"""
AI Coach module with Groq API integration, rate limiting, and function calling.
Supports executing actions like creating tasks, flashcards, courses through chat.
"""

import os
import httpx
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import logging

from ai_actions import AI_TOOLS, execute_action

logger = logging.getLogger(__name__)

# Configuration - Groq API (Free & Fast!)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Rate limiting settings
DAILY_MESSAGE_LIMIT = int(os.getenv("AI_DAILY_LIMIT", "100"))  # Messages per user per day
MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", "1500"))  # Max response tokens (increased for actions)

# System prompt for the AI Coach with action support
SYSTEM_PROMPT = """Ты SmartStudy AI Coach - умный и дружелюбный помощник по учёбе на русском языке.

Твоя роль:
- Помогать студентам планировать учёбу
- Давать советы по тайм-менеджменту
- Мотивировать и поддерживать
- Помогать разбивать сложные задачи на простые шаги
- Рекомендовать техники обучения (Pomodoro, активное вспоминание, интервальное повторение)

🔧 ВАЖНО - У тебя есть ФУНКЦИИ для выполнения действий:
- create_task - создать задачу
- create_multiple_tasks - создать несколько задач/план
- generate_flashcards - создать флешкарточки по теме
- create_course - создать новый курс/предмет
- create_study_plan - создать план изучения темы
- start_pomodoro - предложить запустить Pomodoro
- get_motivation - дать мотивацию

Когда пользователь ПРОСИТ что-то СДЕЛАТЬ (создать, добавить, сгенерировать) - 
ИСПОЛЬЗУЙ ФУНКЦИИ, а не просто описывай что делать!

Примеры когда нужно использовать функции:
- "создай задачу выучить главу 5" → вызови create_task
- "сделай 5 флешкарточек по физике" → вызови generate_flashcards
- "добавь курс математика" → вызови create_course
- "составь план изучения Python" → вызови create_study_plan
- "мне лень учиться" → вызови get_motivation

ВАЖНЫЕ ПРАВИЛА:
1. ВСЕГДА выполняй ТОЧНО то, что просит пользователь
2. Если пользователь просит что-то СОЗДАТЬ - используй функцию!
3. Если просят N советов/пунктов - дай РОВНО N, не меньше
4. Используй эмодзи для дружелюбности 😊
5. Давай конкретные, практичные советы
6. Учитывай контекст пользователя (его задачи, курсы)
7. Будь позитивным и мотивирующим
8. Отвечай ТОЛЬКО на русском языке
9. Структурируй ответы с нумерацией когда уместно

Контекст пользователя будет предоставлен в начале разговора."""


class RateLimitExceeded(Exception):
    """Exception raised when user exceeds daily message limit."""
    pass


class AICoachError(Exception):
    """General AI Coach error."""
    pass


