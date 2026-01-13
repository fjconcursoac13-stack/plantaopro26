import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface UseAuthGuardOptions {
  requireMasterSession?: boolean;
  requireUserSession?: boolean;
  allowBoth?: boolean;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { user, isLoading, masterSession } = useAuth();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);

  const { requireMasterSession = false, requireUserSession = false, allowBoth = true } = options;

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) {
      return;
    }

    // Give some time for the session to be fully established
    const timer = setTimeout(() => {
      let isAuthenticated = false;

      if (requireMasterSession && !requireUserSession) {
        // Only master session required (Master page)
        isAuthenticated = !!masterSession;
      } else if (requireUserSession && !requireMasterSession) {
        // Only user session required (AgentPanel)
        isAuthenticated = !!user;
      } else if (allowBoth) {
        // Allow either master session or user session (Dashboard, etc)
        isAuthenticated = !!user || !!masterSession;
      }

      if (!isAuthenticated) {
        navigate('/auth', { replace: true });
      } else {
        setIsReady(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoading, user, masterSession, navigate, requireMasterSession, requireUserSession, allowBoth]);

  // Return ready state only after auth check is complete
  const shouldRender = !isLoading && isReady && (
    (requireMasterSession && !requireUserSession && !!masterSession) ||
    (requireUserSession && !requireMasterSession && !!user) ||
    (allowBoth && (!!user || !!masterSession))
  );

  return {
    isLoading: isLoading || !isReady,
    isAuthenticated: shouldRender,
    user,
    masterSession,
  };
}
