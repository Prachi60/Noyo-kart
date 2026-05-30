/**
 * Flutter WebView Bridge Utility
 * Safe wrapper for native mobile interactions and web fallbacks
 */

const isFlutter = typeof window !== 'undefined' && 
  (!!window.flutter_inappwebview || 
   navigator.userAgent.includes('Flutter') || 
   navigator.userAgent.includes('Appzeto'));

// Helper to wait for Flutter InAppWebView handlers to register
const waitForFlutter = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
      resolve(true);
    } else {
      let retries = 0;
      const interval = setInterval(() => {
        retries++;
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
          clearInterval(interval);
          resolve(true);
        } else if (retries >= 20) { // Timeout after 2 seconds
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
    }
  });
};

/**
 * Capture and safely invoke a Flutter handler or trigger Web Fallback
 */
const callFlutterHandler = async (handlerName, args = null) => {
  const ready = await waitForFlutter();
  if (ready && window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
    try {
      return await window.flutter_inappwebview.callHandler(handlerName, args);
    } catch (e) {
      console.error(`[FlutterBridge] Error calling handler: ${handlerName}`, e);
      throw e;
    }
  }
  return null;
};

const flutterBridge = {
  isFlutter,
  waitForFlutter,

  /**
   * Get dynamic device geolocation
   */
  getCurrentLocation: async () => {
    if (isFlutter) {
      const response = await callFlutterHandler('getCurrentLocation');
      if (response) {
        // Parse if returned as string
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        return {
          latitude: parsed.latitude || parsed.lat,
          longitude: parsed.longitude || parsed.lng
        };
      }
    }

    // Web browser fallback
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation not supported on this browser.'));
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  },

  /**
   * Capture haptic feedback vibration response
   */
  hapticFeedback: (type = 'light') => {
    if (isFlutter) {
      callFlutterHandler('hapticFeedback', type).catch(console.error);
    } else {
      try {
        if (navigator.vibrate) {
          if (type === 'success') navigator.vibrate([100, 50, 100]);
          else if (type === 'error') navigator.vibrate([200, 100, 200]);
          else navigator.vibrate(50); // Light
        }
      } catch (e) {}
    }
  },

  /**
   * Open camera / gallery to pick image files
   */
  openCamera: async () => {
    if (isFlutter) {
      return await callFlutterHandler('openCamera');
    }
    
    // Web fallback: resolve with null so standard input works
    return null;
  }
};

export default flutterBridge;
