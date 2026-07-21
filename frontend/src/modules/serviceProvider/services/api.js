import axios from 'axios';
import { apiCache } from '../utils/apiCache';
import { resolveApiBaseUrl } from '../../../core/api/resolveApiBaseUrl';
import { getStoredAuthToken } from '../../../core/utils/authStorage';

// API Base URL - Using /api/sp prefix for Service Provider module
const API_BASE_URL = resolveApiBaseUrl().replace(/\/api$/, '/api/sp');

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
  // 1. Prioritize API URL first (most reliable for pending requests after navigation)
  if (url?.includes('/admin/')) {
    return { access: 'spAdminAccessToken', refresh: 'spAdminRefreshToken', role: 'admin' };
  }
  if (url?.includes('/vendors/')) {
    return { access: 'spVendorAccessToken', refresh: 'spVendorRefreshToken', role: 'vendor' };
  }
  if (url?.includes('/workers/')) {
    return { access: 'spWorkerAccessToken', refresh: 'spWorkerRefreshToken', role: 'worker' };
  }
  if (url?.includes('/users/')) {
    return { access: 'spAccessToken', refresh: 'spRefreshToken', role: 'user' };
  }

  // 2. Fallback to current page context
  if (window.location.pathname.startsWith('/sp/admin')) {
    return { access: 'spAdminAccessToken', refresh: 'spAdminRefreshToken', role: 'admin' };
  }
  if (window.location.pathname.startsWith('/sp/vendor')) {
    return { access: 'spVendorAccessToken', refresh: 'spVendorRefreshToken', role: 'vendor' };
  }
  if (window.location.pathname.startsWith('/sp/worker')) {
    return { access: 'spWorkerAccessToken', refresh: 'spWorkerRefreshToken', role: 'worker' };
  }

  // 3. Absolute fallback
  return { access: 'spAccessToken', refresh: 'spRefreshToken', role: 'user' };
};

let ssoRecoverInFlight = null;

async function recoverUserSessionViaSso() {
  const qcToken = getStoredAuthToken('auth_customer') || getStoredAuthToken('token', { allowExpired: false });
  if (!qcToken) return null;

  if (!ssoRecoverInFlight) {
    ssoRecoverInFlight = axios
      .post(`${API_BASE_URL}/users/auth/sso-login`, { qcToken })
      .then((res) => {
        if (!res.data?.success || !res.data.accessToken) return null;
        localStorage.setItem('spAccessToken', res.data.accessToken);
        if (res.data.refreshToken) {
          localStorage.setItem('spRefreshToken', res.data.refreshToken);
        }
        if (res.data.user) {
          localStorage.setItem('spUserData', JSON.stringify(res.data.user));
        }
        sessionStorage.removeItem('spAccessToken');
        sessionStorage.removeItem('spRefreshToken');
        sessionStorage.removeItem('spUserData');
        window.dispatchEvent(new CustomEvent('sp-auth-changed', { detail: { userType: 'spUserData' } }));
        return res.data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        ssoRecoverInFlight = null;
      });
  }

  return ssoRecoverInFlight;
}

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
      const requestToken = originalRequest.headers?.Authorization?.replace(/^Bearer\s+/i, '') || null;
      const currentToken = sessionStorage.getItem(access) || localStorage.getItem(access);

      // Stale in-flight request after a newer SSO/login — don't wipe the fresh session
      if (currentToken && requestToken && requestToken !== currentToken) {
        isRefreshing = false;
        originalRequest.headers.Authorization = `Bearer ${currentToken}`;
        return api(originalRequest);
      }

      const refreshToken = sessionStorage.getItem(refresh) || localStorage.getItem(refresh);

      if (refreshToken) {
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
        }
      }

      // QC session can rebuild SP user tokens via SSO
      if (role === 'user') {
        const ssoToken = await recoverUserSessionViaSso();
        if (ssoToken) {
          originalRequest.headers.Authorization = `Bearer ${ssoToken}`;
          processQueue(null, ssoToken);
          isRefreshing = false;
          return api(originalRequest);
        }
      }

      processQueue(error, null);
      isRefreshing = false;
      handleLogout(role);
      return Promise.reject(error);
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

    // QC session can recover via SSO — don't hard-redirect to SP login
    const hasQcSession = Boolean(
      getStoredAuthToken('auth_customer') || getStoredAuthToken('token', { allowExpired: true })
    );
    if (hasQcSession) {
      window.dispatchEvent(new CustomEvent('sp-auth-changed'));
      return;
    }

    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/sp/user/login';
    }
  }
};

export { apiCache };
export default api;
