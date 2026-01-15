import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  const location = useLocation();
  
  const [showReconnecting, setShowReconnecting] = useState(false);
  const [waitProgress, setWaitProgress] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  
  // Track if user was ever authenticated in this component lifecycle
  const wasAuthenticatedRef = useRef(false);
  const waitStartTime = useRef<number | null>(null);

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
      }
    }
  }, [user, session, masterSession, showReconnecting]);

  // CRITICAL: Never redirect during loading or if master session is active
  // This guard only shows a reconnecting screen, it does NOT redirect
  useEffect(() => {
    // Still loading - do nothing
    if (isLoading) return;

    // Master session bypasses everything
    if (masterSession) return;

    // Has valid session - all good
    if (user && session) return;

    // User was authenticated before but now lost session - show reconnecting
    if (wasAuthenticatedRef.current && !user && !session) {
      // Only show if we're not already showing
      if (!showReconnecting) {
        setShowReconnecting(true);
        setTimedOut(false);
        setWaitProgress(0);
        waitStartTime.current = Date.now();
      }
    }
  }, [user, session, isLoading, masterSession, showReconnecting]);

  // Progress timer while reconnecting
  useEffect(() => {
    if (!showReconnecting || timedOut) return;

    const interval = setInterval(() => {
      if (!waitStartTime.current) return;
      
      const elapsed = Date.now() - waitStartTime.current;
      const progress = Math.min((elapsed / maxWaitTime) * 100, 100);
      setWaitProgress(progress);

      if (elapsed >= maxWaitTime) {
        setTimedOut(true);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [showReconnecting, timedOut, maxWaitTime]);

  const handleGoHome = () => {
    setShowReconnecting(false);
    wasAuthenticatedRef.current = false;
    waitStartTime.current = null;
    navigate('/', { replace: true });
  };

  const handleRetry = () => {
    setTimedOut(false);
    setWaitProgress(0);
    waitStartTime.current = Date.now();
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
