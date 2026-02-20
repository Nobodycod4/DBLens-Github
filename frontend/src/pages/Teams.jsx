
import { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  MoreVertical,
  Search,
  X,
  Crown,
  Trash2,
  Inbox,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  Edit3,
  Key,
  UserX,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { api, rolesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { usePermissions } from '../contexts/PermissionContext';

const getErrorMessage = (error, defaultMsg = 'An error occurred') => {
  const detail = error.response?.data?.detail;
  if (!detail) return defaultMsg;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
  }
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return defaultMsg;
};

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

const EmptyState = ({ title, description, icon: Icon, action, actionLabel }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-md mb-4">{description}</p>
    {action && (
      <button
        onClick={action}
        className="px-5 py-2.5 bg-[#0891B2] hover:bg-[#0e7490] text-white rounded-xl transition-all font-medium"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
);

const roleColors = {
  super_admin: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  admin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  administrator: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  user: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  developer: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  analyst: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  viewer: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  manager: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  testing_role: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

const roleIcons = {
  super_admin: Crown,
  admin: Shield,
  administrator: Shield,
  user: Users,
  developer: Users,
  analyst: Users,
  viewer: Eye,
  manager: Users,
  testing_role: Users,
};

const availableRoles = [
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
  { value: 'user', label: 'User', description: 'Standard access' },
  { value: 'admin', label: 'Admin', description: 'Administrative access' },
  { value: 'super_admin', label: 'Super Admin', description: 'Full system control' },
];

const getUserRole = (user) => user?.role ?? (Array.isArray(user?.roles) && user.roles[0] ? user.roles[0].name : undefined) ?? 'user';

const mapRoleNameToAuth = (name) => {
  if (!name) return 'user';
  const n = String(name).toLowerCase();
  if (n === 'super_admin') return 'super_admin';
  if (n === 'admin' || n === 'administrator') return 'admin';
  if (n === 'viewer' || n === 'analyst') return 'viewer';
  return 'user'; // developer, user, manager, etc.
};

export default function Teams() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const actionMenuRef = useRef(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'user',
    selectedRoleId: null
  });
  const [managementRoles, setManagementRoles] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  let permissions = { isSuperAdmin: () => false, isAdmin: () => false };
  try { const p = usePermissions(); if (p) permissions = p; } catch (e) {}
  const { isSuperAdmin, isAdmin } = permissions;

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    rolesAPI.getAll().then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setManagementRoles(list);
    }).catch(() => setManagementRoles([]));
  }, []);

  useEffect(() => {
    if (actionMenuOpen == null) return;
    const handleClickOutside = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActionMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuOpen]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      try {
        const response = await api.get('/auth/admin/users');
        setUsers(response.data?.users || []);
        return;
      } catch (adminError) {
        if (adminError.response?.status === 403) {
          const fallback = await api.get('/roles/user-list');
          setUsers(Array.isArray(fallback.data) ? fallback.data : []);
          return;
        }
        throw adminError;
      }
      setUsers([]);
    } catch (error) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const authRole = (formData.role || 'user').trim() || 'user';
      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        full_name: (formData.full_name || '').trim() || undefined,
        role: authRole,
      };
      const createRes = await api.post('/auth/admin/users', payload);
      const newUserId = createRes.data?.user?.id;
      if (newUserId != null && formData.selectedRoleId != null) {
        try {
          await rolesAPI.assignRole({ user_id: newUserId, role_id: formData.selectedRoleId });
        } catch (assignErr) {
          toast.error(getErrorMessage(assignErr, 'User created but role assignment failed'));
        }
      }
      toast.success(`User ${formData.username} created successfully`);
      setShowCreateModal(false);
      setFormData({ username: '', email: '', password: '', full_name: '', role: 'user', selectedRoleId: null });
      fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create user'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      const roleParam = (formData.role && String(formData.role).trim()) || getUserRole(selectedUser);
      await api.patch(`/auth/admin/users/${selectedUser.id}`, null, {
        params: {
          full_name: (formData.full_name || '').trim() || undefined,
          role: roleParam || undefined,
          is_active: selectedUser.is_active
        }
      });
      if (formData.selectedRoleId != null) {
        try {
          await rolesAPI.assignRole({ user_id: selectedUser.id, role_id: formData.selectedRoleId });
        } catch (assignErr) {
          if (assignErr?.response?.status !== 400) toast.error(getErrorMessage(assignErr, 'Role assignment failed'));
        }
      }
      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update user'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      await api.delete(`/auth/admin/users/${selectedUser.id}`);
      toast.success(`User ${selectedUser.username} deleted`);
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete user'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await api.patch(`/auth/admin/users/${user.id}`, null, {
        params: { is_active: !user.is_active }
      });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update user'));
    }
    setActionMenuOpen(null);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    const roleName = getUserRole(user);
    const currentRoleId = Array.isArray(user.roles) && user.roles[0] ? user.roles[0].id : null;
    const matchedRoleId = managementRoles.find(r => r.name === roleName)?.id ?? currentRoleId;
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      full_name: user.full_name || '',
      role: roleName,
      selectedRoleId: matchedRoleId ?? managementRoles.find(r => r.name === 'user')?.id ?? managementRoles[0]?.id ?? null
    });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  };

  const getUserInitials = (user) => {
    if (user.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.username?.slice(0, 2).toUpperCase() || '??';
  };

  const canModifyUser = (user) => {
    const role = getUserRole(user);
    if (isSuperAdmin()) return true;
    if (isAdmin() && !['super_admin', 'admin'].includes(role)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#0891B2] text-white shadow-lg">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Team Management
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Create and manage team members</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/20 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              const defaultRole = managementRoles.find(r => r.name === 'user') || managementRoles[0];
              setFormData({
                username: '', email: '', password: '', full_name: '',
                role: defaultRole ? mapRoleNameToAuth(defaultRole.name) : 'user',
                selectedRoleId: defaultRole?.id ?? null
              });
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0891B2] hover:bg-[#0e7490] text-white rounded-xl transition-all font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <GlassCard>
            <Skeleton className="h-12 w-full mb-4" />
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full mb-2" />
            ))}
          </GlassCard>
        </div>
      ) : users.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={Inbox}
            title="No Team Members Found"
            description="Your team is empty. Create the first user to get started."
            action={() => setShowCreateModal(true)}
            actionLabel="Create First User"
          />
        </GlassCard>
      ) : (
        <>
          {
}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-violet-500/10">
                  <Users className="w-6 h-6 text-violet-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-500/10">
                  <Crown className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {users.filter(u => getUserRole(u) === 'super_admin').length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Super Admins</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Shield className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {users.filter(u => getUserRole(u) === 'admin').length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Admins</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <UserCheck className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {users.filter(u => u.is_active !== false).length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {
}
          <GlassCard padding={false}>
            <div className="p-4 border-b border-gray-200/50 dark:border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No users match your search</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200/50 dark:divide-white/10">
                {filteredUsers.map(user => {
                  const userRole = getUserRole(user);
                  const RoleIcon = roleIcons[userRole] || Users;
                  const canModify = canModifyUser(user);
                  return (
                    <div key={user.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold ${
                            userRole === 'super_admin' 
                              ? 'bg-[#DC2626]' 
                              : userRole === 'admin' || userRole === 'administrator'
                              ? 'bg-[#EA580C]'
                              : 'bg-[#0891B2]'
                          }`}>
                            {getUserInitials(user)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {user.full_name || user.username}
                              </h4>
                              {user.is_active === false && (
                                <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${roleColors[userRole] || roleColors.user}`}>
                            <RoleIcon className="w-3.5 h-3.5" />
                            <span className="capitalize">{userRole?.replace('_', ' ') || 'user'}</span>
                          </div>
                          
                          {canModify && (
                            <div ref={actionMenuOpen === user.id ? actionMenuRef : null} className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenuOpen(actionMenuOpen === user.id ? null : user.id);
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                aria-expanded={actionMenuOpen === user.id}
                                aria-haspopup="true"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-500" />
                              </button>
                              
                              {actionMenuOpen === user.id && (
                                <div
                                  className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl py-1"
                                  role="menu"
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={(e) => { e.stopPropagation(); openEditModal(user); }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                                  >
                                    <Edit3 className="w-4 h-4 shrink-0" />
                                    Edit User
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={(e) => { e.stopPropagation(); handleToggleActive(user); }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                                  >
                                    {user.is_active ? (
                                      <>
                                        <UserX className="w-4 h-4" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="w-4 h-4" />
                                        Activate
                                      </>
                                    )}
                                  </button>
                                  <div className="border-t border-gray-200 dark:border-white/10 my-1" />
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={(e) => { e.stopPropagation(); openDeleteModal(user); }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="w-4 h-4 shrink-0" />
                                    Delete User
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </>
      )}

      {
}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <UserPlus className="w-5 h-5 text-violet-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New User</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="johndoe"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-10 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                <select
                  value={formData.selectedRoleId ?? formData.role ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (managementRoles.length) {
                      const id = Number(val);
                      const role = managementRoles.find(r => r.id === id);
                      setFormData(prev => ({
                        ...prev,
                        selectedRoleId: id,
                        role: role ? mapRoleNameToAuth(role.name) : 'user'
                      }));
                    } else {
                      setFormData(prev => ({ ...prev, role: val, selectedRoleId: null }));
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  {managementRoles.length > 0
                    ? managementRoles.map(role => (
                        <option key={role.id} value={role.id} disabled={role.name === 'super_admin' && !isSuperAdmin()}>
                          {role.display_name || role.name} {role.description ? `- ${role.description}` : ''}
                        </option>
                      ))
                    : availableRoles.map(role => (
                        <option key={role.value} value={role.value} disabled={role.value === 'super_admin' && !isSuperAdmin()}>
                          {role.label} - {role.description}
                        </option>
                      ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-[#0891B2] hover:bg-[#0e7490] text-white rounded-xl transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {
}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Edit3 className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit User</h2>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                <select
                  value={formData.selectedRoleId ?? formData.role ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (managementRoles.length) {
                      const id = Number(val);
                      const role = managementRoles.find(r => r.id === id);
                      setFormData(prev => ({
                        ...prev,
                        selectedRoleId: id,
                        role: role ? mapRoleNameToAuth(role.name) : prev.role
                      }));
                    } else {
                      setFormData(prev => ({ ...prev, role: val, selectedRoleId: null }));
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {managementRoles.length > 0
                    ? managementRoles.map(role => (
                        <option key={role.id} value={role.id} disabled={role.name === 'super_admin' && !isSuperAdmin()}>
                          {role.display_name || role.name}
                        </option>
                      ))
                    : availableRoles.map(role => (
                        <option key={role.value} value={role.value} disabled={role.value === 'super_admin' && !isSuperAdmin()}>
                          {role.label}
                        </option>
                      ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-[#2563EB] text-white rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {
}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delete User</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{selectedUser.username}</span>? 
              All their data will be permanently removed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

    </div>
  );
}

