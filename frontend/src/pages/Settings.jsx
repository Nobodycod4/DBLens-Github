import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon, Palette, Moon, Sun, User, Key, BookOpen, Gauge, Layers, FileText, Archive, Clock, Camera, Users, ChevronRight, List, LayoutGrid } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../contexts/PermissionContext';
import { getDefaultDBCredentials, putDefaultDBCredentials } from '../services/api';
import toast from 'react-hot-toast';

const GlassCard = ({ children, className = "", hover = true, padding = true }) => (
  <div className={`
    bg-white/80 dark:bg-[#1a1a2e]/80 
    backdrop-blur-xl 
    border border-white/20 dark:border-white/10
    rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20
    ${hover ? 'hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300' : ''}
    ${padding ? 'p-6' : ''}
    ${className}
  `}>
    {children}
  </div>
);

const settingsCategories = [
  {
    title: 'Content & documentation',
    items: [
      { name: 'Documentation', href: '/docs', icon: BookOpen, bg: 'bg-[#2563EB]', permission: 'documentation.view' },
    ],
  },
  {
    title: 'Performance & system health',
    items: [
      { name: 'Performance & System Health', href: '/performance', icon: Gauge, bg: 'bg-[#EA580C]', permission: 'performance.view' },
    ],
  },
  {
    title: 'Infrastructure',
    items: [
      { name: 'Connection Pool', href: '/connection-pool', icon: Layers, bg: 'bg-[#0891B2]', permission: 'system.pool' },
    ],
  },
  {
    title: 'Data & operations',
    items: [
      { name: 'Snapshots', href: '/snapshots', icon: Camera, bg: 'bg-[#EC4899]', permission: 'snapshots.view' },
      { name: 'Backups', href: '/backups', icon: Archive, bg: 'bg-[#F59E0B]', permission: 'backups.view' },
      { name: 'Schedules', href: '/schedules', icon: Clock, bg: 'bg-[#0891B2]', permission: 'schedules.view' },
    ],
  },
  {
    title: 'Security & audit',
    items: [
      { name: 'Audit Logs', href: '/audit-logs', icon: FileText, bg: 'bg-[#6366F1]', permission: 'audit.view' },
    ],
  },
  {
    title: 'Organization',
    items: [
      { name: 'Teams', href: '/teams', icon: Users, bg: 'bg-[#0891B2]', permission: 'teams.view', adminOnly: true },
    ],
  },
];

