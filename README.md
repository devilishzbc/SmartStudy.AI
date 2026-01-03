# SmartStudy.AI

An intelligent study workload management system that helps students plan study schedules automatically, estimate task durations, track progress, and interact with an AI Coach.

## 🎯 Features

- **Automated Scheduling**: OR-Tools CP-SAT powered schedule optimization
- **Task Management**: CRUD operations with priorities, dependencies, and deadlines
- **ETA Prediction**: Machine learning-based task duration estimates
- **Progress Analytics**: Burndown charts, completion rates, and insights
- **AI Coach**: Groq API powered study assistant
- **Availability Management**: Weekly patterns with exceptions
- **Session Tracking**: Pomodoro-style study sessions

## 🚀 Quick Start

### Demo Credentials
```
Email: demo@smartstudy.ai
Password: demo123
```

### Seed Database
```bash
cd backend
python seed.py
```

## 📚 API Endpoints

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/courses` - List courses
- `POST /api/v1/courses` - Create course
- `GET /api/v1/tasks` - List tasks
- `POST /api/v1/tasks` - Create task
- `POST /api/v1/schedule/generate` - Generate optimized schedule
- `GET /api/v1/analytics/summary` - Get analytics
- `POST /api/v1/coach/conversations` - AI Coach chat

## 🧠 Technology Stack

- **Backend**: FastAPI + MongoDB + OR-Tools + Groq API
- **Frontend**: React + TypeScript + TanStack Query + Zustand + Recharts
- **Design**: Electric Violet (#6D28D9) theme with Outfit & DM Sans fonts

## 📄 Documentation

Full API documentation available at `/docs` when running the server.
