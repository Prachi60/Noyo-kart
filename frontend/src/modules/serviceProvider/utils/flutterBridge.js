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
        (error) => {
          // Fallback to low accuracy if high accuracy fails or times out
          if (error.code === error.TIMEOUT || error.code === 3) {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              (err) => reject(err),
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
            );
          } else {
            reject(error);
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
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
      const response = await callFlutterHandler('openCamera');
      if (response && typeof response === 'string') {
        try {
          if (response.startsWith('data:image') || (!response.startsWith('http') && !response.startsWith('file:') && response.length > 100)) {
            const str = response.startsWith('data:') ? response : `data:image/jpeg;base64,${response}`;
            const arr = str.split(',');
            const match = arr[0].match(/:(.*?);/);
            const mime = match ? match[1] : 'image/jpeg';
            const bstr = atob(arr[1] || arr[0]); // fallback if missing 'data:' prefix initially
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], `camera_${Date.now()}.jpg`, { type: mime });
          }
        } catch (e) {
          console.error('[FlutterBridge] Error converting base64 to File:', e);
        }
      }
      return response;
    }
    
    // Web fallback: resolve with null so standard input works
    return null;
  }
};

export default flutterBridge;
