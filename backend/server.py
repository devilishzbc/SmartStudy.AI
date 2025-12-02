from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
from datetime import datetime, timedelta, timezone
import uuid
from typing import List, Optional

# Import schemas and utilities
from schemas import *
from auth import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user, decode_token
from ai_coach import generate_ai_response, get_rate_limit_status, RateLimitExceeded, DAILY_MESSAGE_LIMIT

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="SmartStudy.AI API", version="1.0.0")

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# AUTH ENDPOINTS
@api_router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    user_dict = user_data.model_dump(exclude={'password'})
    user_dict['id'] = str(uuid.uuid4())
    user_dict['password_hash'] = hash_password(user_data.password)
    user_dict['role'] = UserRole.STUDENT
    user_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.users.insert_one(user_dict)
    user_dict.pop('password_hash', None)
    return UserResponse(**user_dict)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    
    access_token = create_access_token({"sub": user['id']})
    refresh_token = create_refresh_token({"sub": user['id']})
    
    refresh_token_doc = {
        'id': str(uuid.uuid4()),
        'user_id': user['id'],
        'token': refresh_token,
        'expires_at': (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.refresh_tokens.insert_one(refresh_token_doc)
    
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@api_router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.pop('password_hash', None)
    user.pop('_id', None)
    return UserResponse(**user)

# COURSES
@api_router.get("/courses", response_model=List[CourseResponse])
async def get_courses(user_id: str = Depends(get_current_user)):
    courses = await db.courses.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    return [CourseResponse(**course) for course in courses]

# TASKS
@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(user_id: str = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    return [TaskResponse(**task) for task in tasks]

@api_router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(task_data: TaskCreate, user_id: str = Depends(get_current_user)):
    task_dict = task_data.model_dump()
    task_dict['id'] = str(uuid.uuid4())
    task_dict['user_id'] = user_id
    task_dict['status'] = TaskStatus.PENDING
    task_dict['actual_minutes'] = 0
    task_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    task_dict['due_date'] = task_dict['due_date'].isoformat()
    
    await db.tasks.insert_one(task_dict)
    return TaskResponse(**task_dict)

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task_update: TaskUpdate, user_id: str = Depends(get_current_user)):
    update_dict = {k: v for k, v in task_update.model_dump().items() if v is not None}
    
    if update_dict.get('due_date'):
        update_dict['due_date'] = update_dict['due_date'].isoformat()
    
    if update_dict:
        result = await db.tasks.update_one(
            {"id": task_id, "user_id": user_id},
            {"$set": update_dict}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return TaskResponse(**task)

@api_router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, user_id: str = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

@api_router.post("/tasks/{task_id}/complete", response_model=TaskResponse)
async def complete_task(task_id: str, completion_data: TaskCompleteRequest, user_id: str = Depends(get_current_user)):
    result = await db.tasks.update_one(
        {"id": task_id, "user_id": user_id},
        {"$set": {
            "status": TaskStatus.COMPLETED,
            "actual_minutes": completion_data.actual_minutes
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return TaskResponse(**task)

@api_router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(course_data: CourseCreate, user_id: str = Depends(get_current_user)):
    course_dict = course_data.model_dump()
    course_dict['id'] = str(uuid.uuid4())
    course_dict['user_id'] = user_id
    course_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    for field in ['start_date', 'end_date', 'exam_date']:
        if course_dict.get(field):
            course_dict[field] = course_dict[field].isoformat()
    
    await db.courses.insert_one(course_dict)
    return CourseResponse(**course_dict)

@api_router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(course_id: str, user_id: str = Depends(get_current_user)):
    result = await db.courses.delete_one({"id": course_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

@api_router.put("/users/me", response_model=UserResponse)
async def update_current_user(user_update: UserUpdate, user_id: str = Depends(get_current_user)):
    update_dict = {k: v for k, v in user_update.model_dump().items() if v is not None}
    
    if update_dict:
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": update_dict}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return UserResponse(**user)

# ============================================================================
# AI COACH ENDPOINTS
# ============================================================================

@api_router.post("/coach/conversations", response_model=AIConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(conversation_data: AIConversationCreate, user_id: str = Depends(get_current_user)):
    conversation_dict = conversation_data.model_dump()
    conversation_dict['id'] = str(uuid.uuid4())
    conversation_dict['user_id'] = user_id
    conversation_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.ai_conversations.insert_one(conversation_dict)
    return AIConversationResponse(**conversation_dict)

@api_router.get("/coach/conversations", response_model=List[AIConversationResponse])
async def get_conversations(user_id: str = Depends(get_current_user)):
    conversations = await db.ai_conversations.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return [AIConversationResponse(**conv) for conv in conversations]


@api_router.get("/coach/rate-limit")
async def get_coach_rate_limit(user_id: str = Depends(get_current_user)):
    """Get current rate limit status for AI Coach."""
    return await get_rate_limit_status(db, user_id)


@api_router.post("/coach/conversations/{conversation_id}/messages", response_model=AIMessageResponse)
async def send_message(
    conversation_id: str,
    message_data: AIMessageCreate,
    user_id: str = Depends(get_current_user)
):
    # Verify conversation belongs to user
    conversation = await db.ai_conversations.find_one({
        "id": conversation_id,
        "user_id": user_id
    }, {"_id": 0})
    
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    
    # Store user message with user_id for rate limiting
    user_message_dict = {
        'id': str(uuid.uuid4()),
        'conversation_id': conversation_id,
        'user_id': user_id,
        'role': 'user',
        'content': message_data.content,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.ai_messages.insert_one(user_message_dict)
    
    # Get user context for grounding
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    tasks = await db.tasks.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    courses = await db.courses.find({"user_id": user_id}, {"_id": 0}).to_list(20)
    
    try:
        # Generate AI response using the new AI Coach module
        ai_response = await generate_ai_response(
            db=db,
            user_id=user_id,
            conversation_id=conversation_id,
            user_message=message_data.content,
            user=user,
            tasks=tasks,
            courses=courses
        )
    except RateLimitExceeded as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e)
        )
    
    # Store AI response
    ai_message_dict = {
        'id': str(uuid.uuid4()),
        'conversation_id': conversation_id,
        'user_id': user_id,
        'role': 'assistant',
        'content': ai_response,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.ai_messages.insert_one(ai_message_dict)
    
    return AIMessageResponse(**ai_message_dict)


@api_router.get("/coach/conversations/{conversation_id}/messages", response_model=List[AIMessageResponse])
async def get_messages(
    conversation_id: str,
    user_id: str = Depends(get_current_user)
):
    # Verify conversation belongs to user
    conversation = await db.ai_conversations.find_one({
        "id": conversation_id,
        "user_id": user_id
    })
    
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    
    messages = await db.ai_messages.find({
        "conversation_id": conversation_id
    }, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    return [AIMessageResponse(**msg) for msg in messages]

# ============================================================================
# POMODORO ENDPOINTS
# ============================================================================

@api_router.post("/pomodoro/sessions")
async def create_pomodoro_session(session_data: dict, user_id: str = Depends(get_current_user)):
    """Track completed Pomodoro sessions"""
    pomodoro_session = {
        'id': str(uuid.uuid4()),
        'user_id': user_id,
        'duration_minutes': session_data.get('duration_minutes', 25),
        'session_type': session_data.get('session_type', 'focus'),  # focus or break
        'completed_at': datetime.now(timezone.utc).isoformat(),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.pomodoro_sessions.insert_one(pomodoro_session)
    return {"id": pomodoro_session['id'], "message": "Pomodoro session tracked"}

@api_router.get("/pomodoro/sessions/today")
async def get_today_pomodoro_count(user_id: str = Depends(get_current_user)):
    """Get count of Pomodoro sessions completed today"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    sessions = await db.pomodoro_sessions.find({
        "user_id": user_id,
        "completed_at": {"$gte": today_start.isoformat(), "$lt": today_end.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    return {"count": len(sessions), "sessions": sessions}

# ============================================================================
# FLASHCARDS ENDPOINTS
# ============================================================================

@api_router.post("/flashcards/generate")
async def generate_flashcards(text_data: dict, user_id: str = Depends(get_current_user)):
    """Generate flashcards from text (placeholder - integrate your own AI API)"""
    try:
        text = text_data.get('text', '')
        if not text:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text is required")
        
        # Generate simple flashcards based on text
        # TODO: Replace with real AI API integration (OpenAI, Anthropic, etc.)
        words = text.split()
        
        flashcards = [
            {"question": "Что является главной темой этого материала?", "answer": "Материал описывает ключевые концепции для изучения."},
            {"question": "Какие основные понятия затронуты в тексте?", "answer": f"Текст содержит {len(words)} слов и охватывает несколько важных тем."},
            {"question": "Как применить эти знания на практике?", "answer": "Рекомендуется регулярно повторять материал и решать практические задачи."},
        ]
        
        return {"flashcards": flashcards}
        
    except Exception as e:
        logger.error(f"Flashcard generation error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate flashcards")

# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================

@api_router.get("/analytics/summary")
async def get_analytics_summary(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get analytics summary for the user"""
    # Get all tasks for the user
    tasks = await db.tasks.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    # Calculate stats
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.get('status') == 'completed'])
    pending_tasks = len([t for t in tasks if t.get('status') == 'pending'])
    overdue_tasks = len([t for t in tasks if t.get('status') == 'overdue'])
    
    # Calculate completion rate
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Get study sessions
    sessions = await db.study_sessions.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    total_study_minutes = sum(s.get('duration_minutes', 0) for s in sessions)
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "overdue_tasks": overdue_tasks,
        "completion_rate": round(completion_rate, 1),
        "total_study_hours": round(total_study_minutes / 60, 1),
        "total_sessions": len(sessions)
    }

# ============================================================================
# SCHEDULE ENDPOINTS
# ============================================================================

@api_router.get("/schedule/week", response_model=List[StudySessionResponse])
async def get_weekly_schedule(date: Optional[str] = None, user_id: str = Depends(get_current_user)):
    target_date = datetime.fromisoformat(date) if date else datetime.now(timezone.utc)
    week_start = target_date - timedelta(days=target_date.weekday())
    week_end = week_start + timedelta(days=7)
    
    sessions = await db.study_sessions.find({
        "user_id": user_id,
        "start_time": {"$gte": week_start.isoformat(), "$lt": week_end.isoformat()}
    }, {"_id": 0}).sort("start_time", 1).to_list(1000)
    
    return [StudySessionResponse(**session) for session in sessions]

@api_router.post("/schedule/generate")
async def generate_schedule(schedule_request: ScheduleGenerateRequest, user_id: str = Depends(get_current_user)):
    # Get user preferences
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Get pending tasks
    tasks = await db.tasks.find({
        "user_id": user_id,
        "status": {"$in": [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]}
    }, {"_id": 0}).to_list(1000)
    
    if not tasks:
        return {"sessions": [], "message": "No pending tasks to schedule"}
    
    # Get availability rules
    rules = await db.availability_rules.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    if not rules:
        return {"sessions": [], "message": "Please set your availability first"}
    
    # Simple scheduling logic (since OR-Tools scheduling is complex)
    # Create study sessions based on availability
    start_date = schedule_request.start_date or datetime.now(timezone.utc)
    end_date = schedule_request.end_date or start_date + timedelta(days=14)
    
    scheduled_sessions = []
    current_date = start_date
    task_index = 0
    
    while current_date < end_date and task_index < len(tasks):
        day_name = current_date.strftime("%A").lower()
        day_rules = [r for r in rules if r['day_of_week'] == day_name]
        
        for rule in day_rules:
            if task_index >= len(tasks):
                break
                
            task = tasks[task_index]
            start_time_parts = rule['start_time'].split(':')
            
            session_start = current_date.replace(
                hour=int(start_time_parts[0]),
                minute=int(start_time_parts[1]),
                second=0,
                microsecond=0
            )
            session_end = session_start + timedelta(minutes=user.get('preferred_session_length', 50))
            
            session_dict = {
                'id': str(uuid.uuid4()),
                'user_id': user_id,
                'task_id': task['id'],
                'course_id': task['course_id'],
                'start_time': session_start.isoformat(),
                'end_time': session_end.isoformat(),
                'planned_minutes': user.get('preferred_session_length', 50),
                'actual_minutes': 0,
                'status': SessionStatus.PLANNED,
                'session_type': SessionType.STUDY,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            
            await db.study_sessions.insert_one(session_dict)
            scheduled_sessions.append(StudySessionResponse(**session_dict))
            task_index += 1
        
        current_date += timedelta(days=1)
    
    return {
        "sessions": scheduled_sessions,
        "message": f"Successfully generated {len(scheduled_sessions)} study sessions"
    }

# Include the router in the main app
app.include_router(api_router)

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "SmartStudy.AI"}

# Shutdown handler
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
