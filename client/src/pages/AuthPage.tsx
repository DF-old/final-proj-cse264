import { useState } from 'react';
import { CalendarDays, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/Auth';

interface Props {
    mode: 'login' | 'register';
    onNavigate: (page: string) => void;
}

export function AuthPage({ mode, onNavigate }: Props) {
    const { login, register } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const isLogin = mode === 'login';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const result = isLogin
                ? await login(username, password)
                : await register(username, password);
            if (result.error) {
                setError(result.error);
            } else {
                onNavigate('dashboard');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-linear-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isLogin ? 'Log in to plan your events.' : 'Start planning smarter events today.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              placeholder={isLogin ? 'username or email' : 'choose a username'}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition"
            />
          </div>


          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-linear-to-r from-orange-400 to-red-500 text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isLogin ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => onNavigate(isLogin ? 'register' : 'login')}
            className="text-orange-500 font-semibold hover:text-orange-600 transition-colors"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthPage