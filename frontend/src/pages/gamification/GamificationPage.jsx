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
    { id: 1, name: 'First Task', icon: '🎯', description: 'Complete your first task', unlocked: completedTasks.length >= 1, xp: 50 },
    { id: 2, name: 'Task Master', icon: '📚', description: 'Complete 10 tasks', unlocked: completedTasks.length >= 10, xp: 200 },
    { id: 3, name: 'Study Streak', icon: '🔥', description: '7 days study streak', unlocked: streak >= 7, xp: 300 },
    { id: 4, name: 'Early Bird', icon: '🌅', description: 'Complete a task before 9 AM', unlocked: false, xp: 100 },
    { id: 5, name: 'Night Owl', icon: '🦉', description: 'Study after 10 PM', unlocked: false, xp: 100 },
    { id: 6, name: 'Focused Mind', icon: '🧠', description: 'Complete 5 Pomodoro sessions', unlocked: false, xp: 150 },
    { id: 7, name: 'Speed Runner', icon: '⚡', description: 'Complete a task in under 30 minutes', unlocked: false, xp: 100 },
    { id: 8, name: 'Consistent', icon: '📅', description: 'Study every day for a week', unlocked: streak >= 7, xp: 400 },
    { id: 9, name: 'Overachiever', icon: '🏆', description: 'Complete 50 tasks', unlocked: completedTasks.length >= 50, xp: 1000 },
  ];

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      <PageHeader 
        title="Your Progress & Achievements" 
        subtitle="Track your learning journey and unlock rewards"
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
