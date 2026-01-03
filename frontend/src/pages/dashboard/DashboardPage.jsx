import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Navigation } from '../../components/Navigation';
import { PageHeader } from '../../components/PageHeader';
import { BookOpen, Target, Clock, AlertCircle, TrendingUp, Sparkles, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getRandomStudyTip } from '../../utils/studyTips';
import { useThemeStore } from '../../store/themeStore';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [studyTip, setStudyTip] = useState('');
  const theme = useThemeStore((state) => state.theme);

  // Get random study tip on page load
  useEffect(() => {
    setStudyTip(getRandomStudyTip());
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.getCurrentUser(),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  });

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.getCourses(),
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return api.getAnalyticsSummary(
        thirtyDaysAgo.toISOString(),
        now.toISOString()
      );
    },
  });

  const handleGenerateSchedule = async () => {
    setIsGenerating(true);
    try {
      const now = new Date();
      const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const result = await api.generateSchedule({
        start_date: now.toISOString(),
        end_date: twoWeeksLater.toISOString(),
      });
      toast.success(result.message);
      navigate('/schedule');
    } catch (error) {
      toast.error('Failed to generate schedule. Please set your availability first.');
    } finally {
      setIsGenerating(false);
    }
  };

  const pendingTasks = tasks?.filter((t) => t.status === 'pending') || [];
  const overdueTasks = tasks?.filter((t) => t.status === 'overdue') || [];
  const completedTasks = tasks?.filter((t) => t.status === 'completed') || [];

  const completionRate = tasks?.length > 0
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  return (
    <div className="min-h-screen" data-testid="dashboard-page">
      <PageHeader 
        title={`Welcome back, ${user?.name || 'Student'}!`}
        subtitle="Here's your study progress overview"
        icon={LayoutDashboard}
        iconColor={theme?.tailwind?.iconColor || '#6D28D9'}
        showHome={false}
      />
      
      {/* Action Bar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-end">
          <Button
            onClick={handleGenerateSchedule}
            disabled={isGenerating}
            className="theme-btn-primary h-12 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            data-testid="generate-schedule-button"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Schedule'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 border-gray-200 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-violet-50 animate-fadeInUp card-hover" data-testid="total-tasks-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-violet-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-gray-900 mb-1">{tasks?.length || 0}</div>
              <p className="text-xs text-gray-500">{courses?.length || 0} active courses</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-orange-50 animate-fadeInUp animate-delay-100 card-hover" data-testid="pending-tasks-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-600 mb-1">{pendingTasks.length}</div>
              <p className="text-xs text-gray-500">In progress</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-green-50 animate-fadeInUp animate-delay-200 card-hover" data-testid="completion-rate-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Completion</CardTitle>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600 mb-1">{completionRate}%</div>
              <p className="text-xs text-gray-500">{completedTasks.length} completed</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-red-50 animate-fadeInUp animate-delay-300 card-hover" data-testid="overdue-tasks-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Overdue</CardTitle>
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-red-600 mb-1">{overdueTasks.length}</div>
              <p className="text-xs text-gray-500">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tasks and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tasks */}
          <Card className="border-2 border-gray-200 shadow-md bg-white">
            <CardHeader>
              <CardTitle className="font-heading text-gray-900">Recent Tasks</CardTitle>
              <CardDescription className="text-gray-600">Your upcoming assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No pending tasks</p>
                  <Button
                    onClick={() => navigate('/tasks')}
                    variant="outline"
                    className="mt-4"
                    data-testid="create-task-button"
                  >
                    Create Your First Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => navigate('/tasks')}
                      data-testid={`task-item-${task.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{task.title}</p>
                        <p className="text-sm text-gray-500">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          task.priority === 'urgent'
                            ? 'bg-red-100 text-red-700'
                            : task.priority === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-2 border-gray-200 shadow-md bg-white">
            <CardHeader>
              <CardTitle className="font-heading text-gray-900">Quick Actions</CardTitle>
              <CardDescription className="text-gray-600">Manage your study workflow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 animate-fadeInUp animate-delay-300">
              <Button
                onClick={() => navigate('/tasks')}
                variant="outline"
                className="w-full justify-start h-16 text-left hover:bg-violet-50 border-2 border-gray-200 btn-hover-lift group"
                data-testid="manage-tasks-button"
              >
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Manage Tasks</div>
                  <div className="text-xs text-gray-500">Create and organize assignments</div>
                </div>
              </Button>

              <Button
                onClick={() => navigate('/schedule')}
                variant="outline"
                className="w-full justify-start h-16 text-left hover:bg-blue-50 border-2 border-gray-200 btn-hover-lift group"
                data-testid="view-schedule-button"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">View Schedule</div>
                  <div className="text-xs text-gray-500">See your study plan</div>
                </div>
              </Button>

              <Button
                onClick={() => navigate('/courses')}
                variant="outline"
                className="w-full justify-start h-16 text-left hover:bg-green-50 border-2 border-gray-200 btn-hover-lift group"
                data-testid="manage-courses-button"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Manage Courses</div>
                  <div className="text-xs text-gray-500">Add or edit your courses</div>
                </div>
              </Button>

              <Button
                onClick={() => navigate('/coach')}
                variant="outline"
                className="w-full justify-start h-16 text-left hover:bg-purple-50 border-2 border-gray-200 btn-hover-lift group"
                data-testid="ai-coach-button"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">AI Coach</div>
                  <div className="text-xs text-gray-500">Get personalized study advice</div>
                </div>
              </Button>

              <Button
                onClick={() => navigate('/focus')}
                variant="outline"
                className="w-full justify-start h-16 text-left hover:bg-orange-50 border-2 border-gray-200 btn-hover-lift group"
              >
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Focus Mode</div>
                  <div className="text-xs text-gray-500">Pomodoro timer for productivity</div>
                </div>
              </Button>

              <Button
                onClick={() => navigate('/achievements')}
                variant="outline"
                className="w-full justify-start h-16 text-left hover:bg-purple-50 border-2 border-gray-200 btn-hover-lift group"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Achievements</div>
                  <div className="text-xs text-gray-500">Track your progress & rewards</div>
                </div>
              </Button>

              <Button
                onClick={() => navigate('/flashcards')}
                variant="outline"
                className="w-full justify-start h-16 text-left hover:bg-indigo-50 border-2 border-gray-200 btn-hover-lift group"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">AI Flashcards</div>
                  <div className="text-xs text-gray-500">Generate study cards with AI</div>
                </div>
              </Button>

              <Button
                onClick={() => navigate('/themes')}
                variant="outline"
                className="w-full justify-start h-16 text-left hover:bg-pink-50 border-2 border-gray-200 btn-hover-lift group"
              >
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Customize Theme</div>
                  <div className="text-xs text-gray-500">Choose your color scheme</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Study Tips */}
        <Card className="border-2 border-gray-200 shadow-md mt-6 bg-white">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-gray-900">
              <TrendingUp className="w-5 h-5 text-violet-600" />
              Study Tip of the Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">
              {studyTip}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
