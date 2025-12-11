import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BookOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export const LoginPage = () => {
  const [email, setEmail] = useState('demo@smartstudy.ai');
  const [password, setPassword] = useState('demo123');
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-heading font-bold text-gray-900 mb-2">
            SmartStudy.AI
          </h1>
          <p className="text-gray-600 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            Your AI-Powered Study Companion
          </p>
        </div>

        <Card className="border-2 border-gray-200 shadow-xl bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-heading">Welcome Back</CardTitle>
            <CardDescription>Sign in to continue your study journey</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@smartstudy.ai"
                  required
                  data-testid="email-input"
                  className="h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••"
                  required
                  data-testid="password-input"
                  className="h-12"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                disabled={isLoading}
                data-testid="login-button"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p className="mb-2">Demo Credentials:</p>
              <p className="font-mono text-xs bg-gray-100 p-2 rounded">demo@smartstudy.ai / demo123</p>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-violet-600 font-semibold hover:underline">
                  Sign Up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
