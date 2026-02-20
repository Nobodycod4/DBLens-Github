import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, TestTube, Database as DatabaseIcon, Loader, ExternalLink, Server, RefreshCw, CheckCircle, XCircle, Clock, Zap, UserPlus, Users, X } from 'lucide-react';
import { getAllDatabases, createDatabase, updateDatabase, deleteDatabase, testConnection, createNewDatabase, getDefaultDBCredentials, getSharedWith, grantSharedWith, revokeSharedWith, searchUsers } from '../services/api';
import ConnectionModal from '../components/ConnectionModal';
import DeleteModal from '../components/DeleteModal';
import CreateDatabaseModal from '../components/CreateDatabaseModal';
import DBCredentialsModal from '../components/DBCredentialsModal';
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
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
    green: { bg: 'bg-green-500/10', text: 'text-green-500' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
    red: { bg: 'bg-red-500/10', text: 'text-red-500' },
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

const DatabaseTypeBadge = ({ type }) => {
  const config = {
    mysql: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'MySQL' },
    postgresql: { color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', label: 'PostgreSQL' },
    sqlite: { color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'SQLite' },
    mongodb: { color: 'bg-green-500/10 text-green-600 dark:text-green-400', label: 'MongoDB' },
  };
  const { color, label } = config[type?.toLowerCase()] || { color: 'bg-gray-500/10 text-gray-600', label: type };
  
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium uppercase ${color}`}>
      {label}
    </span>
  );
};

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
);

function Connections() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [pendingCreateData, setPendingCreateData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showManageAccess, setShowManageAccess] = useState(false);
  const [manageAccessConnection, setManageAccessConnection] = useState(null);
  const [sharedWithList, setSharedWithList] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [manageAccessLoading, setManageAccessLoading] = useState(false);

  useEffect(() => { fetchConnections(); }, []);

  useEffect(() => {
    if (!userSearchQuery || userSearchQuery.length < 2) {
      setUserSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await searchUsers(userSearchQuery);
        setUserSearchResults(r.data?.users || []);
      } catch {
        setUserSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [userSearchQuery]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const r = await getAllDatabases();
      setConnections(r.data);
      setError(null);
    } catch (e) {
      setError('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConnections();
    setRefreshing(false);
    toast.success('Connections refreshed');
  };

  const handleCreate = () => { setSelectedConnection(null); setShowModal(true); };
  const handleEdit = (e, c) => { e.stopPropagation(); setSelectedConnection(c); setShowModal(true); };
  const handleDelete = (e, c) => { e.stopPropagation(); setSelectedConnection(c); setShowDeleteModal(true); };

  const openManageAccess = async (e, c) => {
    e.stopPropagation();
    if (c.access_type !== 'owner') return;
    setManageAccessConnection(c);
    setShowManageAccess(true);
    setUserSearchQuery('');
    setUserSearchResults([]);
    setManageAccessLoading(true);
    try {
      const r = await getSharedWith(c.id);
      setSharedWithList(r.data || []);
    } catch {
      toast.error('Failed to load shared users');
      setSharedWithList([]);
    } finally {
      setManageAccessLoading(false);
    }
  };

  const handleGrantAccess = async (userId) => {
    if (!manageAccessConnection) return;
    try {
      await grantSharedWith(manageAccessConnection.id, { user_id: userId, role: 'use' });
      const r = await getSharedWith(manageAccessConnection.id);
      setSharedWithList(r.data || []);
      setUserSearchQuery('');
      setUserSearchResults([]);
      toast.success('Access granted');
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed to grant access');
    }
  };

  const handleRevokeAccess = async (userId) => {
    if (!manageAccessConnection) return;
    try {
      await revokeSharedWith(manageAccessConnection.id, userId);
      const r = await getSharedWith(manageAccessConnection.id);
      setSharedWithList(r.data || []);
      toast.success('Access revoked');
    } catch {
      toast.error('Failed to revoke access');
    }
  };
  
  const handleSave = async (data) => {
    try {
      if (selectedConnection) {
        await updateDatabase(selectedConnection.id, data);
        toast.success('Connection updated');
      } else {
        await createDatabase(data);
        toast.success('Connection created');
      }
      await fetchConnections();
      setShowModal(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteDatabase(selectedConnection.id);
      toast.success('Connection deleted');
      await fetchConnections();
      setShowDeleteModal(false);
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const handleTest = async (e, id) => {
    e.stopPropagation();
    try {
      setTestingId(id);
      const r = await testConnection(id);
      if (r.data.success) {
        toast.success(`Connected (${r.data.details.latency_ms}ms)`);
      } else {
        toast.error(r.data.message || 'Connection failed');
      }
      await fetchConnections();
    } catch (e) {
      toast.error('Test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateNew = async (data) => {
    try {
      const credsRes = await getDefaultDBCredentials();
      const hasDefaults = credsRes.data?.has_defaults === true;
      if (hasDefaults) {
        await createNewDatabase({ db_type: data.db_type, database_name: data.database_name });
        toast.success('Database created');
        await fetchConnections();
        setShowCreateModal(false);
        return;
      }
      setPendingCreateData(data);
      setShowCredentialsModal(true);
    } catch (e) {
      if (e.response?.status === 400 && e.response?.data?.detail?.code === 'CREDENTIALS_REQUIRED') {
        setPendingCreateData(data);
        setShowCredentialsModal(true);
        return;
      }
      toast.error(e.response?.data?.detail?.message || e.response?.data?.detail || 'Failed');
    }
  };

  const handleCredentialsConfirm = async (username, password) => {
    if (!pendingCreateData) return;
    try {
      await createNewDatabase({ ...pendingCreateData, username, password });
      toast.success('Database created');
      await fetchConnections();
      setShowCreateModal(false);
      setShowCredentialsModal(false);
      setPendingCreateData(null);
    } catch (e) {
      toast.error(e.response?.data?.detail?.message || e.response?.data?.detail || 'Failed');
    }
  };

  const formatDate = (d) => {
    if (!d) return 'Never';
    const date = new Date(d);
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const stats = {
    total: connections.length,
    connected: connections.filter(c => c.connection_status === 'connected').length,
    failed: connections.filter(c => c.connection_status === 'failed').length,
    untested: connections.filter(c => !c.connection_status || c.connection_status === 'untested').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary p-6 lg:p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
            <div className="p-2.5 rounded-xl bg-[#2563EB] text-white shadow-lg">
              <DatabaseIcon className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Connections
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Manage your database connections</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-gray-200 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-gray-200 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create New
          </button>
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl transition-all font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Connect Existing
          </button>
        </div>
      </div>

      {
}
      {error && (
        <GlassCard className="mb-6 border-red-500/20 bg-red-50/80 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </GlassCard>
      )}

      {
}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon={<Server className="w-6 h-6" />}
          title="Total Connections"
          value={stats.total}
          color="blue"
        />
        <StatCard 
          icon={<CheckCircle className="w-6 h-6" />}
          title="Connected"
          value={stats.connected}
          color="green"
        />
        <StatCard 
          icon={<XCircle className="w-6 h-6" />}
          title="Failed"
          value={stats.failed}
          color="red"
        />
        <StatCard 
          icon={<Clock className="w-6 h-6" />}
          title="Untested"
          value={stats.untested}
          color="amber"
        />
      </div>

      {
}
      {connections.length === 0 ? (
        <GlassCard className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#2563EB]/10 flex items-center justify-center">
            <DatabaseIcon className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Connections Yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Get started by connecting to an existing database or create a new one
          </p>
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-gray-200"
            >
              <Plus className="w-4 h-4" />
              Create New Database
            </button>
            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl transition-all font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Connect Existing
            </button>
          </div>
        </GlassCard>
      ) : (
        <GlassCard padding={false} className="overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200/50 dark:border-white/10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Connections</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/5">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Connection</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Host</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Tested</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50 dark:divide-white/10">
                {connections.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                          {c.access_type === 'shared' && (
                            <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">Shared with me</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{c.database_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <DatabaseTypeBadge type={c.db_type} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                        {c.db_type === 'sqlite' ? 'Local File' : `${c.host}:${c.port}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        c.connection_status === 'connected' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                          : c.connection_status === 'failed'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          c.connection_status === 'connected' ? 'bg-green-500' : 
                          c.connection_status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                        {c.connection_status || 'untested'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(c.last_tested_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {c.access_type === 'owner' && (
                          <button
                            onClick={(e) => openManageAccess(e, c)}
                            className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                            title="Manage access"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={(e) => handleTest(e, c.id)} 
                          disabled={testingId === c.id}
                          className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                          title="Test Connection"
                        >
                          {testingId === c.id ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        </button>
                        {c.access_type === 'owner' && (
                          <>
                            <button 
                              onClick={(e) => handleEdit(e, c)}
                              className="p-2 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => handleDelete(e, c)}
                              className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
      {showModal && (
        <ConnectionModal 
          connection={selectedConnection} 
          onClose={() => { setShowModal(false); setSelectedConnection(null); }} 
          onSave={handleSave} 
        />
      )}
      {showDeleteModal && (
        <DeleteModal 
          connection={selectedConnection} 
          onClose={() => { setShowDeleteModal(false); setSelectedConnection(null); }} 
          onConfirm={confirmDelete} 
        />
      )}
      {showCreateModal && (
        <CreateDatabaseModal 
          onClose={() => setShowCreateModal(false)} 
          onSave={handleCreateNew} 
        />
      )}
      {showCredentialsModal && pendingCreateData && (
        <DBCredentialsModal
          title="Database credentials"
          onClose={() => { setShowCredentialsModal(false); setPendingCreateData(null); }}
          onConfirm={handleCredentialsConfirm}
        />
      )}

      {showManageAccess && manageAccessConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowManageAccess(false)}>
          <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Manage access — {manageAccessConnection.name}
              </h3>
              <button onClick={() => setShowManageAccess(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {manageAccessLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Users with access to this connection</p>
                  <ul className="space-y-2 mb-6">
                    {sharedWithList.length === 0 ? (
                      <li className="text-sm text-gray-500 dark:text-gray-400">No one else has access yet.</li>
                    ) : (
                      sharedWithList.map((u) => (
                        <li key={u.user_id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-white/5">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{u.username}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">{u.role}</span>
                          <button onClick={() => handleRevokeAccess(u.user_id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" title="Revoke">Revoke</button>
                        </li>
                      ))
                    )}
                  </ul>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add user</p>
                  <input
                    type="text"
                    placeholder="Search by username or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 mb-3"
                  />
                  {userSearchResults.length > 0 && (
                    <ul className="space-y-1 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                      {userSearchResults
                        .filter((u) => !sharedWithList.some((s) => s.user_id === u.id))
                        .map((u) => (
                          <li key={u.id} className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10">
                            <span className="text-sm text-gray-900 dark:text-white">{u.username} {u.email ? `(${u.email})` : ''}</span>
                            <button onClick={() => handleGrantAccess(u.id)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                              <UserPlus className="w-4 h-4" /> Add
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Connections;

