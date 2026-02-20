import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Users, Key, ChevronDown, ChevronRight, Check, X, Save, UserPlus, RefreshCw, Lock, Crown, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { rolesAPI } from '../services/api';
import { usePermissions } from '../contexts/PermissionContext';

const ROLE_HIERARCHY = {
  super_admin: 100,
  admin: 80,
  developer: 60,
  analyst: 40,
  viewer: 20,
  guest: 0,
};

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

export default function RoleManagement() {
  const [activeTab, setActiveTab] = useState('roles');
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [permissionCategories, setPermissionCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showEditRole, setShowEditRole] = useState(null);
  const [showAssignRole, setShowAssignRole] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [roleForm, setRoleForm] = useState({ name: '', display_name: '', description: '', color: '#3B82F6', permissions: [] });

  const { isSuperAdmin, isAdmin, canManageRole, userInfo } = usePermissions();
  const currentUserRole = userInfo?.highestRole || 'viewer';
  const currentUserLevel = userInfo?.highestLevel || 20;

  const canEditRole = (role) => {
    if (isSuperAdmin()) return true;
    if (role.name === 'super_admin') return false;
    return canManageRole(role.name);
  };

  const canAssignRole = (role) => {
    if (isSuperAdmin()) return true;
    if (role.name === 'super_admin') return false;
    const roleLevel = ROLE_HIERARCHY[role.name] || 0;
    return currentUserLevel > roleLevel;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [r, p, u] = await Promise.all([rolesAPI.getAll(), rolesAPI.getAvailablePermissions(), rolesAPI.listUsers()]);
      setRoles(r.data);
      setAvailablePermissions(p.data.permissions || {});
      setPermissionCategories(p.data.categories || {});
      setUsers(Array.isArray(u.data) ? u.data : []);
    } catch (e) {
      if (e.response?.status === 404) {
        try {
          await rolesAPI.initDefaults();
          fetchData();
        } catch (i) {
          toast.error('Failed to initialize');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInitDefaults = async () => {
    try {
      const r = await rolesAPI.initDefaults();
      toast.success(`Created ${r.data?.created?.length ?? 0} roles`);
      fetchData();
    } catch (e) {
      toast.error('Failed');
    }
  };
  const toggleCategory = (c) => setExpandedCategories(p => ({ ...p, [c]: !p[c] }));
  const togglePermission = (k) => setRoleForm(p => ({ ...p, permissions: p.permissions.includes(k) ? p.permissions.filter(x => x !== k) : [...p.permissions, k] }));
  const toggleCategoryPermissions = (c) => { const perms = permissionCategories[c] || [], all = perms.every(p => roleForm.permissions.includes(p)); setRoleForm(prev => ({ ...prev, permissions: all ? prev.permissions.filter(p => !perms.includes(p)) : [...new Set([...prev.permissions, ...perms])] })); };
  const openCreateRole = () => { setRoleForm({ name: '', display_name: '', description: '', color: '#3B82F6', permissions: [] }); setShowCreateRole(true); };
  const openEditRole = (r) => { setRoleForm({ name: r.name, display_name: r.display_name, description: r.description || '', color: r.color, permissions: r.permissions || [] }); setShowEditRole(r); };
  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      await rolesAPI.create(roleForm);
      toast.success('Created');
      setShowCreateRole(false);
      fetchData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create role');
    }
  };
  const handleUpdateRole = async (e) => {
    e.preventDefault();
    try {
      await rolesAPI.update(showEditRole.id, { display_name: roleForm.display_name, description: roleForm.description, color: roleForm.color });
      await rolesAPI.updatePermissions(showEditRole.id, roleForm.permissions);
      toast.success('Updated');
      setShowEditRole(null);
      fetchData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update role');
    }
  };
  const handleDeleteRole = async (r) => {
    if (r.is_system) { toast.error('Cannot delete system role'); return; }
    if (!window.confirm(`Delete "${r.display_name}"?`)) return;
    try {
      await rolesAPI.delete(r.id);
      toast.success('Deleted');
      fetchData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to delete role');
    }
  };
  const handleAssignRole = async (uid, rid) => {
    try {
      await rolesAPI.assignRole({ user_id: uid, role_id: rid });
      toast.success('Assigned');
      fetchData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to assign role');
    }
  };
  const handleRemoveRole = async (aid) => {
    try {
      await rolesAPI.removeAssignment(aid);
      toast.success('Removed');
      fetchData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to remove assignment');
    }
  };
  const colorOptions = [{ value: '#3B82F6' }, { value: '#EF4444' }, { value: '#22C55E' }, { value: '#F97316' }, { value: '#0891B2' }, { value: '#EC4899' }, { value: '#6B7280' }];

  if (loading) {
    return (
      <div className="min-h-screen bg-primary p-6 lg:p-8">
        <div className="mb-8"><Skeleton className="h-10 w-64 mb-2" /><Skeleton className="h-5 w-48" /></div>
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
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
            <div className="p-2.5 rounded-xl bg-[#DC2626] text-white shadow-lg">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Role Management
            </h1>
            {isSuperAdmin() && (
              <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                <Crown className="w-3 h-3" /> Super Admin
              </span>
            )}
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">
            Manage roles and permissions
            {!isSuperAdmin() && (
              <span className="text-amber-600 dark:text-amber-400 ml-2 text-xs">
                (Limited - Only Super Admin can create/modify roles)
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isSuperAdmin() && (
            <>
              <button onClick={handleInitDefaults} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/20">
                <RefreshCw className="w-4 h-4" /> Init Defaults
              </button>
              <button onClick={openCreateRole} className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl transition-all font-medium">
                <Plus className="w-4 h-4" /> Create Role
              </button>
            </>
          )}
        </div>
      </div>

      {
}
      {!isSuperAdmin() && isAdmin() && (
        <GlassCard className="mb-6 border-l-4 border-l-amber-500" hover={false}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Limited Access</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                As an Admin, you can view roles and manage users, but only Super Admins can create, 
                edit, or delete roles. You can assign roles that are lower than your own level.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {
}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('roles')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'roles' ? 'bg-[#2563EB] text-white' : 'bg-white/80 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'}`}>
          <Shield className="w-4 h-4" /> Roles ({roles.length})
        </button>
        <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'users' ? 'bg-[#2563EB] text-white' : 'bg-white/80 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'}`}>
          <Users className="w-4 h-4" /> Users ({users.length})
        </button>
      </div>

      {
}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((r) => {
            const roleLevel = ROLE_HIERARCHY[r.name] || 0;
            const canEdit = canEditRole(r);
            const isSuperAdminRole = r.name === 'super_admin';
            
            return (
              <GlassCard key={r.id} className={!canEdit ? 'opacity-75' : ''}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: r.color + '20' }}>
                      {isSuperAdminRole ? (
                        <Crown className="w-5 h-5" style={{ color: r.color }} />
                      ) : (
                        <Shield className="w-5 h-5" style={{ color: r.color }} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                        {r.display_name}
                        {r.is_system && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                      </h3>
                      <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{r.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {canEdit ? (
                      <>
                        <button onClick={() => openEditRole(r)} className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Edit role">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!r.is_system && !isSuperAdminRole && (
                          <button onClick={() => handleDeleteRole(r)} className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete role">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 px-2">View only</span>
                    )}
                  </div>
                </div>
                {r.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{r.description}</p>}
                
                {
}
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-100/80 dark:bg-white/5 rounded-xl">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Level:</span>
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all" 
                      style={{ 
                        width: `${roleLevel}%`, 
                        backgroundColor: r.color 
                      }} 
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: r.color }}>{roleLevel}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Key className="w-4 h-4" /> {r.permissions?.length || 0} permissions
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: r.color + '20', color: r.color }}>
                    {isSuperAdminRole ? 'Super Admin' : r.is_system ? 'System' : 'Custom'}
                  </span>
                </div>
              </GlassCard>
            );
          })}
          {roles.length === 0 && (
            <div className="col-span-full">
              <GlassCard className="text-center py-16">
                <Shield className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Roles</h3>
                <button onClick={handleInitDefaults} className="mt-4 px-6 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl">Initialize Defaults</button>
              </GlassCard>
            </div>
          )}
        </div>
      )}

      {
}
      {activeTab === 'users' && (
        <GlassCard padding={false} className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-white/5">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Roles</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 dark:divide-white/10">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 dark:text-white">{u.full_name || u.username}</p>
                    <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles?.map((r) => <span key={r.id} className="px-2.5 py-1 text-xs font-medium rounded-lg" style={{ backgroundColor: r.color + '20', color: r.color }}>{r.display_name}</span>)}
                      {!u.roles?.length && <span className="text-sm text-gray-400">No roles</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setShowAssignRole(u)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 flex items-center gap-2 ml-auto">
                      <UserPlus className="w-4 h-4" /> Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      {
}
      {(showCreateRole || showEditRole) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col" hover={false}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">{showEditRole ? 'Edit Role' : 'Create Role'}</h2>
            <form onSubmit={showEditRole ? handleUpdateRole : handleCreateRole} className="flex flex-col flex-1 overflow-hidden space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                  <input type="text" value={roleForm.name} onChange={(e) => setRoleForm(p => ({ ...p, name: e.target.value }))} disabled={showEditRole} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white font-mono disabled:opacity-50" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Name</label>
                  <input type="text" value={roleForm.display_name} onChange={(e) => setRoleForm(p => ({ ...p, display_name: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea value={roleForm.description} onChange={(e) => setRoleForm(p => ({ ...p, description: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                <div className="flex gap-2">{colorOptions.map((c) => <button key={c.value} type="button" onClick={() => setRoleForm(p => ({ ...p, color: c.value }))} className={`w-8 h-8 rounded-xl border-2 ${roleForm.color === c.value ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c.value }} />)}</div>
              </div>
              <div className="flex-1 overflow-hidden">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions ({roleForm.permissions.length})</label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-xl">
                  {Object.entries(permissionCategories).map(([cat, perms]) => {
                    const all = perms.every(p => roleForm.permissions.includes(p)), some = perms.some(p => roleForm.permissions.includes(p));
                    return (
                      <div key={cat} className="border-b border-gray-200/50 dark:border-white/10 last:border-b-0">
                        <button type="button" onClick={() => toggleCategory(cat)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5">
                          <div className="flex items-center gap-2">
                            {expandedCategories[cat] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                            <span className="text-sm text-gray-900 dark:text-white">{cat}</span>
                            <span className="text-xs text-gray-400">({perms.filter(p => roleForm.permissions.includes(p)).length}/{perms.length})</span>
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); toggleCategoryPermissions(cat); }} className={`p-1.5 rounded-lg ${all ? 'bg-violet-500 text-white' : some ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}><Check className="w-3.5 h-3.5" /></button>
                        </button>
                        {expandedCategories[cat] && (
                          <div className="px-4 pb-3 space-y-1">
                            {perms.map((p) => (
                              <label key={p} className="flex items-center gap-3 py-2 px-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer">
                                <input type="checkbox" checked={roleForm.permissions.includes(p)} onChange={() => togglePermission(p)} className="w-4 h-4 accent-violet-500 rounded" />
                                <div>
                                  <span className="text-sm text-gray-900 dark:text-white">{availablePermissions[p]}</span>
                                  <span className="text-xs font-mono text-gray-400 block">{p}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowCreateRole(false); setShowEditRole(null); }} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {showEditRole ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {
}
      {showAssignRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-md w-full" hover={false}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Manage Roles</h2>
            <p className="text-sm font-mono text-gray-500 dark:text-gray-400 mb-5">{showAssignRole.email}</p>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {showAssignRole.roles?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Roles</label>
                  <div className="space-y-2">
                    {showAssignRole.roles.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: r.color + '20' }}><Shield className="w-3.5 h-3.5" style={{ color: r.color }} /></div>
                          <span className="text-sm text-gray-900 dark:text-white">{r.display_name}</span>
                        </div>
                        <button onClick={async () => { try { const ur = await rolesAPI.getUserRoles(showAssignRole.id); const a = ur.data.find(x => x.role_id === r.id); if (a) { await handleRemoveRole(a.id); setShowAssignRole({ ...showAssignRole, roles: showAssignRole.roles.filter(x => x.id !== r.id) }); } } catch (e) {} }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Role</label>
                <div className="space-y-2">
                  {roles.filter(r => !showAssignRole.roles?.some(x => x.id === r.id)).map((r) => (
                    <button key={r.id} onClick={async () => { await handleAssignRole(showAssignRole.id, r.id); setShowAssignRole({ ...showAssignRole, roles: [...(showAssignRole.roles || []), { id: r.id, name: r.name, display_name: r.display_name, color: r.color }] }); }} className="w-full flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: r.color + '20' }}><Shield className="w-3.5 h-3.5" style={{ color: r.color }} /></div>
                        <span className="text-sm text-gray-900 dark:text-white">{r.display_name}</span>
                      </div>
                      <Plus className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-5">
              <button onClick={() => setShowAssignRole(null)} className="px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl">Close</button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

