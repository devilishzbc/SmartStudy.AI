import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { PageHeader } from '../../components/PageHeader';
import { Calendar, Clock, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const SchedulePage = () => {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['weeklySchedule', selectedDate],
    queryFn: () => api.getWeeklySchedule(selectedDate),
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
      toast.success(data.message || 'Schedule generated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to generate schedule. Please set your availability first.');
    },
  });

  const handleGenerateSchedule = async () => {
    setIsGenerating(true);
    try {
      await generateScheduleMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
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

  const getStatusColor = (status) => {
    const colors = {
      planned: 'bg-blue-100 text-blue-700 border-blue-300',
      completed: 'bg-green-100 text-green-700 border-green-300',
      in_progress: 'bg-orange-100 text-orange-700 border-orange-300',
      skipped: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return colors[status] || colors.planned;
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      <PageHeader 
        title="Study Schedule" 
        subtitle="Your optimized weekly study plan"
        icon={Calendar}
        iconColor="#6D28D9"
      />

      {/* Action Bar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-end gap-3">
          <Button
            onClick={handleGenerateSchedule}
            disabled={isGenerating}
            className="bg-violet-600 hover:bg-violet-700 text-white h-12 px-6 rounded-xl"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Schedule'}
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

      {/* Week Calendar */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Card className="border-2 border-gray-200 bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-2xl text-gray-900 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-violet-600" />
                Week of {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
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
                  Previous Week
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
                  Next Week
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sessions?.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No schedule generated yet</h3>
                <p className="text-gray-600 mb-6">Generate an optimized study schedule based on your tasks and availability</p>
                <Button onClick={handleGenerateSchedule} className="bg-violet-600 hover:bg-violet-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate My Schedule
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-4">
                {weekDates.map((date) => {
                  const daySessions = getSessionsForDay(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={date.toISOString()}
                      className={`border-2 rounded-lg p-3 ${
                        isToday ? 'border-violet-600 bg-violet-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="text-center mb-3">
                        <div className="text-sm font-semibold text-gray-600">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`text-2xl font-bold ${isToday ? 'text-violet-600' : 'text-gray-900'}`}>
                          {date.getDate()}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {daySessions.length === 0 ? (
                          <div className="text-xs text-gray-400 text-center py-2">No sessions</div>
                        ) : (
                          daySessions.map((session, idx) => (
                            <div
                              key={idx}
                              className={`text-xs p-2 rounded border ${getStatusColor(session.status)}`}
                            >
                              <div className="font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(session.start_time).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                              <div className="mt-1 text-xs">{session.planned_minutes} min</div>
                              {session.status === 'completed' && (
                                <CheckCircle2 className="w-3 h-3 mt-1" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Details */}
        {sessions && sessions.length > 0 && (
          <Card className="border-2 border-gray-200 bg-white mt-6">
            <CardHeader>
              <CardTitle className="font-heading text-xl text-gray-900">Session Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.slice(0, 10).map((session, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {new Date(session.start_time).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(session.start_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' - '}
                        {new Date(session.end_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">{session.planned_minutes} minutes</div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
