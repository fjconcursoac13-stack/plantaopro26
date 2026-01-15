import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, Home, WifiOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ReconnectingGuardProps {
  children: React.ReactNode;
  /** Maximum time to wait for session recovery (ms) */
  maxWaitTime?: number;
}

export function ReconnectingGuard({
  children,
  maxWaitTime = 15000,
}: ReconnectingGuardProps) {
  const { user, session, isLoading, masterSession } = useAuth();
  const navigate = useNavigate();
  
  const [showReconnecting, setShowReconnecting] = useState(false);
  const [waitProgress, setWaitProgress] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  
  // Track if user was ever authenticated in this component lifecycle
  const wasAuthenticatedRef = useRef(false);
  const waitStartTime = useRef<number | null>(null);
  const graceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingSessionRef = useRef(false);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current);
      }
    };
  }, []);

  // Verify if there's actually a session in Supabase
  const verifySession = useCallback(async (): Promise<boolean> => {
    if (isCheckingSessionRef.current) return true;
    
    try {
      isCheckingSessionRef.current = true;
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      return !!currentSession;
    } catch {
      return false;
    } finally {
      isCheckingSessionRef.current = false;
    }
  }, []);

  // Update wasAuthenticated when we have a valid session
  useEffect(() => {
    if (user || session || masterSession) {
      wasAuthenticatedRef.current = true;
      // If we were showing reconnecting and now have session, hide it
      if (showReconnecting) {
        setShowReconnecting(false);
        setTimedOut(false);
        setWaitProgress(0);
        waitStartTime.current = null;
        if (graceTimeoutRef.current) {
          clearTimeout(graceTimeoutRef.current);
          graceTimeoutRef.current = null;
        }
      }
    }
  }, [user, session, masterSession, showReconnecting]);

  // Handle session loss with grace period
  useEffect(() => {
    // Still loading - do nothing
    if (isLoading) return;

    // Master session bypasses everything
    if (masterSession) return;

    // Has valid session - all good
    if (user && session) return;

    // Already showing reconnecting or timed out
    if (showReconnecting) return;

    // User was authenticated before but now lost session - verify with grace period
    if (wasAuthenticatedRef.current && !user && !session) {
      // Clear any existing grace timeout
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current);
      }

      // Give Supabase 3 seconds to recover the session before showing reconnecting screen
      // This handles the case where session is temporarily null during token refresh
      graceTimeoutRef.current = setTimeout(async () => {
        // Double-check if we still don't have a session
        const hasSession = await verifySession();
        
        if (!hasSession) {
          // Check context state again (it may have updated)
          const { data: { session: latestSession } } = await supabase.auth.getSession();
          
          if (!latestSession) {
            setShowReconnecting(true);
            setTimedOut(false);
            setWaitProgress(0);
            waitStartTime.current = Date.now();
          }
        }
      }, 3000); // 3 second grace period
    }
  }, [user, session, isLoading, masterSession, showReconnecting, verifySession]);

  // Progress timer while reconnecting
  useEffect(() => {
    if (!showReconnecting || timedOut) return;

    const interval = setInterval(async () => {
      if (!waitStartTime.current) return;
      
      // Check if session was recovered
      const hasSession = await verifySession();
      if (hasSession) {
        setShowReconnecting(false);
        setTimedOut(false);
        setWaitProgress(0);
        waitStartTime.current = null;
        clearInterval(interval);
        return;
      }
      
      const elapsed = Date.now() - waitStartTime.current;
      const progress = Math.min((elapsed / maxWaitTime) * 100, 100);
      setWaitProgress(progress);

      if (elapsed >= maxWaitTime) {
        setTimedOut(true);
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [showReconnecting, timedOut, maxWaitTime, verifySession]);

  const handleGoHome = () => {
    setShowReconnecting(false);
    wasAuthenticatedRef.current = false;
    waitStartTime.current = null;
    navigate('/', { replace: true });
  };

  const handleRetry = async () => {
    setTimedOut(false);
    setWaitProgress(0);
    waitStartTime.current = Date.now();
    
    // Try to refresh session instead of full reload
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (data?.session) {
        setShowReconnecting(false);
        return;
      }
      if (error) {
        console.error('[ReconnectingGuard] Refresh failed:', error.message);
      }
    } catch (e) {
      console.error('[ReconnectingGuard] Refresh error:', e);
    }
    
    // Fallback to reload if refresh doesn't work
    window.location.reload();
  };

  // Show reconnecting screen only if we lost session after being authenticated
  if (showReconnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
        <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
          {/* Icon */}
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-pulse" />
            {timedOut ? (
              <WifiOff className="absolute inset-0 m-auto h-10 w-10 text-amber-500" />
            ) : (
              <Shield className="absolute inset-0 m-auto h-10 w-10 text-amber-500 animate-pulse" />
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">
              {timedOut ? 'Reconexão falhou' : 'Reconectando...'}
            </h1>
            <p className="text-slate-400 text-sm">
              {timedOut 
                ? 'Não foi possível recuperar sua sessão. Verifique sua conexão e tente novamente.'
                : 'Sua sessão está sendo recuperada. Por favor, aguarde...'
              }
            </p>
          </div>

          {/* Progress bar */}
          {!timedOut && (
            <div className="space-y-2">
              <Progress value={waitProgress} className="h-2" />
              <p className="text-xs text-slate-500">
                {Math.round((maxWaitTime - (waitProgress / 100 * maxWaitTime)) / 1000)}s restantes
              </p>
            </div>
          )}

          {/* Spinner */}
          {!timedOut && (
            <Loader2 className="h-6 w-6 animate-spin text-amber-500 mx-auto" />
          )}

          {/* Actions */}
          {timedOut && (
            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleGoHome}
                className="border-slate-600 hover:bg-slate-800"
              >
                <Home className="h-4 w-4 mr-2" />
                Ir para Início
              </Button>
              <Button
                onClick={handleRetry}
                className="bg-amber-500 text-black hover:bg-amber-400"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Help text */}
          <p className="text-xs text-slate-600 pt-4">
            Se o problema persistir, limpe o cache do navegador ou acesse /debug/auth
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
