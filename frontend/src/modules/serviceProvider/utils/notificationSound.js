// Notification Sound Utility for Service Provider Module

let audioContext = null;

const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
};

export const playNotificationSound = async () => {
  try {
    initAudio();
    if (audioContext.state === 'suspended') {
      await audioContext.resume().catch(() => {});
    }

    const now = audioContext.currentTime;
    const tones = [
      { freq: 523.25, time: 0, dur: 0.8 },
      { freq: 659.25, time: 0.1, dur: 0.8 },
      { freq: 783.99, time: 0.2, dur: 0.8 },
      { freq: 987.77, time: 0.3, dur: 1.0 }
    ];

    tones.forEach(({ freq, time, dur }) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.4, now + time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + time + dur);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now + time);
      osc.stop(now + time + dur);
    });

    return true;
  } catch (error) {
    return false;
  }
};

let currentAudio = null;

export const playAlertRing = (loop = false) => {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    const audio = new Audio('/booking-alert.mp3');
    if (loop) audio.loop = true;
    currentAudio = audio;
    audio.play().catch(() => {});
    audio.onended = () => { if (currentAudio === audio) currentAudio = null; };
    return true;
  } catch (error) {
    return false;
  }
};

export const stopAlertRing = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
};

export const isSoundEnabled = (userType = 'vendor') => {
  let storageKey = 'spVendorData';
  if (userType === 'user') storageKey = 'spUserData';
  else if (userType === 'worker') storageKey = 'spWorkerData';
  else if (userType === 'admin') storageKey = 'spAdminData';

  const dataString = localStorage.getItem(storageKey);
  if (dataString) {
    try {
      const data = JSON.parse(dataString);
      return data.settings?.soundAlerts !== false;
    } catch (error) {
      return true;
    }
  }
  return true;
};

export default { playNotificationSound, playAlertRing, stopAlertRing, isSoundEnabled };
