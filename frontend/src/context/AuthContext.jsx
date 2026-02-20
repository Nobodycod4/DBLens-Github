import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, isAuthenticated, getUser, setCurrentOrgId, getCurrentOrgId, clearTokens } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser());
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((data) => {
    setUser(data);
    localStorage.setItem('dblens_user', JSON.stringify(data));
    if (data?.current_org_id != null) {
      setCurrentOrgId(data.current_org_id);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        try {
          const data = await authAPI.getMe();
          persistUser(data);
        } catch (e) {
          localStorage.removeItem('dblens_access_token');
          localStorage.removeItem('dblens_user');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [persistUser]);

  const login = useCallback(async (username, password) => {
    await authAPI.login(username, password);
    const data = await authAPI.getMe();
    persistUser(data);
    window.dispatchEvent(new Event('storage'));
    return data;
  }, [persistUser]);

  const register = useCallback(async (username, email, password, fullName) => {
    await authAPI.register(username, email, password, fullName);
    const data = await authAPI.getMe();
    persistUser(data);
    window.dispatchEvent(new Event('storage'));
    return data;
  }, [persistUser]);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch (e) {}
    clearTokens();
    setUser(null);
  }, []);

  const organizations = user?.organizations ?? [];
  const currentOrgId = user?.current_org_id ?? getCurrentOrgId() ?? (organizations[0]?.id ?? null);

  const setCurrentOrg = useCallback(async (orgId) => {
    setCurrentOrgId(orgId);
    try {
      const data = await authAPI.getMe();
      persistUser({ ...data, current_org_id: orgId });
    } catch (_) {
      setUser((prev) => (prev ? { ...prev, current_org_id: orgId } : null));
    }
    window.dispatchEvent(new Event('storage'));
  }, [persistUser]);

  const value = {
    user,
    loading,
    isAuthenticated: isAuthenticated(),
    login,
    register,
    logout,
    organizations,
    currentOrgId,
    setCurrentOrg,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;