function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('dblens_settings_view_mode') || 'list';
    } catch {
      return 'list';
    }
  });
  const setViewModePersisted = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('dblens_settings_view_mode', mode);
    } catch (_) {}
  };
  const [defaultCreds, setDefaultCreds] = useState({ has_defaults: false, username: null });
  const [defaultUsername, setDefaultUsername] = useState('');
  const [defaultPassword, setDefaultPassword] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);
  let permissions = { hasPermission: () => true, isAdmin: () => false };
  try { const p = usePermissions(); if (p) permissions = p; } catch (e) {}

  useEffect(() => {
    getDefaultDBCredentials()
      .then((r) => {
        setDefaultCreds(r.data);
        if (r.data?.username) setDefaultUsername(r.data.username);
      })
      .catch(() => {});
  }, []);

  const allVisibleItems = settingsCategories.flatMap((category) => {
    const visible = category.items.filter(
      (item) => (!item.adminOnly || permissions.isAdmin()) && permissions.hasPermission(item.permission)
    );
    return visible.map((item) => ({ ...item, categoryTitle: category.title }));
  });

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#64748B] text-white shadow-lg">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Settings
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Manage preferences, account, and app modules</p>
        </div>
        {
}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/50 dark:border-white/10">
          <button
            type="button"
            onClick={() => setViewModePersisted('list')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            title="List view"
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewModePersisted('grid')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
            Grid
          </button>
        </div>
      </div>

      {
}
      {viewMode === 'list' && (
        <div className="mb-10 space-y-6">
          {settingsCategories.map((category) => {
            const visibleItems = category.items.filter(
              (item) => (!item.adminOnly || permissions.isAdmin()) && permissions.hasPermission(item.permission)
            );
            if (visibleItems.length === 0) return null;
            return (
              <GlassCard key={category.title} padding={false}>
                <div className="px-6 py-4 border-b border-gray-200/50 dark:border-white/10">
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {category.title}
                  </h2>
                </div>
                <div className="divide-y divide-gray-200/50 dark:divide-white/10">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl ${item.bg} text-white shadow-lg`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white group-hover:text-gray-800 dark:group-hover:text-gray-100">
                            {item.name}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                      </Link>
                    );
                  })}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {
}
      {viewMode === 'grid' && (
        <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allVisibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className="block"
              >
                <GlassCard className="h-full group hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${item.bg} text-white shadow-lg shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white group-hover:text-brand-primary transition-colors truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={item.categoryTitle}>
                        {item.categoryTitle}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 shrink-0 mt-0.5" />
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {
}
        <GlassCard padding={false}>
          <div className="px-6 py-5 border-b border-gray-200/50 dark:border-white/10">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#2563EB]" /> Profile
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#2563EB] flex items-center justify-center text-white text-2xl font-semibold">
                {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || user?.username?.slice(0, 2).toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.full_name || user?.username}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{user?.email}</p>
              </div>
            </div>
            <div className="pt-5 border-t border-gray-200/50 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Username</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-lg">{user?.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Role</span>
                <span className="px-3 py-1 bg-[#2563EB]/10 text-[#2563EB] rounded-lg text-sm font-medium">{user?.role || 'User'}</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {
}
        <GlassCard padding={false}>
          <div className="px-6 py-5 border-b border-gray-200/50 dark:border-white/10">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#64748B]" /> Appearance
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Choose light or dark mode</p>
              </div>
              <button 
                onClick={toggleTheme} 
                className={`relative w-16 h-8 rounded-full transition-colors ${isDark ? 'bg-[#2563EB]' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform flex items-center justify-center ${isDark ? 'translate-x-9' : 'translate-x-1'}`}>
                  {isDark ? <Moon className="w-3.5 h-3.5 text-[#2563EB]" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                </div>
              </button>
            </div>
            <div className="pt-5 border-t border-gray-200/50 dark:border-white/10">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Preview</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => !isDark || toggleTheme()}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${!isDark ? 'border-[#2563EB] shadow-lg shadow-[#2563EB]/20' : 'border-gray-200 dark:border-white/10 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Light</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 space-y-1.5">
                    <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-600 rounded"></div>
                    <div className="h-1.5 w-2/3 bg-gray-200 dark:bg-gray-600 rounded"></div>
                  </div>
                </button>
                <button 
                  onClick={() => isDark || toggleTheme()}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${isDark ? 'border-[#2563EB] shadow-lg shadow-[#2563EB]/20' : 'border-gray-200 dark:border-white/10 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Moon className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Dark</span>
                  </div>
                  <div className="bg-[#1a1a2e] rounded-lg p-2 space-y-1.5">
                    <div className="h-1.5 w-full bg-gray-700 rounded"></div>
                    <div className="h-1.5 w-2/3 bg-gray-700 rounded"></div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </GlassCard>

        {
}
        {permissions.isAdmin() && (
          <GlassCard padding={false}>
            <div className="px-6 py-5 border-b border-gray-200/50 dark:border-white/10">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" /> Default database credentials
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Used when creating a new database or running a migration (if not set, users are prompted)</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`px-2.5 py-1 rounded-lg text-sm font-medium ${defaultCreds.has_defaults ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                  {defaultCreds.has_defaults ? `Set (${defaultCreds.username || '—'})` : 'Not set'}
                </span>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!defaultUsername.trim()) { toast.error('Username required'); return; }
                  setSavingCreds(true);
                  try {
                    await putDefaultDBCredentials({ username: defaultUsername.trim(), password: defaultPassword || undefined });
                    toast.success('Default credentials saved');
                    const r = await getDefaultDBCredentials();
                    setDefaultCreds(r.data);
                    setDefaultPassword('');
                  } catch (err) {
                    toast.error(err.response?.data?.detail || 'Failed to save');
                  } finally {
                    setSavingCreds(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={defaultUsername}
                    onChange={(e) => setDefaultUsername(e.target.value)}
                    placeholder={defaultCreds.username || 'e.g. admin'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password (leave blank to keep existing)</label>
                  <input
                    type="password"
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingCreds || !defaultUsername.trim()}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white hover:bg-[#1d4ed8] disabled:opacity-50"
                >
                  {savingCreds ? 'Saving…' : 'Save default credentials'}
                </button>
              </form>
            </div>
          </GlassCard>
        )}

      </div>
    </div>
  );
}

export default Settings;

