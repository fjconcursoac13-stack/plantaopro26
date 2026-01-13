import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  playSound?: boolean;
}

// Play notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;
    
    // Alert chime - 3 ascending notes
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    };
    
    playNote(523, now, 0.15);        // C5
    playNote(659, now + 0.12, 0.15); // E5
    playNote(784, now + 0.24, 0.25); // G5
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [serviceWorker, setServiceWorker] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      setServiceWorker(registration);
      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Seu navegador não suporta notificações');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notificações ativadas com sucesso!');
        return true;
      } else if (result === 'denied') {
        toast.error('Permissão de notificações negada');
        return false;
      } else {
        toast.info('Permissão de notificações pendente');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Erro ao solicitar permissão de notificações');
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(async (payload: NotificationPayload): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      // Play sound if enabled (default: true)
      if (payload.playSound !== false) {
        playNotificationSound();
      }

      // Use service worker notification if available (works even when tab is closed)
      if (serviceWorker) {
        await serviceWorker.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: payload.tag || 'default',
          requireInteraction: payload.requireInteraction ?? true,
        } as NotificationOptions);
      } else {
        // Fallback to regular notification
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/favicon.ico',
          tag: payload.tag || 'default',
          requireInteraction: payload.requireInteraction ?? true,
        });
      }
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }, [isSupported, permission, serviceWorker]);

  const scheduleNotification = useCallback((payload: NotificationPayload, delayMs: number) => {
    if (permission !== 'granted') {
      console.warn('Cannot schedule notification: permission not granted');
      return null;
    }

    const timeoutId = setTimeout(() => {
      showNotification(payload);
    }, delayMs);

    return timeoutId;
  }, [permission, showNotification]);

  return {
    permission,
    isSupported,
    isEnabled: permission === 'granted',
    requestPermission,
    showNotification,
    scheduleNotification,
    playNotificationSound,
  };
}
