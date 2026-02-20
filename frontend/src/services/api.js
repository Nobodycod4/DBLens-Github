import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1');

const TOKEN_KEY = 'dblens_access_token';
const REFRESH_TOKEN_KEY = 'dblens_refresh_token';
const USER_KEY = 'dblens_user';
const CURRENT_ORG_KEY = 'dblens_current_org_id';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});


export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const getUser = () => {
  try {
    const user = localStorage.getItem(USER_KEY);
    if (!user || user === 'undefined' || user === 'null') return null;
    return JSON.parse(user);
  } catch (e) {
    return null;
  }
};

export const setTokens = (accessToken, refreshToken, user) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(CURRENT_ORG_KEY);
};

export const getCurrentOrgId = () => {
  const id = localStorage.getItem(CURRENT_ORG_KEY);
  if (id == null || id === '') return null;
  const n = parseInt(id, 10);
  return Number.isNaN(n) ? null : n;
};

export const setCurrentOrgId = (orgId) => {
  if (orgId == null) localStorage.removeItem(CURRENT_ORG_KEY);
  else localStorage.setItem(CURRENT_ORG_KEY, String(orgId));
};

export const isAuthenticated = () => {
  return !!getAccessToken();
};


api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const orgId = getCurrentOrgId();
    if (orgId != null) {
      config.headers['X-Org-Id'] = String(orgId);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timeout - Please try again');
      } else if (error.message === 'Network Error') {
        toast.error('Network error - Please check your connection');
      } else {
        toast.error('An unexpected error occurred');
      }
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      
      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken
        });

        const { access_token, user } = response.data;
        setTokens(access_token, refreshToken, user);
        
        api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        processQueue(null, access_token);
        isRefreshing = false;
        
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        clearTokens();
        window.location.href = '/login';
        toast.error('Session expired - Please log in again');
        return Promise.reject(refreshError);
      }
    }

    switch (status) {
      case 400:
        if (data?.detail) {
          toast.error(data.detail);
        } else {
          toast.error('Invalid request');
        }
        break;

      case 403:
        toast.error('Access denied');
        break;

      case 404:
        toast.error('Resource not found');
        break;

      case 409:
        if (data?.detail) {
          toast.error(data.detail);
        } else {
          toast.error('Conflict - Resource already exists');
        }
        break;

      case 422:
        if (data?.detail) {
          const errorMsg = Array.isArray(data.detail) 
            ? data.detail.map(e => e.msg).join(', ')
            : data.detail;
          toast.error(`Validation error: ${errorMsg}`);
        } else {
          toast.error('Validation error');
        }
        break;

      case 500:
        toast.error('Server error - Please try again later');
        break;

      case 502:
      case 503:
      case 504:
        toast.error('Service temporarily unavailable');
        
        if (!originalRequest._retry) {
          originalRequest._retry = true;
          originalRequest._retryCount = originalRequest._retryCount || 0;
          
          if (originalRequest._retryCount < 2) {
            originalRequest._retryCount++;
            
            await new Promise(resolve => 
              setTimeout(resolve, 1000 * Math.pow(2, originalRequest._retryCount))
            );
            
            return api(originalRequest);
          }
        }
        break;

      default:
        toast.error('An error occurred');
    }

    return Promise.reject(error);
  }
);


export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { access_token, refresh_token, user } = response.data;
    setTokens(access_token, refresh_token, user);
    return response.data;
  },

  register: async (username, email, password, full_name = null) => {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
      full_name
    });
    const { access_token, refresh_token, user } = response.data;
    setTokens(access_token, refresh_token, user);
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearTokens();
    }
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async () => {
    const refreshToken = getRefreshToken();
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    const { access_token, user } = response.data;
    setTokens(access_token, refreshToken, user);
    return response.data;
  },

  adminCreateUser: async (userData) => {
    const response = await api.post('/auth/admin/users', userData);
    return response.data;
  },

  adminListUsers: async () => {
    const response = await api.get('/auth/admin/users');
    return response.data;
  },

  adminDeleteUser: async (userId) => {
    const response = await api.delete(`/auth/admin/users/${userId}`);
    return response.data;
  },

  adminUpdateUser: async (userId, updates) => {
    const response = await api.patch(`/auth/admin/users/${userId}`, null, { params: updates });
    return response.data;
  },

  checkSetupStatus: async () => {
    const response = await api.get('/auth/setup-status');
    return response.data;
  }
};

export const searchUsers = (q, limit = 20) =>
  api.get('/auth/users/search', { params: { q: q || '', limit } });

