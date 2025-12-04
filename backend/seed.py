import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import os
import uuid
from auth import hash_password

load_dotenv()

async def seed_database():
    """Seed database with demo data"""
    
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🌱 Seeding database...")
    
    # Clear existing data
    await db.users.delete_many({})
    await db.courses.delete_many({})
    await db.tasks.delete_many({})
    await db.availability_rules.delete_many({})
    await db.study_sessions.delete_many({})
    await db.ai_conversations.delete_many({})
    
    # Create demo user
    user_id = str(uuid.uuid4())
    user = {
        'id': user_id,
        'email': 'demo@smartstudy.ai',
        'password_hash': hash_password('demo123'),
        'name': 'Demo Student',
        'first_name': 'Алекс',
        'last_name': 'Петров',
        'avatar_url': None,
        'student_type': 'student',
        'timezone': 'UTC',
        'weekly_hours_goal': 25,
        'preferred_session_length': 50,
        'pomodoro_work_minutes': 25,
        'pomodoro_break_minutes': 5,
        'difficulty_tolerance': 'medium',
        'break_preference': 10,
        'role': 'student',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    print(f"✅ Created user: {user['email']} (password: demo123)")
    
    # Create courses
    courses = [
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'title': 'Data Structures & Algorithms',
            'description': 'Advanced data structures, algorithm analysis, and problem-solving techniques',
            'start_date': datetime.now(timezone.utc).isoformat(),
            'end_date': (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
            'exam_date': (datetime.now(timezone.utc) + timedelta(days=85)).isoformat(),
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'title': 'Machine Learning Fundamentals',
            'description': 'Introduction to ML algorithms, supervised and unsupervised learning',
            'start_date': datetime.now(timezone.utc).isoformat(),
            'end_date': (datetime.now(timezone.utc) + timedelta(days=120)).isoformat(),
            'exam_date': (datetime.now(timezone.utc) + timedelta(days=115)).isoformat(),
            'created_at': datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.courses.insert_many(courses)
    print(f"✅ Created {len(courses)} courses")
    
    # Create tasks
    tasks = [
        # DSA Course tasks
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'course_id': courses[0]['id'],
            'title': 'Complete Binary Tree Assignment',
            'description': 'Implement BST operations: insert, delete, search, and traversals',
            'due_date': (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            'priority': 'high',
            'difficulty': 'medium',
            'estimated_minutes': 180,
            'actual_minutes': 0,
            'status': 'pending',
            'tags': ['assignment', 'trees', 'recursion'],
            'dependencies': [],
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'course_id': courses[0]['id'],
            'title': 'Study Graph Algorithms',
            'description': 'Review DFS, BFS, Dijkstra, and MST algorithms',
            'due_date': (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            'priority': 'medium',
            'difficulty': 'hard',
            'estimated_minutes': 240,
            'actual_minutes': 0,
            'status': 'pending',
            'tags': ['reading', 'graphs'],
            'dependencies': [],
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'course_id': courses[0]['id'],
            'title': 'Practice LeetCode Problems',
            'description': 'Solve 10 medium-level problems on arrays and strings',
            'due_date': (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
            'priority': 'urgent',
            'difficulty': 'medium',
            'estimated_minutes': 300,
            'actual_minutes': 0,
            'status': 'pending',
            'tags': ['practice', 'coding'],
            'dependencies': [],
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'course_id': courses[0]['id'],
            'title': 'Prepare for Midterm Exam',
            'description': 'Review all topics covered so far',
            'due_date': (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
            'priority': 'high',
            'difficulty': 'hard',
            'estimated_minutes': 600,
            'actual_minutes': 0,
            'status': 'pending',
            'tags': ['exam', 'review'],
            'dependencies': [],
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        # ML Course tasks
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'course_id': courses[1]['id'],
            'title': 'Linear Regression Project',
            'description': 'Implement linear regression from scratch',
            'due_date': (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
            'priority': 'high',
            'difficulty': 'medium',
            'estimated_minutes': 420,
            'actual_minutes': 0,
            'status': 'pending',
            'tags': ['project', 'regression'],
            'dependencies': [],
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'course_id': courses[1]['id'],
            'title': 'Watch Neural Network Lectures',
            'description': 'Complete video series on backpropagation',
            'due_date': (datetime.now(timezone.utc) + timedelta(days=6)).isoformat(),
            'priority': 'medium',
            'difficulty': 'easy',
            'estimated_minutes': 150,
            'actual_minutes': 0,
            'status': 'pending',
            'tags': ['video', 'neural-networks'],
            'dependencies': [],
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'course_id': courses[1]['id'],
            'title': 'Read Chapter 3-5 of Textbook',
            'description': 'Study classification algorithms',
            'due_date': (datetime.now(timezone.utc) + timedelta(days=8)).isoformat(),
            'priority': 'medium',
            'difficulty': 'medium',
            'estimated_minutes': 180,
            'actual_minutes': 0,
            'status': 'pending',
            'tags': ['reading', 'classification'],
            'dependencies': [],
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'course_id': courses[1]['id'],
            'title': 'Complete Quiz on Supervised Learning',
            'description': 'Online quiz covering weeks 1-4',
            'due_date': (datetime.now(timezone.utc) + timedelta(days=4)).isoformat(),
            'priority': 'urgent',
            'difficulty': 'easy',
            'estimated_minutes': 60,
            'actual_minutes': 0,
            'status': 'pending',
            'tags': ['quiz', 'assessment'],
            'dependencies': [],
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'course_id': courses[1]['id'],
            'title': 'Group Project Planning Meeting',
            'description': 'Meet with team to plan final project',
            'due_date': (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            'priority': 'high',
            'difficulty': 'easy',
            'estimated_minutes': 90,
            'actual_minutes': 0,
            'status': 'pending',
            'tags': ['meeting', 'project'],
            'dependencies': [],
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'course_id': courses[1]['id'],
            'title': 'Implement K-Means Clustering',
            'description': 'Code K-means algorithm and visualize results',
            'due_date': (datetime.now(timezone.utc) + timedelta(days=12)).isoformat(),
            'priority': 'medium',
            'difficulty': 'hard',
            'estimated_minutes': 360,
            'actual_minutes': 0,
            'status': 'pending',
            'tags': ['coding', 'unsupervised'],
            'dependencies': [],
            'created_at': datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.tasks.insert_many(tasks)
    print(f"✅ Created {len(tasks)} tasks")
    
    # Create availability rules (weekday evenings)
    availability_rules = [
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'day_of_week': 'monday',
            'start_time': '18:00',
            'end_time': '22:00',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'day_of_week': 'tuesday',
            'start_time': '18:00',
            'end_time': '22:00',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'day_of_week': 'wednesday',
            'start_time': '18:00',
            'end_time': '22:00',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'day_of_week': 'thursday',
            'start_time': '18:00',
            'end_time': '22:00',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'day_of_week': 'friday',
            'start_time': '18:00',
            'end_time': '21:00',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'day_of_week': 'saturday',
            'start_time': '10:00',
            'end_time': '16:00',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'day_of_week': 'sunday',
            'start_time': '14:00',
            'end_time': '18:00',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.availability_rules.insert_many(availability_rules)
    print(f"✅ Created {len(availability_rules)} availability rules")
    
    print("\n🎉 Seed data created successfully!")
    print("\n📝 Demo Credentials:")
    print("   Email: demo@smartstudy.ai")
    print("   Password: demo123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
