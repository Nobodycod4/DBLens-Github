
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Mail, ArrowLeft, Moon, Sun, CheckCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from '../components/Logo.jsx';

export default function ForgotPassword() {
  const { toggleTheme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      
      setSent(true);
      toast.success('Reset instructions sent!');
    } catch (err) {
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      {
}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#2563EB]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#0891B2]/10 rounded-full blur-3xl" />
      </div>

      {
}
      <div className="fixed top-6 right-6">
        <button 
          onClick={toggleTheme} 
          className="p-3 rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/20 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/20 transition-colors shadow-lg"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {
}
      <div className="relative w-full max-w-md">
        <div className="bg-white/80 dark:bg-[#1a1a2e]/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/40 p-8">
          {
}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
              <Logo className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {sent ? 'Check your inbox' : "Enter your email to receive reset instructions"}
            </p>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Check your email
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                We've sent password reset instructions to<br />
                <span className="font-medium text-gray-900 dark:text-white">{email}</span>
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => { setSent(false); setEmail(''); }}
                  className="w-full py-3 px-4 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                >
                  Try a different email
                </button>
                
                <Link
                  to="/login"
                  className="block w-full py-3 px-4 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium rounded-xl transition-all text-center"
                >
                  Back to Login
                </Link>
              </div>
              
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                Didn't receive the email?{' '}
                <button 
                  onClick={handleSubmit}
                  className="text-[#2563EB] hover:underline font-medium"
                >
                  Click to resend
                </button>
              </p>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter your email address"
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 text-white font-medium bg-[#2563EB] hover:bg-[#1d4ed8] rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Send Reset Instructions
                    </>
                  )}
                </button>
              </form>

              <Link
                to="/login"
                className="mt-6 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </>
          )}
        </div>

        {
}
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Need help?{' '}
          <a href="mailto:support@dblens.app" className="text-[#2563EB] hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}