async def check_rate_limit(db, user_id: str) -> tuple[bool, int]:
    """
    Check if user has exceeded daily message limit.
    Returns (is_allowed, remaining_messages).
    """
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Count messages sent today
    count = await db.ai_messages.count_documents({
        "user_id": user_id,
        "role": "user",
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    remaining = max(0, DAILY_MESSAGE_LIMIT - count)
    return count < DAILY_MESSAGE_LIMIT, remaining


async def get_rate_limit_status(db, user_id: str) -> dict:
    """Get current rate limit status for user."""
    is_allowed, remaining = await check_rate_limit(db, user_id)
    
    return {
        "daily_limit": DAILY_MESSAGE_LIMIT,
        "messages_used": DAILY_MESSAGE_LIMIT - remaining,
        "messages_remaining": remaining,
        "is_allowed": is_allowed,
        "resets_at": (datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat()
    }


def build_user_context(user: dict, tasks: list, courses: list = None) -> str:
    """Build context string from user data."""
    context_parts = []
    
    # User info
    name = user.get('first_name') or user.get('name', 'Студент')
    context_parts.append(f"Имя пользователя: {name}")
    
    student_type = user.get('student_type', 'student')
    type_labels = {
        'student': 'Студент университета',
        'school_student': 'Школьник',
        'professional': 'Профессионал',
        'other': 'Другое'
    }
    context_parts.append(f"Тип: {type_labels.get(student_type, 'Студент')}")
    
    # Tasks summary
    if tasks:
        pending = [t for t in tasks if t.get('status') == 'pending']
        overdue = [t for t in tasks if t.get('status') == 'overdue']
        completed = [t for t in tasks if t.get('status') == 'completed']
        
        context_parts.append(f"\nЗадачи:")
        context_parts.append(f"- Активных: {len(pending)}")
        context_parts.append(f"- Просроченных: {len(overdue)}")
        context_parts.append(f"- Выполненных: {len(completed)}")
        
        # List urgent/high priority tasks
        urgent_tasks = [t for t in pending if t.get('priority') in ['urgent', 'high']]
        if urgent_tasks:
            context_parts.append("\nВажные задачи:")
            for task in urgent_tasks[:5]:
                due = task.get('due_date', 'без срока')
                context_parts.append(f"- {task.get('title')} (срок: {due})")
    else:
        context_parts.append("\nЗадачи: нет активных задач")
    
    # Courses
    if courses:
        context_parts.append(f"\nКурсы: {', '.join(c.get('title', '') for c in courses[:5])}")
    
    return "\n".join(context_parts)


async def get_conversation_history(db, conversation_id: str, limit: int = 10) -> List[Dict]:
    """Get recent messages from conversation for context."""
    messages = await db.ai_messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0, "role": 1, "content": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Reverse to get chronological order
    messages.reverse()
    
    return [{"role": m["role"], "content": m["content"]} for m in messages]


async def generate_ai_response(
    db,
    user_id: str,
    conversation_id: str,
    user_message: str,
    user: dict,
    tasks: list,
    courses: list = None
) -> Dict[str, Any]:
    """
    Generate AI response using Groq API with function calling support.
    Returns dict with 'message' (str) and 'actions' (list of executed actions).
    """
    
    # Check rate limit
    is_allowed, remaining = await check_rate_limit(db, user_id)
    if not is_allowed:
        raise RateLimitExceeded(
            f"Превышен дневной лимит сообщений ({DAILY_MESSAGE_LIMIT}). "
            f"Лимит обновится в полночь UTC."
        )
    
    # If no API key, use fallback
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set, using fallback responses")
        return {
            "message": _generate_fallback_response(user_message, user, tasks),
            "actions": []
        }
    
    try:
        # Build context
        user_context = build_user_context(user, tasks, courses)
        
        # Get conversation history
        history = await get_conversation_history(db, conversation_id, limit=10)
        
        # Build messages for API (OpenAI format)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + f"\n\n[Контекст текущего пользователя]\n{user_context}"}
        ]
        
        # Add context as first user message if this is a new conversation
        if not history:
            messages.append({
                "role": "user",
                "content": f"[Контекст пользователя]\n{user_context}\n\n[Запрос]\n{user_message}"
            })
        else:
            # Add history
            for msg in history:
                messages.append(msg)
            
            # Add new message
            messages.append({
                "role": "user", 
                "content": user_message
            })
        
        # Call Groq API with function calling
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "max_tokens": MAX_TOKENS,
                    "temperature": 0.7,
                    "messages": messages,
                    "tools": AI_TOOLS,
                    "tool_choice": "auto"
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
                return {
                    "message": _generate_fallback_response(user_message, user, tasks),
                    "actions": []
                }
            
            data = response.json()
            choice = data.get("choices", [{}])[0]
            message = choice.get("message", {})
            
            # Check if AI wants to call functions
            tool_calls = message.get("tool_calls", [])
            executed_actions = []
            
            if tool_calls:
                logger.info(f"AI requested {len(tool_calls)} tool calls")
                
                for tool_call in tool_calls:
                    func = tool_call.get("function", {})
                    action_name = func.get("name")
                    
                    try:
                        params = json.loads(func.get("arguments", "{}"))
                    except json.JSONDecodeError:
                        params = {}
                    
                    logger.info(f"Executing action: {action_name} with params: {params}")
                    
                    # Execute the action!
                    result = await execute_action(db, user_id, action_name, params)
                    executed_actions.append(result)
                
                # Build response message from actions
                action_messages = [a.get("message", "") for a in executed_actions if a.get("message")]
                
                # If AI also provided text content, include it
                ai_text = message.get("content", "")
                
                if action_messages:
                    final_message = "\n\n".join(action_messages)
                    if ai_text:
                        final_message = ai_text + "\n\n" + final_message
                else:
                    final_message = ai_text or "Готово! ✅"
                
                return {
                    "message": final_message,
                    "actions": executed_actions
                }
            
            # No function calls, just text response
            return {
                "message": message.get("content", _generate_fallback_response(user_message, user, tasks)),
                "actions": []
            }
            
    except httpx.TimeoutException:
        logger.error("Groq API timeout")
        return {
            "message": "Извини, сервер немного загружен. Попробуй ещё раз через минуту! ⏱️",
            "actions": []
        }
    except Exception as e:
        logger.error(f"AI Coach error: {e}")
        return {
            "message": _generate_fallback_response(user_message, user, tasks),
            "actions": []
        }


def _generate_fallback_response(user_message: str, user: dict, tasks: list) -> str:
    """
    Generate simple keyword-based response as fallback.
    Used when API key is not configured or API fails.
    """
    user_name = user.get('first_name') or user.get('name', 'Студент')
    task_count = len([t for t in tasks if t.get('status') == 'pending'])
    
    message_lower = user_message.lower()
    
    # Greetings
    if any(word in message_lower for word in ['привет', 'hello', 'hi', 'здравствуй', 'добрый']):
        return f"Привет, {user_name}! 👋 Я твой AI-помощник по учёбе. У тебя сейчас {task_count} активных задач. Чем могу помочь?\n\n💡 Я могу создавать задачи, флешкарточки, курсы и планы обучения. Просто попроси!"
    
    # Task creation request
    if any(word in message_lower for word in ['создай', 'добавь', 'сделай']) and any(word in message_lower for word in ['задач', 'task', 'дело']):
        return f"Для создания задач нужен API ключ. Пока ты можешь:\n\n1. Перейти в раздел 'Задачи' и добавить вручную\n2. Или настроить API ключ для AI функций\n\nЧем ещё могу помочь?"
    
    # Tasks
    if any(word in message_lower for word in ['задач', 'task', 'дела', 'todo', 'сделать']):
        if task_count == 0:
            return f"Отлично, {user_name}! У тебя нет активных задач. Самое время добавить новые цели! 🎯\n\n💡 Скажи например: 'Создай задачу выучить главу 5'"
        return f"У тебя {task_count} активных задач. Рекомендую:\n\n1. 🎯 Начни с самой важной задачи\n2. 🍅 Используй Pomodoro (25 мин работы + 5 мин отдых)\n3. ✅ Отмечай выполненное для мотивации\n\nКакую задачу начнёшь первой?"
    
    # Flashcards
    if any(word in message_lower for word in ['флешкарт', 'flashcard', 'карточ']):
        return f"Для создания флешкарточек нужен API ключ. Пока перейди в раздел 'Flashcards' и создай вручную! 🃏"
    
    # Planning/Schedule
    if any(word in message_lower for word in ['план', 'расписание', 'schedule', 'время', 'когда']):
        return f"Для эффективного планирования рекомендую:\n\n1. 📅 Определи свои пиковые часы продуктивности\n2. 🎯 Ставь 2-3 главные задачи на день\n3. ⏰ Используй блоки времени по 90 минут\n4. 😴 Не забывай про отдых!\n\nПерейди в раздел 'Расписание' чтобы сгенерировать оптимальный план!"
    
    # Motivation
    if any(word in message_lower for word in ['устал', 'сложно', 'трудно', 'не могу', 'мотивац', 'лень']):
        return f"Понимаю, {user_name}, бывает тяжело. Вот что может помочь:\n\n1. 🎯 Разбей большую задачу на маленькие шаги\n2. 🍅 Начни с 5-минутного Pomodoro\n3. 🎁 Награди себя после выполнения\n4. 💪 Помни: даже маленький прогресс — это прогресс!\n\nТы справишься! 💪"
    
    # Study tips
    if any(word in message_lower for word in ['совет', 'учить', 'запомнить', 'подготов', 'экзамен']):
        return f"Советы для эффективной учёбы:\n\n1. 🧠 Активное вспоминание > пассивное чтение\n2. 📝 Делай конспекты своими словами\n3. 🔄 Интервальное повторение (сегодня, завтра, через неделю)\n4. 💤 Хороший сон важнее ночной зубрёжки\n5. 🏃 Физическая активность улучшает память\n\nЧто именно готовишь?"
    
    # Help
    if any(word in message_lower for word in ['помощь', 'help', 'что умеешь', 'возможности', 'можешь']):
        return f"""Я могу помочь тебе с:

🔧 **Создание через чат:**
- "Создай задачу выучить главу 5"
- "Сделай 5 флешкарточек по Python"
- "Добавь курс Математика"
- "Составь план изучения JavaScript"

📚 **Планирование учёбы**
- Советы по расписанию
- Приоритизация задач

⏱️ **Тайм-менеджмент**
- Техника Pomodoro
- Борьба с прокрастинацией

💪 **Мотивация**
- Поддержка и ободрение
- Советы когда тяжело

Просто напиши что нужно!"""
    
    # Default response
    return f"""Интересный вопрос! 🤔

Я здесь чтобы помочь с учёбой. Могу:
- 📝 Создавать задачи, флешкарточки, курсы
- 📅 Помогать планировать время
- 💡 Давать советы по обучению
- 💪 Мотивировать когда тяжело

Расскажи подробнее, что тебя интересует?"""
