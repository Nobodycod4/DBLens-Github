import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Eye, EyeOff, Moon, Sun, Shield, Server, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import Logo from '../components/Logo.jsx';

export default function Setup() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.get('/auth/setup-status');
        if (!res.data.setup_required) {
          navigate('/login', { replace: true });
          return;
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingSetup(false);
      }
    };
    check();
  }, [navigate]);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(
        formData.username.trim(),
        formData.email.trim(),
        formData.password,
        formData.full_name.trim() || null
      );
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-center">
          <Logo className="w-12 h-12 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-primary">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-brand-primary-light/20 rounded-full blur-3xl" />
      </div>

      <div className="fixed top-6 right-6 z-10">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-3 rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/20 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/20 transition-colors shadow-lg"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white/80 dark:bg-[#1a1a2e]/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-primary/20 mb-4">
                <Shield className="w-7 h-7 text-brand-primary" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Initial Setup</h1>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Create the first administrator account for DBLens
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full name (optional)</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData((d) => ({ ...d, full_name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={formData.username}
                  onChange={(e) => setFormData((d) => ({ ...d, username: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((d) => ({ ...d, email: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData((d) => ({ ...d, password: e.target.value }))}
                    className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 text-white font-medium bg-brand-primary hover:bg-brand-primary-hover rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/30"
              >
                {loading ? 'Creating account...' : 'Create account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              You will be logged in as Super Admin after setup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

