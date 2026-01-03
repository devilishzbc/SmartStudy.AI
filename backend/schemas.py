from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class TaskDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class SessionStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"

class SessionType(str, Enum):
    STUDY = "study"
    REVIEW = "review"
    PRACTICE = "practice"

class DayOfWeek(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    student_type: str = "student"  # student, school_student, professional, other
    timezone: str = "UTC"
    weekly_hours_goal: int = 20
    preferred_session_length: int = 50
    pomodoro_work_minutes: int = 25
    pomodoro_break_minutes: int = 5
    difficulty_tolerance: str = "medium"
    break_preference: int = 10

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    student_type: Optional[str] = None
    timezone: Optional[str] = None
    weekly_hours_goal: Optional[int] = None
    preferred_session_length: Optional[int] = None
    pomodoro_work_minutes: Optional[int] = None
    pomodoro_break_minutes: Optional[int] = None
    difficulty_tolerance: Optional[str] = None
    break_preference: Optional[int] = None

class UserResponse(UserBase):
    id: str
    role: UserRole
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Auth Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Course Schemas
class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    exam_date: Optional[datetime] = None

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    exam_date: Optional[datetime] = None

class CourseResponse(CourseBase):
    id: str
    user_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Task Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    course_id: str
    due_date: datetime
    priority: TaskPriority = TaskPriority.MEDIUM
    difficulty: TaskDifficulty = TaskDifficulty.MEDIUM
    estimated_minutes: int
    tags: List[str] = []

class TaskCreate(TaskBase):
    dependencies: List[str] = []  # List of task IDs

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    course_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    difficulty: Optional[TaskDifficulty] = None
    estimated_minutes: Optional[int] = None
    status: Optional[TaskStatus] = None
    tags: Optional[List[str]] = None

class TaskCompleteRequest(BaseModel):
    actual_minutes: int

class TaskResponse(TaskBase):
    id: str
    user_id: str
    status: TaskStatus
    actual_minutes: int
    dependencies: List[str] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Availability Schemas
class AvailabilityRuleBase(BaseModel):
    day_of_week: DayOfWeek
    start_time: str  # Format: HH:MM
    end_time: str    # Format: HH:MM

class AvailabilityRuleCreate(AvailabilityRuleBase):
    pass

class AvailabilityRuleResponse(AvailabilityRuleBase):
    id: str
    user_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AvailabilityExceptionBase(BaseModel):
    date: datetime
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_available: bool = True

class AvailabilityExceptionCreate(AvailabilityExceptionBase):
    pass

class AvailabilityExceptionResponse(AvailabilityExceptionBase):
    id: str
    user_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Study Session Schemas
class StudySessionBase(BaseModel):
    course_id: str
    task_id: Optional[str] = None
    start_time: datetime
    end_time: datetime
    planned_minutes: int
    session_type: SessionType = SessionType.STUDY

class StudySessionCreate(StudySessionBase):
    pass

class StudySessionUpdate(BaseModel):
    status: Optional[SessionStatus] = None
    actual_minutes: Optional[int] = None

class StudySessionResponse(StudySessionBase):
    id: str
    user_id: str
    status: SessionStatus
    actual_minutes: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Schedule Schemas
class ScheduleGenerateRequest(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ScheduleResponse(BaseModel):
    sessions: List[StudySessionResponse]
    message: str

# Analytics Schemas
class AnalyticsSummary(BaseModel):
    total_planned_minutes: int
    total_actual_minutes: int
    completion_rate: float
    tasks_completed: int
    tasks_pending: int
    tasks_overdue: int

class BurndownPoint(BaseModel):
    date: str
    remaining_hours: float
    ideal_hours: float

class BurndownResponse(BaseModel):
    points: List[BurndownPoint]

# AI Coach Schemas
class AIConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"

class AIConversationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AIMessageCreate(BaseModel):
    content: str

class AIMessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ETA Prediction Schemas
class ETAPredictRequest(BaseModel):
    task_id: str

class ETAPredictResponse(BaseModel):
    task_id: str
    predicted_minutes: int
    confidence: float
    factors: dict
