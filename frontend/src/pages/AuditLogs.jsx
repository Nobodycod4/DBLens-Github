import { useState, useEffect } from 'react';
import { getAuditLogs, getAllDatabases } from '../services/api';
import { Filter, Search, Download, Eye, AlertCircle, CheckCircle, XCircle, Upload, ChevronLeft, ChevronRight, FileText, Clock, User, Activity } from 'lucide-react';
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

const StatCard = ({ icon, title, value, color }) => {
  const colors = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', gradient: 'from-blue-500/20 to-blue-600/5' },
    green: { bg: 'bg-green-500/10', text: 'text-green-500', gradient: 'from-green-500/20 to-green-600/5' },
    red: { bg: 'bg-red-500/10', text: 'text-red-500', gradient: 'from-red-500/20 to-red-600/5' },
    teal: { bg: 'bg-[#0891B2]/10', text: 'text-[#0891B2]', gradient: 'from-[#0891B2]/20 to-[#0891B2]/5' },
  };
  const { bg, text } = colors[color] || colors.blue;
  
  return (
    <GlassCard className="relative overflow-hidden">
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center`}>
          <span className={text}>{icon}</span>
        </div>
      </div>
    </GlassCard>
  );
};

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
);

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(10);
  
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [daysFilter, setDaysFilter] = useState(7);
  const [sourceFilter, setSourceFilter] = useState('');
  const [connectionFilter, setConnectionFilter] = useState('');
  const [connections, setConnections] = useState([]);

  useEffect(() => { fetchConnections(); fetchLogs(); }, [actionFilter, statusFilter, daysFilter, sourceFilter]);
  useEffect(() => { setCurrentPage(1); }, [actionFilter, statusFilter, searchTerm, daysFilter, sourceFilter, logsPerPage]);

  const fetchConnections = async () => {
    try {
      const response = await getAllDatabases();
      setConnections(response.data);
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        days: daysFilter,
        ...(actionFilter && { action_type: actionFilter }),
        ...(statusFilter && { success: statusFilter }),
        ...(sourceFilter && { source: sourceFilter }),
        ...(connectionFilter && { database_connection_id: connectionFilter }),
      };
      const response = await getAuditLogs(params);
      setLogs(response.data?.items ?? response.data ?? []);
      setError(null);
    } catch (err) {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return log.action_description?.toLowerCase().includes(search) || log.resource_name?.toLowerCase().includes(search) || log.user_id.toLowerCase().includes(search);
  });

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Description', 'Status'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.user_id,
      log.action_type,
      log.resource_type,
      log.action_description || '',
      log.success
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
    toast.success('Exported to CSV');
  };

  const handleImportLogs = async () => {
    const connectionId = prompt("Enter connection ID to import logs from:");
    if (!connectionId) return;
    try {
      setLoading(true);
      const response = await api.post(`/audit-logs/import/${connectionId}?limit=100`);
      toast.success(response.data.message || 'Logs imported successfully!');
      await fetchLogs();
    } catch (err) {
      toast.error('Failed to import logs');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: filteredLogs.length,
    success: filteredLogs.filter(l => l.success === 'success').length,
    failed: filteredLogs.filter(l => l.success !== 'success').length,
    users: [...new Set(filteredLogs.map(l => l.user_id))].length,
  };

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-primary p-6 lg:p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
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
            <div className="p-2.5 rounded-xl bg-[#6366F1] text-white shadow-lg">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Audit Logs
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Complete history of all actions</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button onClick={handleImportLogs} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium">
            <Upload className="w-4 h-4" />
            Import DB Logs
          </button>
        </div>
      </div>

      {
}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard icon={<Activity className="w-6 h-6" />} title="Total Logs" value={stats.total} color="blue" />
        <StatCard icon={<CheckCircle className="w-6 h-6" />} title="Successful" value={stats.success} color="green" />
        <StatCard icon={<XCircle className="w-6 h-6" />} title="Failed" value={stats.failed} color="red" />
        <StatCard icon={<User className="w-6 h-6" />} title="Unique Users" value={stats.users} color="teal" />
      </div>

      {
}
      <GlassCard className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Filters</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white">
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="QUERY">QUERY</option>
            <option value="TEST">TEST</option>
          </select>
          
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white">
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
          
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white">
            <option value="">All Sources</option>
            <option value="dblens">DBLens App</option>
            <option value="database">Direct DB</option>
          </select>
          
          <select value={daysFilter} onChange={(e) => setDaysFilter(Number(e.target.value))} className="px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white">
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          
          <select value={connectionFilter} onChange={(e) => setConnectionFilter(e.target.value)} className="px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white">
            <option value="">All Connections</option>
            {connections.map(conn => <option key={conn.id} value={conn.id}>{conn.name}</option>)}
          </select>
        </div>
      </GlassCard>

      {
}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {indexOfFirstLog + 1}-{Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length} logs
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Per page:</label>
          <select value={logsPerPage} onChange={(e) => setLogsPerPage(Number(e.target.value))} className="px-3 py-1.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {
}
      <GlassCard padding={false} className="overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-white/5">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Timestamp</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Action</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Resource</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 dark:divide-white/10">
              {currentLogs.map((log) => (
                <tr key={log.id} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${log.source === 'database' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {log.source === 'database' && (
                        <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg">Direct</span>
                      )}
                      <span className="text-sm text-gray-900 dark:text-white">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{log.user_id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {log.action_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{log.resource_type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 dark:text-white max-w-xs truncate block">{log.action_description}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      log.success === 'success' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {log.success === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {log.success === 'success' ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setSelectedLog(log)} className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {
}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl disabled:opacity-50 text-gray-700 dark:text-gray-300">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl disabled:opacity-50 text-gray-700 dark:text-gray-300">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {
}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log Details</h2>
              <button onClick={() => setSelectedLog(null)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <DetailRow label="ID" value={selectedLog.id} />
              <DetailRow label="Source" value={selectedLog.source === 'database' ? 'Direct DB' : 'DBLens App'} />
              <DetailRow label="Timestamp" value={new Date(selectedLog.timestamp).toLocaleString()} />
              <DetailRow label="User" value={selectedLog.user_id} />
              <DetailRow label="Action Type" value={selectedLog.action_type} />
              <DetailRow label="Resource Type" value={selectedLog.resource_type} />
              <DetailRow label="Resource Name" value={selectedLog.resource_name || 'N/A'} />
              <DetailRow label="Description" value={selectedLog.action_description || 'N/A'} />
              <DetailRow label="Status" value={selectedLog.success} />
              
              {selectedLog.error_message && <DetailRow label="Error Message" value={selectedLog.error_message} />}

              {selectedLog.query_executed && (
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Query Executed:</h3>
                  <pre className="bg-gray-100 dark:bg-black/30 p-4 rounded-xl overflow-x-auto text-sm text-gray-800 dark:text-gray-200 font-mono">
                    {selectedLog.query_executed}
                  </pre>
                </div>
              )}

              {selectedLog.changes_made && (
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Changes Made:</h3>
                  <pre className="bg-gray-100 dark:bg-black/30 p-4 rounded-xl overflow-x-auto text-sm text-gray-800 dark:text-gray-200 font-mono">
                    {JSON.stringify(selectedLog.changes_made, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex border-b border-gray-200/50 dark:border-white/10 pb-3">
      <span className="font-semibold text-gray-600 dark:text-gray-400 w-1/3">{label}:</span>
      <span className="text-gray-900 dark:text-white w-2/3">{value}</span>
    </div>
  );
}

export default AuditLogs;

