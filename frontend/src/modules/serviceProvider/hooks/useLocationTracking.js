import { useEffect, useRef, useCallback } from 'react';

/**
 * useLocationTracking Hook
 * Watches GPS location and emits updates via socket for live tracking.
 */
export const useLocationTracking = (socket, bookingId, isActive, options = {}) => {
  const {
    distanceFilter = 10,
    interval = 3000,
    enableHighAccuracy = true
  } = options;

  const watchIdRef = useRef(null);
  const lastEmitTimeRef = useRef(0);
  const lastPositionRef = useRef(null);

  const getDistance = useCallback((lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const emitLocation = useCallback((position) => {
    if (!socket || !bookingId) return;

    const { latitude, longitude, heading } = position.coords;
    const now = Date.now();

    if (now - lastEmitTimeRef.current < interval) return;

    if (lastPositionRef.current) {
      const dist = getDistance(lastPositionRef.current.lat, lastPositionRef.current.lng, latitude, longitude);
      if (dist < distanceFilter) return;
    }

    socket.emit('update_location', {
      bookingId,
      lat: latitude,
      lng: longitude,
      heading: heading || 0
    });

    lastEmitTimeRef.current = now;
    lastPositionRef.current = { lat: latitude, lng: longitude };
  }, [socket, bookingId, interval, distanceFilter, getDistance]);

  useEffect(() => {
    if (!isActive || !socket || !bookingId) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => emitLocation(position),
        (error) => console.warn('[useLocationTracking] GPS Error:', error.message),
        { enableHighAccuracy, maximumAge: 5000, timeout: 10000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isActive, socket, bookingId, emitLocation, enableHighAccuracy]);

  const forceEmit = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (socket && bookingId) {
            const { latitude, longitude, heading } = position.coords;
            socket.emit('update_location', { bookingId, lat: latitude, lng: longitude, heading: heading || 0 });
            lastPositionRef.current = { lat: latitude, lng: longitude };
          }
        },
        (error) => console.warn('[useLocationTracking] Force emit error:', error.message),
        { enableHighAccuracy, timeout: 5000 }
      );
    }
  }, [socket, bookingId, enableHighAccuracy]);

  return { forceEmit };
};

export default useLocationTracking;
