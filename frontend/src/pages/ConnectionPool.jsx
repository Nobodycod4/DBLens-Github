
import { useState, useEffect } from 'react';
import { 
  Layers, 
  Database, 
  Activity, 
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Inbox
} from 'lucide-react';
import { getAllDatabases } from '../services/api';
import toast from 'react-hot-toast';

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

const ProgressRing = ({ value, max, size = 80, color = 'blue' }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const colors = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={colors[color]}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900 dark:text-white">{value}</span>
      </div>
    </div>
  );
};

const EmptyState = ({ title, description, icon: Icon }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-md">{description}</p>
  </div>
);

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
);

export default function ConnectionPool() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchConnections, 10000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await getAllDatabases();
      setConnections(response.data || []);
    } catch (error) {
      console.error('Failed to fetch connections');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchConnections();
    toast.success('Pool data refreshed');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'text-green-500 bg-green-100 dark:bg-green-900/30';
      case 'disconnected': return 'text-red-500 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-500 bg-gray-100 dark:bg-gray-800';
    }
  };

  const connectedCount = connections.filter(c => c.connection_status === 'connected').length;
  const totalCount = connections.length;

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#0891B2] text-white shadow-lg">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Connection Pool Manager
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Monitor and configure database connection pools</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-white/10 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 accent-cyan-500 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Auto-refresh</span>
            {autoRefresh && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live
              </span>
            )}
          </label>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0891B2] hover:bg-[#0e7490] text-white rounded-xl transition-all font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <GlassCard key={i}>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </GlassCard>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <GlassCard key={i}>
                <Skeleton className="h-48 w-full" />
              </GlassCard>
            ))}
          </div>
        </div>
      ) : connections.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={Inbox}
            title="No Database Connections"
            description="Add database connections to monitor and manage connection pools. Go to the Connections page to add your first database."
          />
        </GlassCard>
      ) : (
        <>
          {
}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Activity className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{connectedCount}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Connections</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Clock className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount - connectedCount}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Idle Connections</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Layers className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Connections</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Waiting Requests</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {
}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {connections.map(conn => (
              <GlassCard key={conn.id} className="overflow-hidden" padding={false}>
                {
}
                <div className="p-5 border-b border-gray-200/50 dark:border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#2563EB] text-white">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{conn.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{conn.host}:{conn.port}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(conn.connection_status)}`}>
                      {conn.connection_status === 'connected' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {conn.connection_status}
                    </span>
                  </div>
                </div>

                {
}
                <div className="p-5">
                  <div className="flex items-center justify-center gap-8 mb-6">
                    <div className="text-center">
                      <ProgressRing 
                        value={conn.connection_status === 'connected' ? 1 : 0} 
                        max={1} 
                        color={conn.connection_status === 'connected' ? 'green' : 'red'}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Status</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${conn.connection_status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {conn.connection_status === 'connected' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Type: {conn.db_type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Database</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {conn.database_name}
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          {
}
          <GlassCard className="mt-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 flex-shrink-0">
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Connection Pool Info</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connection pools help manage database connections efficiently. 
                  Each connection shown represents a configured database in your DBLens setup.
                </p>
              </div>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}

