import { useState, useCallback, useEffect } from 'react';

type SoundType = 'theme-change' | 'notification' | 'click' | 'success' | 'error' | 'shift-start' | 'shift-end';

export function useSoundEffects() {
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('plantaopro-sound-enabled');
    return saved !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('plantaopro-sound-enabled', String(isSoundEnabled));
  }, [isSoundEnabled]);

  const playSound = useCallback((type: SoundType) => {
    if (!isSoundEnabled) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;

    switch (type) {
      case 'theme-change':
        // Ascending sweep sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.25);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;

      case 'notification':
        // Alert chime
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523, now); // C5
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        
        // Second note
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(659, audioContext.currentTime); // E5
          gain2.gain.setValueAtTime(0.2, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.2);
        }, 120);
        
        // Third note
        setTimeout(() => {
          const osc3 = audioContext.createOscillator();
          const gain3 = audioContext.createGain();
          osc3.connect(gain3);
          gain3.connect(audioContext.destination);
          osc3.type = 'sine';
          osc3.frequency.setValueAtTime(784, audioContext.currentTime); // G5
          gain3.gain.setValueAtTime(0.2, audioContext.currentTime);
          gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          osc3.start(audioContext.currentTime);
          osc3.stop(audioContext.currentTime + 0.35);
        }, 240);
        break;

      case 'click':
        // Soft click
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;

      case 'success':
        // Success chime
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.setValueAtTime(500, now + 0.1);
        oscillator.frequency.setValueAtTime(600, now + 0.2);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
        break;

      case 'error':
        // Error buzz
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.setValueAtTime(100, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;

      case 'shift-start':
        // Shift start fanfare
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(392, now); // G4
        oscillator.frequency.setValueAtTime(523, now + 0.15); // C5
        oscillator.frequency.setValueAtTime(659, now + 0.3); // E5
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.5);
        break;

      case 'shift-end':
        // Shift end melody
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(659, now); // E5
        oscillator.frequency.setValueAtTime(523, now + 0.15); // C5
        oscillator.frequency.setValueAtTime(392, now + 0.3); // G4
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.5);
        break;
    }
  }, [isSoundEnabled]);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
  }, []);

  return {
    isSoundEnabled,
    toggleSound,
    playSound,
  };
}
