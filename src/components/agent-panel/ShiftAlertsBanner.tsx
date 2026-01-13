import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell, X, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShiftAlertsBannerProps {
  agentId: string;
}

interface UpcomingShift {
  id: string;
  shift_date: string;
  start_time: string;
}

export function ShiftAlertsBanner({ agentId }: ShiftAlertsBannerProps) {
  const [upcomingShift, setUpcomingShift] = useState<UpcomingShift | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const { isEnabled, showNotification } = usePushNotifications();
  const notificationSentRef = useRef<string | null>(null);

  useEffect(() => {
    checkUpcomingShift();
    
    // Check every 30 minutes
    const interval = setInterval(checkUpcomingShift, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [agentId]);

  const checkUpcomingShift = async () => {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Get shifts within next 24 hours
      const { data, error } = await supabase
        .from('agent_shifts')
        .select('id, shift_date, start_time')
        .eq('agent_id', agentId)
        .gte('shift_date', format(now, 'yyyy-MM-dd'))
        .lte('shift_date', format(tomorrow, 'yyyy-MM-dd'))
        .neq('status', 'vacation')
        .order('shift_date', { ascending: true })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const shift = data[0] as UpcomingShift;
        const shiftDateTime = parseISO(`${shift.shift_date}T${shift.start_time}`);
        const hoursUntilShift = (shiftDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // Show alert if shift is within 24 hours but hasn't started
        if (hoursUntilShift > 0 && hoursUntilShift <= 24) {
          setUpcomingShift(shift);
          
          // Create alert in database if not exists
          await createShiftAlert(shift, hoursUntilShift);
          
          // Send push notification if enabled and not already sent for this shift
          if (isEnabled && notificationSentRef.current !== shift.id) {
            const shiftDate = parseISO(shift.shift_date);
            showNotification({
              title: '🔔 Lembrete de Plantão',
              body: `Seu plantão é ${format(shiftDate, "EEEE, dd/MM", { locale: ptBR })} às ${shift.start_time}. Faltam ${Math.round(hoursUntilShift)}h!`,
              tag: `shift-${shift.id}`,
              requireInteraction: true,
            });
            notificationSentRef.current = shift.id;
          }
        } else {
          setUpcomingShift(null);
        }
      } else {
        setUpcomingShift(null);
      }
    } catch (error) {
      console.error('Error checking upcoming shift:', error);
    }
  };

  const createShiftAlert = async (shift: UpcomingShift, hoursUntil: number) => {
    try {
      // Check if alert already exists for this shift
      const { data: existingAlert } = await supabase
        .from('shift_alerts')
        .select('id')
        .eq('agent_id', agentId)
        .eq('shift_id', shift.id)
        .eq('alert_type', 'shift_reminder_24h')
        .maybeSingle();

      if (!existingAlert) {
        const shiftDate = parseISO(shift.shift_date);
        await supabase
          .from('shift_alerts')
          .insert({
            agent_id: agentId,
            shift_id: shift.id,
            alert_type: 'shift_reminder_24h',
            title: 'Lembrete de Plantão',
            message: `Seu plantão está programado para ${format(shiftDate, "EEEE, dd/MM", { locale: ptBR })} às ${shift.start_time}.`,
            scheduled_for: new Date().toISOString(),
            sent_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Error creating shift alert:', error);
    }
  };

  if (!upcomingShift || dismissed) {
    return null;
  }

  const shiftDate = parseISO(upcomingShift.shift_date);
  const shiftDateTime = parseISO(`${upcomingShift.shift_date}T${upcomingShift.start_time}`);
  const now = new Date();
  const hoursUntil = Math.round((shiftDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <Alert className="bg-amber-500/10 border-amber-500/50 mb-4">
      <Bell className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-400 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Plantão em {hoursUntil}h
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-6 w-6 p-0 hover:bg-amber-500/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="text-slate-300">
        Seu próximo plantão é <strong className="text-amber-400">{format(shiftDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</strong> às <strong className="text-amber-400">{upcomingShift.start_time}</strong>. 
        Prepare-se!
      </AlertDescription>
    </Alert>
  );
}
