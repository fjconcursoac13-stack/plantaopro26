import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Clock, Timer, Play, Loader2, AlertCircle, CheckCircle2, 
  Bell, BellOff, Calendar, ArrowRight, Zap
} from 'lucide-react';
import { 
  format, differenceInHours, differenceInMinutes, differenceInSeconds, 
  addHours, isWithinInterval, parseISO, subDays, differenceInDays,
  addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface ProfessionalShiftTimerProps {
  agentId: string;
  compact?: boolean;
}

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  is_vacation: boolean;
}

export function ProfessionalShiftTimer({ agentId, compact = false }: ProfessionalShiftTimerProps) {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [nextShift, setNextShift] = useState<Shift | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [timeElapsed, setTimeElapsed] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);
  
  const { isSupported: pushSupported, isEnabled: pushEnabled, requestPermission } = usePushNotifications();

  // Load reminder settings
  useEffect(() => {
    const savedReminder = localStorage.getItem(`shift_reminder_enabled_${agentId}`);
    setReminderEnabled(savedReminder === 'true');
  }, [agentId]);

  useEffect(() => {
    fetchShiftData();
  }, [agentId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentShift && isOnDuty) {
        updateTimeRemaining(currentShift);
      }
      checkShiftReminder();
    }, 1000);
    return () => clearInterval(interval);
  }, [currentShift, isOnDuty, nextShift, reminderEnabled]);

  const checkShiftReminder = useCallback(() => {
    if (!reminderEnabled || !nextShift) return;
    
    const now = new Date();
    const shiftDate = parseISO(nextShift.shift_date);
    const [startHour, startMin] = nextShift.start_time.split(':').map(Number);
    const shiftStart = new Date(shiftDate);
    shiftStart.setHours(startHour, startMin, 0);
    
    const minutesUntilShift = differenceInMinutes(shiftStart, now);
    const shiftKey = `${nextShift.shift_date}_${nextShift.start_time}`;
    const shownReminder = localStorage.getItem(`shift_reminder_shown_${agentId}`);
    
    if (minutesUntilShift > 0 && minutesUntilShift <= 60 && shownReminder !== shiftKey) {
      const message = `Seu plantão começa em ${minutesUntilShift} minuto${minutesUntilShift > 1 ? 's' : ''}!`;
      
      toast.info(message, {
        duration: 10000,
        icon: <Bell className="h-5 w-5 text-amber-500" />,
      });
      
      if (pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 Plantão Próximo!', {
          body: message,
          icon: '/favicon.ico',
          tag: 'shift-reminder',
        });
      }
      
      localStorage.setItem(`shift_reminder_shown_${agentId}`, shiftKey);
    }
  }, [reminderEnabled, nextShift, pushEnabled, agentId]);

  const toggleReminder = async () => {
    if (!reminderEnabled && pushSupported && !pushEnabled) {
      await requestPermission();
    }
    const newValue = !reminderEnabled;
    setReminderEnabled(newValue);
    localStorage.setItem(`shift_reminder_enabled_${agentId}`, String(newValue));
    
    if (newValue) {
      toast.success('Lembrete de plantão ativado! Você será avisado 1h antes.');
    } else {
      toast.info('Lembrete de plantão desativado.');
    }
  };

  const fetchShiftData = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      
      const { data: shifts, error } = await supabase
        .from('agent_shifts')
        .select('*')
        .eq('agent_id', agentId)
        .gte('shift_date', yesterday)
        .neq('status', 'vacation')
        .order('shift_date', { ascending: true })
        .limit(10);

      if (error) throw error;

      const shiftList = (shifts || []) as Shift[];

      if (shiftList.length > 0) {
        const yesterdayShift = shiftList.find(s => s.shift_date === yesterday);
        const todayShift = shiftList.find(s => s.shift_date === today);
        
        // Check if still on duty from yesterday's shift
        if (yesterdayShift) {
          const stillOnDuty = checkIfStillOnDuty(yesterdayShift);
          if (stillOnDuty) {
            setCurrentShift(yesterdayShift);
            setIsOnDuty(true);
            updateTimeRemaining(yesterdayShift);
            const futureShifts = shiftList.filter(s => s.shift_date > yesterday);
            setUpcomingShifts(futureShifts.slice(0, 5));
            if (futureShifts.length > 0) setNextShift(futureShifts[0]);
            return;
          }
        }
        
        // Check if on duty today
        if (todayShift) {
          setCurrentShift(todayShift);
          const onDuty = checkIfOnDuty(todayShift);
          setIsOnDuty(onDuty);
          if (onDuty) updateTimeRemaining(todayShift);
          
          const futureShifts = shiftList.filter(s => s.shift_date > today);
          setUpcomingShifts(futureShifts.slice(0, 5));
          if (futureShifts.length > 0) setNextShift(futureShifts[0]);
        } else {
          // No shift today, set next shift
          const futureShifts = shiftList.filter(s => s.shift_date >= today);
          setUpcomingShifts(futureShifts.slice(0, 5));
          if (futureShifts.length > 0) setNextShift(futureShifts[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching shift data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfStillOnDuty = (shift: Shift): boolean => {
    const now = new Date();
    const shiftDate = parseISO(shift.shift_date);
    const [startHour, startMin] = shift.start_time.split(':').map(Number);
    const shiftStart = new Date(shiftDate);
    shiftStart.setHours(startHour, startMin, 0);
    const shiftEnd = addHours(shiftStart, 24);
    return isWithinInterval(now, { start: shiftStart, end: shiftEnd });
  };

  const checkIfOnDuty = (shift: Shift): boolean => {
    return checkIfStillOnDuty(shift);
  };

  const updateTimeRemaining = (shift: Shift) => {
    const now = new Date();
    const shiftDate = parseISO(shift.shift_date);
    const [startHour, startMin] = shift.start_time.split(':').map(Number);
    const shiftStart = new Date(shiftDate);
    shiftStart.setHours(startHour, startMin, 0);
    const shiftEnd = addHours(shiftStart, 24);
    
    const hoursRemaining = Math.max(0, differenceInHours(shiftEnd, now));
    const minutesRemaining = Math.max(0, differenceInMinutes(shiftEnd, now) % 60);
    const secondsRemaining = Math.max(0, differenceInSeconds(shiftEnd, now) % 60);
    
    const hoursElapsed = Math.max(0, differenceInHours(now, shiftStart));
    const minutesElapsed = Math.max(0, differenceInMinutes(now, shiftStart) % 60);
    const secondsElapsed = Math.max(0, differenceInSeconds(now, shiftStart) % 60);
    
    const totalMinutes = 24 * 60;
    const elapsedMinutes = differenceInMinutes(now, shiftStart);
    const progressPercent = Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));
    
    setProgress(progressPercent);
    setTimeRemaining({ hours: hoursRemaining, minutes: minutesRemaining, seconds: secondsRemaining });
    setTimeElapsed({ hours: hoursElapsed, minutes: minutesElapsed, seconds: secondsElapsed });
  };

  const formatUnit = (value: number) => value.toString().padStart(2, '0');

  const getShiftEndDateTime = (shift: Shift) => {
    const shiftDate = parseISO(shift.shift_date);
    const [startHour, startMin] = shift.start_time.split(':').map(Number);
    const shiftStart = new Date(shiftDate);
    shiftStart.setHours(startHour, startMin, 0);
    return addHours(shiftStart, 24);
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-2xl">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isOnDuty ? 'bg-green-500/20 ring-2 ring-green-500/30' : 'bg-slate-700'}`}>
              {isOnDuty ? (
                <Play className="h-5 w-5 text-green-400" />
              ) : (
                <Clock className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Plantão</p>
              {isOnDuty ? (
                <p className="text-xl font-bold text-green-400 font-mono">
                  {formatUnit(timeRemaining.hours)}:{formatUnit(timeRemaining.minutes)}:{formatUnit(timeRemaining.seconds)}
                </p>
              ) : nextShift ? (
                <p className="text-sm font-medium text-foreground">
                  {format(parseISO(nextShift.shift_date), "dd/MM", { locale: ptBR })} às {nextShift.start_time}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Sem escalas</p>
              )}
            </div>
          </div>
          {isOnDuty && (
            <Progress value={progress} className="h-1.5 mt-3" />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 border-slate-700 shadow-2xl overflow-hidden">
      <CardHeader className="pb-2 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Timer className="h-5 w-5 text-primary" />
            <span>Controle de Plantão</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {isOnDuty && (
              <Badge className="bg-green-500/90 text-white animate-pulse shadow-lg shadow-green-500/30">
                <Zap className="h-3 w-3 mr-1" />
                EM SERVIÇO
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        {isOnDuty && currentShift ? (
          <div className="space-y-4">
            {/* Shift Date Info */}
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400 font-medium">Plantão Atual</span>
                </div>
                <Badge variant="outline" className="text-green-400 border-green-500/50 font-mono">
                  24 HORAS
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Início</p>
                  <p className="text-sm font-bold text-foreground">
                    {format(parseISO(currentShift.shift_date), "dd/MM", { locale: ptBR })} às {currentShift.start_time}
                  </p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Término</p>
                  <p className="text-sm font-bold text-foreground">
                    {format(getShiftEndDateTime(currentShift), "dd/MM", { locale: ptBR })} às {currentShift.start_time}
                  </p>
                </div>
              </div>
            </div>

            {/* Professional Timer Display */}
            <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-700/50">
              {/* Time Elapsed */}
              <div className="mb-6">
                <p className="text-xs text-center text-amber-400 mb-3 uppercase tracking-[0.2em] font-medium">
                  Tempo Decorrido
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="bg-gradient-to-b from-slate-700 to-slate-800 rounded-xl px-4 py-3 border border-amber-500/30 shadow-lg shadow-amber-500/10">
                    <span className="font-mono text-4xl font-bold text-amber-400 drop-shadow-lg">{formatUnit(timeElapsed.hours)}</span>
                  </div>
                  <span className="text-3xl font-bold text-amber-400 animate-pulse">:</span>
                  <div className="bg-gradient-to-b from-slate-700 to-slate-800 rounded-xl px-4 py-3 border border-amber-500/30 shadow-lg shadow-amber-500/10">
                    <span className="font-mono text-4xl font-bold text-amber-400 drop-shadow-lg">{formatUnit(timeElapsed.minutes)}</span>
                  </div>
                  <span className="text-3xl font-bold text-amber-400 animate-pulse">:</span>
                  <div className="bg-gradient-to-b from-slate-700 to-slate-800 rounded-xl px-4 py-3 border border-amber-500/30 shadow-lg shadow-amber-500/10">
                    <span className="font-mono text-4xl font-bold text-amber-400 drop-shadow-lg">{formatUnit(timeElapsed.seconds)}</span>
                  </div>
                </div>
                <div className="flex justify-center gap-10 mt-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                  <span>Horas</span>
                  <span>Min</span>
                  <span>Seg</span>
                </div>
              </div>

              {/* Time Remaining */}
              <div className="pt-4 border-t border-slate-700/50">
                <p className="text-xs text-center text-green-400 mb-3 uppercase tracking-[0.2em] font-medium">
                  Tempo Restante
                </p>
                <div className="flex items-center justify-center gap-1.5">
                  <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-green-500/20">
                    <span className="font-mono text-2xl font-bold text-green-400">{formatUnit(timeRemaining.hours)}</span>
                  </div>
                  <span className="text-xl font-bold text-green-400 animate-pulse">:</span>
                  <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-green-500/20">
                    <span className="font-mono text-2xl font-bold text-green-400">{formatUnit(timeRemaining.minutes)}</span>
                  </div>
                  <span className="text-xl font-bold text-green-400 animate-pulse">:</span>
                  <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-green-500/20">
                    <span className="font-mono text-2xl font-bold text-green-400">{formatUnit(timeRemaining.seconds)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="relative h-5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 via-amber-400 to-green-500 transition-all duration-1000 rounded-full"
                  style={{ width: `${progress}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {progress.toFixed(1)}% concluído
                  </span>
                </div>
              </div>
            </div>

            {/* Next Shift Preview */}
            {nextShift && (
              <div className="pt-3 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase">Próximo plantão</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {format(parseISO(nextShift.shift_date), "EEEE, dd/MM", { locale: ptBR })} às {nextShift.start_time}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Countdown to Next Shift */}
            {nextShift ? (
              <CountdownToShift shift={nextShift} />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
                <p className="font-medium">Nenhum plantão agendado</p>
                <p className="text-xs text-center max-w-xs">
                  Configure sua escala na aba "Plantões" para ver seu próximo serviço
                </p>
              </div>
            )}
            
            {/* Reminder Toggle */}
            {nextShift && (
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3">
                  {reminderEnabled ? (
                    <Bell className="h-5 w-5 text-primary" />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <span className="text-sm font-medium text-foreground">Lembrete 1h antes</span>
                    <p className="text-xs text-muted-foreground">Receber alerta antes do plantão</p>
                  </div>
                </div>
                <Switch
                  checked={reminderEnabled}
                  onCheckedChange={toggleReminder}
                />
              </div>
            )}

            {/* Upcoming Shifts Preview */}
            {upcomingShifts.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Próximos Plantões</p>
                <div className="space-y-1.5">
                  {upcomingShifts.slice(1, 4).map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-2.5 bg-slate-800/30 rounded-lg border border-slate-700/30">
                      <span className="text-sm text-foreground capitalize">
                        {format(parseISO(shift.shift_date), "EEE, dd/MM", { locale: ptBR })}
                      </span>
                      <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                        {shift.start_time}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Countdown component for next shift
function CountdownToShift({ shift }: { shift: Shift }) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const shiftDate = parseISO(shift.shift_date);
      const [startHour, startMin] = shift.start_time.split(':').map(Number);
      const shiftStart = new Date(shiftDate);
      shiftStart.setHours(startHour, startMin, 0);

      if (now >= shiftStart) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = differenceInDays(shiftStart, now);
      const hours = differenceInHours(shiftStart, now) % 24;
      const minutes = differenceInMinutes(shiftStart, now) % 60;
      const seconds = differenceInSeconds(shiftStart, now) % 60;

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [shift]);

  const formatUnit = (value: number) => value.toString().padStart(2, '0');

  return (
    <div className="p-5 bg-gradient-to-br from-primary/15 via-primary/10 to-slate-800 rounded-2xl border border-primary/30 shadow-lg">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <span className="text-sm text-primary font-bold uppercase tracking-wider">Próximo Plantão</span>
      </div>
      
      <p className="text-lg font-bold text-foreground capitalize text-center mb-5">
        {format(parseISO(shift.shift_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
      </p>
      
      {/* Countdown Display */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-slate-900/80 rounded-xl p-3 text-center border border-slate-700 shadow-inner">
          <span className="font-mono text-3xl font-bold text-primary block drop-shadow-lg">{formatUnit(countdown.days)}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Dias</span>
        </div>
        <div className="bg-slate-900/80 rounded-xl p-3 text-center border border-slate-700 shadow-inner">
          <span className="font-mono text-3xl font-bold text-primary block drop-shadow-lg">{formatUnit(countdown.hours)}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horas</span>
        </div>
        <div className="bg-slate-900/80 rounded-xl p-3 text-center border border-slate-700 shadow-inner">
          <span className="font-mono text-3xl font-bold text-primary block drop-shadow-lg">{formatUnit(countdown.minutes)}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Min</span>
        </div>
        <div className="bg-slate-900/80 rounded-xl p-3 text-center border border-slate-700 shadow-inner">
          <span className="font-mono text-3xl font-bold text-primary block drop-shadow-lg animate-pulse">{formatUnit(countdown.seconds)}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Seg</span>
        </div>
      </div>
      
      <p className="text-center text-sm text-primary mt-4 font-mono font-medium">
        Início às {shift.start_time}
      </p>
    </div>
  );
}
