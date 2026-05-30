/**
 * Push Notification Service for Service Provider Module
 * Handles FCM token registration and notification handling
 */

// Note: Firebase imports should be configured at the app level
// import { messaging, getToken, onMessage } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function isFlutterWebView() {
  return !!(window.flutter_inappwebview && window.flutter_inappwebview.callHandler);
}

function getPlatformType() {
  return isFlutterWebView() ? 'mobile' : 'web';
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      return registration;
    } catch (error) {
      throw error;
    }
  } else {
    throw new Error('Service Workers are not supported in this browser');
  }
}

async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

async function getFCMToken() {
  try {
    // Dynamic import for firebase messaging
    const { getFirebaseApp } = await import('@core/firebase/client.js');
    const app = getFirebaseApp();
    if (!app) return null;
    const { getMessaging, getToken: getFirebaseToken } = await import('firebase/messaging');
    const messaging = getMessaging(app);
    if (!messaging) return null;


    const registration = await registerServiceWorker();
    await registration.update();

    const token = await getFirebaseToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    return token || null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

async function registerFCMToken(userType = 'user', forceUpdate = false) {
  try {
    const storageKey = `sp_fcm_token_${userType}_web`;
    const savedToken = localStorage.getItem(storageKey);
    if (savedToken && !forceUpdate) return savedToken;

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return null;

    const token = await getFCMToken();
    if (!token) return null;

    let endpoint;
    let authTokenKey;
    switch (userType) {
      case 'vendor':
        endpoint = '/vendors/fcm-tokens/save';
        authTokenKey = 'spVendorAccessToken';
        break;
      case 'worker':
        endpoint = '/workers/fcm-tokens/save';
        authTokenKey = 'spWorkerAccessToken';
        break;
      case 'user':
      default:
        endpoint = '/users/fcm-tokens/save';
        authTokenKey = 'spAccessToken';
    }

    const authToken = localStorage.getItem(authTokenKey);
    if (!authToken) return null;

    const baseUrl = import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, '/api/sp')
      : 'http://localhost:5000/api/sp';

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ token, platform: 'web' })
    });

    if (response.ok) {
      localStorage.setItem(storageKey, token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return null;
  }
}

async function removeFCMToken(userType = 'user') {
  try {
    const platform = getPlatformType();
    const storageKey = `sp_fcm_token_${userType}_${platform}`;
    const tokenToRemove = localStorage.getItem(storageKey);

    if (!tokenToRemove) return;

    let endpoint;
    let authTokenKey;
    switch (userType) {
      case 'vendor':
        endpoint = '/vendors/fcm-tokens/remove';
        authTokenKey = 'spVendorAccessToken';
        break;
      case 'worker':
        endpoint = '/workers/fcm-tokens/remove';
        authTokenKey = 'spWorkerAccessToken';
        break;
      default:
        endpoint = '/users/fcm-tokens/remove';
        authTokenKey = 'spAccessToken';
    }

    const authToken = localStorage.getItem(authTokenKey);
    if (authToken) {
      const baseUrl = import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, '/api/sp')
        : 'http://localhost:5000/api/sp';

      await fetch(`${baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ token: tokenToRemove, platform })
      });
    }

    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Error removing FCM token:', error);
    const platform = getPlatformType();
    localStorage.removeItem(`sp_fcm_token_${userType}_${platform}`);
  }
}

function setupForegroundNotificationHandler(handler) {
  // Will be set up when firebase is available
}

async function initializePushNotifications() {
  try {
    if (!('serviceWorker' in navigator)) return;
    if (!('Notification' in window)) return;
    await registerServiceWorker();
  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
}

export {
  initializePushNotifications,
  registerFCMToken,
  removeFCMToken,
  setupForegroundNotificationHandler,
  requestNotificationPermission,
  getFCMToken
};
