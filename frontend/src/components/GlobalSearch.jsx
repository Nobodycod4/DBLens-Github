import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Database, List, Code, Settings, Activity, FileText, Archive, Clock, RefreshCw, Camera, X, LayoutDashboard, Network, Shield, ArrowRight, Users, Gauge } from 'lucide-react';

const pages = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, keywords: ['home', 'overview'], color: 'from-brand-primary to-brand-primary-hover' },
  { name: 'Connections', path: '/connections', icon: Database, keywords: ['database', 'connect', 'server'], color: 'from-brand-primary to-brand-primary-light' },
  { name: 'Schema Viewer', path: '/schema', icon: List, keywords: ['tables', 'columns', 'structure'], color: 'from-brand-primary to-brand-primary-hover' },
  { name: 'Schema Diagram', path: '/schema-diagram', icon: Network, keywords: ['erd', 'diagram', 'visual'], color: 'from-brand-primary to-brand-primary-light' },
  { name: 'Query Editor', path: '/query', icon: Code, keywords: ['sql', 'execute', 'run'], color: 'from-brand-primary to-brand-primary-hover' },
  { name: 'Monitoring', path: '/monitoring', icon: Activity, keywords: ['health', 'metrics', 'status'], color: 'from-brand-primary to-brand-primary-light' },
  { name: 'Migration', path: '/migration', icon: RefreshCw, keywords: ['migrate', 'transfer', 'move'], color: 'from-brand-primary to-brand-primary-hover' },
  { name: 'Settings', path: '/settings', icon: Settings, keywords: ['profile', 'preferences', 'config', 'documentation', 'performance', 'backups', 'audit', 'teams'], color: 'from-gray-500 to-gray-700' },
  { name: 'Performance & System Health', path: '/performance', icon: Gauge, keywords: ['performance', 'health', 'system', 'metrics'], color: 'from-orange-500 to-rose-600' },
  { name: 'Documentation', path: '/docs', icon: FileText, keywords: ['docs', 'documentation'], color: 'from-brand-primary to-brand-primary-light' },
  { name: 'Connection Pool', path: '/connection-pool', icon: Database, keywords: ['pool', 'connections'], color: 'from-brand-primary to-brand-primary-light' },
  { name: 'Snapshots', path: '/snapshots', icon: Camera, keywords: ['snapshot', 'point-in-time'], color: 'from-pink-500 to-rose-600' },
  { name: 'Backups', path: '/backups', icon: Archive, keywords: ['backup', 'restore', 'save'], color: 'from-amber-500 to-orange-600' },
  { name: 'Schedules', path: '/schedules', icon: Clock, keywords: ['schedule', 'cron', 'automatic'], color: 'from-brand-primary to-brand-primary-light' },
  { name: 'Audit Logs', path: '/audit-logs', icon: FileText, keywords: ['history', 'activity', 'log', 'audit'], color: 'from-brand-primary to-brand-primary-light' },
  { name: 'Teams', path: '/teams', icon: Users, keywords: ['teams', 'users', 'members'], color: 'from-brand-primary to-brand-primary-hover' },
  { name: 'Role Management', path: '/roles', icon: Shield, keywords: ['rbac', 'permissions', 'admin', 'users'], color: 'from-brand-primary to-brand-primary-hover' },
];

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const results = query.trim()
    ? pages.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.keywords.some(k => k.toLowerCase().includes(query.toLowerCase()))
      )
    : pages;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[selectedIndex]) { navigate(results[selectedIndex].path); onClose(); }
    else if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[12vh] z-50" onClick={onClose}>
      <div
        className="bg-white/95 dark:bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl w-full max-w-xl shadow-2xl shadow-black/20 dark:shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-200/50 dark:border-white/10">
          <div className="p-2 rounded-xl bg-brand-primary text-white">
            <Search className="w-5 h-5" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, features..."
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base outline-none"
          />
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">No results found for &quot;{query}&quot;</p>
            </div>
          ) : (
            <div className="px-2">
              {results.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); onClose(); }}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-brand-primary/10 dark:bg-brand-primary/20'
                        : 'hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${isSelected ? `bg-gradient-to-br ${item.color} shadow-lg` : 'bg-gray-100 dark:bg-white/10'}`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                    </div>
                    <span className={`flex-1 font-medium ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                      {item.name}
                    </span>
                    {isSelected && (
                      <ArrowRight className="w-4 h-4 text-brand-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

