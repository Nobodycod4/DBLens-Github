import { useState, useEffect } from 'react';
import { Activity, Database, Clock, Zap, HardDrive, TrendingUp, RefreshCw, AlertCircle, Server, Gauge, BarChart3 } from 'lucide-react';
import apiService, { getAllDatabases } from '../services/api';
import { LineChart, BarChart, AreaChart } from '../components/MetricChart';
import toast from 'react-hot-toast';

const api = apiService.api;

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

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
);

export default function Monitoring() {
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [historicalMetrics, setHistoricalMetrics] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('current');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10);
  const [chartType, setChartType] = useState('line');

  useEffect(() => { fetchConnections(); }, []);
  useEffect(() => { 
    let interval; 
    if (autoRefresh && selectedConnection) { 
      interval = setInterval(() => fetchCurrentMetrics(selectedConnection.id), refreshInterval * 1000); 
    } 
    return () => clearInterval(interval); 
  }, [autoRefresh, refreshInterval, selectedConnection]);

  const fetchConnections = async () => { 
    try { 
      const response = await getAllDatabases(); 
      const activeConnections = response.data.filter(c => c.connection_status === 'connected');
      setConnections(activeConnections); 
      if (activeConnections.length > 0) { 
        const conn = activeConnections[0]; 
        setSelectedConnection(conn); 
        try {
          await api.post(`/health/collect/${conn.id}`);
        } catch (e) {
        }
        fetchCurrentMetrics(conn.id); 
        fetchHistoricalMetrics(conn.id); 
        fetchStats(conn.id); 
      } 
    } catch (err) { 
      console.error('Error fetching connections:', err); 
    } 
  };

  const fetchCurrentMetrics = async (connectionId) => { 
    setLoading(true); 
    setError(null); 
    try { 
      const response = await api.get(`/health/${connectionId}/current`); 
      setCurrentMetrics(response.data); 
    } catch (err) { 
      setError('No metrics available yet. Click "Collect Metrics" to start.'); 
      setCurrentMetrics(null); 
    } finally { 
      setLoading(false); 
    } 
  };

  const fetchHistoricalMetrics = async (connectionId, hours = 24) => { 
    try { 
      const response = await api.get(`/health/${connectionId}/history?hours=${hours}`); 
      setHistoricalMetrics(response.data); 
    } catch (err) { 
      console.error('Error fetching historical metrics:', err); 
    } 
  };

  const fetchStats = async (connectionId) => { 
    try { 
      const response = await api.get(`/health/${connectionId}/stats?hours=24`); 
      setStats(response.data); 
    } catch (err) { 
      console.error('Error fetching stats:', err); 
    } 
  };

  const collectMetrics = async () => { 
    if (!selectedConnection) return; 
    setLoading(true); 
    setError(null); 
    try { 
      await api.post(`/health/collect/${selectedConnection.id}`); 
      toast.success('Metrics collected!'); 
      await Promise.all([
        fetchCurrentMetrics(selectedConnection.id), 
        fetchHistoricalMetrics(selectedConnection.id), 
        fetchStats(selectedConnection.id)
      ]); 
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Failed to collect'); 
      setError(err.response?.data?.detail || 'Failed'); 
    } finally { 
      setLoading(false); 
    } 
  };

  const handleConnectionChange = async (conn) => { 
    setSelectedConnection(conn); 
    setLoading(true);
    try {
      await api.post(`/health/collect/${conn.id}`);
    } catch (e) {
    }
    fetchCurrentMetrics(conn.id); 
    fetchHistoricalMetrics(conn.id); 
    fetchStats(conn.id); 
  };

  const prepareChartData = (metricName) => ({ 
    labels: historicalMetrics.map(m => new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 
    values: historicalMetrics.map(m => m[metricName] || 0) 
  });

  const getWarningLevel = (value, threshold) => { 
    if (!value || !threshold) return 'normal'; 
    const pct = (value / threshold) * 100; 
    if (pct >= 90) return 'critical'; 
    if (pct >= 75) return 'warning'; 
    return 'normal'; 
  };

  const tabs = [
    { id: 'current', label: 'Current', icon: Gauge },
    { id: 'history', label: 'History', icon: BarChart3 },
    { id: 'stats', label: 'Statistics', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#EA580C] text-white shadow-lg">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Health Monitoring
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Monitor database performance and health</p>
        </div>
        
        <button 
          onClick={collectMetrics} 
          disabled={loading || !selectedConnection}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#EA580C] hover:bg-[#c2410c] text-white rounded-xl transition-all font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Collecting...' : 'Collect Metrics'}
        </button>
      </div>

      {
}
      <GlassCard className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Database:</label>
            <select 
              value={selectedConnection?.id || ''} 
              onChange={(e) => { 
                const conn = connections.find(c => c.id === parseInt(e.target.value)); 
                if (conn) handleConnectionChange(conn); 
              }} 
              className="px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {connections.map(conn => (
                <option key={conn.id} value={conn.id}>{conn.name} ({conn.db_type})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center cursor-pointer gap-2">
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)} 
                className="w-4 h-4 accent-purple-500 rounded" 
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Auto-refresh</span>
              {autoRefresh && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Live
                </span>
              )}
            </label>
            {autoRefresh && (
              <select 
                value={refreshInterval} 
                onChange={(e) => setRefreshInterval(Number(e.target.value))} 
                className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white"
              >
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1min</option>
                <option value={300}>5min</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Chart:</label>
            <select 
              value={chartType} 
              onChange={(e) => setChartType(e.target.value)} 
              className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white"
            >
              <option value="line">Line</option>
              <option value="bar">Bar</option>
              <option value="area">Area</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {
}
      {error && (
        <GlassCard className="mb-6 bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-500/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <p className="text-amber-700 dark:text-amber-400">{error}</p>
          </div>
        </GlassCard>
      )}

      {
}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-[#EA580C] text-white shadow-lg' 
                  : 'bg-white/80 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {
}
      {activeTab === 'current' && currentMetrics && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard 
              icon={<Database className="w-6 h-6" />} 
              title="Active Connections" 
              value={currentMetrics.active_connections} 
              max={currentMetrics.max_connections} 
              unit="conn" 
              warningLevel={getWarningLevel(currentMetrics.active_connections, currentMetrics.max_connections)}
              color="blue"
            />
            <MetricCard 
              icon={<Zap className="w-6 h-6" />} 
              title="Queries Per Second" 
              value={currentMetrics.queries_per_second?.toFixed(2)} 
              unit="qps"
              color="amber"
            />
            <MetricCard 
              icon={<Clock className="w-6 h-6" />} 
              title="Avg Query Time" 
              value={currentMetrics.avg_query_time_ms?.toFixed(2)} 
              unit="ms"
              color="teal"
            />
            <MetricCard 
              icon={<TrendingUp className="w-6 h-6" />} 
              title="Cache Hit Ratio" 
              value={currentMetrics.cache_hit_ratio?.toFixed(2)} 
              unit="%"
              color="green"
            />
            <MetricCard 
              icon={<HardDrive className="w-6 h-6" />} 
              title="Database Size" 
              value={currentMetrics.database_size_mb?.toFixed(2)} 
              unit="MB"
              color="indigo"
            />
            <MetricCard 
              icon={<Activity className="w-6 h-6" />} 
              title="Slow Queries" 
              value={currentMetrics.slow_query_count} 
              unit="queries"
              color="red"
            />
          </div>
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              Last updated: {new Date(currentMetrics.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {
}
      {activeTab === 'history' && (
        <div>
          {historicalMetrics.length === 0 ? (
            <GlassCard className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">No historical data</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Collect metrics multiple times to see trends</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                { key: 'avg_query_time_ms', title: 'Avg Query Time (ms)', color: 'rgb(168, 85, 247)' }, 
                { key: 'active_connections', title: 'Active Connections', color: 'rgb(59, 130, 246)' }, 
                { key: 'queries_per_second', title: 'Queries Per Second', color: 'rgb(234, 179, 8)' }, 
                { key: 'cache_hit_ratio', title: 'Cache Hit Ratio (%)', color: 'rgb(34, 197, 94)' }
              ].map(({ key, title, color }) => (
                <GlassCard key={key} hover={false} style={{ height: '350px' }}>
                  {chartType === 'line' && <LineChart data={prepareChartData(key)} title={title} color={color} animated />}
                  {chartType === 'bar' && <BarChart data={prepareChartData(key)} title={title} color={color} animated />}
                  {chartType === 'area' && <AreaChart data={prepareChartData(key)} title={title} color={color} animated />}
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {
}
      {activeTab === 'stats' && (
        <div>
          {!stats ? (
            <GlassCard className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">No statistics available</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard title="Total Samples" value={stats.total_samples} icon={<Activity className="w-6 h-6" />} color="blue" />
              <StatCard title="Avg Active Connections" value={stats.avg_active_connections.toFixed(1)} icon={<Database className="w-6 h-6" />} color="green" />
              <StatCard title="Avg Query Time" value={`${stats.avg_query_time.toFixed(2)} ms`} icon={<Clock className="w-6 h-6" />} color="teal" />
              <StatCard title="Avg Cache Hit Ratio" value={`${stats.avg_cache_hit_ratio.toFixed(2)}%`} icon={<TrendingUp className="w-6 h-6" />} color="amber" />
              <StatCard title="Peak Connections" value={stats.peak_connections} icon={<Server className="w-6 h-6" />} color="indigo" />
              <StatCard title="Total Slow Queries" value={stats.total_slow_queries} icon={<AlertCircle className="w-6 h-6" />} color="red" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, title, value, max, unit, warningLevel = 'normal', color = 'blue' }) {
  const percentage = max ? ((value / max) * 100).toFixed(1) : null;
  
  const colorConfig = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', gradient: 'from-blue-500/20 to-blue-600/5', bar: 'bg-blue-500' },
    green: { bg: 'bg-green-500/10', text: 'text-green-500', gradient: 'from-green-500/20 to-green-600/5', bar: 'bg-green-500' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', gradient: 'from-amber-500/20 to-amber-600/5', bar: 'bg-amber-500' },
    teal: { bg: 'bg-[#0891B2]/10', text: 'text-[#0891B2]', gradient: 'from-[#0891B2]/20 to-[#0891B2]/5', bar: 'bg-[#0891B2]' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', gradient: 'from-indigo-500/20 to-indigo-600/5', bar: 'bg-indigo-500' },
    red: { bg: 'bg-red-500/10', text: 'text-red-500', gradient: 'from-red-500/20 to-red-600/5', bar: 'bg-red-500' },
  };
  
  const { bg, text, bar } = colorConfig[color] || colorConfig.blue;
  
  const borderColors = { 
    normal: 'border-transparent', 
    warning: 'border-amber-500/50', 
    critical: 'border-red-500/50' 
  };

  return (
    <GlassCard className={`relative overflow-hidden ${borderColors[warningLevel]}`}>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center`}>
            <span className={text}>{icon}</span>
          </div>
          {warningLevel !== 'normal' && (
            <AlertCircle className={`w-5 h-5 ${warningLevel === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
          )}
        </div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {value !== null && value !== undefined ? value : 'N/A'}
          </span>
          {unit && <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>}
        </div>
        {max && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>{percentage}% used</span>
              <span>Max: {max}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className={`${bar} h-2 rounded-full transition-all`} style={{ width: `${Math.min(percentage, 100)}%` }} />
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function StatCard({ title, value, icon, color = 'blue' }) {
  const colorConfig = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', gradient: 'from-blue-500/20 to-blue-600/5' },
    green: { bg: 'bg-green-500/10', text: 'text-green-500', gradient: 'from-green-500/20 to-green-600/5' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', gradient: 'from-amber-500/20 to-amber-600/5' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', gradient: 'from-purple-500/20 to-purple-600/5' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', gradient: 'from-indigo-500/20 to-indigo-600/5' },
    red: { bg: 'bg-red-500/10', text: 'text-red-500', gradient: 'from-red-500/20 to-red-600/5' },
  };
  
  const { bg, text } = colorConfig[color] || colorConfig.blue;

  return (
    <GlassCard className="relative overflow-hidden">
      <div className="relative">
        <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center mb-4`}>
          <span className={text}>{icon}</span>
        </div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </GlassCard>
  );
}

