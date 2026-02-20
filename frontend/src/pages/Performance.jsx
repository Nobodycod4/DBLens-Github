
import { useState, useEffect } from 'react';
import { 
  Gauge, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Database,
  Zap,
  Timer,
  BarChart3,
  Activity,
  RefreshCw,
  Inbox
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

const StatCard = ({ title, value, icon: Icon, bg }) => (
  <GlassCard>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${bg || 'bg-[#2563EB]'}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </GlassCard>
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

export default function Performance({ embedded = false }) {
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [slowQueries, setSlowQueries] = useState([]);
  const [stats, setStats] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchConnections();
    fetchPerformanceData();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchPerformanceData, 10000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, selectedConnection]);

  const fetchConnections = async () => {
    try {
      const response = await getAllDatabases();
      setConnections(response.data || []);
    } catch (error) {
      console.error('Failed to fetch connections');
    }
  };

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      try {
        const metricsResponse = await api.get('/health/performance-stats');
        setStats(metricsResponse.data);
      } catch {
        setStats(null);
      }

      try {
        const slowQueriesResponse = await api.get('/health/slow-queries');
        setSlowQueries(slowQueriesResponse.data || []);
      } catch {
        setSlowQueries([]);
      }
    } catch (error) {
      console.error('Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchPerformanceData();
    toast.success('Performance data refreshed');
  };

  return (
    <div className={embedded ? '' : 'min-h-screen bg-primary p-6 lg:p-8'}>
      {!embedded && (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#EA580C] text-white shadow-lg">
              <Gauge className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Performance Analytics
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Query performance and optimization insights</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-white/10 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 accent-orange-500 rounded"
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

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2.5 bg-white/80 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white"
          >
            <option value="1h">Last 1 hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#EA580C] hover:bg-[#c2410c] text-white rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <GlassCard key={i}>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </GlassCard>
            ))}
          </div>
          <GlassCard>
            <Skeleton className="h-64 w-full" />
          </GlassCard>
        </div>
      ) : !stats && slowQueries.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={Inbox}
            title="No Performance Data Available"
            description="Performance metrics will appear here once you start executing queries on your connected databases. Connect a database and run some queries to see analytics."
          />
        </GlassCard>
      ) : (
        <>
          {
}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard 
              title="Total Queries" 
              value={stats?.totalQueries?.toLocaleString() || '0'} 
              icon={BarChart3} 
              bg="bg-[#2563EB]" 
            />
            <StatCard 
              title="Avg Response" 
              value={`${stats?.avgResponseTime || 0}ms`} 
              icon={Timer} 
              bg="bg-[#059669]" 
            />
            <StatCard 
              title="Slow Queries" 
              value={slowQueries.length} 
              icon={AlertTriangle} 
              bg="bg-[#EA580C]" 
            />
            <StatCard 
              title="Active Connections" 
              value={connections.filter(c => c.connection_status === 'connected').length} 
              icon={Activity} 
              bg="bg-[#6366F1]" 
            />
          </div>

          {
}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {
}
            <div className="lg:col-span-2">
              <GlassCard padding={false}>
                <div className="p-6 border-b border-gray-200/50 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10">
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Slow Queries</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Queries exceeding 500ms threshold</p>
                    </div>
                  </div>
                </div>

                {slowQueries.length === 0 ? (
                  <div className="p-12 text-center">
                    <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No slow queries detected</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Great! Your queries are performing well.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200/50 dark:divide-white/10">
                    {slowQueries.map((query, idx) => (
                      <div key={idx} className="p-4 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <code className="flex-1 text-sm font-mono text-gray-700 dark:text-gray-300 line-clamp-2">
                            {query.query}
                          </code>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                            query.duration > 2000 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                              : query.duration > 1000 
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          }`}>
                            {query.duration}ms
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Database className="w-3.5 h-3.5" />
                            {query.database}
                          </span>
                          <span>{query.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>

            {
}
            <div className="space-y-6">
              {
}
              <GlassCard>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Connected Databases</h3>
                {connections.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No databases connected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {connections.slice(0, 5).map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            conn.connection_status === 'connected' ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">{conn.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">{conn.db_type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {
}
              <GlassCard>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Optimization Tips</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-500/20">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium text-blue-600 dark:text-blue-400">Tip:</span> Add indexes on frequently queried columns to improve performance.
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200/50 dark:border-purple-500/20">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium text-purple-600 dark:text-purple-400">Tip:</span> Use EXPLAIN to analyze slow queries and identify bottlenecks.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

