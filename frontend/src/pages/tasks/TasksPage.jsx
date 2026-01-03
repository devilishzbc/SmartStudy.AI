import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PageHeader } from '../../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, CheckCircle2, Clock, AlertCircle, Trash2, Play, ListTodo } from 'lucide-react';
import { toast } from 'sonner';

export const TasksPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    course_id: '',
    due_date: '',
    priority: 'medium',
    difficulty: 'medium',
    estimated_minutes: 60,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
    refetchOnWindowFocus: true,  // Автообновление при возврате на вкладку
    staleTime: 5000,  // Данные считаются свежими 5 секунд
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.getCurrentUser(),
  });

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.getCourses(),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => api.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Task created successfully!');
      setIsDialogOpen(false);
      setNewTask({
        title: '',
        description: '',
        course_id: '',
        due_date: '',
        priority: 'medium',
        difficulty: 'medium',
        estimated_minutes: 60,
      });
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Task deleted');
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: ({ id, actualMinutes }) => api.completeTask(id, actualMinutes),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Task completed!');
    },
  });

  const handleCreateTask = () => {
    if (!newTask.title || !newTask.course_id || !newTask.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    createTaskMutation.mutate(newTask);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-700 border-red-300',
      high: 'bg-orange-100 text-orange-700 border-orange-300',
      medium: 'bg-blue-100 text-blue-700 border-blue-300',
      low: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return colors[priority] || colors.medium;
  };

  if (tasksLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen" data-testid="tasks-page">
      <PageHeader 
        title="Tasks" 
        subtitle="Manage your assignments and deadlines"
        icon={ListTodo}
        iconColor="#6D28D9"
      />
      
      {/* Action Bar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white h-12 px-6 rounded-xl" data-testid="create-task-dialog-button">
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Task title"
                    className="mt-1"
                  />
                </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Task description"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Course *</Label>
                    <Select value={newTask.course_id} onValueChange={(value) => setNewTask({ ...newTask, course_id: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses?.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Due Date *</Label>
                    <Input
                      type="datetime-local"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Priority</Label>
                      <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Difficulty</Label>
                      <Select value={newTask.difficulty} onValueChange={(value) => setNewTask({ ...newTask, difficulty: value })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Estimated Time (minutes)</Label>
                    <Input
                      type="number"
                      value={newTask.estimated_minutes}
                      onChange={(e) => setNewTask({ ...newTask, estimated_minutes: parseInt(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleCreateTask}
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    disabled={createTaskMutation.isPending}
                  >
                    {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                  </Button>
                </div>
              </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tasks List */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid gap-4">
          {tasks?.length === 0 ? (
            <Card className="border-2 border-gray-200 bg-white">
              <CardContent className="py-16 text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks yet</h3>
                <p className="text-gray-600 mb-6">Create your first task to get started</p>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Task
                </Button>
              </CardContent>
            </Card>
          ) : (
            tasks?.map((task) => (
              <Card key={task.id} className="border-2 border-gray-200 bg-white hover:shadow-lg transition-shadow" data-testid={`task-card-${task.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="font-heading text-xl">{task.title}</CardTitle>
                      {task.description && <p className="text-sm text-gray-600 mt-1">{task.description}</p>}
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="text-sm text-gray-600">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {task.estimated_minutes} min
                        </span>
                        <span className="text-sm text-gray-600">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {task.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/focus?taskId=${task.id}`)}
                            className="bg-orange-50 border-orange-200 hover:bg-orange-100"
                          >
                            <Play className="w-4 h-4 mr-1 text-orange-600" />
                            Start Pomodoro
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => completeTaskMutation.mutate({ id: task.id, actualMinutes: task.estimated_minutes })}
                            className="bg-green-50 border-green-200 hover:bg-green-100"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
                            Complete
                          </Button>
                        </>
                      )}
                      {task.status === 'completed' && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          Completed
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTaskMutation.mutate(task.id)}
                        className="border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
