import { Sparkles, LogOut, Crown, CalendarDays } from 'lucide-react';
import { useAuth } from '../auth/Auth';

interface Props {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Navbar({ onNavigate, currentPage }: Props) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button
          onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'landing')}
          className="flex items-center gap-2 font-bold text-gray-900 hover:text-orange-500 transition-colors"
        >
          <div className="w-7 h-7 bg-linear-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-white" />
          </div>
          <span className="text-base">EventPlanner</span>
        </button>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-2">
                {user.tier === 'premium' ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" />
                    Premium
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Free</span>
                )}
                <span className="text-sm font-medium text-gray-700">{user.username}</span>
              </div>
              <button
                onClick={() => {
                  logout();
                  onNavigate('landing');
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onNavigate('login')}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="flex items-center gap-1.5 text-sm font-semibold bg-linear-to-r from-orange-400 to-red-500 text-white px-3.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
