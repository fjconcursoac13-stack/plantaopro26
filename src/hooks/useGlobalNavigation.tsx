import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UseGlobalNavigationOptions {
  enabled?: boolean;
}

// Create a visual flash effect on the screen
const triggerNavigationFlash = () => {
  const flash = document.createElement('div');
  flash.className = 'navigation-flash';
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%);
    pointer-events: none;
    z-index: 9999;
    animation: nav-flash 0.3s ease-out forwards;
  `;
  
  // Add keyframes if not exists
  if (!document.getElementById('nav-flash-style')) {
    const style = document.createElement('style');
    style.id = 'nav-flash-style';
    style.textContent = `
      @keyframes nav-flash {
        0% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.5); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 300);
};

export function useGlobalNavigation(options: UseGlobalNavigationOptions = {}) {
  const { enabled = true } = options;
  const navigate = useNavigate();
  const location = useLocation();
  const { user, masterSession, isLoading } = useAuth();

  const performNavigation = useCallback(() => {
    triggerNavigationFlash();
    
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  // Handle ESC key for global navigation
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Check if any dialog or modal is open
        const openDialogs = document.querySelectorAll('[role="dialog"]');
        const openPopovers = document.querySelectorAll('[data-state="open"]');
        
        // Don't navigate if a dialog or popover is open
        if (openDialogs.length > 0 || openPopovers.length > 0) {
          return;
        }

        // Check if we're focused on an input or textarea
        const activeElement = document.activeElement;
        if (
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement
        ) {
          // Blur the input instead of navigating
          activeElement.blur();
          return;
        }

        // Skip navigation on auth and index pages
        if (location.pathname === '/' || location.pathname === '/auth') {
          return;
        }

        performNavigation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, location.pathname, performNavigation]);

  // Redirect to home when user logs out (but never during auth bootstrapping)
  useEffect(() => {
    // During initial auth hydration the user can be null briefly.
    // Redirecting here causes an unwanted bounce back to '/'.
    const isAuthPage = location.pathname === '/auth' || location.pathname === '/';
    const isMasterPage = location.pathname === '/master';
    if (isAuthPage) return;

    // IMPORTANT: only redirect after auth finished loading
    if (isLoading) return;

    // Never redirect if master session is active
    if (masterSession) return;

    // Never redirect from master page (handled by Master component itself)
    if (isMasterPage) return;

    if (!user && !masterSession) {
      // Longer delay to ensure the session state is settled
      const timer = setTimeout(() => {
        navigate('/', { replace: true });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [user, masterSession, isLoading, location.pathname, navigate]);

  return { navigate, performNavigation };
}
