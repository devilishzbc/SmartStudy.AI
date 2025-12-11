import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    timezone: 'UTC',
    weekly_hours_goal: 20,
  });
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(formData);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Registration failed. Email may already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-4" data-testid="register-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-heading font-bold text-gray-900 mb-2">
            Join SmartStudy.AI
          </h1>
          <p className="text-gray-600">Start your intelligent study journey</p>
        </div>

        <Card className="border-2 border-gray-200 shadow-xl bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-heading">Create Account</CardTitle>
            <CardDescription>Get started with your AI study assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Full Name</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                  data-testid="name-input"
                  className="h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                  data-testid="email-input"
                  className="h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Password</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="•••••••••"
                  required
                  minLength={6}
                  data-testid="password-input"
                  className="h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Weekly Study Goal (hours)</label>
                <Input
                  type="number"
                  value={formData.weekly_hours_goal}
                  onChange={(e) => setFormData({ ...formData, weekly_hours_goal: parseInt(e.target.value) })}
                  min={1}
                  max={100}
                  data-testid="weekly-goal-input"
                  className="h-12"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                disabled={isLoading}
                data-testid="register-button"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-violet-600 font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
