import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { PageHeader } from '../../components/PageHeader';
import { useThemeStore } from '../../store/themeStore';
import { 
  Play, Pause, RotateCcw, Coffee, Flame, Volume2, VolumeX, 
  CheckCircle2, Settings, X, Save, Target, Trophy, Zap,
  Clock, SkipForward, Music
} from 'lucide-react';
import { toast } from 'sonner';

// Sound effects
const SOUNDS = {
  bell: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVKzn77BiFAo+meHwwHAjBSyAzPLaizsIGGS57OihUBELTqXh8LhjGgU2jdTyz4IyBiJsw+/mnFENEFSs5++wYhQKPpnh8MBwIwUsgMzy2os7CBhkuezoob0Q',
  chime: 'data:audio/wav;base64,UklGRl9vT19teleAbmV3QXVkaW8=',
  digital: 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
};

// Motivational messages
const FOCUS_MESSAGES = [
  '💪 Ты справишься!',
  '🎯 Фокус — ключ к успеху!',
  '🚀 Вперёд к цели!',
  '⚡ Мощная концентрация!',
  '🔥 Ничто не отвлечёт тебя!',
  '🧠 Максимальная продуктивность!',
];

const BREAK_MESSAGES = [
  '☕ Время для кофе!',
  '🌿 Расслабься и перезарядись!',
  '🧘 Глубокий вдох...',
  '🚶 Можно немного прогуляться!',
  '💧 Не забудь попить воды!',
  '👀 Отдохни глазам!',
];

