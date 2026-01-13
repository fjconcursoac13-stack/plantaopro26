import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isLicenseExpired } from '@/lib/license';

interface LicenseCheckConfig {
  licenseStatus: string | null | undefined;
  licenseExpiresAt: string | null | undefined;
  enabled?: boolean;
  warningDurationSeconds?: number;
  /** When false, only shows the warning banner and never forces logout */
  autoLogout?: boolean;
  skipForMaster?: boolean;
  isMasterSession?: boolean;
}

interface LicenseCheckResult {
  isLicenseInvalid: boolean;
  showWarning: boolean;
  secondsUntilLogout: number;
  licenseStatus: string;
  dismissWarning: () => void;
  cancelLogout: () => void;
}

export function useLicenseCheck(config: LicenseCheckConfig): LicenseCheckResult {
  const {
    licenseStatus: rawLicenseStatus,
    licenseExpiresAt,
    enabled = true,
    warningDurationSeconds = 15,
    autoLogout = true,
    skipForMaster = true,
    isMasterSession = false,
  } = config;

  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsUntilLogout, setSecondsUntilLogout] = useState(warningDurationSeconds);
  const [dismissed, setDismissed] = useState(false);
  const [logoutCancelled, setLogoutCancelled] = useState(false);

  const licenseStatus = rawLicenseStatus || 'active';
  const isExpired = isLicenseExpired(licenseExpiresAt);
  
  const isLicenseInvalid = 
    licenseStatus === 'blocked' || 
    licenseStatus === 'expired' || 
    licenseStatus === 'pending' ||
    isExpired;

  // Check if we should skip license enforcement
  const shouldSkip = !enabled || (skipForMaster && isMasterSession) || logoutCancelled;

  // Start warning countdown when license is invalid
  useEffect(() => {
    if (shouldSkip || !isLicenseInvalid) {
      setShowWarning(false);
      return;
    }

    // Show warning banner
    setShowWarning(true);
    setSecondsUntilLogout(autoLogout ? warningDurationSeconds : 0);

    console.log('[LicenseCheck] License invalid, starting countdown:', {
      licenseStatus,
      isExpired,
      warningDurationSeconds,
      autoLogout,
    });
  }, [shouldSkip, isLicenseInvalid, licenseStatus, isExpired, warningDurationSeconds, autoLogout]);

  const performLogout = useCallback(async () => {
    console.log('[LicenseCheck] Performing automatic logout');
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[LicenseCheck] Logout error:', error);
    } finally {
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  // Countdown timer (only when autoLogout is enabled)
  useEffect(() => {
    if (!showWarning || dismissed || logoutCancelled || !autoLogout) return;

    const interval = setInterval(() => {
      setSecondsUntilLogout(prev => {
        if (prev <= 1) {
          // Time's up - perform logout
          performLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning, dismissed, logoutCancelled, autoLogout, performLogout]);

  const dismissWarning = useCallback(() => {
    setDismissed(true);
  }, []);

  const cancelLogout = useCallback(() => {
    console.log('[LicenseCheck] Logout cancelled by user');
    setLogoutCancelled(true);
    setShowWarning(false);
  }, []);

  return {
    isLicenseInvalid,
    showWarning: showWarning && !dismissed,
    secondsUntilLogout,
    licenseStatus,
    dismissWarning,
    cancelLogout,
  };
}
