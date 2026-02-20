import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Database, LayoutDashboard, List, Code, Settings, Menu, X, Activity, FileText, Archive, Network, Clock, RefreshCw, Camera, LogOut, ChevronDown, Shield, Search, Moon, Sun, ChevronRight, Keyboard, Command, BookOpen, Gauge, Layers, Users, HeartPulse, Server, Zap, Bell, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAppStore } from '../store/useStore';
import { usePermissions } from '../contexts/PermissionContext';
import GlobalSearch from './GlobalSearch.jsx';
import ShortcutsModal from './ShortcutsModal';
import OnboardingTour from './OnboardingTour';
import NotificationsCenter from './NotificationsCenter';
import OrgSwitcher from './OrgSwitcher.jsx';
import Logo from './Logo.jsx';

function Layout({ children }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const userMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated: authCheck } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  
  let permissions = { 
    isAdmin: () => false, 
    isSuperAdmin: () => false, 
    hasPermission: () => true,
    canManageRoles: () => false,
    userInfo: { highestRole: 'viewer', highestLevel: 20 },
    getRoleColor: () => '#6B7280'
  };
  try { 
    const p = usePermissions(); 
    if (p) permissions = p; 
  } catch (e) {}
  
  const { isAdmin, isSuperAdmin, hasPermission, canManageRoles, userInfo, getRoleColor } = permissions;

  useKeyboardShortcuts({ 'search': () => setSearchOpen(true), 'sidebar': toggleSidebar, 'darkmode': toggleTheme, 'help': () => setShortcutsOpen(true), 'close': () => { setSearchOpen(false); setShortcutsOpen(false); setUserMenuOpen(false); }, 'nav-dashboard': () => navigate('/'), 'nav-connections': () => navigate('/connections') }, [navigate, toggleTheme, toggleSidebar]);

  useEffect(() => { const h = (e) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const getUserInitials = () => { if (!user) return '?'; if (user.full_name) return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); return user.username?.slice(0, 2).toUpperCase() || '?'; };

  const allNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, bg: 'bg-[#2563EB]', permission: 'dashboard.view' },
    { name: 'Connections', href: '/connections', icon: Database, bg: 'bg-[#0891B2]', permission: 'connections.view' },
    { name: 'Schema Viewer', href: '/schema', icon: List, bg: 'bg-[#0D9488]', permission: 'schema.view' },
    { name: 'Schema Diagram', href: '/schema-diagram', icon: Network, bg: 'bg-[#0D9488]', permission: 'schema.diagram' },
    { name: 'Query Editor', href: '/query', icon: Code, bg: 'bg-[#059669]', permission: 'query.execute' },
    { name: 'Monitoring', href: '/monitoring', icon: Activity, bg: 'bg-[#EA580C]', permission: 'monitoring.view' },
    { name: 'Migration', href: '/migration', icon: RefreshCw, bg: 'bg-[#2563EB]', permission: 'migrations.view' },
    { name: 'Settings', href: '/settings', icon: Settings, bg: 'bg-[#64748B]', permission: 'settings.view' },
  ];

  const navigation = allNavigation.filter(item => {
    if (item.adminOnly && !isAdmin()) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  const adminNavigation = canManageRoles() ? [
    { name: 'Role Management', href: '/roles', icon: Shield, bg: 'bg-[#DC2626]' }
  ] : [];
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-primary transition-colors duration-300">
      {
}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}`}>
        <div className="h-full flex flex-col bg-white/90 dark:bg-[#1a1a2e]/95 backdrop-blur-xl border-r border-gray-200/80 dark:border-white/10 rounded-r-2xl shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden">
          {
}
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center px-3' : 'px-5'} h-16 border-b border-gray-200/50 dark:border-white/10`}>
            <Link to="/" className="flex items-center gap-3">
              <Logo className="w-9 h-9" />
              {!sidebarCollapsed && (
                <span className="font-bold text-lg text-secondary">
                  DBLens
                </span>
              )}
            </Link>
          </div>

          {
}
          {!sidebarCollapsed && (
            <div className="px-4 py-4">
              <button 
                onClick={() => setSearchOpen(true)} 
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-100/80 dark:bg-white/5 hover:bg-gray-200/80 dark:hover:bg-white/10 border border-gray-200/50 dark:border-white/10 rounded-xl transition-all"
              >
                <Search className="w-4 h-4" />
                <span className="flex-1 text-left">Search...</span>
                <kbd className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-mono bg-white dark:bg-white/10 rounded-lg shadow-sm">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
              </button>
            </div>
          )}

          {
}
          <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              if (item.comingSoon) {
                return (
                  <div 
                    key={item.name} 
                    title={sidebarCollapsed ? `${item.name} (Coming Soon)` : undefined}
                    className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''} gap-3 px-3 py-2.5 rounded-xl text-sm cursor-not-allowed opacity-40`}
                  >
                    <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5">
                      <Icon className="w-4 h-4 text-gray-400" />
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex items-center justify-between flex-1">
                        <span className="text-gray-500 dark:text-gray-400">{item.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md font-medium">Soon</span>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link 
                  key={item.name} 
                  to={item.href} 
                  title={sidebarCollapsed ? item.name : undefined}
                  className={`group flex items-center ${sidebarCollapsed ? 'justify-center' : ''} gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    active ? 'bg-[#2563EB]/10' : 'hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg transition-all ${
                    active ? `${item.bg} shadow-lg` : 'bg-gray-100 dark:bg-white/10 group-hover:bg-gray-200 dark:group-hover:bg-white/15'
                  }`}>
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                  </div>
                  {!sidebarCollapsed && (
                    <span className={`font-medium ${active ? 'text-secondary' : 'text-gray-600 dark:text-gray-400 group-hover:text-secondary dark:group-hover:text-white'}`}>
                      {item.name}
                    </span>
                  )}
                </Link>
              );
            })}

            {
}
            {adminNavigation.length > 0 && (
              <>
                <div className={`${sidebarCollapsed ? 'hidden' : ''} px-3 pt-4 pb-2`}>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Admin</p>
                </div>
                {adminNavigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link 
                      key={item.name} 
                      to={item.href}
                      title={sidebarCollapsed ? item.name : undefined}
                      className={`group flex items-center ${sidebarCollapsed ? 'justify-center' : ''} gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                        active ? 'bg-[#DC2626]/10' : 'hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg transition-all ${
                        active ? `${item.bg} shadow-lg` : 'bg-gray-100 dark:bg-white/10 group-hover:bg-gray-200 dark:group-hover:bg-white/15'
                      }`}>
                        <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                      </div>
                      {!sidebarCollapsed && (
                        <span className={`font-medium ${active ? 'text-secondary' : 'text-gray-600 dark:text-gray-400 group-hover:text-secondary dark:group-hover:text-white'}`}>
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {
}
          <div className={`p-4 border-t border-gray-200/50 dark:border-white/10 ${sidebarCollapsed ? 'text-center' : ''}`}>
            {!sidebarCollapsed ? (
              <div className="space-y-3">
                {
}
                {userInfo?.highestRole && userInfo.highestRole !== 'guest' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10">
                    {isSuperAdmin() ? (
                      <Crown className="w-4 h-4 text-red-500" />
                    ) : (
                      <Shield className="w-4 h-4" style={{ color: getRoleColor(userInfo.highestRole) }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize truncate">
                        {userInfo.highestRole.replace('_', ' ')}
                      </p>
                    </div>
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: getRoleColor(userInfo.highestRole) }}
                    />
                  </div>
                )}
                {
}
                <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#059669] flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">DBLens v9.1.0</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Enterprise Edition</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {isSuperAdmin() && (
                  <div className="w-8 h-8 mx-auto rounded-lg bg-[#DC2626] flex items-center justify-center" title="Super Admin">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="w-8 h-8 mx-auto rounded-lg bg-[#059669] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">9.1</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {
}
      <div className={`transition-all duration-300 min-h-screen ${sidebarCollapsed ? 'ml-[72px]' : 'ml-64'}`}>
        {
}
        <header className="sticky top-0 z-30">
          <div className="h-16 px-5 flex items-center justify-between bg-white/90 dark:bg-[#1a1a2e]/95 backdrop-blur-xl border-b border-r border-t border-gray-200/80 dark:border-white/10 rounded-tr-2xl rounded-bl-2xl rounded-br-2xl shadow-lg shadow-black/5 dark:shadow-black/20">
            {
}
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleSidebar} 
                className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </button>
              
              {
}
              <nav className="hidden md:flex items-center text-sm">
                <Link to="/" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                  Home
                </Link>
                {location.pathname !== '/' && (
                  <>
                    <ChevronRight className="w-4 h-4 mx-2 text-gray-300 dark:text-gray-600" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {location.pathname.split('/').filter(Boolean).map(s => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(' / ')}
                    </span>
                  </>
                )}
              </nav>
            </div>

            {
}
            <div className="flex items-center gap-2">
              {
}
              <OrgSwitcher />
              {
}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#059669]/10 border border-[#059669]/20 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400">Online</span>
              </div>

              {
}
              <span className="hidden lg:block text-sm text-gray-500 dark:text-gray-400 px-3">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>

              {
}
              <div className="hidden lg:block h-6 w-px bg-gray-200 dark:bg-white/10"></div>

              {
}
              <NotificationsCenter />

              {
}
              <button 
                onClick={() => setShortcutsOpen(true)} 
                className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title="Keyboard Shortcuts"
              >
                <Keyboard className="w-4 h-4" />
              </button>

              {
}
              <button 
                onClick={toggleTheme} 
                className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title={isDark ? 'Light Mode' : 'Dark Mode'}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              {
}
              <div className="relative ml-2" ref={userMenuRef}>
                <button 
                  onClick={() => setUserMenuOpen(!userMenuOpen)} 
                  className="flex items-center gap-3 p-1.5 pl-3 pr-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200/50 dark:border-white/10 transition-colors"
                >
                  <div className="hidden md:block text-left">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Logged in as
                    </p>
                    <p className="text-sm font-medium text-secondary leading-tight">
                      {user?.full_name || user?.username || userInfo?.highestRole?.replace('_', ' ') || 'User'}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center text-white text-sm font-semibold">
                    {getUserInitials()}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {
}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white/95 dark:bg-[#1a1a2e]/95 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/30 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {
}
                    <div className="px-4 py-3 border-b border-gray-200/50 dark:border-white/10">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Account</p>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#2563EB] flex items-center justify-center text-white text-lg font-semibold">
                          {getUserInitials()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-secondary truncate">{user?.full_name || user?.username || 'User'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || ''}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {isSuperAdmin() ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-full">
                                <Crown className="w-3 h-3 text-red-500" />
                                <span className="text-[10px] font-medium text-red-600 dark:text-red-400">Super Admin</span>
                              </span>
                            ) : (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border"
                                style={{ 
                                  backgroundColor: `${getRoleColor(userInfo?.highestRole)}10`,
                                  borderColor: `${getRoleColor(userInfo?.highestRole)}30`
                                }}
                              >
                                <Shield className="w-3 h-3" style={{ color: getRoleColor(userInfo?.highestRole) }} />
                                <span 
                                  className="text-[10px] font-medium capitalize"
                                  style={{ color: getRoleColor(userInfo?.highestRole) }}
                                >
                                  {userInfo?.highestRole?.replace('_', ' ') || 'User'}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {
}
                    <div className="py-2 px-2">
                      <Link 
                        to="/profile" 
                        onClick={() => setUserMenuOpen(false)} 
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        My Profile
                      </Link>
                      <Link 
                        to="/settings" 
                        onClick={() => setUserMenuOpen(false)} 
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        App Settings
                      </Link>
                      {canManageRoles() && (
                        <Link 
                          to="/roles" 
                          onClick={() => setUserMenuOpen(false)} 
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Role Management
                        </Link>
                      )}
                    </div>

                    {
}
                    <div className="border-t border-gray-200/50 dark:border-white/10 pt-2 px-2">
                      <button 
                        onClick={handleLogout} 
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {
}
        <main className="p-4">
          {children}
        </main>
      </div>

      {
}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <OnboardingTour />
    </div>
  );
}

export default Layout;

