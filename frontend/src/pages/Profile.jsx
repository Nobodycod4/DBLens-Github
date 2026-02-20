
import { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Key, 
  Shield, 
  Clock, 
  Activity,
  Monitor,
  Smartphone,
  Globe,
  LogOut,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Crown,
  Edit3,
  Save,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../contexts/PermissionContext';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const api = apiService.api;

const getErrorMessage = (error, defaultMsg = 'An error occurred') => {
  const detail = error.response?.data?.detail;
  if (!detail) return defaultMsg;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
  }
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return defaultMsg;
};

const GlassCard = ({ children, className = "", padding = true }) => (
  <div className={`
    bg-white/80 dark:bg-[#1a1a2e]/80 
    backdrop-blur-xl 
    border border-white/20 dark:border-white/10
    rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20
    ${padding ? 'p-6' : ''}
    ${className}
  `}>
    {children}
  </div>
);

const TabButton = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
      active 
        ? 'bg-[#2563EB] text-white shadow-lg' 
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
    }`}
  >
    <Icon className="w-4 h-4" />
    {children}
  </button>
);

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: ''
  });
  const [editingProfile, setEditingProfile] = useState(false);
  
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  const [activities, setActivities] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  let permissions = { isSuperAdmin: () => false, userInfo: { highestRole: 'user' }, getRoleColor: () => '#3B82F6' };
  try { const p = usePermissions(); if (p) permissions = p; } catch (e) {}
  const { isSuperAdmin, userInfo, getRoleColor } = permissions;

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions();
    if (activeTab === 'activity') fetchActivity();
  }, [activeTab]);

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await api.get('/auth/sessions');
      setSessions(response.data?.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchActivity = async () => {
    try {
      setLoadingActivity(true);
      const response = await api.get('/auth/activity');
      setActivities(response.data?.activities || []);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
      setActivities([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.put('/auth/profile', profileForm);
      toast.success('Profile updated successfully');
      setEditingProfile(false);
      if (refreshUser) refreshUser();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update profile'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    try {
      setLoading(true);
      await api.post('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to change password'));
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      toast.success('Session revoked');
      fetchSessions();
    } catch (error) {
      toast.error('Failed to revoke session');
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await api.delete('/auth/sessions/all');
      toast.success('All other sessions revoked');
      fetchSessions();
    } catch (error) {
      toast.error('Failed to revoke sessions');
    }
  };

  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return Monitor;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return Smartphone;
    }
    return Monitor;
  };

  const getBrowserName = (userAgent) => {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Browser';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
  };

  const getActionColor = (actionType) => {
    const colors = {
      'LOGIN': 'text-green-500',
      'LOGOUT': 'text-gray-500',
      'CREATE': 'text-blue-500',
      'UPDATE': 'text-amber-500',
      'DELETE': 'text-red-500',
      'EXECUTE': 'text-purple-500',
      'PASSWORD_CHANGE': 'text-orange-500',
      'BACKUP': 'text-cyan-500',
      'RESTORE': 'text-teal-500',
      'MIGRATE': 'text-violet-500',
    };
    return colors[actionType] || 'text-gray-500';
  };

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        {
}
        <GlassCard className="lg:w-80">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-[#2563EB] flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
              {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || user?.username?.slice(0, 2).toUpperCase() || '??'}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {user?.full_name || user?.username || 'User'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">@{user?.username}</p>
            
            {
}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{
              backgroundColor: `${getRoleColor(userInfo?.highestRole)}10`,
              borderColor: `${getRoleColor(userInfo?.highestRole)}30`
            }}>
              {isSuperAdmin() ? (
                <Crown className="w-4 h-4 text-red-500" />
              ) : (
                <Shield className="w-4 h-4" style={{ color: getRoleColor(userInfo?.highestRole) }} />
              )}
              <span className="text-sm font-medium capitalize" style={{ color: getRoleColor(userInfo?.highestRole) }}>
                {userInfo?.highestRole?.replace('_', ' ') || 'User'}
              </span>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-white/10 space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Last login {user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Unknown'}</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {
}
        <div className="flex-1">
          {
}
          <div className="flex flex-wrap gap-2 mb-6">
            <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={User}>
              Profile
            </TabButton>
            <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={Key}>
              Security
            </TabButton>
            <TabButton active={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')} icon={Monitor}>
              Sessions
            </TabButton>
            <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} icon={Activity}>
              Activity
            </TabButton>
          </div>

          {
}
          {activeTab === 'profile' && (
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Update your personal information</p>
                </div>
                {!editingProfile && (
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      disabled
                      className="w-full px-4 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      disabled={!editingProfile}
                      className={`w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl ${
                        editingProfile 
                          ? 'bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/50' 
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    disabled={!editingProfile}
                    placeholder="Enter your full name"
                    className={`w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl ${
                      editingProfile 
                        ? 'bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/50' 
                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 cursor-not-allowed'
                    }`}
                  />
                </div>

                {editingProfile && (
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProfile(false);
                        setProfileForm({ full_name: user?.full_name || '', email: user?.email || '' });
                      }}
                      className="px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            </GlassCard>
          )}

          {
}
          {activeTab === 'security' && (
            <GlassCard>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Update your password to keep your account secure</p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Passwords do not match
                    </p>
                  )}
                  {passwordForm.confirm_password && passwordForm.new_password === passwordForm.confirm_password && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || passwordForm.new_password !== passwordForm.confirm_password}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl disabled:opacity-50 mt-4"
                >
                  <Key className="w-4 h-4" />
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </GlassCard>
          )}

          {
}
          {activeTab === 'sessions' && (
            <GlassCard padding={false}>
              <div className="p-6 border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Sessions</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage your logged-in devices</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchSessions}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingSessions ? 'animate-spin' : ''}`} />
                  </button>
                  {sessions.length > 1 && (
                    <button
                      onClick={handleRevokeAllSessions}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <LogOut className="w-4 h-4" />
                      Revoke All Others
                    </button>
                  )}
                </div>
              </div>

              {loadingSessions ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">Loading sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-8 text-center">
                  <Monitor className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No active sessions found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200/50 dark:divide-white/10">
                  {sessions.filter(s => s.token_type === 'access').map(session => {
                    const DeviceIcon = getDeviceIcon(session.user_agent);
                    return (
                      <div key={session.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/10">
                              <DeviceIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {getBrowserName(session.user_agent)}
                                </h4>
                                {!session.is_expired && (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  {session.ip_address || 'Unknown IP'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(session.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleRevokeSession(session.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="Revoke session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          )}

          {
}
          {activeTab === 'activity' && (
            <GlassCard padding={false}>
              <div className="p-6 border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your recent actions and events</p>
                </div>
                <button
                  onClick={fetchActivity}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingActivity ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingActivity ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">Loading activity...</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="p-8 text-center">
                  <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No recent activity found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200/50 dark:divide-white/10 max-h-[500px] overflow-y-auto">
                  {activities.map(activity => (
                    <div key={activity.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-white/5">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${activity.success ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                          {activity.success ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium uppercase ${getActionColor(activity.action_type)}`}>
                              {activity.action_type}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{activity.resource_type}</span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {activity.action_description || activity.resource_name || 'Action performed'}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(activity.created_at)}
                            </span>
                            {activity.ip_address && (
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {activity.ip_address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

