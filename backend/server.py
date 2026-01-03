from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import json
import re
import httpx
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


@api_router.put("/coach/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    update_data: dict,
    user_id: str = Depends(get_current_user)
):
    """Update conversation title."""
    result = await db.ai_conversations.update_one(
        {"id": conversation_id, "user_id": user_id},
        {"$set": {"title": update_data.get("title", "New Conversation")}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    
    conversation = await db.ai_conversations.find_one({"id": conversation_id}, {"_id": 0})
    return AIConversationResponse(**conversation)


@api_router.delete("/coach/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete conversation and all its messages."""
    # Delete conversation
    result = await db.ai_conversations.delete_one({"id": conversation_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    
    # Delete all messages in this conversation
    await db.ai_messages.delete_many({"conversation_id": conversation_id})
    
    return {"message": "Conversation deleted successfully"}


@api_router.get("/coach/rate-limit")
async def get_coach_rate_limit(user_id: str = Depends(get_current_user)):
    """Get current rate limit status for AI Coach."""
    return await get_rate_limit_status(db, user_id)


@api_router.post("/coach/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    message_data: AIMessageCreate,
    user_id: str = Depends(get_current_user)
):
    """
    Send a message to AI Coach and get response with optional actions.
    AI can now execute actions like creating tasks, flashcards, courses, etc.
    """
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
        # Generate AI response using the AI Coach module with function calling
        ai_result = await generate_ai_response(
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
    
    # ai_result is now a dict with 'message' and 'actions'
    ai_response_text = ai_result.get("message", "")
    executed_actions = ai_result.get("actions", [])
    
    # Store AI response
    ai_message_dict = {
        'id': str(uuid.uuid4()),
        'conversation_id': conversation_id,
        'user_id': user_id,
        'role': 'assistant',
        'content': ai_response_text,
        'actions': executed_actions,  # Store actions with message
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.ai_messages.insert_one(ai_message_dict)
    
    # Return enhanced response with actions
    return {
        "id": ai_message_dict['id'],
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": ai_response_text,
        "actions": executed_actions,
        "created_at": ai_message_dict['created_at']
    }


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
    """Generate flashcards from text using Groq AI"""
    try:
        text = text_data.get('text', '')
        num_cards = text_data.get('num_cards', 5)
        
        if not text:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text is required")
        
        if len(text) < 50:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Текст слишком короткий. Минимум 50 символов.")
        
        # Use Groq API for flashcard generation
        groq_api_key = os.getenv("GROQ_API_KEY")
        
        if not groq_api_key:
            # Fallback to simple generation
            return _generate_fallback_flashcards(text)
        
        prompt = f"""Проанализируй следующий учебный материал и создай {num_cards} флешкарт для запоминания.

МАТЕРИАЛ:
{text[:3000]}

ТРЕБОВАНИЯ:
1. Создай РОВНО {num_cards} флешкарт
2. Каждая флешкарта должна иметь:
   - question: краткий, понятный вопрос
   - answer: точный, информативный ответ (1-3 предложения)
3. Вопросы должны проверять понимание ключевых концепций
4. Отвечай ТОЛЬКО на русском языке
5. Верни ТОЛЬКО JSON массив без дополнительного текста

ФОРМАТ ОТВЕТА (строго JSON):
[
  {{"question": "Вопрос 1?", "answer": "Ответ 1"}},
  {{"question": "Вопрос 2?", "answer": "Ответ 2"}}
]"""

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "max_tokens": 2000,
                    "temperature": 0.7,
                    "messages": [
                        {"role": "system", "content": "Ты помощник для создания учебных флешкарт. Отвечай ТОЛЬКО валидным JSON массивом."},
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                
                # Parse JSON from response - try to extract JSON array
                json_match = re.search(r'\[[\s\S]*\]', content)
                if json_match:
                    flashcards = json.loads(json_match.group())
                    # Validate structure
                    valid_cards = []
                    for card in flashcards:
                        if isinstance(card, dict) and 'question' in card and 'answer' in card:
                            valid_cards.append({
                                "question": str(card['question']),
                                "answer": str(card['answer'])
                            })
                    
                    if valid_cards:
                        return {"flashcards": valid_cards}
                
                # If parsing failed, use fallback
                return _generate_fallback_flashcards(text)
            else:
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
                return _generate_fallback_flashcards(text)
                
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {e}")
        return _generate_fallback_flashcards(text)
    except Exception as e:
        logger.error(f"Flashcard generation error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate flashcards")


def _generate_fallback_flashcards(text: str) -> dict:
    """Generate simple flashcards when AI is unavailable"""
    sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20][:5]
    
    flashcards = []
    for i, sentence in enumerate(sentences):
        words = sentence.split()
        if len(words) > 3:
            flashcards.append({
                "question": f"Что означает: '{' '.join(words[:5])}...'?",
                "answer": sentence
            })
    
    if not flashcards:
        flashcards = [
            {"question": "Какова главная идея этого материала?", "answer": text[:200] + "..."},
            {"question": "Что важно запомнить?", "answer": "Основные концепции из предоставленного материала."},
        ]
    
    return {"flashcards": flashcards}

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
# AVAILABILITY ENDPOINTS
# ============================================================================

@api_router.get("/availability/rules")
async def get_availability_rules(user_id: str = Depends(get_current_user)):
    """Get all availability rules for the current user"""
    rules = await db.availability_rules.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return rules

@api_router.post("/availability/rules")
async def create_availability_rule(rule: AvailabilityRuleCreate, user_id: str = Depends(get_current_user)):
    """Create a new availability rule"""
    rule_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "day_of_week": rule.day_of_week,
        "start_time": rule.start_time,
        "end_time": rule.end_time,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.availability_rules.insert_one(rule_dict)
    return rule_dict

@api_router.put("/availability/rules/{rule_id}")
async def update_availability_rule(rule_id: str, rule: AvailabilityRuleCreate, user_id: str = Depends(get_current_user)):
    """Update an availability rule"""
    existing = await db.availability_rules.find_one({"id": rule_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    
    await db.availability_rules.update_one(
        {"id": rule_id},
        {"$set": {
            "day_of_week": rule.day_of_week,
            "start_time": rule.start_time,
            "end_time": rule.end_time
        }}
    )
    updated = await db.availability_rules.find_one({"id": rule_id}, {"_id": 0})
    return updated

@api_router.delete("/availability/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_availability_rule(rule_id: str, user_id: str = Depends(get_current_user)):
    """Delete an availability rule"""
    result = await db.availability_rules.delete_one({"id": rule_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return

@api_router.post("/availability/rules/batch")
async def set_availability_rules_batch(rules: List[AvailabilityRuleCreate], user_id: str = Depends(get_current_user)):
    """Set multiple availability rules at once (replaces existing)"""
    # Delete existing rules
    await db.availability_rules.delete_many({"user_id": user_id})
    
    # Insert new rules
    if rules:
        new_rules = []
        for rule in rules:
            new_rules.append({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "day_of_week": rule.day_of_week,
                "start_time": rule.start_time,
                "end_time": rule.end_time,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        await db.availability_rules.insert_many(new_rules)
        
        # Return rules without MongoDB _id
        rules_response = [
            {k: v for k, v in rule.items() if k != '_id'} 
            for rule in new_rules
        ]
        return {"message": f"Создано {len(rules_response)} правил доступности", "rules": rules_response}
    
    return {"message": "Все правила доступности очищены", "rules": []}

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
    
    # Clear existing planned sessions
    await db.study_sessions.delete_many({
        "user_id": user_id,
        "status": SessionStatus.PLANNED
    })
    
    # Smart scheduling logic
    start_date = schedule_request.start_date or datetime.now(timezone.utc)
    end_date = schedule_request.end_date or start_date + timedelta(days=14)
    
    # Sort tasks by priority and due date
    def task_priority_key(task):
        priority_order = {'urgent': 0, 'high': 1, 'medium': 2, 'low': 3}
        priority = priority_order.get(task.get('priority', 'medium'), 2)
        due = task.get('due_date', '9999-12-31')
        return (priority, due)
    
    sorted_tasks = sorted(tasks, key=task_priority_key)
    
    session_length = user.get('preferred_session_length', 50)
    break_length = user.get('break_preference', 10)
    
    scheduled_sessions = []
    task_queue = list(sorted_tasks)
    current_date = start_date
    
    while current_date < end_date and task_queue:
        day_name = current_date.strftime("%A").lower()
        day_rules = [r for r in rules if r['day_of_week'] == day_name]
        
        for rule in day_rules:
            if not task_queue:
                break
            
            # Parse time window
            start_h, start_m = map(int, rule['start_time'].split(':'))
            end_h, end_m = map(int, rule['end_time'].split(':'))
            
            window_start = current_date.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
            window_end = current_date.replace(hour=end_h, minute=end_m, second=0, microsecond=0)
            
            # Calculate available minutes in this window
            available_minutes = int((window_end - window_start).total_seconds() / 60)
            current_time = window_start
            
            # Schedule sessions within this time window
            while available_minutes >= session_length and task_queue:
                task = task_queue[0]
                task_remaining = task.get('estimated_minutes', session_length) - task.get('completed_minutes', 0)
                
                if task_remaining <= 0:
                    task_queue.pop(0)
                    continue
                
                session_duration = min(session_length, task_remaining, available_minutes)
                session_end = current_time + timedelta(minutes=session_duration)
                
                session_dict = {
                    'id': str(uuid.uuid4()),
                    'user_id': user_id,
                    'task_id': task['id'],
                    'course_id': task.get('course_id'),
                    'start_time': current_time.isoformat(),
                    'end_time': session_end.isoformat(),
                    'planned_minutes': session_duration,
                    'actual_minutes': 0,
                    'status': SessionStatus.PLANNED,
                    'session_type': SessionType.STUDY,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                
                await db.study_sessions.insert_one(session_dict)
                scheduled_sessions.append(StudySessionResponse(**session_dict))
                
                # Update task progress tracking
                task['completed_minutes'] = task.get('completed_minutes', 0) + session_duration
                if task['completed_minutes'] >= task.get('estimated_minutes', session_length):
                    task_queue.pop(0)
                
                # Move to next time slot
                current_time = session_end + timedelta(minutes=break_length)
                available_minutes -= (session_duration + break_length)
        
        current_date += timedelta(days=1)
    
    return {
        "sessions": scheduled_sessions,
        "message": f"Создано {len(scheduled_sessions)} учебных сессий"
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
