import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Public Route Component for Service Provider Module
 * Redirects to dashboard if user is already authenticated
 */
const PublicRoute = ({ children, userType = 'user', redirectTo = null }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      let tokenKey = 'spAccessToken';
      let dataKey = 'spUserData';

      switch (userType) {
        case 'vendor':
          tokenKey = 'spVendorAccessToken';
          dataKey = 'spVendorData';
          break;
        case 'worker':
          tokenKey = 'spWorkerAccessToken';
          dataKey = 'spWorkerData';
          break;
        case 'admin':
          tokenKey = 'spAdminAccessToken';
          dataKey = 'spAdminData';
          break;
        default:
          tokenKey = 'spAccessToken';
          dataKey = 'spUserData';
          break;
      }

      const token = localStorage.getItem(tokenKey);
      const userData = localStorage.getItem(dataKey);

      if (token && userData) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const currentTime = Date.now() / 1000;

            if (!payload.exp || payload.exp <= currentTime) {
              localStorage.removeItem(tokenKey);
              localStorage.removeItem(dataKey);
              setIsAuthenticated(false);
              setIsLoading(false);
              return;
            }

            const roleMap = { user: 'user', vendor: 'vendor', worker: 'worker', admin: 'admin' };
            setIsAuthenticated(payload.role === roleMap[userType]);
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

    checkAuth();
  }, [userType, location.pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    const defaultRedirects = {
      user: '/sp/user',
      vendor: '/sp/vendor/dashboard',
      worker: '/sp/worker/dashboard',
      admin: '/sp/admin/dashboard'
    };
    const redirectPath = redirectTo || defaultRedirects[userType] || '/sp/user';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default PublicRoute;
