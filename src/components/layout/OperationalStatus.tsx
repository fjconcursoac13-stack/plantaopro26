import { useState, useEffect } from 'react';
import { Shield, Radio, Wifi, WifiOff, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type StatusLevel = 'online' | 'standby' | 'offline' | 'alert';

interface OperationalStatusProps {
  className?: string;
}

export function OperationalStatus({ className }: OperationalStatusProps) {
  const [status, setStatus] = useState<StatusLevel>('standby');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeAgents, setActiveAgents] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check active agents count
  useEffect(() => {
    const checkActiveAgents = async () => {
      const { count } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      setActiveAgents(count || 0);
    };

    checkActiveAgents();
    const interval = setInterval(checkActiveAgents, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Determine status based on conditions
  useEffect(() => {
    if (!isOnline) {
      setStatus('offline');
    } else if (activeAgents > 0) {
      setStatus('online');
    } else {
      setStatus('standby');
    }
  }, [isOnline, activeAgents]);

  // Periodic pulse animation trigger
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseKey(prev => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    online: {
      label: 'OPERACIONAL',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/40',
      pulseColor: 'bg-emerald-400',
      icon: Shield,
    },
    standby: {
      label: 'STANDBY',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500/40',
      pulseColor: 'bg-amber-400',
      icon: Radio,
    },
    offline: {
      label: 'OFFLINE',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/40',
      pulseColor: 'bg-red-400',
      icon: WifiOff,
    },
    alert: {
      label: 'ALERTA',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/40',
      pulseColor: 'bg-orange-400',
      icon: Activity,
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-sm transition-all duration-300",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {/* Animated Status Indicator */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring */}
        <div 
          key={pulseKey}
          className={cn(
            "absolute w-6 h-6 rounded-full animate-ping opacity-75",
            config.pulseColor
          )}
          style={{ animationDuration: '1.5s' }}
        />
        {/* Middle ring */}
        <div 
          className={cn(
            "absolute w-5 h-5 rounded-full opacity-50",
            config.pulseColor,
            "animate-pulse"
          )}
        />
        {/* Inner solid circle */}
        <div 
          className={cn(
            "relative w-3 h-3 rounded-full z-10",
            config.pulseColor
          )}
        />
      </div>

      {/* Status Icon & Text */}
      <div className="flex items-center gap-1.5">
        <StatusIcon className={cn("h-3.5 w-3.5", config.color)} />
        <span className={cn("text-[10px] font-bold tracking-wider", config.color)}>
          {config.label}
        </span>
      </div>

      {/* Signal Bars (desktop only) */}
      <div className="hidden md:flex items-end gap-0.5 ml-1">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={cn(
              "w-1 rounded-sm transition-all duration-300",
              status === 'online' && bar <= 4 ? config.pulseColor : 
              status === 'standby' && bar <= 2 ? config.pulseColor :
              status === 'offline' ? 'bg-muted-foreground/30' :
              bar <= 3 ? config.pulseColor : 'bg-muted-foreground/30'
            )}
            style={{ height: `${bar * 3 + 2}px` }}
          />
        ))}
      </div>

      {/* Live Indicator */}
      {status === 'online' && (
        <div className="hidden md:flex items-center gap-1 ml-1 pl-2 border-l border-border/50">
          <Wifi className="h-3 w-3 text-emerald-400" />
          <span className="text-[9px] text-muted-foreground font-mono">
            {activeAgents} ATIVOS
          </span>
        </div>
      )}
    </div>
  );
}