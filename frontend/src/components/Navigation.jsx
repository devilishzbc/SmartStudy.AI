import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from './ui/button';
import { User, LogOut, Home, BookOpen, Calendar, MessageSquare, Clock, Award, Brain, Palette } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const Navigation = ({ userName }) => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Tasks', path: '/tasks' },
    { icon: Calendar, label: 'Schedule', path: '/schedule' },
    { icon: BookOpen, label: 'Courses', path: '/courses' },
    { icon: MessageSquare, label: 'AI Coach', path: '/coach' },
    { icon: Clock, label: 'Pomodoro', path: '/focus' },
    { icon: Brain, label: 'Flashcards', path: '/flashcards' },
    { icon: Award, label: 'Achievements', path: '/achievements' },
    { icon: Palette, label: 'Themes', path: '/themes' },
  ];

  return (
    <div className="flex items-center gap-4">
      {/* Quick Navigation */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="border-2 border-gray-200">
            <Home className="w-4 h-4 mr-2" />
            Menu
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {menuItems.map((item) => (
            <DropdownMenuItem
              key={item.path}
              onClick={() => navigate(item.path)}
              className="cursor-pointer"
            >
              <item.icon className="w-4 h-4 mr-2" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Profile Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="border-2 border-violet-200 hover:bg-violet-50">
            <User className="w-4 h-4 mr-2" />
            {userName || 'User'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
            <User className="w-4 h-4 mr-2" />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};