import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Eye, EyeOff, Moon, Sun, Terminal, Zap, Shield, Server, Crown, ArrowRight, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import Logo from '../components/Logo.jsx';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await api.get('/auth/setup-status');
        if (response.data.setup_required) {
          navigate('/setup', { replace: true });
          return;
        }
      } catch (err) {
        console.error('Failed to check setup status:', err);
      } finally {
        setCheckingSetup(false);
      }
    };
    checkSetupStatus();
  }, [navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(formData.username, formData.password);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Server, title: 'Multi-Database Support', desc: 'PostgreSQL, MySQL, SQLite, MongoDB' },
    { icon: Shield, title: 'Secure by Default', desc: 'Role-based access control & audit logs' },
    { icon: Zap, title: 'Fast & Modern', desc: 'Real-time queries with instant feedback' },
  ];

  const roleFeatures = [
    { role: 'Super Admin', color: '#DC2626', desc: 'Full system control' },
    { role: 'Admin', color: '#F59E0B', desc: 'User & team management' },
    { role: 'Developer', color: '#3B82F6', desc: 'Database operations' },
    { role: 'Analyst', color: '#0891B2', desc: 'Read & query access' },
  ];

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Logo className="w-12 h-12" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-primary">
      {
}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {
}
        <div className="absolute inset-0 bg-[#2563EB]/5" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {
}
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">DBLens</span>
          </div>
          
          {
}
          <div className="space-y-8">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
              Database Management<br />
              <span className="text-[#2563EB]">Made Simple</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-md">
              Connect, query, and manage multiple databases with a modern developer-focused interface.
            </p>
            
            {
}
            <div className="space-y-4">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="flex items-start gap-4 bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/20 dark:border-white/10">
                    <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{feature.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {
}
            <div className="mt-8 bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/20 dark:border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-gray-900 dark:text-white">Role-Based Access</span>
              </div>
              <div className="flex items-center gap-2">
                {roleFeatures.map((role, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span 
                      className="px-2.5 py-1 text-xs font-medium rounded-lg" 
                      style={{ backgroundColor: role.color + '20', color: role.color }}
                    >
                      {role.role}
                    </span>
                    {idx < roleFeatures.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {
}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-medium text-green-600 dark:text-green-400">All systems operational</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">v9.1.0 · Enterprise</span>
          </div>
        </div>
      </div>

      {
}
      <div className="flex-1 flex flex-col">
        {
}
        <div className="flex justify-end p-6">
          <button 
            onClick={toggleTheme} 
            className="p-3 rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/20 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/20 transition-colors shadow-lg"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md">
            {
}
            <div className="lg:hidden text-center mb-10">
              <div className="inline-flex items-center gap-3">
                <Logo className="w-10 h-10" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">DBLens</span>
              </div>
            </div>

            {
}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Enter your credentials to access your account</p>
            </div>

            {
}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-500/20 rounded-2xl">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {
}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your username"
                  disabled={loading}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                  <Link to="/forgot-password" className="text-sm text-[#2563EB] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 px-4 text-white font-medium bg-[#2563EB] hover:bg-[#1d4ed8] rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign in'}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-[#2563EB] hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