export const withLoading = async (apiCall, loadingMessage = 'Loading...') => {
  const toastId = toast.loading(loadingMessage);
  try {
    const result = await apiCall();
    toast.dismiss(toastId);
    return result;
  } catch (error) {
    toast.dismiss(toastId);
    throw error;
  }
};


export const getDashboardStats = () => api.get('/databases/dashboard/stats');
export const getAllDatabases = () => api.get('/databases/');
export const getDatabase = (id) => api.get(`/databases/${id}`);
export const createDatabase = (data) => api.post('/databases/', data);
export const createNewDatabase = (data) => 
  api.post('/databases/create-new', null, { params: data });
export const updateDatabase = (id, data) => api.put(`/databases/${id}`, data);
export const deleteDatabase = (id) => api.delete(`/databases/${id}`);
export const getSharedWith = (connectionId) => api.get(`/databases/${connectionId}/shared-with`);
export const grantSharedWith = (connectionId, body) => api.post(`/databases/${connectionId}/shared-with`, body);
export const revokeSharedWith = (connectionId, userId) => api.delete(`/databases/${connectionId}/shared-with/${userId}`);
export const testConnection = (id) => api.post(`/databases/${id}/test`);
export const getSchema = (id) => api.get(`/databases/${id}/schema`);
export const executeQuery = (id, data) => api.post(`/databases/${id}/query`, data);
export const executeWriteQuery = (id, data, confirm = false) =>
  api.post(`/databases/${id}/execute`, data, { params: { confirm } });

export const getAuditLogs = (params) => api.get('/audit-logs/', { params });
export const getAuditLog = (id) => api.get(`/audit-logs/${id}`);
export const getDatabaseAuditLogs = (dbId, params) => 
  api.get(`/databases/${dbId}/audit-logs`, { params });

export const createBackup = (connectionId) => api.post(`/backups/${connectionId}/create`);
export const listBackups = (connectionId) => api.get(`/backups/${connectionId}/list`);
export const downloadBackup = (backupId) => {
  return api.get(`/backups/download/${backupId}`, { responseType: 'blob' });
};
export const deleteBackup = (backupId) => api.delete(`/backups/${backupId}`);
export const restoreBackup = (backupId) => api.post(`/backups/restore/${backupId}`);

export const listSchedules = (connectionId = null) => {
  const params = connectionId ? { connection_id: connectionId } : {};
  return api.get('/backup-schedules/', { params });
};
export const getSchedule = (scheduleId) => api.get(`/backup-schedules/${scheduleId}`);
export const createSchedule = (data) => api.post('/backup-schedules/', data);
export const updateSchedule = (scheduleId, data) => 
  api.put(`/backup-schedules/${scheduleId}`, data);
export const deleteSchedule = (scheduleId) => api.delete(`/backup-schedules/${scheduleId}`);
export const runScheduleNow = (scheduleId) => 
  api.post(`/backup-schedules/${scheduleId}/run-now`);

export const checkBackendHealth = async () => {
  try {
    const response = await api.get('/health', { timeout: 5000 });
    return response.data;
  } catch (error) {
    throw new Error('Backend is not responding');
  }
};

export const rolesAPI = {
  getAvailablePermissions: () => api.get('/roles/permissions'),
  getMyPermissions: () => api.get('/roles/my-permissions'),
  getAll: () => api.get('/roles/'),
  get: (id) => api.get(`/roles/${id}`),
  create: (data) => api.post('/roles/', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  updatePermissions: (id, permissions) => api.put(`/roles/${id}/permissions`, { permissions }),
  delete: (id) => api.delete(`/roles/${id}`),
  getUserRoles: (userId) => api.get(`/roles/users/${userId}/roles`),
  assignRole: (data) => api.post('/roles/assign', data),
  removeAssignment: (assignmentId) => api.delete(`/roles/assignments/${assignmentId}`),
  listUsers: () => api.get('/roles/user-list'),
  initDefaults: () => api.post('/roles/init-defaults'),
};

export const getDefaultDBCredentials = () => api.get('/settings/default-db-credentials');
export const putDefaultDBCredentials = (data) => api.put('/settings/default-db-credentials', data);

export const organizationsAPI = {
  list: () => api.get('/organizations/'),
  create: (data) => api.post('/organizations/', data),
  get: (id) => api.get(`/organizations/${id}`),
  update: (id, data) => api.put(`/organizations/${id}`, data),
  listMembers: (orgId) => api.get(`/organizations/${orgId}/members`),
};

export { api };
export default {
  api,
  ...authAPI,
  isAuthenticated,
  getUser,
};
