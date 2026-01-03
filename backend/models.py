from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text, Enum as SQLEnum, Float, Table
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone
import enum
import uuid

class UserRole(str, enum.Enum):
    STUDENT = "student"
    ADMIN = "admin"

class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"

class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class TaskDifficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class SessionStatus(str, enum.Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"

class SessionType(str, enum.Enum):
    STUDY = "study"
    REVIEW = "review"
    PRACTICE = "practice"

class DayOfWeek(str, enum.Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

# Association table for task dependencies (many-to-many)
task_dependencies = Table(
    'task_dependencies',
    Base.metadata,
    Column('task_id', String(36), ForeignKey('tasks.id', ondelete='CASCADE'), primary_key=True),
    Column('depends_on_task_id', String(36), ForeignKey('tasks.id', ondelete='CASCADE'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    timezone = Column(String(50), default="UTC")
    weekly_hours_goal = Column(Integer, default=20)
    
    # Preferences stored as JSON text
    preferred_session_length = Column(Integer, default=50)  # minutes
    difficulty_tolerance = Column(String(20), default="medium")
    break_preference = Column(Integer, default=10)  # minutes
    
    role = Column(SQLEnum(UserRole), default=UserRole.STUDENT, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    courses = relationship("Course", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    availability_rules = relationship("AvailabilityRule", back_populates="user", cascade="all, delete-orphan")
    availability_exceptions = relationship("AvailabilityException", back_populates="user", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="user", cascade="all, delete-orphan")
    ai_conversations = relationship("AIConversation", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    token = Column(String(500), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")

class Course(Base):
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    exam_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="courses")
    tasks = relationship("Task", back_populates="course", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="course", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    course_id = Column(String(36), ForeignKey('courses.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    due_date = Column(DateTime(timezone=True), nullable=False, index=True)
    priority = Column(SQLEnum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False)
    difficulty = Column(SQLEnum(TaskDifficulty), default=TaskDifficulty.MEDIUM, nullable=False)
    estimated_minutes = Column(Integer, nullable=False)
    actual_minutes = Column(Integer, default=0)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False, index=True)
    tags = Column(Text)  # JSON array stored as text
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="tasks")
    course = relationship("Course", back_populates="tasks")
    study_sessions = relationship("StudySession", back_populates="task", cascade="all, delete-orphan")
    
    # Self-referential many-to-many for dependencies
    dependencies = relationship(
        "Task",
        secondary=task_dependencies,
        primaryjoin=id==task_dependencies.c.task_id,
        secondaryjoin=id==task_dependencies.c.depends_on_task_id,
        backref="dependent_tasks"
    )

class AvailabilityRule(Base):
    __tablename__ = "availability_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    day_of_week = Column(SQLEnum(DayOfWeek), nullable=False)
    start_time = Column(String(5), nullable=False)  # Format: HH:MM
    end_time = Column(String(5), nullable=False)  # Format: HH:MM
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="availability_rules")

class AvailabilityException(Base):
    __tablename__ = "availability_exceptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    start_time = Column(String(5))
    end_time = Column(String(5))
    is_available = Column(Boolean, default=True)  # True=add availability, False=block availability
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="availability_exceptions")

class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    course_id = Column(String(36), ForeignKey('courses.id', ondelete='CASCADE'), nullable=False, index=True)
    task_id = Column(String(36), ForeignKey('tasks.id', ondelete='CASCADE'))
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    planned_minutes = Column(Integer, nullable=False)
    actual_minutes = Column(Integer, default=0)
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.PLANNED, nullable=False)
    session_type = Column(SQLEnum(SessionType), default=SessionType.STUDY, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="study_sessions")
    course = relationship("Course", back_populates="study_sessions")
    task = relationship("Task", back_populates="study_sessions")
    time_logs = relationship("TimeLog", back_populates="session", cascade="all, delete-orphan")

class TimeLog(Base):
    __tablename__ = "time_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey('study_sessions.id', ondelete='CASCADE'), nullable=False, index=True)
    actual_duration = Column(Integer, nullable=False)  # minutes
    interruptions = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    session = relationship("StudySession", back_populates="time_logs")

class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(255), default="New Conversation")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="ai_conversations")
    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan")

class AIMessage(Base):
    __tablename__ = "ai_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey('ai_conversations.id', ondelete='CASCADE'), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    conversation = relationship("AIConversation", back_populates="messages")
