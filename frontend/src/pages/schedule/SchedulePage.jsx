import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { PageHeader } from '../../components/PageHeader';
import { 
  Calendar, Clock, Sparkles, RefreshCw, CheckCircle2, 
  Settings, Plus, Trash2, Save, X, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { useThemeStore } from '../../store/themeStore';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Пн', fullLabel: 'Понедельник' },
  { key: 'tuesday', label: 'Вт', fullLabel: 'Вторник' },
  { key: 'wednesday', label: 'Ср', fullLabel: 'Среда' },
  { key: 'thursday', label: 'Чт', fullLabel: 'Четверг' },
  { key: 'friday', label: 'Пт', fullLabel: 'Пятница' },
  { key: 'saturday', label: 'Сб', fullLabel: 'Суббота' },
  { key: 'sunday', label: 'Вс', fullLabel: 'Воскресенье' },
];

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00', '23:00'
];

export const SchedulePage = () => {
  const queryClient = useQueryClient();
  const theme = useThemeStore((state) => state.theme);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAvailabilitySettings, setShowAvailabilitySettings] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState({});
  const [newRule, setNewRule] = useState({ day: 'monday', start: '18:00', end: '21:00' });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['weeklySchedule', selectedDate],
    queryFn: () => api.getWeeklySchedule(selectedDate),
  });

  const { data: availabilityRules, isLoading: isLoadingRules } = useQuery({
    queryKey: ['availabilityRules'],
    queryFn: () => api.getAvailabilityRules(),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  });

  const generateScheduleMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      return api.generateSchedule({
        start_date: now.toISOString(),
        end_date: twoWeeksLater.toISOString(),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['weeklySchedule']);
      toast.success(data.message || 'Расписание успешно создано!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || error.response?.data?.detail;
      if (message?.includes('availability')) {
        setShowAvailabilitySettings(true);
        toast.error('Сначала укажите ваше свободное время');
      } else {
        toast.error(message || 'Ошибка создания расписания');
      }
    },
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: (rules) => api.setAvailabilityRulesBatch(rules),
    onSuccess: () => {
      queryClient.invalidateQueries(['availabilityRules']);
      toast.success('Время доступности сохранено!');
      setShowAvailabilitySettings(false);
    },
    onError: () => {
      toast.error('Ошибка сохранения');
    },
  });

  const handleGenerateSchedule = async () => {
    if (!availabilityRules || availabilityRules.length === 0) {
      setShowAvailabilitySettings(true);
      toast.error('Сначала укажите ваше свободное время');
      return;
    }
    
    setIsGenerating(true);
    try {
      await generateScheduleMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAvailability = () => {
    const rules = Object.entries(editingAvailability)
      .filter(([_, slots]) => slots && slots.length > 0)
      .flatMap(([day, slots]) => 
        slots.map(slot => ({
          day_of_week: day,
          start_time: slot.start,
          end_time: slot.end
        }))
      );
    
    saveAvailabilityMutation.mutate(rules);
  };

  const handleAddTimeSlot = (day) => {
    setEditingAvailability(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: '18:00', end: '21:00' }]
    }));
  };

  const handleRemoveTimeSlot = (day, index) => {
    setEditingAvailability(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }));
  };

  const handleUpdateTimeSlot = (day, index, field, value) => {
    setEditingAvailability(prev => ({
      ...prev,
      [day]: prev[day].map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const initEditingAvailability = () => {
    const grouped = {};
    DAYS_OF_WEEK.forEach(d => grouped[d.key] = []);
    
    (availabilityRules || []).forEach(rule => {
      if (!grouped[rule.day_of_week]) grouped[rule.day_of_week] = [];
      grouped[rule.day_of_week].push({
        start: rule.start_time,
        end: rule.end_time
      });
    });
    
    setEditingAvailability(grouped);
  };

  const getWeekDates = () => {
    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      dates.push(day);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const getSessionsForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return sessions?.filter(session => {
      const sessionDate = new Date(session.start_time).toISOString().split('T')[0];
      return sessionDate === dateStr;
    }) || [];
  };

  const getTaskById = (taskId) => {
    return tasks?.find(t => t.id === taskId);
  };

  const getStatusColor = (status) => {
    const colors = {
      planned: 'bg-blue-100 text-blue-700 border-blue-300',
      completed: 'bg-green-100 text-green-700 border-green-300',
      in_progress: 'bg-orange-100 text-orange-700 border-orange-300',
      skipped: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return colors[status] || colors.planned;
  };

  const pendingTasks = tasks?.filter(t => t.status === 'pending' || t.status === 'in_progress') || [];

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;

  return (
    <div className="min-h-screen">
      <PageHeader 
        title="Расписание занятий" 
        subtitle="Оптимизированный план обучения"
        icon={Calendar}
        iconColor={theme?.colors?.primary}
      />

      {/* Action Bar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{pendingTasks.length}</span> задач ожидают планирования
            </div>
            {availabilityRules && availabilityRules.length > 0 && (
              <div className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Время доступности настроено
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                initEditingAvailability();
                setShowAvailabilitySettings(true);
              }}
              variant="outline"
              className="h-12 px-6 rounded-xl border-2 border-gray-200"
            >
              <Settings className="w-4 h-4 mr-2" />
              Настроить время
            </Button>
            <Button
              onClick={handleGenerateSchedule}
              disabled={isGenerating || pendingTasks.length === 0}
              className="theme-btn-primary h-12 px-6 rounded-xl"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? 'Создаём...' : 'Создать расписание'}
            </Button>
            <Button
              onClick={() => queryClient.invalidateQueries(['weeklySchedule'])}
              variant="outline"
              className="h-12 px-6 rounded-xl border-2 border-gray-200"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Availability Settings Modal */}
      {showAvailabilitySettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto bg-white">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                  <Clock className="w-6 h-6" style={{ color: theme?.colors?.primary }} />
                  Настройка времени для учёбы
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAvailabilitySettings(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Укажите когда вы свободны для занятий. Расписание будет создано на основе этих данных.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.key} className="border-2 border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-gray-900">{day.fullLabel}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddTimeSlot(day.key)}
                        className="border-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Добавить время
                      </Button>
                    </div>
                    
                    {(!editingAvailability[day.key] || editingAvailability[day.key].length === 0) ? (
                      <div className="text-sm text-gray-400 italic">Нет запланированного времени</div>
                    ) : (
                      <div className="space-y-2">
                        {editingAvailability[day.key].map((slot, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-gray-50 p-2 rounded">
                            <select
                              value={slot.start}
                              onChange={(e) => handleUpdateTimeSlot(day.key, idx, 'start', e.target.value)}
                              className="border-2 border-gray-200 rounded px-3 py-2 text-sm"
                            >
                              {TIME_SLOTS.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            <span className="text-gray-500">—</span>
                            <select
                              value={slot.end}
                              onChange={(e) => handleUpdateTimeSlot(day.key, idx, 'end', e.target.value)}
                              className="border-2 border-gray-200 rounded px-3 py-2 text-sm"
                            >
                              {TIME_SLOTS.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveTimeSlot(day.key, idx)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowAvailabilitySettings(false)}
                  className="border-2 border-gray-200"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSaveAvailability}
                  disabled={saveAvailabilityMutation.isPending}
                  className="theme-btn-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveAvailabilityMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Week Calendar */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Card className="border-2 border-gray-200 bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-2xl text-gray-900 flex items-center gap-2">
                <Calendar className="w-6 h-6" style={{ color: theme?.colors?.primary }} />
                Неделя {weekDates[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const prev = new Date(selectedDate);
                    prev.setDate(prev.getDate() - 7);
                    setSelectedDate(prev.toISOString().split('T')[0]);
                  }}
                  className="border-2 border-gray-200"
                >
                  ← Пред. неделя
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="border-2 border-gray-200"
                >
                  Сегодня
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = new Date(selectedDate);
                    next.setDate(next.getDate() + 7);
                    setSelectedDate(next.toISOString().split('T')[0]);
                  }}
                  className="border-2 border-gray-200"
                >
                  След. неделя →
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(!sessions || sessions.length === 0) ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Расписание не создано</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {(!availabilityRules || availabilityRules.length === 0) 
                    ? 'Сначала настройте ваше свободное время, затем создайте расписание'
                    : 'Создайте оптимизированное расписание на основе ваших задач и свободного времени'
                  }
                </p>
                {(!availabilityRules || availabilityRules.length === 0) ? (
                  <Button 
                    onClick={() => {
                      initEditingAvailability();
                      setShowAvailabilitySettings(true);
                    }}
                    className="theme-btn-primary"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Настроить время
                  </Button>
                ) : (
                  <Button onClick={handleGenerateSchedule} className="theme-btn-primary">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Создать расписание
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-4">
                {weekDates.map((date, dayIdx) => {
                  const daySessions = getSessionsForDay(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={date.toISOString()}
                      className={`border-2 rounded-lg p-3 min-h-[200px] ${
                        isToday 
                          ? 'border-2 bg-opacity-10' 
                          : 'border-gray-200 bg-white'
                      }`}
                      style={isToday ? { 
                        borderColor: theme?.colors?.primary,
                        backgroundColor: theme?.colors?.primaryLight 
                      } : {}}
                    >
                      <div className="text-center mb-3">
                        <div className="text-sm font-semibold text-gray-600">
                          {DAYS_OF_WEEK[dayIdx]?.label}
                        </div>
                        <div 
                          className={`text-2xl font-bold ${isToday ? '' : 'text-gray-900'}`}
                          style={isToday ? { color: theme?.colors?.primary } : {}}
                        >
                          {date.getDate()}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {daySessions.length === 0 ? (
                          <div className="text-xs text-gray-400 text-center py-4">Нет сессий</div>
                        ) : (
                          daySessions.map((session, idx) => {
                            const task = getTaskById(session.task_id);
                            return (
                              <div
                                key={idx}
                                className={`text-xs p-2 rounded border ${getStatusColor(session.status)}`}
                              >
                                <div className="font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(session.start_time).toLocaleTimeString('ru-RU', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                                {task && (
                                  <div className="mt-1 truncate" title={task.title}>
                                    {task.title}
                                  </div>
                                )}
                                <div className="mt-1 text-xs opacity-75">{session.planned_minutes} мин</div>
                                {session.status === 'completed' && (
                                  <CheckCircle2 className="w-3 h-3 mt-1 text-green-600" />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <Card className="border-2 border-gray-200 bg-white mt-6">
            <CardHeader>
              <CardTitle className="font-heading text-xl text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5" style={{ color: theme?.colors?.primary }} />
                Задачи для планирования ({pendingTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingTasks.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                  >
                    <div className="font-semibold text-gray-900 truncate">{task.title}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {task.estimated_minutes ? `${task.estimated_minutes} мин` : 'Время не указано'}
                    </div>
                    {task.due_date && (
                      <div className="text-xs text-gray-500 mt-2">
                        Дедлайн: {new Date(task.due_date).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {pendingTasks.length > 6 && (
                <div className="text-center mt-4 text-sm text-gray-500">
                  И ещё {pendingTasks.length - 6} задач...
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Session Details */}
        {sessions && sessions.length > 0 && (
          <Card className="border-2 border-gray-200 bg-white mt-6">
            <CardHeader>
              <CardTitle className="font-heading text-xl text-gray-900">Детали сессий</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.slice(0, 10).map((session, idx) => {
                  const task = getTaskById(session.task_id);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">
                          {task?.title || 'Учебная сессия'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {new Date(session.start_time).toLocaleDateString('ru-RU', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'short',
                          })}
                          {' • '}
                          {new Date(session.start_time).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' - '}
                          {new Date(session.end_time).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">{session.planned_minutes} мин</div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(session.status)}`}>
                          {session.status === 'planned' ? 'Запланировано' : 
                           session.status === 'completed' ? 'Выполнено' :
                           session.status === 'in_progress' ? 'В процессе' : session.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
