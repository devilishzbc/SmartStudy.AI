import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { PageHeader } from '../../components/PageHeader';
import { Plus, BookOpen, Calendar, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

export const CoursesPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    exam_date: '',
  });

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.getCourses(),
  });

  const createCourseMutation = useMutation({
    mutationFn: (data) => api.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['courses']);
      toast.success('Course created successfully!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create course');
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id) => api.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['courses']);
      toast.success('Course deleted');
    },
  });

  const resetForm = () => {
    setCourseData({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      exam_date: '',
    });
    setEditingCourse(null);
  };

  const handleSubmit = () => {
    if (!courseData.title) {
      toast.error('Please enter course title');
      return;
    }
    createCourseMutation.mutate(courseData);
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50" data-testid="courses-page">
      <PageHeader 
        title="Courses" 
        subtitle="Manage your academic courses"
        icon={BookOpen}
        iconColor="#10B981"
      />
      
      {/* Action Bar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white h-12 px-6 rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Course
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl text-gray-900">Add New Course</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-gray-900">Course Title *</Label>
                    <Input
                      value={courseData.title}
                      onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
                      placeholder="e.g., Data Structures and Algorithms"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-900">Description</Label>
                    <Input
                      value={courseData.description}
                      onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
                      placeholder="Course description"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-900">Start Date</Label>
                      <Input
                        type="date"
                        value={courseData.start_date}
                        onChange={(e) => setCourseData({ ...courseData, start_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-900">End Date</Label>
                      <Input
                        type="date"
                        value={courseData.end_date}
                        onChange={(e) => setCourseData({ ...courseData, end_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-900">Exam Date</Label>
                    <Input
                      type="date"
                      value={courseData.exam_date}
                      onChange={(e) => setCourseData({ ...courseData, exam_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleSubmit}
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    disabled={createCourseMutation.isPending}
                  >
                    {createCourseMutation.isPending ? 'Creating...' : 'Create Course'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {courses?.length === 0 ? (
          <Card className="border-2 border-gray-200 bg-white">
            <CardContent className="py-16 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses yet</h3>
              <p className="text-gray-600 mb-6">Add your first course to get started</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Course
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses?.map((course) => (
              <Card key={course.id} className="border-2 border-gray-200 bg-white hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-violet-600" />
                      <CardTitle className="font-heading text-lg text-gray-900">{course.title}</CardTitle>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteCourseMutation.mutate(course.id)}
                      className="border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                  {course.description && (
                    <CardDescription className="text-gray-600 mt-2">{course.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {course.start_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Start: {new Date(course.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {course.exam_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-red-600" />
                        <span className="font-semibold">Exam: {new Date(course.exam_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
