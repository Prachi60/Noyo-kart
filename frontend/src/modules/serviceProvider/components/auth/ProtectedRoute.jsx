import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Protected Route Component for Service Provider Module
 * Uses sp-prefixed token keys to avoid conflicts with main Noyo-Kart auth
 */
const ProtectedRoute = ({ children, userType = 'user', redirectTo = null }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      let tokenKey = 'spAccessToken';
      let refreshTokenKey = 'spRefreshToken';
      let dataKey = 'spUserData';

      switch (userType) {
        case 'vendor':
          tokenKey = 'spVendorAccessToken';
          refreshTokenKey = 'spVendorRefreshToken';
          dataKey = 'spVendorData';
          break;
        case 'worker':
          tokenKey = 'spWorkerAccessToken';
          refreshTokenKey = 'spWorkerRefreshToken';
          dataKey = 'spWorkerData';
          break;
        case 'admin':
          tokenKey = 'spAdminAccessToken';
          refreshTokenKey = 'spAdminRefreshToken';
          dataKey = 'spAdminData';
          break;
        default:
          tokenKey = 'spAccessToken';
          refreshTokenKey = 'spRefreshToken';
          dataKey = 'spUserData';
          break;
      }

      const token = sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey);
      const refreshToken = sessionStorage.getItem(refreshTokenKey) || localStorage.getItem(refreshTokenKey);
      const userData = sessionStorage.getItem(dataKey) || localStorage.getItem(dataKey);

      if (token && userData) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const currentTime = Math.floor(Date.now() / 1000);

            if (payload.exp && payload.exp > currentTime) {
              setIsAuthenticated(true);
            } else if (refreshToken) {
              setIsAuthenticated(true);
            } else {
              handleExpiredSession(tokenKey, refreshTokenKey, dataKey);
            }
          } else {
            setIsAuthenticated(false);
          }
        } catch (error) {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    const handleExpiredSession = (tokenKey, refreshTokenKey, dataKey) => {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(refreshTokenKey);
      localStorage.removeItem(dataKey);
      sessionStorage.removeItem(tokenKey);
      sessionStorage.removeItem(refreshTokenKey);
      sessionStorage.removeItem(dataKey);
      setIsAuthenticated(false);
    };

    checkAuth();
  }, [userType, location.pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    const defaultRedirects = {
      user: '/sp/user/login',
      vendor: '/sp/vendor/login',
      worker: '/sp/worker/login',
      admin: '/sp/admin/login'
    };
    const redirectPath = redirectTo || defaultRedirects[userType] || '/sp/user/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
