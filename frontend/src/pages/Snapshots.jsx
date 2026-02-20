import { useState, useEffect } from 'react';
import { Camera, Database, RotateCcw, Trash2, GitCompare, Clock, CheckCircle2, XCircle, Loader, AlertTriangle, Plus, Hash, HardDrive, Table } from 'lucide-react';
import { api, getAllDatabases } from '../services/api';
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
    teal: { bg: 'bg-[#0891B2]/10', text: 'text-[#0891B2]', gradient: 'from-[#0891B2]/20 to-[#0891B2]/5' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', gradient: 'from-amber-500/20 to-amber-600/5' },
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

export default function Snapshots() {
  const [connections, setConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [connectionsError, setConnectionsError] = useState(null);
  const [selectedDbId, setSelectedDbId] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareSnapshots, setCompareSnapshots] = useState({ snap1: null, snap2: null });
  const [comparisonResult, setComparisonResult] = useState(null);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotType, setSnapshotType] = useState('full');
  const [description, setDescription] = useState('');

  useEffect(() => { fetchConnections(); }, []);
  useEffect(() => { if (selectedDbId) fetchSnapshots(selectedDbId); }, [selectedDbId]);

  const fetchConnections = async () => {
    try {
      setConnectionsLoading(true);
      setConnectionsError(null);
      const response = await getAllDatabases();
      const raw = response?.data;
      const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && Array.isArray(raw.data) ? raw.data : []);
      setConnections(list);
      if (list.length > 0) setSelectedDbId(list[0].id);
      else setSelectedDbId(null);
    } catch (err) {
      setConnections([]);
      setSelectedDbId(null);
      const msg = err?.response?.data?.detail || err?.message;
      setConnectionsError(msg || 'Failed to load connections');
      toast.error(typeof msg === 'string' ? msg : 'Failed to load connections. Check Connections page or try again.');
    } finally {
      setConnectionsLoading(false);
    }
  };

  const fetchSnapshots = async (dbId) => {
    try {
      setLoading(true);
      const response = await api.get(`/snapshots/connection/${dbId}`);
      setSnapshots(response.data ?? []);
    } catch (err) {
      setSnapshots([]);
      toast.error('Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!snapshotName.trim()) { toast.error('Please enter a snapshot name'); return; }
    try {
      toast.loading('Creating snapshot...', { id: 'snapshot-create' });
      await api.post('/snapshots/', { database_connection_id: selectedDbId, snapshot_name: snapshotName, snapshot_type: snapshotType, description: description.trim() || null });
      toast.success('Snapshot creation started!', { id: 'snapshot-create' });
      setShowCreateModal(false);
      setSnapshotName('');
      setDescription('');
      setTimeout(() => fetchSnapshots(selectedDbId), 2000);
    } catch (err) {
      toast.error('Failed to create snapshot', { id: 'snapshot-create' });
    }
  };

  const handleRestore = async (snapshotId) => {
    try {
      toast.loading('Starting restore...', { id: 'snapshot-restore' });
      await api.post(`/snapshots/${snapshotId}/restore`);
      toast.success('Restore started!', { id: 'snapshot-restore' });
      setShowRestoreConfirm(null);
      setTimeout(() => fetchSnapshots(selectedDbId), 3000);
    } catch (err) {
      toast.error('Failed to restore snapshot', { id: 'snapshot-restore' });
    }
  };

  const handleDelete = async (snapshotId) => {
    if (!confirm('Delete this snapshot?')) return;
    try {
      await api.delete(`/snapshots/${snapshotId}`);
      toast.success('Snapshot deleted!');
      fetchSnapshots(selectedDbId);
    } catch (err) {
      toast.error('Failed to delete snapshot');
    }
  };

  const handleCompare = async () => {
    if (!compareSnapshots.snap1 || !compareSnapshots.snap2) { toast.error('Please select two snapshots'); return; }
    try {
      toast.loading('Comparing...', { id: 'snapshot-compare' });
      const response = await api.post('/snapshots/compare', { snapshot1_id: compareSnapshots.snap1, snapshot2_id: compareSnapshots.snap2 });
      setComparisonResult(response.data);
      toast.success('Comparison complete!', { id: 'snapshot-compare' });
    } catch (err) {
      toast.error('Failed to compare snapshots', { id: 'snapshot-compare' });
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === 'failed') return <XCircle className="w-5 h-5 text-red-500" />;
    if (status === 'in_progress') return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
    return <Clock className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (mb) => {
    if (!mb) return 'N/A';
    if (mb < 1) return `${(mb * 1024).toFixed(2)} KB`;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const stats = {
    total: snapshots.length,
    completed: snapshots.filter(s => s.status === 'completed').length,
    totalRows: snapshots.reduce((acc, s) => acc + (s.total_rows || 0), 0),
    totalSize: snapshots.reduce((acc, s) => acc + (s.file_size_mb || 0), 0),
  };

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#EC4899] text-white shadow-lg">
              <Camera className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Database Snapshots
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Create point-in-time snapshots for rollback and recovery</p>
        </div>
        
        <button 
          onClick={() => setShowCreateModal(true)}
          disabled={!selectedDbId}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#EC4899] hover:bg-[#db2777] text-white rounded-xl transition-all font-medium disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Create Snapshot
        </button>
      </div>

      {
}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard icon={<Camera className="w-6 h-6" />} title="Total Snapshots" value={stats.total} color="blue" />
        <StatCard icon={<CheckCircle2 className="w-6 h-6" />} title="Completed" value={stats.completed} color="green" />
        <StatCard icon={<Hash className="w-6 h-6" />} title="Total Rows" value={stats.totalRows.toLocaleString()} color="teal" />
        <StatCard icon={<HardDrive className="w-6 h-6" />} title="Total Size" value={formatFileSize(stats.totalSize)} color="amber" />
      </div>

      {
}
      <GlassCard className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Database className="w-5 h-5 text-gray-500 shrink-0" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Select Database:</label>
          <select
            value={selectedDbId ?? ''}
            onChange={(e) => setSelectedDbId(e.target.value === '' ? null : Number(e.target.value))}
            disabled={connectionsLoading}
            className="flex-1 min-w-[200px] px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {connectionsLoading ? (
              <option value="">Loading databases…</option>
            ) : connectionsError ? (
              <option value="">Error — click Retry</option>
            ) : connections.length === 0 ? (
              <option value="">No databases — add one in Connections</option>
            ) : (
              <>
                <option value="">Choose a database…</option>
                {(connections || []).map(db => (
                  <option key={db.id} value={db.id}>{db.name} ({db.db_type})</option>
                ))}
              </>
            )}
          </select>
          {connectionsError && (
            <button
              type="button"
              onClick={() => fetchConnections()}
              className="px-4 py-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/50 text-sm font-medium"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => setShowCompareModal(true)}
            disabled={snapshots.filter(s => s.status === 'completed').length < 2}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/20 disabled:opacity-50"
          >
            <GitCompare className="w-4 h-4" />
            Compare
          </button>
        </div>
      </GlassCard>

      {
}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : snapshots.length === 0 ? (
        <GlassCard className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#EC4899]/10 flex items-center justify-center">
            <Camera className="w-10 h-10 text-pink-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Snapshots Yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Create your first snapshot for point-in-time recovery</p>
          <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-[#EC4899] hover:bg-[#db2777] text-white rounded-xl transition-all font-medium">
            <Plus className="w-5 h-5" />
            Create First Snapshot
          </button>
        </GlassCard>
      ) : (
        <GlassCard padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/5">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Size</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tables</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rows</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50 dark:divide-white/10">
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.id} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 ${snapshot.is_active_snapshot ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{snapshot.snapshot_name}</div>
                        {snapshot.description && <div className="text-xs text-gray-500 dark:text-gray-400">{snapshot.description}</div>}
                        {snapshot.is_active_snapshot && <span className="text-xs text-green-600 dark:text-green-400 font-medium">Active</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${snapshot.snapshot_type === 'full' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'}`}>
                        {snapshot.snapshot_type === 'full' ? 'Full' : 'Schema'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(snapshot.status)}
                        <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{snapshot.status.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{formatFileSize(snapshot.file_size_mb)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{snapshot.table_count}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{snapshot.total_rows?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{new Date(snapshot.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setShowRestoreConfirm(snapshot.id)} disabled={snapshot.status !== 'completed'} className="p-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-50" title="Restore">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(snapshot.id)} disabled={snapshot.is_active_snapshot} className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50" title="Delete">
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
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-md w-full" hover={false}>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">Create Snapshot</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Snapshot Name *</label>
                <input type="text" value={snapshotName} onChange={(e) => setSnapshotName(e.target.value)} placeholder="Pre-deployment snapshot" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <select value={snapshotType} onChange={(e) => setSnapshotType(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white">
                  <option value="full">Full (Schema + Data)</option>
                  <option value="schema_only">Schema Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this snapshot for?" rows={3} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowCreateModal(false); setSnapshotName(''); setDescription(''); }} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl">Cancel</button>
              <button onClick={handleCreateSnapshot} className="flex-1 px-4 py-2.5 bg-[#EC4899] hover:bg-[#db2777] text-white rounded-xl">Create</button>
            </div>
          </GlassCard>
        </div>
      )}

      {
}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-md w-full" hover={false}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Restore Snapshot?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This will overwrite your current database</p>
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-700 dark:text-red-300">All current data will be replaced with snapshot data.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRestoreConfirm(null)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl">Cancel</button>
              <button onClick={() => handleRestore(showRestoreConfirm)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl">Restore</button>
            </div>
          </GlassCard>
        </div>
      )}

      {
}
      {showCompareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto" hover={false}>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">Compare Snapshots</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Snapshot</label>
                <select value={compareSnapshots.snap1 || ''} onChange={(e) => setCompareSnapshots(p => ({ ...p, snap1: Number(e.target.value) }))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white">
                  <option value="">Select snapshot</option>
                  {snapshots.filter(s => s.status === 'completed').map(s => <option key={s.id} value={s.id}>{s.snapshot_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Second Snapshot</label>
                <select value={compareSnapshots.snap2 || ''} onChange={(e) => setCompareSnapshots(p => ({ ...p, snap2: Number(e.target.value) }))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white">
                  <option value="">Select snapshot</option>
                  {snapshots.filter(s => s.status === 'completed').map(s => <option key={s.id} value={s.id}>{s.snapshot_name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleCompare} disabled={!compareSnapshots.snap1 || !compareSnapshots.snap2} className="w-full mb-6 px-4 py-2.5 bg-[#EC4899] hover:bg-[#db2777] text-white rounded-xl disabled:opacity-50">Compare</button>
            {comparisonResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Snapshot 1</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{comparisonResult.snapshot1.name}</div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Snapshot 2</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{comparisonResult.snapshot2.name}</div>
                  </div>
                </div>
                <div className="border-t border-gray-200/50 dark:border-white/10 pt-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Changes</h4>
                  {comparisonResult.comparison.total_changes === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">No changes detected</p>
                  ) : (
                    <div className="space-y-3">
                      {comparisonResult.comparison.added_tables?.length > 0 && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                          <div className="font-medium text-green-800 dark:text-green-300">Added Tables</div>
                          <div className="text-sm text-green-700 dark:text-green-400">{comparisonResult.comparison.added_tables.join(', ')}</div>
                        </div>
                      )}
                      {comparisonResult.comparison.removed_tables?.length > 0 && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                          <div className="font-medium text-red-800 dark:text-red-300">Removed Tables</div>
                          <div className="text-sm text-red-700 dark:text-red-400">{comparisonResult.comparison.removed_tables.join(', ')}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowCompareModal(false); setCompareSnapshots({ snap1: null, snap2: null }); setComparisonResult(null); }} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl">Close</button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

