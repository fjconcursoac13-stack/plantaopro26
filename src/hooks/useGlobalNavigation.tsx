import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface UseGlobalNavigationOptions {
  enabled?: boolean;
}

export function useGlobalNavigation(options: UseGlobalNavigationOptions = {}) {
  const { enabled = true } = options;
  const navigate = useNavigate();
  const location = useLocation();
  const { user, masterSession } = useAuth();

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

        // Navigate back or to home
        if (window.history.length > 2) {
          navigate(-1);
        } else {
          navigate('/');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, navigate, location.pathname]);

  // Redirect to home when user logs out
  useEffect(() => {
    // If no user and no master session and not on auth/index page, redirect to home
    const isAuthPage = location.pathname === '/auth' || location.pathname === '/';
    
    if (!user && !masterSession && !isAuthPage) {
      // Small delay to ensure the logout is complete
      const timer = setTimeout(() => {
        navigate('/', { replace: true });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [user, masterSession, location.pathname, navigate]);

  return { navigate };
}
