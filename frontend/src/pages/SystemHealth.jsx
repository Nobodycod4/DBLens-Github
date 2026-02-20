
import { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Wifi, 
  Activity,
  Server,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Inbox,
  Database
} from 'lucide-react';
import { getAllDatabases } from '../services/api';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const api = apiService.api;

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

const ProgressBar = ({ value, max = 100, color = 'blue', showLabel = true, label }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  const getColor = () => {
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'amber';
    return color;
  };

  return (
    <div>
      {showLabel && (
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-gray-600 dark:text-gray-400">{label}</span>
          <span className="font-medium text-gray-900 dark:text-white">{percentage.toFixed(1)}%</span>
        </div>
      )}
      <div className="h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colors[getColor()]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, unit, icon: Icon, bg }) => (
  <GlassCard>
    <div className="flex items-start justify-between mb-4">
      <div className={`p-2.5 rounded-xl ${bg || 'bg-[#2563EB]'}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
    <div className="mb-1">
      <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
      <span className="text-gray-500 dark:text-gray-400 ml-1">{unit}</span>
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
  </GlassCard>
);

export default function SystemHealth({ embedded = false }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [backendHealth, setBackendHealth] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchData, 10000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const connResponse = await getAllDatabases();
      setConnections(connResponse.data || []);

      try {
        const healthResponse = await api.get('/health');
        setBackendHealth(healthResponse.data);
      } catch {
        setBackendHealth({ status: 'unknown' });
      }
    } catch (error) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('System data refreshed');
  };

  const connectedCount = connections.filter(c => c.connection_status === 'connected').length;
  const isHealthy = backendHealth?.status === 'ok' || backendHealth?.status === 'healthy';

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#EA580C] text-white shadow-lg">
              <HeartPulse className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              System Health
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Server resources, performance metrics, and service status</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-white/10 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 accent-rose-500 rounded"
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
            className="flex items-center gap-2 px-5 py-2.5 bg-[#EA580C] hover:bg-[#c2410c] text-white rounded-xl transition-all font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <GlassCard>
            <Skeleton className="h-16 w-full" />
          </GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <GlassCard key={i}>
                <Skeleton className="h-20 w-full" />
              </GlassCard>
            ))}
          </div>
        </div>
      ) : (
        <>
          {
}
          <GlassCard className={`mb-8 ${isHealthy ? 'border-green-200 dark:border-green-500/20' : 'border-amber-200 dark:border-amber-500/20'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isHealthy ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                  {isHealthy ? (
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    System Status: <span className={isHealthy ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                      {isHealthy ? 'Healthy' : 'Unknown'}
                    </span>
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {connectedCount} of {connections.length} databases connected
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isHealthy ? 'bg-green-400' : 'bg-amber-400'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isHealthy ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Live</span>
              </div>
            </div>
          </GlassCard>

          {
}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Databases"
              value={connections.length}
              unit="total"
              icon={Database}
              color="from-blue-500 to-blue-600"
            />
            <MetricCard
              title="Connected"
              value={connectedCount}
              unit="active"
              icon={Wifi}
              bg="bg-[#059669]"
            />
            <MetricCard
              title="Disconnected"
              value={connections.length - connectedCount}
              unit="offline"
              icon={AlertTriangle}
              bg="bg-[#EA580C]"
            />
            <MetricCard
              title="Backend"
              value={isHealthy ? 'Online' : 'Unknown'}
              unit=""
              icon={Server}
              bg="bg-[#6366F1]"
            />
          </div>

          {
}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {
}
            <GlassCard padding={false}>
              <div className="p-6 border-b border-gray-200/50 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10">
                    <Database className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Database Connections</h3>
                </div>
              </div>
              
              {connections.length === 0 ? (
                <div className="p-12 text-center">
                  <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No databases configured</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200/50 dark:divide-white/10">
                  {connections.map((conn) => (
                    <div key={conn.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          conn.connection_status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{conn.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {conn.db_type} · {conn.host}:{conn.port}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        conn.connection_status === 'connected' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {conn.connection_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {
}
            <GlassCard padding={false}>
              <div className="p-6 border-b border-gray-200/50 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-500/10">
                    <Server className="w-5 h-5 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Backend Services</h3>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200/50 dark:divide-white/10">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">API Server</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">localhost:8000</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    isHealthy 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  }`}>
                    {isHealthy ? 'running' : 'checking...'}
                  </span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Frontend</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">localhost:5173</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    running
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}

