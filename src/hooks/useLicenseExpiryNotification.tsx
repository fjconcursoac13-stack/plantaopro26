import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface LicenseExpiryConfig {
  licenseExpiresAt: string | null | undefined;
  agentId: string | null | undefined;
  enabled?: boolean;
  warningDaysBefore?: number;
}

const NOTIFICATION_KEY_PREFIX = 'plantaopro_license_expiry_notified_';

export function useLicenseExpiryNotification(config: LicenseExpiryConfig) {
  const {
    licenseExpiresAt,
    agentId,
    enabled = true,
    warningDaysBefore = 7,
  } = config;

  const { toast } = useToast();

  const getDaysUntilExpiry = useCallback((): number | null => {
    if (!licenseExpiresAt) return null;
    
    // Handle date-only format (YYYY-MM-DD)
    const expiryDate = /^\d{4}-\d{2}-\d{2}$/.test(licenseExpiresAt)
      ? new Date(`${licenseExpiresAt}T23:59:59.999`)
      : new Date(licenseExpiresAt);
    
    if (Number.isNaN(expiryDate.getTime())) return null;
    
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }, [licenseExpiresAt]);

  const getNotificationKey = useCallback(() => {
    if (!agentId) return null;
    const today = new Date().toISOString().split('T')[0];
    return `${NOTIFICATION_KEY_PREFIX}${agentId}_${today}`;
  }, [agentId]);

  const hasNotifiedToday = useCallback((): boolean => {
    const key = getNotificationKey();
    if (!key) return true;
    return localStorage.getItem(key) === 'true';
  }, [getNotificationKey]);

  const markAsNotified = useCallback(() => {
    const key = getNotificationKey();
    if (key) {
      localStorage.setItem(key, 'true');
    }
  }, [getNotificationKey]);

  useEffect(() => {
    if (!enabled || !agentId || !licenseExpiresAt) return;

    const daysUntilExpiry = getDaysUntilExpiry();
    
    if (daysUntilExpiry === null) return;

    // Only notify if within warning period and not already notified today
    if (daysUntilExpiry > 0 && daysUntilExpiry <= warningDaysBefore && !hasNotifiedToday()) {
      const message = daysUntilExpiry === 1
        ? 'Sua licença expira amanhã! Entre em contato com o administrador.'
        : `Sua licença expira em ${daysUntilExpiry} dias. Entre em contato com o administrador para renovação.`;

      // Delay notification to avoid UI interference during mount
      const timeout = setTimeout(() => {
        toast({
          title: '⚠️ Licença Expirando',
          description: message,
          duration: 10000,
          variant: daysUntilExpiry <= 3 ? 'destructive' : 'default',
        });
        markAsNotified();
      }, 2000);

      return () => clearTimeout(timeout);
    }

    // If already expired, show critical notification
    if (daysUntilExpiry <= 0 && !hasNotifiedToday()) {
      const timeout = setTimeout(() => {
        toast({
          title: '🚨 Licença Expirada',
          description: 'Sua licença expirou. Entre em contato com o administrador para renovação imediata.',
          duration: 15000,
          variant: 'destructive',
        });
        markAsNotified();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [enabled, agentId, licenseExpiresAt, getDaysUntilExpiry, hasNotifiedToday, markAsNotified, warningDaysBefore, toast]);

  return {
    daysUntilExpiry: getDaysUntilExpiry(),
    isExpiringSoon: (getDaysUntilExpiry() ?? Infinity) <= warningDaysBefore && (getDaysUntilExpiry() ?? 0) > 0,
  };
}
