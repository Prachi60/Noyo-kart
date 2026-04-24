import { useRef, useCallback } from "react";

// Use public folder URL — always works regardless of Vite asset pipeline
const SOUND_URL = "/sound.mp3";

/**
 * Returns a `play()` function that plays the order notification sound.
 * Safe to call multiple times — reuses the same Audio instance.
 */
export function useOrderSound() {
  const audioRef = useRef(null);

  const play = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(SOUND_URL);
        audioRef.current.volume = 0.8;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Browser autoplay policy blocked it — user hasn't interacted yet
      });
    } catch {
      // Ignore
    }
  }, []);

  return play;
}
