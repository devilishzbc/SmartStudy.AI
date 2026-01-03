import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { PageHeader } from '../../components/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { User, Camera, Mail, Calendar, Trophy, Flame, Target, TrendingUp, Award, Edit2, Save, X, Upload } from 'lucide-react';
import { toast } from 'sonner';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.getCurrentUser(),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => api.updateUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      toast.success('Профиль обновлён!');
      setIsEditing(false);
      setAvatarPreview(null);
    },
  });

  const handleEdit = () => {
    setEditData({
      name: user?.name || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      student_type: user?.student_type || 'student',
      weekly_hours_goal: user?.weekly_hours_goal || 20,
      pomodoro_work_minutes: user?.pomodoro_work_minutes || 25,
      pomodoro_break_minutes: user?.pomodoro_break_minutes || 5,
    });
    setIsEditing(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        setEditData({ ...editData, avatar_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    updateUserMutation.mutate(editData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
    setAvatarPreview(null);
  };

  const completedTasks = tasks?.filter(t => t.status === 'completed') || [];
  const totalXP = completedTasks.length * 100;
  const level = Math.floor(totalXP / 500) + 1;
  const streak = completedTasks.length >= 7 ? 7 : completedTasks.length;
  const progressToNextLevel = ((totalXP % 500) / 500) * 100;

  const achievements = [
    // Показываем 12 основных ачивок на профиле
    { id: 1, name: 'Первый шаг', icon: '🎯', unlocked: completedTasks.length >= 1, xp: 50 },
    { id: 2, name: 'Новичок', icon: '🌱', unlocked: completedTasks.length >= 5, xp: 100 },
    { id: 3, name: 'Ученик', icon: '📖', unlocked: completedTasks.length >= 10, xp: 200 },
    { id: 4, name: 'Огненный старт', icon: '🔥', unlocked: streak >= 3, xp: 150 },
    { id: 5, name: 'Неделя силы', icon: '💪', unlocked: streak >= 7, xp: 300 },
    { id: 6, name: 'Ранняя пташка', icon: '🌅', unlocked: false, xp: 100 },
    { id: 7, name: 'Ночной волк', icon: '🌙', unlocked: false, xp: 100 },
    { id: 8, name: 'Помидорка', icon: '🍅', unlocked: false, xp: 50 },
    { id: 9, name: 'Молния', icon: '⚡', unlocked: false, xp: 100 },
    { id: 10, name: 'Книжный червь', icon: '📚', unlocked: completedTasks.length >= 25, xp: 400 },
    { id: 11, name: 'AI друг', icon: '🤝', unlocked: false, xp: 50 },
    { id: 12, name: 'Элита', icon: '🏅', unlocked: level >= 5, xp: 400 },
  ];

  const unlockedAchievements = achievements.filter(a => a.unlocked);

  const studentTypes = [
    { value: 'student', label: 'Студент университета' },
    { value: 'school_student', label: 'Школьник' },
    { value: 'professional', label: 'Профессионал' },
    { value: 'other', label: 'Другое' },
  ];

  const getStudentTypeLabel = (type) => {
    return studentTypes.find(t => t.value === type)?.label || 'Студент';
  };

  // Activity data for last 7 days
  const activityData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      day: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
      count: Math.floor(Math.random() * 5) + 1,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      <PageHeader 
        title="Мой профиль" 
        subtitle="Управляйте своим аккаунтом и отслеживайте прогресс"
        icon={User}
        iconColor="#6D28D9"
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="border-2 border-gray-200 bg-white shadow-xl card-hover animate-fadeInUp">
              <CardContent className="p-8">
                <div className="text-center">
                  {/* Avatar */}
                  <div className="relative inline-block mb-6">
                    {isEditing ? (
                      <label className="cursor-pointer">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-2xl overflow-hidden">
                          {avatarPreview || user?.avatar_url ? (
                            <img src={avatarPreview || user?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            user?.name?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                        <div className="absolute bottom-0 right-0 w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center shadow-lg hover:bg-violet-700 transition-all">
                          <Upload className="w-5 h-5 text-white" />
                        </div>
                      </label>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-2xl overflow-hidden">
                        {user?.avatar_url ? (
                          <img src={user?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          user?.name?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  {!isEditing ? (
                    <>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">{user?.name}</h2>
                      {(user?.first_name || user?.last_name) && (
                        <p className="text-gray-600 mb-2">
                          {user?.first_name} {user?.last_name}
                        </p>
                      )}
                      <p className="text-gray-600 flex items-center justify-center gap-2 mb-2">
                        <Mail className="w-4 h-4" />
                        {user?.email}
                      </p>
                      <div className="inline-block px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-medium mb-4">
                        {getStudentTypeLabel(user?.student_type)}
                      </div>
                      <Button
                        onClick={handleEdit}
                        variant="outline"
                        className="w-full border-2 border-gray-200 btn-hover-lift"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Редактировать профиль
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-gray-700">Отображаемое имя</Label>
                        <Input
                          value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-sm text-gray-700">Имя</Label>
                          <Input
                            value={editData.first_name}
                            onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-700">Фамилия</Label>
                          <Input
                            value={editData.last_name}
                            onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-700">Статус</Label>
                        <Select value={editData.student_type} onValueChange={(value) => setEditData({ ...editData, student_type: value })}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {studentTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-700">Цель (часов/неделю)</Label>
                        <Input
                          type="number"
                          value={editData.weekly_hours_goal}
                          onChange={(e) => setEditData({ ...editData, weekly_hours_goal: parseInt(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">⏱️ Настройки Pomodoro</h4>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm text-gray-700">Работа (минут)</Label>
                            <Input
                              type="number"
                              min="1"
                              max="60"
                              value={editData.pomodoro_work_minutes}
                              onChange={(e) => setEditData({ ...editData, pomodoro_work_minutes: parseInt(e.target.value) })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm text-gray-700">Перерыв (минут)</Label>
                            <Input
                              type="number"
                              min="1"
                              max="30"
                              value={editData.pomodoro_break_minutes}
                              onChange={(e) => setEditData({ ...editData, pomodoro_break_minutes: parseInt(e.target.value) })}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={handleSave}
                          className="flex-1 bg-violet-600 hover:bg-violet-700"
                          disabled={updateUserMutation.isPending}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Сохранить
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          className="flex-1 border-2 border-gray-200"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Отмена
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t-2 border-gray-100">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-violet-100 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-violet-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{level}</div>
                      <div className="text-xs text-gray-600">Уровень</div>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-orange-100 flex items-center justify-center">
                        <Flame className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{streak}</div>
                      <div className="text-xs text-gray-600">Дней подряд</div>
                    </div>
                  </div>

                  {/* Level Progress */}
                  <div className="mt-6 pt-6 border-t-2 border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Прогресс до уровня {level + 1}</span>
                      <span className="text-sm font-medium text-gray-700">{Math.round(progressToNextLevel)}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-500"
                        style={{ width: `${progressToNextLevel}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{totalXP} XP / {level * 500} XP</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeInUp animate-delay-100">
              <Card className="border-2 border-gray-200 bg-white card-hover">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{tasks?.length || 0}</div>
                  <div className="text-sm text-gray-600 mt-1">Всего задач</div>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200 bg-white card-hover">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{completedTasks.length}</div>
                  <div className="text-sm text-gray-600 mt-1">Выполнено</div>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200 bg-white card-hover">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{totalXP}</div>
                  <div className="text-sm text-gray-600 mt-1">Всего XP</div>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200 bg-white card-hover">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-violet-100 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-violet-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{unlockedAchievements.length}</div>
                  <div className="text-sm text-gray-600 mt-1">Достижений</div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Heatmap */}
            <Card className="border-2 border-gray-200 bg-white shadow-lg animate-fadeInUp animate-delay-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-violet-600" />
                  Недельная активность
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2 h-48">
                  {activityData.map((day, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-violet-500 to-purple-500 transition-all duration-300 hover:from-violet-600 hover:to-purple-600"
                        style={{ height: `${(day.count / 5) * 100}%` }}
                      />
                      <div className="text-xs text-gray-600 font-medium">{day.day}</div>
                      <div className="text-xs text-gray-400">{day.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="border-2 border-gray-200 bg-white shadow-lg animate-fadeInUp animate-delay-300">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-violet-600" />
                  Достижения ({unlockedAchievements.length}/{achievements.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        achievement.unlocked
                          ? 'border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 card-hover'
                          : 'border-gray-200 bg-gray-50 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-4xl ${!achievement.unlocked && 'grayscale'}`}>
                          {achievement.icon}
                        </span>
                        <div>
                          <h4 className="font-semibold text-gray-900">{achievement.name}</h4>
                          {achievement.unlocked && (
                            <p className="text-xs text-green-600 font-medium mt-1">✓ Разблокировано</p>
                          )}
                          <p className="text-xs text-gray-600 mt-1">+{achievement.xp} XP</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4 border-2 border-violet-200 text-violet-600 hover:bg-violet-50"
                  onClick={() => navigate('/achievements')}
                >
                  Смотреть все 30 достижений →
                </Button>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card className="border-2 border-gray-200 bg-white shadow-lg animate-fadeInUp animate-delay-400">
              <CardHeader>
                <CardTitle className="text-gray-900">Информация об аккаунте</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600">Участник с</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {new Date(user?.created_at).toLocaleDateString('ru-RU', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </div>
                    </div>
                    <Calendar className="w-6 h-6 text-violet-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600">Цель учёбы в неделю</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {user?.weekly_hours_goal} часов
                      </div>
                    </div>
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-violet-50 rounded-lg border-2 border-violet-200">
                    <div>
                      <div className="text-sm text-gray-600">Pomodoro настройки</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {user?.pomodoro_work_minutes || 25} мин работа / {user?.pomodoro_break_minutes || 5} мин перерыв
                      </div>
                    </div>
                    <div className="text-2xl">⏱️</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};