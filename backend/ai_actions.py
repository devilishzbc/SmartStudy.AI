"""
AI Actions - Functions that AI can call to perform actions in the app.
Supports: creating tasks, courses, flashcards, pomodoro, and more.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import logging
import os
import httpx
import json
import re

logger = logging.getLogger(__name__)

# Groq API for flashcard generation
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Define available AI actions/tools for function calling
AI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Создать новую учебную задачу для пользователя. Используй когда пользователь просит создать, добавить задачу или дело.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Название задачи"
                    },
                    "description": {
                        "type": "string",
                        "description": "Подробное описание задачи (опционально)"
                    },
                    "due_date": {
                        "type": "string",
                        "description": "Срок выполнения: 'today', 'tomorrow', 'next_week' или дата в формате YYYY-MM-DD"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "urgent"],
                        "description": "Приоритет: low (низкий), medium (средний), high (высокий), urgent (срочный)"
                    },
                    "estimated_minutes": {
                        "type": "integer",
                        "description": "Примерное время выполнения в минутах"
                    }
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_multiple_tasks",
            "description": "Создать несколько задач сразу. Используй когда пользователь просит создать список задач или план.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tasks": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "description": {"type": "string"},
                                "due_date": {"type": "string"},
                                "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"]},
                                "estimated_minutes": {"type": "integer"}
                            },
                            "required": ["title"]
                        },
                        "description": "Список задач для создания"
                    }
                },
                "required": ["tasks"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_flashcards",
            "description": "Сгенерировать флешкарточки по теме для запоминания материала. Используй когда пользователь просит создать карточки для изучения.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "Тема для флешкарточек (например: 'Python циклы', 'Формулы физики')"
                    },
                    "count": {
                        "type": "integer",
                        "description": "Количество карточек (от 3 до 15)",
                        "default": 5
                    },
                    "difficulty": {
                        "type": "string",
                        "enum": ["easy", "medium", "hard"],
                        "description": "Сложность карточек"
                    }
                },
                "required": ["topic"]
            }
        }
    },
    {
        "type": "function", 
        "function": {
            "name": "create_course",
            "description": "Создать новый курс или предмет. Используй когда пользователь хочет добавить новый предмет обучения.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Название курса/предмета"
                    },
                    "description": {
                        "type": "string",
                        "description": "Описание курса"
                    },
                    "color": {
                        "type": "string",
                        "enum": ["blue", "green", "purple", "red", "orange", "pink", "teal", "indigo"],
                        "description": "Цвет курса для визуального отличия"
                    }
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_study_plan",
            "description": "Создать план изучения темы с задачами и этапами. Используй когда пользователь хочет спланировать изучение чего-то.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "Что нужно изучить"
                    },
                    "duration_days": {
                        "type": "integer",
                        "description": "За сколько дней нужно изучить (по умолчанию 7)"
                    },
                    "hours_per_day": {
                        "type": "number",
                        "description": "Сколько часов в день готов уделять (по умолчанию 2)"
                    }
                },
                "required": ["topic"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "start_pomodoro",
            "description": "Предложить запустить таймер Pomodoro для фокусировки на задаче",
            "parameters": {
                "type": "object",
                "properties": {
                    "duration_minutes": {
                        "type": "integer",
                        "description": "Длительность рабочей сессии в минутах (по умолчанию 25)"
                    },
                    "task_name": {
                        "type": "string",
                        "description": "Над какой задачей будем работать"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_motivation",
            "description": "Дать мотивационное сообщение или совет. Используй когда пользователь устал, не может сосредоточиться или нуждается в поддержке.",
            "parameters": {
                "type": "object",
                "properties": {
                    "mood": {
                        "type": "string",
                        "enum": ["tired", "stressed", "unmotivated", "overwhelmed", "procrastinating"],
                        "description": "Текущее состояние пользователя"
                    }
                },
                "required": []
            }
        }
    }
]


def parse_relative_date(date_str: str) -> str:
    """Convert relative dates to ISO format."""
    today = datetime.now(timezone.utc).date()
    
    if not date_str:
        return (today + timedelta(days=1)).isoformat()
    
    date_lower = date_str.lower().strip()
    
    if date_lower in ['today', 'сегодня']:
        return today.isoformat()
    elif date_lower in ['tomorrow', 'завтра']:
        return (today + timedelta(days=1)).isoformat()
    elif date_lower in ['next_week', 'через неделю', 'next week']:
        return (today + timedelta(days=7)).isoformat()
    elif date_lower in ['in 3 days', 'через 3 дня']:
        return (today + timedelta(days=3)).isoformat()
    elif date_lower in ['in 2 days', 'через 2 дня', 'послезавтра']:
        return (today + timedelta(days=2)).isoformat()
    else:
        # Try to parse as date
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date().isoformat()
        except:
            return (today + timedelta(days=1)).isoformat()


async def execute_action(db, user_id: str, action_name: str, params: dict) -> dict:
    """Execute an AI action and return result."""
    
    try:
        if action_name == "create_task":
            return await action_create_task(db, user_id, params)
        elif action_name == "create_multiple_tasks":
            return await action_create_multiple_tasks(db, user_id, params)
        elif action_name == "generate_flashcards":
            return await action_generate_flashcards(db, user_id, params)
        elif action_name == "create_course":
            return await action_create_course(db, user_id, params)
        elif action_name == "create_study_plan":
            return await action_create_study_plan(db, user_id, params)
        elif action_name == "start_pomodoro":
            return action_start_pomodoro(params)
        elif action_name == "get_motivation":
            return action_get_motivation(params)
        else:
            return {"type": "unknown", "error": f"Unknown action: {action_name}"}
    except Exception as e:
        logger.error(f"Error executing action {action_name}: {e}")
        return {"type": "error", "error": str(e), "message": f"❌ Ошибка при выполнении действия: {str(e)}"}


async def action_create_task(db, user_id: str, params: dict) -> dict:
    """Create a new task."""
    due_date = parse_relative_date(params.get('due_date', 'tomorrow'))
    priority = params.get('priority', 'medium')
    
    # Map priority to Russian for display
    priority_labels = {
        'low': 'низкий',
        'medium': 'средний', 
        'high': 'высокий',
        'urgent': 'срочный'
    }
    
    task = {
        'id': str(uuid.uuid4()),
        'user_id': user_id,
        'title': params['title'],
        'description': params.get('description', ''),
        'course_id': None,  # AI-created tasks don't belong to a course by default
        'status': 'pending',
        'priority': priority,
        'difficulty': 'medium',
        'due_date': due_date,
        'estimated_minutes': params.get('estimated_minutes', 30),
        'actual_minutes': None,
        'tags': [],
        'dependencies': [],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.tasks.insert_one(task)
    
    return {
        "type": "task_created",
        "task": {
            "id": task['id'],
            "title": task['title'],
            "due_date": due_date,
            "priority": priority
        },
        "message": f"✅ Создана задача: **{task['title']}**\n📅 Срок: {due_date}\n🎯 Приоритет: {priority_labels.get(priority, priority)}",
        "link": "/tasks"
    }


async def action_create_multiple_tasks(db, user_id: str, params: dict) -> dict:
    """Create multiple tasks at once."""
    tasks_data = params.get('tasks', [])
    created_tasks = []
    
    for i, task_params in enumerate(tasks_data):
        due_date = parse_relative_date(task_params.get('due_date', ''))
        # Stagger due dates if not specified
        if not task_params.get('due_date'):
            today = datetime.now(timezone.utc).date()
            due_date = (today + timedelta(days=i+1)).isoformat()
        
        task = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'title': task_params['title'],
            'description': task_params.get('description', ''),
            'course_id': None,
            'status': 'pending',
            'priority': task_params.get('priority', 'medium'),
            'difficulty': 'medium',
            'due_date': due_date,
            'estimated_minutes': task_params.get('estimated_minutes', 30),
            'actual_minutes': None,
            'tags': [],
            'dependencies': [],
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        await db.tasks.insert_one(task)
        created_tasks.append(task)
    
    task_list = "\n".join([f"• {t['title']}" for t in created_tasks])
    
    return {
        "type": "tasks_created",
        "tasks": [{"id": t['id'], "title": t['title']} for t in created_tasks],
        "count": len(created_tasks),
        "message": f"✅ Создано {len(created_tasks)} задач:\n{task_list}",
        "link": "/tasks"
    }


async def action_create_course(db, user_id: str, params: dict) -> dict:
    """Create a new course."""
    color = params.get('color', 'blue')
    
    course = {
        'id': str(uuid.uuid4()),
        'user_id': user_id,
        'title': params['title'],
        'description': params.get('description', ''),
        'color': color,
        'progress': 0,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.courses.insert_one(course)
    
    color_emoji = {
        'blue': '🔵', 'green': '🟢', 'purple': '🟣', 'red': '🔴',
        'orange': '🟠', 'pink': '💗', 'teal': '🩵', 'indigo': '💜'
    }
    
    return {
        "type": "course_created",
        "course": {
            "id": course['id'],
            "title": course['title'],
            "color": color
        },
        "message": f"📚 Создан курс: **{course['title']}** {color_emoji.get(color, '')}",
        "link": "/courses"
    }


async def action_generate_flashcards(db, user_id: str, params: dict) -> dict:
    """Generate flashcards using AI."""
    topic = params.get('topic', '')
    count = min(max(params.get('count', 5), 3), 15)  # 3-15 cards
    difficulty = params.get('difficulty', 'medium')
    
    if not GROQ_API_KEY:
        # Return instruction to use flashcards page
        return {
            "type": "flashcards_redirect",
            "topic": topic,
            "count": count,
            "message": f"🃏 Для создания флешкарточек по теме **{topic}** перейди на страницу Flashcards",
            "link": "/flashcards"
        }
    
    # Generate flashcards using AI
    difficulty_prompts = {
        'easy': 'простые, для начинающих',
        'medium': 'средней сложности',
        'hard': 'сложные, для продвинутых'
    }
    
    prompt = f"""Создай {count} флешкарточек по теме: {topic}
