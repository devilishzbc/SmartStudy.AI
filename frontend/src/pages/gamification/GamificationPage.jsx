import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { PageHeader } from '../../components/PageHeader';
import { Trophy, Star, Flame, Award, TrendingUp, Target } from 'lucide-react';

export const GamificationPage = () => {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.getCurrentUser(),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  });

  const completedTasks = tasks?.filter(t => t.status === 'completed') || [];
  const totalXP = completedTasks.length * 100;
  const level = Math.floor(totalXP / 500) + 1;
  const xpForNextLevel = (level * 500) - totalXP;
  const progressToNextLevel = ((totalXP % 500) / 500) * 100;

  // Calculate streak (simplified - counting completed tasks in sequence)
  const streak = completedTasks.length >= 7 ? 7 : completedTasks.length;

  const achievements = [
    // 🎯 Начальные достижения
    { id: 1, name: 'Первый шаг', icon: '🎯', description: 'Выполни свою первую задачу', unlocked: completedTasks.length >= 1, xp: 50, category: 'начало' },
    { id: 2, name: 'Новичок', icon: '🌱', description: 'Выполни 5 задач', unlocked: completedTasks.length >= 5, xp: 100, category: 'начало' },
    { id: 3, name: 'Ученик', icon: '📖', description: 'Выполни 10 задач', unlocked: completedTasks.length >= 10, xp: 200, category: 'начало' },
    
    // 🔥 Серии (Streak)
    { id: 4, name: 'Огненный старт', icon: '🔥', description: '3 дня подряд учёбы', unlocked: streak >= 3, xp: 150, category: 'серии' },
    { id: 5, name: 'Неделя силы', icon: '💪', description: '7 дней подряд учёбы', unlocked: streak >= 7, xp: 300, category: 'серии' },
    { id: 6, name: 'Непобедимый', icon: '⚔️', description: '14 дней подряд учёбы', unlocked: streak >= 14, xp: 500, category: 'серии' },
    { id: 7, name: 'Легенда', icon: '👑', description: '30 дней подряд учёбы', unlocked: streak >= 30, xp: 1000, category: 'серии' },
    
    // ⏰ Время
    { id: 8, name: 'Ранняя пташка', icon: '🌅', description: 'Выполни задачу до 9:00', unlocked: false, xp: 100, category: 'время' },
    { id: 9, name: 'Ночной волк', icon: '🌙', description: 'Учись после 23:00', unlocked: false, xp: 100, category: 'время' },
    { id: 10, name: 'Воскресный воин', icon: '☀️', description: 'Учись в воскресенье', unlocked: false, xp: 150, category: 'время' },
    
    // 🍅 Pomodoro
    { id: 11, name: 'Помидорка', icon: '🍅', description: 'Заверши 1 Pomodoro сессию', unlocked: false, xp: 50, category: 'фокус' },
    { id: 12, name: 'Фокус-мастер', icon: '🧘', description: 'Заверши 10 Pomodoro сессий', unlocked: false, xp: 200, category: 'фокус' },
    { id: 13, name: 'Zen Mode', icon: '🧠', description: 'Заверши 50 Pomodoro сессий', unlocked: false, xp: 500, category: 'фокус' },
    { id: 14, name: 'Марафонец', icon: '🏃', description: '5 Pomodoro подряд за день', unlocked: false, xp: 300, category: 'фокус' },
    
    // ⚡ Скорость
    { id: 15, name: 'Молния', icon: '⚡', description: 'Выполни задачу за 15 минут', unlocked: false, xp: 100, category: 'скорость' },
    { id: 16, name: 'Спринтер', icon: '🏎️', description: 'Выполни 3 задачи за день', unlocked: false, xp: 150, category: 'скорость' },
    { id: 17, name: 'Машина', icon: '🤖', description: 'Выполни 5 задач за день', unlocked: false, xp: 300, category: 'скорость' },
    
    // 📚 Мастерство
    { id: 18, name: 'Книжный червь', icon: '📚', description: 'Выполни 25 задач', unlocked: completedTasks.length >= 25, xp: 400, category: 'мастерство' },
    { id: 19, name: 'Профессор', icon: '🎓', description: 'Выполни 50 задач', unlocked: completedTasks.length >= 50, xp: 750, category: 'мастерство' },
    { id: 20, name: 'Гений', icon: '🧬', description: 'Выполни 100 задач', unlocked: completedTasks.length >= 100, xp: 1500, category: 'мастерство' },
    { id: 21, name: 'Мастер вселенной', icon: '🌌', description: 'Выполни 200 задач', unlocked: completedTasks.length >= 200, xp: 3000, category: 'мастерство' },
    
    // 🎮 Особые
    { id: 22, name: 'AI друг', icon: '🤝', description: 'Поговори с AI Coach', unlocked: false, xp: 50, category: 'особые' },
    { id: 23, name: 'Флэшкард гуру', icon: '🃏', description: 'Создай 10 флэшкарт', unlocked: false, xp: 150, category: 'особые' },
    { id: 24, name: 'Планировщик', icon: '📋', description: 'Сгенерируй расписание', unlocked: false, xp: 100, category: 'особые' },
    { id: 25, name: 'Перфекционист', icon: '✨', description: 'Выполни все задачи за день', unlocked: false, xp: 250, category: 'особые' },
    
    // 🏆 Редкие
    { id: 26, name: 'Феникс', icon: '🔮', description: 'Вернись после 7 дней отсутствия', unlocked: false, xp: 200, category: 'редкие' },
    { id: 27, name: 'Коллекционер', icon: '💎', description: 'Разблокируй 15 достижений', unlocked: false, xp: 500, category: 'редкие' },
    { id: 28, name: 'Элита', icon: '🏅', description: 'Достигни 5 уровня', unlocked: level >= 5, xp: 400, category: 'редкие' },
    { id: 29, name: 'Титан', icon: '⭐', description: 'Достигни 10 уровня', unlocked: level >= 10, xp: 1000, category: 'редкие' },
    { id: 30, name: 'Бессмертный', icon: '🌟', description: 'Набери 10,000 XP', unlocked: totalXP >= 10000, xp: 2000, category: 'редкие' },
  ];

  // Подсчитываем разблокированные (без "Коллекционера")
  const unlockedCount = achievements.filter(a => a.unlocked && a.id !== 27).length;
  
  // Обновляем "Коллекционера" если разблокировано 15+ достижений
  const finalAchievements = achievements.map(a => 
    a.id === 27 ? { ...a, unlocked: unlockedCount >= 15 } : a
  );
  
  const unlockedAchievements = finalAchievements.filter(a => a.unlocked);
  const lockedAchievements = finalAchievements.filter(a => !a.unlocked);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      <PageHeader 
        title="Прогресс и Достижения" 
        subtitle="Отслеживай свой путь и разблокируй награды"
        icon={Trophy}
        iconColor="#8B5CF6"
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Level & XP Card */}
        <Card className="border-2 border-violet-300 bg-gradient-to-r from-violet-50 to-purple-50 shadow-xl mb-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-4xl font-bold text-white">{level}</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Level {level}</h2>
                  <p className="text-gray-600 mt-1">Total XP: {totalXP}</p>
                  <p className="text-sm text-gray-500 mt-1">{xpForNextLevel} XP to next level</p>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                    <Flame className="w-10 h-10 text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{streak}</div>
                  <div className="text-xs text-gray-600">Day Streak</div>
                </div>
                
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-2">
                    <Target className="w-10 h-10 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{completedTasks.length}</div>
                  <div className="text-xs text-gray-600">Tasks Done</div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress to Level {level + 1}</span>
                <span className="text-sm font-medium text-gray-700">{Math.round(progressToNextLevel)}%</span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressToNextLevel}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unlocked Achievements */}
        <Card className="border-2 border-gray-200 bg-white mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-violet-500" />
              Unlocked Achievements ({unlockedAchievements.length}/{achievements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unlockedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 rounded-lg border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-4xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{achievement.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                      <div className="mt-2 inline-flex items-center px-2 py-1 bg-violet-100 rounded text-xs font-semibold text-violet-700">
                        +{achievement.xp} XP
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Locked Achievements */}
        <Card className="border-2 border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900 flex items-center gap-2">
              <Star className="w-6 h-6 text-gray-400" />
              Locked Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lockedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-60 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-4xl grayscale">{achievement.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-700">{achievement.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{achievement.description}</p>
                      <div className="mt-2 inline-flex items-center px-2 py-1 bg-gray-200 rounded text-xs font-semibold text-gray-600">
                        +{achievement.xp} XP
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Teaser */}
        <Card className="border-2 border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 mt-6">
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-purple-600" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon: Global Leaderboard</h3>
            <p className="text-gray-600">Compete with other students worldwide and climb the ranks!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
