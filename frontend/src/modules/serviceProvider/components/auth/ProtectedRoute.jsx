import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

import { resolveApiBaseUrl } from '../../../../core/api/resolveApiBaseUrl';
import { getStoredAuthToken } from '../../../../core/utils/authStorage';

// API Base URL - Using /api/sp prefix for Service Provider module
const API_BASE_URL = resolveApiBaseUrl().replace(/\/api$/, '/api/sp');

const DEFAULT_REDIRECTS = {
  user: '/sp/user/login',
  vendor: '/sp/vendor/login',
  worker: '/sp/worker/login',
  admin: '/sp/admin/login'
};

// Prevent concurrent SSO calls from rotating loginSessionId multiple times
let ssoInFlight = null;

function getStorageKeys(userType) {
  switch (userType) {
    case 'vendor':
      return {
        tokenKey: 'spVendorAccessToken',
        refreshTokenKey: 'spVendorRefreshToken',
        dataKey: 'spVendorData'
      };
    case 'worker':
      return {
        tokenKey: 'spWorkerAccessToken',
        refreshTokenKey: 'spWorkerRefreshToken',
        dataKey: 'spWorkerData'
      };
    case 'admin':
      return {
        tokenKey: 'spAdminAccessToken',
        refreshTokenKey: 'spAdminRefreshToken',
        dataKey: 'spAdminData'
      };
    default:
      return {
        tokenKey: 'spAccessToken',
        refreshTokenKey: 'spRefreshToken',
        dataKey: 'spUserData'
      };
  }
}

function storeSpSession(tokenKey, refreshTokenKey, dataKey, accessToken, refreshToken, profile) {
  localStorage.setItem(tokenKey, accessToken);
  localStorage.setItem(refreshTokenKey, refreshToken);
  localStorage.setItem(dataKey, JSON.stringify(profile));
  sessionStorage.removeItem(tokenKey);
  sessionStorage.removeItem(refreshTokenKey);
  sessionStorage.removeItem(dataKey);
  window.dispatchEvent(new CustomEvent('sp-auth-changed', { detail: { userType: dataKey } }));
}

function clearSpSession(tokenKey, refreshTokenKey, dataKey) {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(refreshTokenKey);
  localStorage.removeItem(dataKey);
  sessionStorage.removeItem(tokenKey);
  sessionStorage.removeItem(refreshTokenKey);
  sessionStorage.removeItem(dataKey);
}

function hasValidSpToken(token, refreshToken) {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp > currentTime) return true;
    return Boolean(refreshToken);
  } catch {
    return false;
  }
}

async function runUserSso(tokenKey, refreshTokenKey, dataKey) {
  const qcToken = getStoredAuthToken('auth_customer') || getStoredAuthToken('token', { allowExpired: false });
  if (!qcToken) return false;

  if (!ssoInFlight) {
    ssoInFlight = axios
      .post(`${API_BASE_URL}/users/auth/sso-login`, { qcToken })
      .finally(() => {
        ssoInFlight = null;
      });
  }

  const res = await ssoInFlight;
  if (res.data?.success) {
    const { accessToken, refreshToken: newRefreshToken, user } = res.data;
    storeSpSession(tokenKey, refreshTokenKey, dataKey, accessToken, newRefreshToken, user);
    return true;
  }
  return false;
}

async function runAdminSso(tokenKey, refreshTokenKey, dataKey) {
  const qcAdminToken = getStoredAuthToken('auth_admin');
  if (!qcAdminToken) return false;

  const res = await axios.post(`${API_BASE_URL}/admin/auth/sso-login`, { qcToken: qcAdminToken });
  if (res.data?.success) {
    const { accessToken, refreshToken: newRefreshToken, admin } = res.data;
    storeSpSession(tokenKey, refreshTokenKey, dataKey, accessToken, newRefreshToken, admin);
    return true;
  }
  return false;
}

/**
 * Protected Route Component for Service Provider Module
 * Uses sp-prefixed token keys to avoid conflicts with main Noyo-Kart auth.
 * When a Quick Commerce session exists and SP session is missing, SSO refreshes SP auth.
 */
const ProtectedRoute = ({ children, userType = 'user', redirectTo = null }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const { tokenKey, refreshTokenKey, dataKey } = getStorageKeys(userType);
      const token = sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey);
      const refreshToken = sessionStorage.getItem(refreshTokenKey) || localStorage.getItem(refreshTokenKey);
      const userData = sessionStorage.getItem(dataKey) || localStorage.getItem(dataKey);

      // Prefer existing valid SP session — avoid re-SSO (it rotates loginSessionId and races in-flight APIs)
      if (token && userData && hasValidSpToken(token, refreshToken)) {
        if (!cancelled) {
          setIsAuthenticated(true);
          setIsLoading(false);
        }
        return;
      }

      // SSO only when SP session is missing/expired
      try {
        if (userType === 'user') {
          const ok = await runUserSso(tokenKey, refreshTokenKey, dataKey);
          if (ok) {
            if (!cancelled) {
              setIsAuthenticated(true);
              setIsLoading(false);
            }
            return;
          }
        } else if (userType === 'admin') {
          const ok = await runAdminSso(tokenKey, refreshTokenKey, dataKey);
          if (ok) {
            if (!cancelled) {
              setIsAuthenticated(true);
              setIsLoading(false);
            }
            return;
          }
        }
      } catch (err) {
        console.error('SSO failed:', err.response?.data?.message || err.message);
      }

      // Fallback: existing SP-only session without userData, or clear invalid leftovers
      const latestToken = sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey);
      const latestRefresh = sessionStorage.getItem(refreshTokenKey) || localStorage.getItem(refreshTokenKey);
      if (latestToken && hasValidSpToken(latestToken, latestRefresh)) {
        if (!cancelled) {
          setIsAuthenticated(true);
          setIsLoading(false);
        }
        return;
      }

      if (token || userData) {
        clearSpSession(tokenKey, refreshTokenKey, dataKey);
      }
      if (!cancelled) {
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [userType, location.pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    const redirectPath = redirectTo || DEFAULT_REDIRECTS[userType] || '/sp/user/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