Сложность: {difficulty_prompts.get(difficulty, 'средней сложности')}

Верни ТОЛЬКО JSON массив в таком формате:
[
  {{"question": "Вопрос 1?", "answer": "Ответ 1"}},
  {{"question": "Вопрос 2?", "answer": "Ответ 2"}}
]

Вопросы должны быть конкретными и проверять понимание темы.
Ответы должны быть краткими но информативными."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "max_tokens": 2048,
                    "temperature": 0.7,
                    "messages": [
                        {"role": "system", "content": "Ты создаёшь образовательные флешкарточки. Отвечай ТОЛЬКО JSON массивом."},
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # Parse JSON from response
                json_match = re.search(r'\[[\s\S]*\]', content)
                if json_match:
                    flashcards = json.loads(json_match.group())
                    valid_cards = []
                    for card in flashcards:
                        if isinstance(card, dict) and 'question' in card and 'answer' in card:
                            valid_cards.append({
                                "question": card['question'],
                                "answer": card['answer']
                            })
                    
                    if valid_cards:
                        # Save flashcard set to database
                        flashcard_set = {
                            'id': str(uuid.uuid4()),
                            'user_id': user_id,
                            'topic': topic,
                            'cards': valid_cards,
                            'created_at': datetime.now(timezone.utc).isoformat()
                        }
                        await db.flashcard_sets.insert_one(flashcard_set)
                        
                        cards_preview = "\n".join([f"• {c['question']}" for c in valid_cards[:3]])
                        
                        return {
                            "type": "flashcards_created",
                            "flashcards": valid_cards,
                            "set_id": flashcard_set['id'],
                            "topic": topic,
                            "count": len(valid_cards),
                            "message": f"🃏 Создано {len(valid_cards)} флешкарточек по теме **{topic}**!\n\nПримеры:\n{cards_preview}\n\n[Открыть карточки →]",
                            "link": "/flashcards"
                        }
    except Exception as e:
        logger.error(f"Flashcard generation error: {e}")
    
    # Fallback
    return {
        "type": "flashcards_redirect",
        "topic": topic,
        "message": f"🃏 Перейди на страницу Flashcards чтобы создать карточки по теме **{topic}**",
        "link": "/flashcards"
    }


async def action_create_study_plan(db, user_id: str, params: dict) -> dict:
    """Create a study plan with multiple tasks."""
    topic = params.get('topic', 'Изучение темы')
    duration_days = params.get('duration_days', 7)
    hours_per_day = params.get('hours_per_day', 2)
    
    # Generate study plan tasks
    plan_tasks = []
    today = datetime.now(timezone.utc).date()
    
    # Basic study plan structure
    phases = [
        {"name": f"Введение в {topic}", "day_offset": 0, "priority": "high"},
        {"name": f"Основные концепции {topic}", "day_offset": 1, "priority": "high"},
        {"name": f"Практика: {topic}", "day_offset": 2, "priority": "medium"},
        {"name": f"Углублённое изучение {topic}", "day_offset": 3, "priority": "medium"},
        {"name": f"Упражнения по {topic}", "day_offset": 4, "priority": "medium"},
        {"name": f"Повторение {topic}", "day_offset": 5, "priority": "low"},
        {"name": f"Тест: {topic}", "day_offset": 6, "priority": "high"},
    ]
    
    # Adjust phases based on duration
    if duration_days < 7:
        phases = phases[:duration_days]
    
    for phase in phases:
        task = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'title': phase['name'],
            'description': f"Часть плана изучения: {topic}. Примерное время: {hours_per_day} часа.",
            'course_id': None,
            'status': 'pending',
            'priority': phase['priority'],
            'difficulty': 'medium',
            'due_date': (today + timedelta(days=phase['day_offset'])).isoformat(),
            'estimated_minutes': int(hours_per_day * 60),
            'actual_minutes': None,
            'tags': ['study-plan', topic.lower().replace(' ', '-')],
            'dependencies': [],
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.tasks.insert_one(task)
        plan_tasks.append(task)
    
    task_list = "\n".join([f"📌 День {i+1}: {t['title']}" for i, t in enumerate(plan_tasks)])
    
    return {
        "type": "study_plan_created",
        "tasks": [{"id": t['id'], "title": t['title'], "due_date": t['due_date']} for t in plan_tasks],
        "topic": topic,
        "duration_days": len(plan_tasks),
        "message": f"📚 Создан план изучения **{topic}** на {len(plan_tasks)} дней!\n\n{task_list}",
        "link": "/tasks"
    }


def action_start_pomodoro(params: dict) -> dict:
    """Return instruction to start pomodoro."""
    duration = params.get('duration_minutes', 25)
    task = params.get('task_name', '')
    
    message = f"🍅 Время для Pomodoro!\n\n"
    if task:
        message += f"Задача: **{task}**\n"
    message += f"Длительность: **{duration} минут**\n\n"
    message += "Перейди на страницу Pomodoro чтобы начать таймер!"
    
    return {
        "type": "pomodoro_start",
        "duration": duration,
        "task": task,
        "message": message,
        "link": "/pomodoro"
    }


def action_get_motivation(params: dict) -> dict:
    """Return motivational message based on mood."""
    mood = params.get('mood', 'unmotivated')
    
    messages = {
        'tired': """💪 Понимаю, что ты устал. Вот что может помочь:

1. 🚶 Встань и пройдись 5 минут
2. 💧 Выпей воды
3. 🎯 Сделай одну маленькую задачу
4. 😴 Если совсем тяжело - отдохни 15-20 минут

**Помни: отдых — это часть продуктивности!**""",

        'stressed': """🌟 Стресс — это нормально. Давай справимся:

1. 🧘 Глубоко вдохни 3 раза
2. 📝 Запиши что тебя беспокоит
3. 🎯 Выбери ОДНУ задачу на сейчас
4. ⏱️ Поставь таймер на 25 минут

**Ты справишься! Один шаг за раз.**""",

        'unmotivated': """🚀 Мотивация приходит с действием! Попробуй:

1. 🎯 Начни с самой лёгкой задачи
2. ⏱️ Правило 2 минут: начни делать хоть что-то 2 минуты
3. 🎁 Назначь себе награду за выполнение
4. 👀 Представь себя через месяц - ты будешь благодарен!

**Даже маленький шаг — это прогресс!**""",

        'overwhelmed': """🌈 Слишком много всего? Давай разберёмся:

1. 📋 Запиши ВСЕ что нужно сделать
2. 🔢 Выбери 3 самых важных
3. 🎯 Сосредоточься ТОЛЬКО на первой задаче
4. 🚫 Остальное подождёт

**Ешь слона по кусочкам! Ты не должен делать всё сразу.**""",

        'procrastinating': """⚡ Прокрастинация — это нормально! Хак:

1. 🔟 Правило 10 секунд: досчитай до 10 и начни
2. 🍅 Поставь таймер на 5 минут — только 5!
3. 📱 Убери телефон в другую комнату
4. 🎮 Скажи себе: "Сначала дело, потом награда"

**Начни СЕЙЧАС. Будущий ты скажет спасибо!**"""
    }
    
    return {
        "type": "motivation",
        "mood": mood,
        "message": messages.get(mood, messages['unmotivated']),
        "link": None
    }

