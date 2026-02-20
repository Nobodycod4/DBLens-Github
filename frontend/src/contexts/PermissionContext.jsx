import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { rolesAPI, isAuthenticated, getUser } from '../services/api';

const PermissionContext = createContext(null);

const ROLE_HIERARCHY = {
  super_admin: 100,
  admin: 80,
  developer: 60,
  user: 60,  // legacy role, same level as developer
  analyst: 40,
  viewer: 20,
  guest: 0,
};

export function PermissionProvider({ children }) {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userInfo, setUserInfo] = useState({
    userId: null,
    username: null,
    email: null,
    highestRole: 'guest',
    highestLevel: 0,
    isSuperAdmin: false,
    isAdmin: false,
    canManageRoles: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      setPermissions([]);
      setRoles([]);
      setUserInfo({
        userId: null,
        username: null,
        email: null,
        highestRole: 'guest',
        highestLevel: 0,
        isSuperAdmin: false,
        isAdmin: false,
        canManageRoles: false,
      });
      return;
    }

    try {
      setLoading(true);
      const response = await rolesAPI.getMyPermissions();
      const data = response.data;
      const authUser = getUser();
      const legacySuperAdmin = (authUser?.role || '').toLowerCase() === 'super_admin';

      setPermissions(data.permissions || []);
      setRoles(data.roles || []);
      setUserInfo({
        userId: data.user_id,
        username: data.username,
        email: data.email,
        highestRole: data.highest_role || (legacySuperAdmin ? 'super_admin' : 'guest'),
        highestLevel: data.highest_level ?? (legacySuperAdmin ? 100 : 0),
        isSuperAdmin: data.is_super_admin || legacySuperAdmin,
        isAdmin: data.is_admin || legacySuperAdmin,
        canManageRoles: data.can_manage_roles || legacySuperAdmin,
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
      setError(err);
      const authUser = getUser();
      const legacySuperAdmin = (authUser?.role || '').toLowerCase() === 'super_admin';
      setPermissions([
        'dashboard.view', 'connections.view', 'connections.create', 'connections.edit',
        'connections.delete', 'schema.view', 'schema.diagram', 'query.execute',
        'monitoring.view', 'audit.view', 'backups.view', 'backups.create',
        'schedules.view', 'migrations.view', 'snapshots.view', 'documentation.view',
        'performance.view', 'teams.view', 'system.health', 'system.pool',
        'settings.view', 'settings.edit',
      ]);
      setUserInfo({
        userId: authUser?.id ?? null,
        username: authUser?.username ?? null,
        email: authUser?.email ?? null,
        highestRole: legacySuperAdmin ? 'super_admin' : 'viewer',
        highestLevel: legacySuperAdmin ? 100 : 20,
        isSuperAdmin: legacySuperAdmin,
        isAdmin: legacySuperAdmin,
        canManageRoles: legacySuperAdmin,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
    const handleStorageChange = (e) => {
      if (e.key === 'dblens_access_token') fetchPermissions();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchPermissions]);

  const hasPermission = useCallback((permission) => {
    if (!isAuthenticated()) return true; // Allow unauthenticated for public routes
    if (loading && permissions.length === 0) return true; // Loading state
    if (userInfo.isSuperAdmin) return true; // Super admin has all permissions
    return permissions.includes(permission);
  }, [permissions, loading, userInfo.isSuperAdmin]);

  const hasAnyPermission = useCallback((requiredPermissions) => {
    if (userInfo.isSuperAdmin) return true;
    return requiredPermissions.some(p => permissions.includes(p));
  }, [permissions, userInfo.isSuperAdmin]);

  const hasAllPermissions = useCallback((requiredPermissions) => {
    if (userInfo.isSuperAdmin) return true;
    return requiredPermissions.every(p => permissions.includes(p));
  }, [permissions, userInfo.isSuperAdmin]);

  const isAdmin = useCallback(() => {
    if (!isAuthenticated()) return false;
    return userInfo.isAdmin;
  }, [userInfo.isAdmin]);

  const isSuperAdmin = useCallback(() => {
    if (!isAuthenticated()) return false;
    return userInfo.isSuperAdmin;
  }, [userInfo.isSuperAdmin]);

  const canManageRoles = useCallback(() => {
    if (!isAuthenticated()) return false;
    return userInfo.canManageRoles;
  }, [userInfo.canManageRoles]);

  const canManageRole = useCallback((targetRoleName) => {
    if (!isAuthenticated()) return false;
    if (userInfo.isSuperAdmin) return true;
    
    const userLevel = userInfo.highestLevel;
    const targetLevel = ROLE_HIERARCHY[targetRoleName] || 0;
    
    if (userInfo.isAdmin && targetRoleName !== 'super_admin') return true;
    
    return userLevel > targetLevel;
  }, [userInfo]);

  const getRoleLevel = useCallback((roleName) => {
    return ROLE_HIERARCHY[roleName] || 0;
  }, []);

  const getRoleColor = useCallback((roleName) => {
    const colors = {
      super_admin: '#DC2626', // Red
      admin: '#F59E0B',       // Amber
      developer: '#3B82F6',   // Blue
      user: '#3B82F6',       // Blue (same as developer)
      analyst: '#0891B2',     // Teal
      viewer: '#6B7280',      // Gray
      guest: '#9CA3AF',       // Light gray
    };
    return colors[roleName] || '#6B7280';
  }, []);

  const refresh = useCallback(() => fetchPermissions(), [fetchPermissions]);

  return (
    <PermissionContext.Provider value={{
      permissions,
      roles,
      userInfo,
      loading,
      error,
      
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      
      isAdmin,
      isSuperAdmin,
      canManageRoles,
      canManageRole,
      
      getRoleLevel,
      getRoleColor,
      roleHierarchy: ROLE_HIERARCHY,
      
      refresh,
    }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) throw new Error('usePermissions must be used within a PermissionProvider');
  return context;
}

export function RequirePermission({ permission, permissions, any = false, children, fallback = null }) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = usePermissions();
  
  if (isSuperAdmin()) return children;
  
  if (permission) return hasPermission(permission) ? children : fallback;
  if (permissions) {
    if (any) return hasAnyPermission(permissions) ? children : fallback;
    return hasAllPermissions(permissions) ? children : fallback;
  }
  return children;
}

export function RequireAdmin({ children, fallback = null }) {
  const { isAdmin } = usePermissions();
  return isAdmin() ? children : fallback;
}

export function RequireSuperAdmin({ children, fallback = null }) {
  const { isSuperAdmin } = usePermissions();
  return isSuperAdmin() ? children : fallback;
}

export default PermissionContext;

