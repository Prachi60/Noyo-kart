import { useEffect, useRef } from 'react';

/**
 * Custom hook for throttled scroll event listener
 */
const useThrottledScroll = (callback, delay = 100, passive = true) => {
  const lastRan = useRef(Date.now());
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handler = () => {
      const now = Date.now();
      
      if (now - lastRan.current >= delay) {
        callback();
        lastRan.current = now;
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          callback();
          lastRan.current = Date.now();
        }, delay - (now - lastRan.current));
      }
    };

    window.addEventListener('scroll', handler, { passive });
    
    return () => {
      window.removeEventListener('scroll', handler);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [callback, delay, passive]);
};

export default useThrottledScroll;
