import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { PageHeader } from '../../components/PageHeader';
import { Play, Pause, RotateCcw, Coffee, Flame, Volume2, VolumeX, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const PomodoroPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');

  const [selectedTaskId, setSelectedTaskId] = useState(taskIdFromUrl || null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef(null);

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

  // Initialize timer with user settings
  useEffect(() => {
    if (user && !isRunning) {
      const workMinutes = user.pomodoro_work_minutes || 25;
      const breakMinutes = user.pomodoro_break_minutes || 5;
      const newTime = isBreak ? breakMinutes * 60 : workMinutes * 60;
      if (timeLeft !== newTime) {
        setTimeLeft(newTime);
      }
    }
  }, [user]);

  useEffect(() => {
    if (todayData?.count) {
      setCompletedSessions(todayData.count);
    }
  }, [todayData]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    if (soundEnabled) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVKzn77BiFAo+meHwwHAjBSyAzPLaizsIGGS57OihUBELTqXh8LhjGgU2jdTyz4IyBiJsw+/mnFENEFSs5++wYhQKPpnh8MBwIwUsgMzy2os7CBhkuezoob0Q');
      audio.play();
    }

    if (!isBreak) {
      setCompletedSessions((prev) => prev + 1);
      // Save to backend
      const workMinutes = user?.pomodoro_work_minutes || 25;
      savePomodoroMutation.mutate({
        duration_minutes: workMinutes,
        session_type: 'focus',
      });
      toast.success('🎉 Сессия Pomodoro завершена! Возьмите перерыв!');
      setIsBreak(true);
      const breakMinutes = user?.pomodoro_break_minutes || 5;
      setTimeLeft(breakMinutes * 60);
    } else {
      toast.success('☕ Перерыв окончен! Готовы к новой сессии?');
      setIsBreak(false);
      const workMinutes = user?.pomodoro_work_minutes || 25;
      setTimeLeft(workMinutes * 60);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, timeLeft]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    const workMinutes = user?.pomodoro_work_minutes || 25;
    setTimeLeft(workMinutes * 60);
  };

  const handleCompleteTask = () => {
    if (!selectedTaskId) return;
    const workMinutes = user?.pomodoro_work_minutes || 25;
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

  const workMinutes = user?.pomodoro_work_minutes || 25;
  const breakMinutes = user?.pomodoro_break_minutes || 5;
  const progress = isBreak 
    ? ((breakMinutes * 60 - timeLeft) / (breakMinutes * 60)) * 100
    : ((workMinutes * 60 - timeLeft) / (workMinutes * 60)) * 100;

  const selectedTask = tasks?.find(t => t.id === selectedTaskId);
  const pendingTasks = tasks?.filter(t => t.status === 'pending') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      <PageHeader 
        title="Фокус - Pomodoro Таймер" 
        subtitle="Оставайтесь сосредоточенными с таймированными сессиями обучения"
        icon={Flame}
        iconColor="#F97316"
      />
      
      {/* Action Bar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-end items-center gap-3">
          <div className="bg-violet-100 px-4 py-2 rounded-full">
            <span className="text-sm font-semibold text-violet-700">
              🔥 {completedSessions} сессий сегодня
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="border-2 border-gray-200"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Timer */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Task Selection */}
        {!selectedTask && pendingTasks.length > 0 && (
          <Card className="border-2 border-violet-300 bg-white mb-6 shadow-lg">
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
                  <Button
                    onClick={handleCompleteTask}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Завершить
                  </Button>
                  <Button
                    onClick={() => setSelectedTaskId(null)}
                    variant="outline"
                    className="border-2 border-gray-300"
                  >
                    Отменить
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-2 border-gray-200 bg-white/90 backdrop-blur shadow-2xl">
          <CardContent className="p-12">
            <div className="text-center">
              {/* Mode Badge */}
              <div className="mb-8">
                <span className={`inline-flex items-center gap-2 px-6 py-2 rounded-full text-sm font-semibold ${
                  isBreak 
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : 'bg-violet-100 text-violet-700 border-2 border-violet-300'
                }`}>
                  {isBreak ? <Coffee className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
                  {isBreak ? 'Время перерыва' : 'Сессия фокуса'}
                </span>
              </div>

              {/* Circular Timer */}
              <div className="relative inline-flex items-center justify-center mb-8">
                <svg className="w-80 h-80 transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="160"
                    cy="160"
                    r="140"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="160"
                    cy="160"
                    r="140"
                    stroke={isBreak ? '#10b981' : '#8b5cf6'}
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
                    <div className="text-7xl font-bold font-mono text-gray-900">
                      {formatTime(timeLeft)}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      {isBreak ? 'Расслабьтесь и перезарядитесь' : 'Оставайтесь сосредоточенными!'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {workMinutes} мин работа / {breakMinutes} мин перерыв
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={toggleTimer}
                  size="lg"
                  className={`h-16 px-8 text-lg font-semibold rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 ${
                    isRunning
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-violet-600 hover:bg-violet-700'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-5 h-5 mr-2" />
                      Пауза
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Старт
                    </>
                  )}
                </Button>
                <Button
                  onClick={resetTimer}
                  size="lg"
                  variant="outline"
                  className="h-16 px-8 text-lg font-semibold border-2 border-gray-300 rounded-2xl hover:bg-gray-100"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Сброс
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <Card className="border-2 border-gray-200 bg-white">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-violet-600">{completedSessions}</div>
              <div className="text-sm text-gray-600 mt-1">Сессий сегодня</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-gray-200 bg-white">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600">{completedSessions * workMinutes}</div>
              <div className="text-sm text-gray-600 mt-1">Минут сосредоточения</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-gray-200 bg-white">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-600">
                {Math.floor((completedSessions * workMinutes) / 60)}ч {(completedSessions * workMinutes) % 60}м
              </div>
              <div className="text-sm text-gray-600 mt-1">Всего времени</div>
            </CardContent>
          </Card>
        </div>

        {/* Tips */}
        <Card className="border-2 border-gray-200 bg-white/80 mt-6">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">💡 Советы Pomodoro</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✓ Работайте {workMinutes} минут без отвлечений</li>
              <li>✓ Берите {breakMinutes}-минутный перерыв после каждой сессии</li>
              <li>✓ После 4 сессий делайте более длинный перерыв (15-30 минут)</li>
              <li>✓ Отключайте уведомления во время сессии фокуса</li>
              <li>✓ Используйте перерывы для растяжки, воды или прогулки</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};