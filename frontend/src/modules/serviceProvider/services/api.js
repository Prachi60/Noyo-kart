import axios from 'axios';
import { apiCache } from '../utils/apiCache';

// API Base URL - Using /api/sp prefix for Service Provider module
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, '/api/sp')
  : 'http://localhost:5000/api/sp';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // For cookies
});

// Helper to get token keys based on role/path
const getTokenKeys = (url) => {
  // 1. Prioritize current page context for role-based tokens
  if (window.location.pathname.startsWith('/sp/admin')) {
    return { access: 'spAdminAccessToken', refresh: 'spAdminRefreshToken', role: 'admin' };
  }
  if (window.location.pathname.startsWith('/sp/vendor')) {
    return { access: 'spVendorAccessToken', refresh: 'spVendorRefreshToken', role: 'vendor' };
  }
  if (window.location.pathname.startsWith('/sp/worker')) {
    return { access: 'spWorkerAccessToken', refresh: 'spWorkerRefreshToken', role: 'worker' };
  }

  // 2. Explicitly detect auth routes regardless of current page (for cross-role login/actions)
  if (url?.includes('/admin/auth')) return { access: 'spAdminAccessToken', refresh: 'spAdminRefreshToken', role: 'admin' };
  if (url?.includes('/vendors/auth')) return { access: 'spVendorAccessToken', refresh: 'spVendorRefreshToken', role: 'vendor' };
  if (url?.includes('/workers/auth')) return { access: 'spWorkerAccessToken', refresh: 'spWorkerRefreshToken', role: 'worker' };

  // 3. Fallback to user token (most common case for user app)
  return { access: 'spAccessToken', refresh: 'spRefreshToken', role: 'user' };
};

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const { access } = getTokenKeys(config.url);
    const token = sessionStorage.getItem(access) || localStorage.getItem(access);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Track if we're currently refreshing
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

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
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

      const { access, refresh, role } = getTokenKeys(originalRequest.url);
      const refreshToken = sessionStorage.getItem(refresh) || localStorage.getItem(refresh);

      if (!refreshToken) {
        handleLogout(role);
        return Promise.reject(error);
      }

      try {
        let refreshEndpoint = '/users/auth/refresh-token';
        if (role === 'vendor') refreshEndpoint = '/vendors/auth/refresh-token';
        else if (role === 'worker') refreshEndpoint = '/workers/auth/refresh-token';
        else if (role === 'admin') refreshEndpoint = '/admin/auth/refresh-token';

        const response = await axios.post(`${API_BASE_URL}${refreshEndpoint}`, {
          refreshToken
        });

        const { accessToken } = response.data;

        if (sessionStorage.getItem(access)) {
          sessionStorage.setItem(access, accessToken);
        } else {
          localStorage.setItem(access, accessToken);
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        console.error('RefreshToken failed:', refreshError);
        processQueue(refreshError, null);
        isRefreshing = false;
        handleLogout(role);
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 403) {
      console.error('Access Denied (403):', error.response.data.message);
    }

    return Promise.reject(error);
  }
);

// Handle logout
export const handleLogout = (role = null) => {
  if (!role) {
    const path = window.location.pathname;
    if (path.startsWith('/sp/admin')) role = 'admin';
    else if (path.startsWith('/sp/vendor')) role = 'vendor';
    else if (path.startsWith('/sp/worker')) role = 'worker';
    else role = 'user';
  }

  const clearTokens = (prefix) => {
    sessionStorage.removeItem(`${prefix}AccessToken`);
    sessionStorage.removeItem(`${prefix}RefreshToken`);
    sessionStorage.removeItem(`${prefix}Data`);
    localStorage.removeItem(`${prefix}AccessToken`);
    localStorage.removeItem(`${prefix}RefreshToken`);
    localStorage.removeItem(`${prefix}Data`);
  };

  if (role === 'vendor') {
    clearTokens('spVendor');
    if (window.location.pathname !== '/sp/vendor/login') {
      window.location.href = '/sp/vendor/login';
    }
  } else if (role === 'worker') {
    clearTokens('spWorker');
    if (window.location.pathname !== '/sp/worker/login') {
      window.location.href = '/sp/worker/login';
    }
  } else if (role === 'admin') {
    clearTokens('spAdmin');
    if (window.location.pathname !== '/sp/admin/login') {
      window.location.href = '/sp/admin/login';
    }
  } else {
    localStorage.removeItem('spAccessToken');
    localStorage.removeItem('spRefreshToken');
    localStorage.removeItem('spUserData');
    sessionStorage.removeItem('spAccessToken');
    sessionStorage.removeItem('spRefreshToken');
    sessionStorage.removeItem('spUserData');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/sp/user/login';
    }
  }
};

export { apiCache };
export default api;
