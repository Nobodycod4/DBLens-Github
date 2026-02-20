import { useState, useEffect } from 'react';
import { getAllDatabases, createBackup, listBackups, downloadBackup, deleteBackup, restoreBackup } from '../services/api';
import { Database, Download, Trash2, RotateCcw, Archive, AlertTriangle, CheckCircle, Clock, HardDrive, RefreshCw, Plus, Server } from 'lucide-react';
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
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', gradient: 'from-amber-500/20 to-amber-600/5' },
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

function Backups() {
  const [databases, setDatabases] = useState([]);
  const [selectedDbId, setSelectedDbId] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(null);

  useEffect(() => { fetchDatabases(); }, []);
  useEffect(() => { if (selectedDbId) fetchBackups(selectedDbId); }, [selectedDbId]);

  const fetchDatabases = async () => {
    try {
      const response = await getAllDatabases();
      setDatabases(response.data);
      if (response.data.length > 0) setSelectedDbId(response.data[0].id);
    } catch (err) {
      toast.error('Failed to load databases');
    }
  };

  const fetchBackups = async (dbId) => {
    try {
      setLoading(true);
      const response = await listBackups(dbId);
      setBackups(response.data?.items ?? response.data ?? []);
    } catch (err) {
      toast.error('Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!selectedDbId) return;
    try {
      setCreating(true);
      toast.loading('Creating backup...', { id: 'backup-create' });
      await createBackup(selectedDbId);
      toast.success('Backup created successfully!', { id: 'backup-create' });
      fetchBackups(selectedDbId);
    } catch (err) {
      toast.error('Failed to create backup', { id: 'backup-create' });
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (backupId, filename) => {
    try {
      toast.loading('Downloading backup...', { id: 'backup-download' });
      const response = await downloadBackup(backupId);
      const blob = new Blob([response.data], { type: 'application/gzip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Backup downloaded!', { id: 'backup-download' });
    } catch (err) {
      toast.error('Failed to download backup', { id: 'backup-download' });
    }
  };

  const handleDelete = async (backupId) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;
    try {
      toast.loading('Deleting backup...', { id: 'backup-delete' });
      await deleteBackup(backupId);
      toast.success('Backup deleted!', { id: 'backup-delete' });
      fetchBackups(selectedDbId);
    } catch (err) {
      toast.error('Failed to delete backup', { id: 'backup-delete' });
    }
  };

  const handleRestore = async (backupId) => {
    try {
      toast.loading('Restoring backup...', { id: 'backup-restore' });
      await restoreBackup(backupId);
      toast.success('Database restored successfully!', { id: 'backup-restore' });
      setShowRestoreConfirm(null);
    } catch (err) {
      toast.error('Failed to restore backup', { id: 'backup-restore' });
    }
  };

  const formatFileSize = (mb) => {
    if (!mb) return 'N/A';
    if (mb < 1) return `${(mb * 1024).toFixed(2)} KB`;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const stats = {
    total: backups.length,
    completed: backups.filter(b => b.status === 'completed').length,
    totalSize: backups.reduce((acc, b) => acc + (b.file_size_mb || 0), 0),
  };

  const selectedDb = databases.find(d => d.id === selectedDbId);

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#F59E0B] text-white shadow-lg">
              <Archive className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Database Backups
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Create and manage database backups</p>
        </div>
        
        <button 
          onClick={handleCreateBackup}
          disabled={creating || !selectedDbId}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] hover:bg-[#d97706] text-white rounded-xl transition-all font-medium disabled:opacity-50"
        >
          {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {creating ? 'Creating...' : 'Create Backup'}
        </button>
      </div>

      {
}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard icon={<Archive className="w-6 h-6" />} title="Total Backups" value={stats.total} color="blue" />
        <StatCard icon={<CheckCircle className="w-6 h-6" />} title="Completed" value={stats.completed} color="green" />
        <StatCard icon={<HardDrive className="w-6 h-6" />} title="Total Size" value={formatFileSize(stats.totalSize)} color="teal" />
      </div>

      {
}
      <GlassCard className="mb-6">
        <div className="flex items-center gap-4">
          <Database className="w-5 h-5 text-gray-500" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Database:</label>
          <select
            value={selectedDbId || ''}
            onChange={(e) => setSelectedDbId(Number(e.target.value))}
            className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {databases.map(db => (
              <option key={db.id} value={db.id}>{db.name} ({db.db_type})</option>
            ))}
          </select>
        </div>
      </GlassCard>

      {
}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : backups.length === 0 ? (
        <GlassCard className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#F59E0B]/10 flex items-center justify-center">
            <Archive className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Backups Yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Create your first backup to protect your data</p>
          <button 
            onClick={handleCreateBackup}
            disabled={creating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#F59E0B] hover:bg-[#d97706] text-white rounded-xl transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            Create First Backup
          </button>
        </GlassCard>
      ) : (
        <GlassCard padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/5">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Filename</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Size</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50 dark:divide-white/10">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-900 dark:text-white">{backup.filename}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{formatFileSize(backup.file_size_mb)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        backup.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                          : backup.status === 'failed'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}>
                        {backup.status === 'completed' && <CheckCircle className="w-3.5 h-3.5" />}
                        {backup.status === 'failed' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {backup.status !== 'completed' && backup.status !== 'failed' && <Clock className="w-3.5 h-3.5" />}
                        {backup.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{formatDuration(backup.duration_seconds)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(backup.created_at).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleDownload(backup.id, backup.filename)} className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="Download">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowRestoreConfirm(backup.id)} className="p-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors" title="Restore">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(backup.id)} className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {
}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Restore Database?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-700 dark:text-red-300">
                <strong>Warning:</strong> This will overwrite your current database with the backup data. 
                All current data will be replaced.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowRestoreConfirm(null)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleRestore(showRestoreConfirm)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
                Yes, Restore
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default Backups;

