import api from './api';
import { registerFCMToken, removeFCMToken } from './pushNotificationService';

/**
 * Notify Flutter WebView about successful login
 */
function notifyFlutterLogin(responseData) {
  try {
    if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
      window.flutter_inappwebview.callHandler('captureLoginResponse', JSON.stringify({
        url: '/auth/login',
        body: responseData
      }));
    }
  } catch (e) {
    console.error('[AUTH] Error notifying Flutter:', e);
  }
}

/**
 * Get the current platform type (web or mobile)
 */
function getPlatformType() {
  return (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) ? 'mobile' : 'web';
}

/**
 * User Authentication Service
 */
export const userAuthService = {
  sendOTP: async (phone, email = null) => {
    const response = await api.post('/users/auth/send-otp', { phone, email });
    return response.data;
  },

  verifyLogin: async (data) => {
    const response = await api.post('/users/auth/verify-login', data);
    if (response.data.success && !response.data.isNewUser && response.data.accessToken) {
      localStorage.setItem('spAccessToken', response.data.accessToken);
      localStorage.setItem('spRefreshToken', response.data.refreshToken);
      localStorage.setItem('spUserData', JSON.stringify(response.data.user));
      notifyFlutterLogin(response.data);
      registerFCMToken('user', true).catch(console.error);
    }
    return response.data;
  },

  register: async (data) => {
    const response = await api.post('/users/auth/register', data);
    if (response.data.accessToken) {
      localStorage.setItem('spAccessToken', response.data.accessToken);
      localStorage.setItem('spRefreshToken', response.data.refreshToken);
      localStorage.setItem('spUserData', JSON.stringify(response.data.user));
      notifyFlutterLogin(response.data);
      registerFCMToken('user', true).catch(console.error);
    }
    return response.data;
  },

  login: async (data) => {
    const response = await api.post('/users/auth/login', data);
    if (response.data.accessToken) {
      localStorage.setItem('spAccessToken', response.data.accessToken);
      localStorage.setItem('spRefreshToken', response.data.refreshToken);
      localStorage.setItem('spUserData', JSON.stringify(response.data.user));
      notifyFlutterLogin(response.data);
      registerFCMToken('user', true).catch(console.error);
    }
    return response.data;
  },

  logout: async () => {
    await removeFCMToken('user');
    try {
      await api.post('/users/auth/logout', { platform: getPlatformType() });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('spAccessToken');
    localStorage.removeItem('spRefreshToken');
    localStorage.removeItem('spUserData');
  },

  getProfile: async () => {
    const response = await api.get('/users/profile');
    if (response.data.user) {
      localStorage.setItem('spUserData', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/users/profile', data);
    if (response.data.user) {
      localStorage.setItem('spUserData', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  getCheckoutData: async () => {
    const response = await api.get('/users/checkout-data');
    return response.data;
  }
};

/**
 * Vendor Authentication Service
 */
export const vendorAuthService = {
  sendOTP: async (phone, email = null) => {
    const response = await api.post('/vendors/auth/send-otp', { phone, email });
    return response.data;
  },

  verifyLogin: async (data) => {
    const response = await api.post('/vendors/auth/verify-login', data);
    if (response.data.success && !response.data.isNewUser && response.data.accessToken) {
      localStorage.setItem('spVendorAccessToken', response.data.accessToken);
      localStorage.setItem('spVendorRefreshToken', response.data.refreshToken);
      localStorage.setItem('spVendorData', JSON.stringify(response.data.vendor));
      notifyFlutterLogin(response.data);
      registerFCMToken('vendor', true).catch(console.error);
    }
    return response.data;
  },

  register: async (data) => {
    const response = await api.post('/vendors/auth/register', data);
    return response.data;
  },

  login: async (data) => {
    const { email, ...loginData } = data;
    const response = await api.post('/vendors/auth/login', loginData);
    if (response.data.accessToken) {
      localStorage.setItem('spVendorAccessToken', response.data.accessToken);
      localStorage.setItem('spVendorRefreshToken', response.data.refreshToken);
      localStorage.setItem('spVendorData', JSON.stringify(response.data.vendor));
      notifyFlutterLogin(response.data);
      registerFCMToken('vendor', true).catch(console.error);
    }
    return response.data;
  },

  logout: async () => {
    await removeFCMToken('vendor');
    try {
      await api.post('/vendors/auth/logout', { platform: getPlatformType() });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('spVendorAccessToken');
    localStorage.removeItem('spVendorRefreshToken');
    localStorage.removeItem('spVendorData');
  },

  getProfile: async () => {
    const response = await api.get('/vendors/profile');
    if (response.data.vendor) {
      localStorage.setItem('spVendorData', JSON.stringify(response.data.vendor));
    }
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/vendors/profile', data);
    if (response.data.vendor) {
      localStorage.setItem('spVendorData', JSON.stringify(response.data.vendor));
    }
    return response.data;
  }
};

/**
 * Worker Authentication Service
 */
export const workerAuthService = {
  sendOTP: async (phone, email = null) => {
    const response = await api.post('/workers/auth/send-otp', { phone, email });
    return response.data;
  },

  verifyLogin: async (data) => {
    const response = await api.post('/workers/auth/verify-login', data);
    if (response.data.success && !response.data.isNewUser && response.data.accessToken) {
      localStorage.setItem('spWorkerAccessToken', response.data.accessToken);
      localStorage.setItem('spWorkerRefreshToken', response.data.refreshToken);
      localStorage.setItem('spWorkerData', JSON.stringify(response.data.worker));
      notifyFlutterLogin(response.data);
      registerFCMToken('worker', true).catch(console.error);
    }
    return response.data;
  },

  register: async (data) => {
    const response = await api.post('/workers/auth/register', data);
    if (response.data.accessToken) {
      localStorage.setItem('spWorkerAccessToken', response.data.accessToken);
      localStorage.setItem('spWorkerRefreshToken', response.data.refreshToken);
      localStorage.setItem('spWorkerData', JSON.stringify(response.data.worker));
      notifyFlutterLogin(response.data);
    }
    return response.data;
  },

  login: async (data) => {
    const { email, ...loginData } = data;
    const response = await api.post('/workers/auth/login', loginData);
    if (response.data.accessToken) {
      localStorage.setItem('spWorkerAccessToken', response.data.accessToken);
      localStorage.setItem('spWorkerRefreshToken', response.data.refreshToken);
      localStorage.setItem('spWorkerData', JSON.stringify(response.data.worker));
      notifyFlutterLogin(response.data);
      registerFCMToken('worker', true).catch(console.error);
    }
    return response.data;
  },

  logout: async () => {
    await removeFCMToken('worker');
    try {
      await api.post('/workers/auth/logout', { platform: getPlatformType() });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('spWorkerAccessToken');
    localStorage.removeItem('spWorkerRefreshToken');
    localStorage.removeItem('spWorkerData');
  },

  getProfile: async () => {
    const response = await api.get('/workers/profile');
    if (response.data.worker) {
      localStorage.setItem('spWorkerData', JSON.stringify(response.data.worker));
    }
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/workers/profile', data);
    if (response.data.worker) {
      localStorage.setItem('spWorkerData', JSON.stringify(response.data.worker));
    }
    return response.data;
  }
};

/**
 * Admin Authentication Service
 */
export const adminAuthService = {
  login: async (email, password, rememberMe = false) => {
    const response = await api.post('/admin/auth/login', { email, password });
    if (response.data.accessToken) {
      sessionStorage.removeItem('spAdminAccessToken');
      sessionStorage.removeItem('spAdminRefreshToken');
      sessionStorage.removeItem('spAdminData');
      localStorage.setItem('spAdminAccessToken', response.data.accessToken);
      localStorage.setItem('spAdminRefreshToken', response.data.refreshToken);
      localStorage.setItem('spAdminData', JSON.stringify(response.data.admin));
    }
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/admin/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('spAdminAccessToken');
    localStorage.removeItem('spAdminRefreshToken');
    localStorage.removeItem('spAdminData');
  }
};
