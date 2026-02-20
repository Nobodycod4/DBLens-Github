import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../services/api';
import { 
  Database, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Server,
  Activity,
  Zap,
  Box,
  Leaf,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const GlassCard = ({ children, className = "", hover = true, padding = true }) => (
  <div className={`
    bg-white
    border border-gray-200
    rounded-2xl shadow-sm
    ${hover ? 'hover:shadow-md transition-shadow duration-200' : ''}
    ${padding ? 'p-6' : ''}
    ${className}
  `}>
    {children}
  </div>
);

const DatabaseTypeIcon = ({ type }) => (
  <div className="w-8 h-8 rounded-lg bg-[#2563eb]/10 flex items-center justify-center">
    {type?.toLowerCase() === 'mongodb' ? <Leaf className="w-4 h-4 text-[#2563eb]" /> :
     type?.toLowerCase() === 'sqlite' ? <Box className="w-4 h-4 text-[#2563eb]" /> :
     <Database className="w-4 h-4 text-[#2563eb]" />}
  </div>
);

const StatCard = ({ icon, title, value, trend }) => (
  <GlassCard>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-secondary">{value}</p>
        {trend && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {trend}
          </p>
        )}
      </div>
      <div className="w-14 h-14 rounded-2xl bg-[#2563eb]/10 flex items-center justify-center">
        <span className="text-[#2563eb]">{icon}</span>
      </div>
    </div>
  </GlassCard>
);

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDashboardStats();
      setStats(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary p-6 lg:p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary p-6 lg:p-8 flex items-center justify-center">
        <GlassCard className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-secondary mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={fetchStats}
            className="px-6 py-3 bg-[#2563eb] text-white rounded-xl hover:bg-[#1d4ed8] transition-colors font-medium"
          >
            Try Again
          </button>
        </GlassCard>
      </div>
    );
  }

  if (!stats || stats.total_connections === 0) {
    return (
      <div className="min-h-screen bg-primary p-6 lg:p-8 flex items-center justify-center">
        <GlassCard className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#2563eb]/10 flex items-center justify-center">
            <Database className="w-10 h-10 text-[#2563eb]" />
          </div>
          <h2 className="text-2xl font-bold text-secondary mb-2">Welcome to DBLens</h2>
          <p className="text-gray-500 mb-8">Get started by adding your first database connection</p>
          <Link 
            to="/connections" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2563eb] text-white rounded-xl hover:bg-[#1d4ed8] transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Connection
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#2563eb] text-white">
              <Server className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              DBLens Dashboard
            </h1>
          </div>
          <p className="text-gray-500 ml-12">Database Management Suite</p>
        </div>
        
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-secondary shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {
}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon={<Database className="w-6 h-6" />}
          title="Total Connections"
          value={stats.total_connections}
        />
        <StatCard 
          icon={<Activity className="w-6 h-6" />}
          title="Active"
          value={stats.active_connections}
        />
        <StatCard 
          icon={<Clock className="w-6 h-6" />}
          title="Recently Tested"
          value={stats.recently_tested}
        />
        <StatCard 
          icon={<CheckCircle className="w-6 h-6" />}
          title="Connected"
          value={stats.by_status?.connected || 0}
        />
      </div>

      {
}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {
}
        <GlassCard padding={false}>
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-secondary">Database Types</h2>
          </div>
          <div className="p-6 space-y-4">
            {Object.entries(stats.by_type || {}).length === 0 ? (
              <p className="text-gray-500 text-sm">No databases configured</p>
            ) : (
              Object.entries(stats.by_type || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <DatabaseTypeIcon type={type} />
                    <span className="text-secondary font-medium capitalize">{type}</span>
                  </div>
                  <span className="px-3 py-1 bg-secondaryAccent/10 text-secondaryAccent rounded-full text-sm font-semibold">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {
}
        <GlassCard padding={false}>
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-secondary">Connection Status</h2>
          </div>
          <div className="p-6 space-y-4">
            {Object.entries(stats.by_status || {}).length === 0 ? (
              <p className="text-gray-500 text-sm">No status data available</p>
            ) : (
              Object.entries(stats.by_status || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'connected' ? 'bg-green-500' :
                      status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-secondary font-medium capitalize">{status}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    status === 'connected' ? 'bg-green-100 text-green-700' :
                    status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {
}
      <GlassCard padding={false} className="overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-secondary">All Connections</h2>
          <Link 
            to="/connections" 
            className="flex items-center gap-1 text-sm font-medium text-secondaryAccent hover:text-[#0e7490] transition-colors"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Tested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.connections.map((conn) => (
                <tr key={conn.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-secondary">{conn.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-gray-500 uppercase">{conn.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      conn.status === 'connected'
                        ? 'bg-green-100 text-green-700'
                        : conn.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        conn.status === 'connected' ? 'bg-green-500' :
                        conn.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      {conn.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {conn.last_tested 
                        ? new Date(conn.last_tested).toLocaleString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })
                        : 'Never'
                      }
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {stats.connections.length === 0 && (
          <div className="p-12 text-center">
            <Database className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No connections yet</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default Dashboard;