export const PomodoroPage = () => {
  const queryClient = useQueryClient();
  const theme = useThemeStore((state) => state.theme);
  const [searchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');

  // Timer state
  const [selectedTaskId, setSelectedTaskId] = useState(taskIdFromUrl || null);
  const [timeLeft, setTimeLeft] = useState(50 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isLongBreak, setIsLongBreak] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [pomodorosUntilLongBreak, setPomodorosUntilLongBreak] = useState(4);
  const intervalRef = useRef(null);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [workMinutes, setWorkMinutes] = useState(50);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(10);
  const [longBreakMinutes, setLongBreakMinutes] = useState(30);
  const [longBreakAfter, setLongBreakAfter] = useState(4);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState('bell');
  const [autoStartBreak, setAutoStartBreak] = useState(true);
  const [autoStartWork, setAutoStartWork] = useState(false);

  // Motivational message
  const [motivationalMessage, setMotivationalMessage] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.getCurrentUser(),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  });

  const { data: todayData } = useQuery({
    queryKey: ['todayPomodoro'],
    queryFn: () => api.getTodayPomodoroCount(),
  });

  const savePomodoroMutation = useMutation({
    mutationFn: (data) => api.createPomodoroSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['todayPomodoro']);
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: ({ id, actualMinutes }) => api.completeTask(id, actualMinutes),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('🎉 Задача завершена!');
    },
  });

  // Load settings from user profile
  useEffect(() => {
    if (user) {
      setWorkMinutes(user.preferred_session_length || 50);
      setShortBreakMinutes(user.break_preference || 10);
    }
  }, [user]);

  // Initialize timer
  useEffect(() => {
    if (!isRunning) {
      const newTime = isLongBreak 
        ? longBreakMinutes * 60 
        : isBreak 
          ? shortBreakMinutes * 60 
          : workMinutes * 60;
      setTimeLeft(newTime);
    }
  }, [workMinutes, shortBreakMinutes, longBreakMinutes, isBreak, isLongBreak]);

  useEffect(() => {
    if (todayData?.count) {
      setCompletedSessions(todayData.count);
    }
  }, [todayData]);

  // Set random motivational message
  useEffect(() => {
    const messages = isBreak ? BREAK_MESSAGES : FOCUS_MESSAGES;
    setMotivationalMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, [isBreak, completedSessions]);

  const playSound = () => {
    if (soundEnabled) {
      try {
        const audio = new Audio(SOUNDS[selectedSound] || SOUNDS.bell);
        audio.play();
      } catch (e) {
        console.log('Audio playback failed');
      }
    }
  };

  const handleTimerComplete = () => {
    setIsRunning(false);
    playSound();

    if (!isBreak) {
      // Work session completed
      const newCompleted = completedSessions + 1;
      setCompletedSessions(newCompleted);
      
      savePomodoroMutation.mutate({
        duration_minutes: workMinutes,
        session_type: 'focus',
      });

      // Check if it's time for a long break
      if (newCompleted % longBreakAfter === 0) {
        toast.success('🏆 Отлично! Время для длинного перерыва!');
        setIsLongBreak(true);
        setIsBreak(true);
        setTimeLeft(longBreakMinutes * 60);
        setPomodorosUntilLongBreak(longBreakAfter);
      } else {
        toast.success('🎉 Сессия завершена! Короткий перерыв!');
        setIsBreak(true);
        setIsLongBreak(false);
        setTimeLeft(shortBreakMinutes * 60);
        setPomodorosUntilLongBreak(longBreakAfter - (newCompleted % longBreakAfter));
      }

      if (autoStartBreak) {
        setTimeout(() => setIsRunning(true), 1000);
      }
    } else {
      // Break completed
      toast.success('💪 Перерыв окончен! Готовы к новой сессии?');
      setIsBreak(false);
      setIsLongBreak(false);
      setTimeLeft(workMinutes * 60);

      if (autoStartWork) {
        setTimeout(() => setIsRunning(true), 1000);
      }
    }
  };

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setIsLongBreak(false);
    setTimeLeft(workMinutes * 60);
    setPomodorosUntilLongBreak(longBreakAfter - (completedSessions % longBreakAfter));
  };

  const skipToNext = () => {
    setIsRunning(false);
    if (isBreak) {
      setIsBreak(false);
      setIsLongBreak(false);
      setTimeLeft(workMinutes * 60);
    } else {
      setIsBreak(true);
      setTimeLeft(shortBreakMinutes * 60);
    }
  };

  const handleCompleteTask = () => {
    if (!selectedTaskId) return;
    completeTaskMutation.mutate({
      id: selectedTaskId,
      actualMinutes: completedSessions * workMinutes,
    });
    setSelectedTaskId(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTime = isLongBreak 
    ? longBreakMinutes * 60 
    : isBreak 
      ? shortBreakMinutes * 60 
      : workMinutes * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const selectedTask = tasks?.find(t => t.id === selectedTaskId);
  const pendingTasks = tasks?.filter(t => t.status === 'pending' || t.status === 'in_progress') || [];

  // Get theme-based colors
  const primaryColor = theme?.colors?.primary || '#8b5cf6';
  const breakColor = '#10b981';

  return (
    <div className="min-h-screen">
      <PageHeader 
        title="Фокус - Pomodoro Таймер" 
        subtitle="Оставайтесь сосредоточенными с таймированными сессиями обучения"
        icon={Flame}
        iconColor="#F97316"
      />
      
      {/* Action Bar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 px-4 py-2 rounded-full flex items-center gap-2">
              <Trophy className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-700">
                {completedSessions} сессий сегодня
              </span>
            </div>
            <div className="bg-violet-100 px-4 py-2 rounded-full flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold text-violet-700">
                {pomodorosUntilLongBreak} до длинного перерыва
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="border-2 border-gray-200"
              title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="border-2 border-gray-200"
            >
              <Settings className="w-4 h-4 mr-2" />
              Настройки
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                  <Settings className="w-6 h-6" style={{ color: primaryColor }} />
                  Настройки таймера
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Time Settings */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Время (минуты)
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Работа</label>
                    <select
                      value={workMinutes}
                      onChange={(e) => setWorkMinutes(Number(e.target.value))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                    >
                      {[15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Короткий</label>
                    <select
                      value={shortBreakMinutes}
                      onChange={(e) => setShortBreakMinutes(Number(e.target.value))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                    >
                      {[5, 10, 15, 20].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Длинный</label>
                    <select
                      value={longBreakMinutes}
                      onChange={(e) => setLongBreakMinutes(Number(e.target.value))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                    >
                      {[15, 20, 25, 30, 45, 60].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Long break interval */}
              <div>
                <label className="text-sm text-gray-600 block mb-1">
                  Длинный перерыв после (сессий)
                </label>
                <select
                  value={longBreakAfter}
                  onChange={(e) => setLongBreakAfter(Number(e.target.value))}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                >
                  {[2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Sound Settings */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Звук уведомления
                </h3>
                <select
                  value={selectedSound}
                  onChange={(e) => setSelectedSound(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                >
                  <option value="bell">🔔 Колокольчик</option>
                  <option value="chime">🎵 Перезвон</option>
                  <option value="digital">📱 Цифровой</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={playSound}
                  className="mt-2 border-2 border-gray-200"
                >
                  Тест звука
                </Button>
              </div>

              {/* Auto-start Settings */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Автозапуск
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoStartBreak}
                      onChange={(e) => setAutoStartBreak(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Автостарт перерыва</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoStartWork}
                      onChange={(e) => setAutoStartWork(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Автостарт работы</span>
                  </label>
                </div>
              </div>

              <Button
                onClick={() => {
                  setShowSettings(false);
                  resetTimer();
                  toast.success('Настройки сохранены!');
                }}
                className="w-full theme-btn-primary h-12"
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить и применить
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Timer */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Task Selection */}
        {!selectedTask && pendingTasks.length > 0 && (
          <Card className="border-2 bg-white mb-6 shadow-lg" style={{ borderColor: primaryColor }}>
            <CardHeader>
              <CardTitle className="text-gray-900">📝 Выберите задачу для работы</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTaskId || ''} onValueChange={setSelectedTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите задачу..." />
                </SelectTrigger>
                <SelectContent>
                  {pendingTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title} {task.priority === 'urgent' && '🔥'} {task.priority === 'high' && '⚡'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Current Task Info */}
        {selectedTask && (
          <Card className="border-2 border-green-300 bg-green-50 mb-6 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">🎯 Текущая задача:</h3>
                  <p className="text-lg text-gray-700">{selectedTask.title}</p>
                  {selectedTask.description && (
                    <p className="text-sm text-gray-600 mt-1">{selectedTask.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCompleteTask} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Завершить
                  </Button>
                  <Button onClick={() => setSelectedTaskId(null)} variant="outline" className="border-2 border-gray-300">
                    Отменить
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timer Card */}
        <Card className={`border-4 bg-white/95 backdrop-blur shadow-2xl transition-all duration-500 ${
          isRunning ? 'scale-[1.02]' : ''
        }`} style={{ borderColor: isBreak ? breakColor : primaryColor }}>
          <CardContent className="p-8 md:p-12">
            <div className="text-center">
              {/* Mode Badge */}
              <div className="mb-6">
                <span 
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold border-2"
                  style={{ 
                    backgroundColor: isBreak ? '#d1fae5' : theme?.colors?.primaryLight || '#ede9fe',
                    color: isBreak ? '#065f46' : theme?.colors?.primary || '#5b21b6',
                    borderColor: isBreak ? breakColor : primaryColor
                  }}
                >
                  {isLongBreak ? <Coffee className="w-5 h-5" /> : isBreak ? <Coffee className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
                  {isLongBreak ? 'Длинный перерыв' : isBreak ? 'Короткий перерыв' : 'Сессия фокуса'}
                </span>
              </div>

              {/* Motivational Message */}
              <div className="mb-4 text-lg font-medium text-gray-600 animate-pulse">
                {motivationalMessage}
              </div>

              {/* Circular Timer */}
              <div className="relative inline-flex items-center justify-center mb-8">
                <svg className="w-72 h-72 md:w-80 md:h-80 transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    stroke={isBreak ? breakColor : primaryColor}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 140}`}
                    strokeDashoffset={`${2 * Math.PI * 140 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div 
                      className={`text-6xl md:text-7xl font-bold font-mono transition-colors ${
                        timeLeft <= 60 && isRunning ? 'text-red-500 animate-pulse' : 'text-gray-900'
                      }`}
                    >
                      {formatTime(timeLeft)}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      {isBreak ? 'Расслабьтесь' : 'Сосредоточьтесь'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pomodoro Progress Dots */}
              <div className="flex justify-center gap-2 mb-8">
                {[...Array(longBreakAfter)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all ${
                      i < (completedSessions % longBreakAfter)
                        ? 'scale-110'
                        : 'bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: i < (completedSessions % longBreakAfter) ? primaryColor : undefined
                    }}
                  />
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={toggleTimer}
                  size="lg"
                  className={`h-16 px-10 text-lg font-bold rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 ${
                    isRunning
                      ? 'bg-red-500 hover:bg-red-600'
                      : ''
                  }`}
                  style={!isRunning ? { backgroundColor: primaryColor } : undefined}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-6 h-6 mr-2" />
                      Пауза
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6 mr-2" />
                      Старт
                    </>
                  )}
                </Button>
                <Button
                  onClick={skipToNext}
                  size="lg"
                  variant="outline"
                  className="h-16 px-6 text-lg font-semibold border-2 border-gray-300 rounded-2xl hover:bg-gray-100"
                  title={isBreak ? 'Пропустить перерыв' : 'Начать перерыв'}
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
                <Button
                  onClick={resetTimer}
                  size="lg"
                  variant="outline"
                  className="h-16 px-6 text-lg font-semibold border-2 border-gray-300 rounded-2xl hover:bg-gray-100"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>

              {/* Timer Info */}
              <div className="mt-6 text-sm text-gray-500">
                {workMinutes} мин работа • {shortBreakMinutes} мин короткий • {longBreakMinutes} мин длинный
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="border-2 border-gray-200 bg-white">
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2" style={{ color: primaryColor }} />
              <div className="text-2xl font-bold" style={{ color: primaryColor }}>{completedSessions}</div>
              <div className="text-xs text-gray-600">Сессий сегодня</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-gray-200 bg-white">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{completedSessions * workMinutes}</div>
              <div className="text-xs text-gray-600">Минут фокуса</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-gray-200 bg-white">
            <CardContent className="p-4 text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-orange-600">
                {Math.floor((completedSessions * workMinutes) / 60)}ч {(completedSessions * workMinutes) % 60}м
              </div>
              <div className="text-xs text-gray-600">Всего времени</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-gray-200 bg-white">
            <CardContent className="p-4 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">{pomodorosUntilLongBreak}</div>
              <div className="text-xs text-gray-600">До длинного</div>
            </CardContent>
          </Card>
        </div>

        {/* Tips */}
        <Card className="border-2 border-gray-200 bg-white/80 mt-6">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">💡 Советы Pomodoro</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Работайте {workMinutes} минут без отвлечений
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Короткий перерыв {shortBreakMinutes} мин после каждой сессии
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Длинный перерыв {longBreakMinutes} мин после {longBreakAfter} сессий
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Отключайте уведомления во время фокуса
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Используйте перерывы для растяжки
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Пейте воду регулярно
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
