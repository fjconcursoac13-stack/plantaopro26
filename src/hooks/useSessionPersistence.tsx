import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionPersistenceConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
  onMaxRetriesReached?: () => void;
}

export function useSessionPersistence(config: SessionPersistenceConfig = {}) {
  const {
    maxRetries = 5,
    retryDelayMs = 2000,
    onConnectionLost,
    onConnectionRestored,
    onMaxRetriesReached,
  } = config;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  
  // Keep refs in sync with callbacks
  const onMaxRetriesReachedRef = useRef(onMaxRetriesReached);
  useEffect(() => {
    onMaxRetriesReachedRef.current = onMaxRetriesReached;
  }, [onMaxRetriesReached]);

  // Clear retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Refresh session with retry logic
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      console.log('[SessionPersistence] Offline, skipping refresh');
      return false;
    }

    try {
      setIsRetrying(true);
      const currentRetry = retryCountRef.current;
      console.log(`[SessionPersistence] Attempting session refresh (attempt ${currentRetry + 1}/${maxRetries})`);

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      if (data.session) {
        console.log('[SessionPersistence] Session refreshed successfully');
        retryCountRef.current = 0;
        setRetryCount(0);
        setLastError(null);
        setIsRetrying(false);
        return true;
      }

      setIsRetrying(false);
      return false;
    } catch (error: any) {
      console.error('[SessionPersistence] Refresh failed:', error.message);
      setLastError(error.message);

      retryCountRef.current += 1;
      const newRetryCount = retryCountRef.current;
      setRetryCount(newRetryCount);

      if (newRetryCount < maxRetries) {
        // Exponential backoff
        const delay = retryDelayMs * Math.pow(2, newRetryCount - 1);
        console.log(`[SessionPersistence] Scheduling retry in ${delay}ms`);
        
        retryTimeoutRef.current = setTimeout(() => {
          refreshSession();
        }, delay);
      } else {
        console.log('[SessionPersistence] Max retries reached');
        setIsRetrying(false);
        onMaxRetriesReachedRef.current?.();
      }

      return false;
    }
  }, [maxRetries, retryDelayMs]);

  // Validate current session
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[SessionPersistence] Session validation error:', error.message);
        return false;
      }

      if (!session) {
        console.log('[SessionPersistence] No active session');
        return false;
      }

      // Check if session is about to expire (within 5 minutes)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expirationTime = expiresAt * 1000;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (expirationTime - now < fiveMinutes) {
          console.log('[SessionPersistence] Session expiring soon, refreshing...');
          return refreshSession();
        }
      }

      return true;
    } catch (error: any) {
      console.error('[SessionPersistence] Validation error:', error.message);
      return false;
    }
  }, [refreshSession]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[SessionPersistence] Connection restored');
      setIsOnline(true);
      retryCountRef.current = 0;
      setRetryCount(0);
      setLastError(null);
      onConnectionRestored?.();
      
      // Attempt to refresh session when coming back online
      refreshSession();
    };

    const handleOffline = () => {
      console.log('[SessionPersistence] Connection lost');
      setIsOnline(false);
      onConnectionLost?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onConnectionLost, onConnectionRestored, refreshSession]);

  // Periodic session check
  useEffect(() => {
    // Check session every 2 minutes
    const interval = setInterval(() => {
      if (navigator.onLine) {
        validateSession();
      }
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [validateSession]);

  // Manual retry function
  const manualRetry = useCallback(() => {
    retryCountRef.current = 0;
    setRetryCount(0);
    setLastError(null);
    return refreshSession();
  }, [refreshSession]);

  return {
    isOnline,
    isRetrying,
    retryCount,
    lastError,
    maxRetries,
    refreshSession,
    validateSession,
    manualRetry,
  };
}
