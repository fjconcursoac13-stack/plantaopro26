import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, RefreshCw, Home, WifiOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ReconnectingGuardProps {
  children: React.ReactNode;
  /** Routes that don't require authentication */
  publicRoutes?: string[];
  /** Maximum time to wait for session recovery (ms) */
  maxWaitTime?: number;
}

export function ReconnectingGuard({
  children,
  publicRoutes = ['/', '/auth', '/install', '/debug/auth'],
  maxWaitTime = 10000,
}: ReconnectingGuardProps) {
  const { user, session, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showReconnecting, setShowReconnecting] = useState(false);
  const [waitProgress, setWaitProgress] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  
  const previousAuthState = useRef<{ hadUser: boolean; hadSession: boolean } | null>(null);
  const waitStartTime = useRef<number | null>(null);

  const isPublicRoute = publicRoutes.some(route => 
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  useEffect(() => {
    // Skip for public routes
    if (isPublicRoute) {
      setShowReconnecting(false);
      return;
    }

    // Initial load - just wait
    if (isLoading) {
      return;
    }

    // Track auth state changes
    const currentState = { hadUser: !!user, hadSession: !!session };
    
    if (previousAuthState.current === null) {
      // First render after loading
      previousAuthState.current = currentState;
      
      // If no session on first render of protected route, redirect
      if (!user && !session) {
        navigate('/', { replace: true });
      }
      return;
    }

    // Check if we lost the session
    const lostSession = previousAuthState.current.hadSession && !session;
    const lostUser = previousAuthState.current.hadUser && !user;

    if (lostSession || lostUser) {
      // Session was lost - show reconnecting screen
      setShowReconnecting(true);
      setTimedOut(false);
      setWaitProgress(0);
      waitStartTime.current = Date.now();
    } else if (session && user) {
      // Session recovered
      setShowReconnecting(false);
      setTimedOut(false);
      setWaitProgress(0);
      waitStartTime.current = null;
    }

    previousAuthState.current = currentState;
  }, [user, session, isLoading, isPublicRoute, navigate]);

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

  // Check if session recovered
  useEffect(() => {
    if (showReconnecting && session && user) {
      setShowReconnecting(false);
    }
  }, [showReconnecting, session, user]);

  const handleGoHome = () => {
    setShowReconnecting(false);
    previousAuthState.current = null;
    navigate('/', { replace: true });
  };

  const handleRetry = () => {
    setTimedOut(false);
    setWaitProgress(0);
    waitStartTime.current = Date.now();
    window.location.reload();
  };

  // Show reconnecting screen
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
