import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Navigation } from './Navigation';
import { Button } from './ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export const PageHeader = ({ title, subtitle, icon: Icon, iconColor = '#6D28D9', showBack = false, showHome = true }) => {
  const navigate = useNavigate();
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.getCurrentUser(),
  });

  return (
    <div className="bg-white/80 backdrop-blur border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-heading font-bold text-gray-900 flex items-center gap-2">
                {Icon && <Icon className="w-8 h-8" style={{ color: iconColor }} />}
                {title}
              </h1>
              {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {showHome && (
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="border-2 border-gray-200 hover:bg-violet-50"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            )}
            <Navigation userName={user?.name} />
          </div>
        </div>
      </div>
    </div>
  );
};

