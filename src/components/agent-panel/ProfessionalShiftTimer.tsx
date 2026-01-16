import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Clock, Timer, Play, Loader2, AlertCircle, 
  Bell, BellOff, Calendar, ArrowRight, Zap, Shield
} from 'lucide-react';
import { 
  format, differenceInHours, differenceInMinutes, differenceInSeconds, 
  addHours, isWithinInterval, parseISO, subDays, differenceInDays
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
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { isSupported: pushSupported, isEnabled: pushEnabled, requestPermission } = usePushNotifications();

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
      toast.success('Lembrete de plantão ativado!');
    } else {
      toast.info('Lembrete desativado.');
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
        
        if (todayShift) {
          setCurrentShift(todayShift);
          const onDuty = checkIfOnDuty(todayShift);
          setIsOnDuty(onDuty);
          if (onDuty) updateTimeRemaining(todayShift);
          
          const futureShifts = shiftList.filter(s => s.shift_date > today);
          setUpcomingShifts(futureShifts.slice(0, 5));
          if (futureShifts.length > 0) setNextShift(futureShifts[0]);
        } else {
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
      <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-slate-700/60 shadow-xl">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    );
  }

  // COMPACT VERSION - Para a linha de stats
  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-slate-700/60 shadow-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isOnDuty ? 'bg-emerald-500/25 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20' : 'bg-slate-700/60'}`}>
              {isOnDuty ? (
                <Play className="h-5 w-5 text-emerald-400" />
              ) : (
                <Clock className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Plantão</p>
              {isOnDuty ? (
                <p className="text-xl font-black text-emerald-400 font-mono leading-tight">
                  {formatUnit(timeRemaining.hours)}:{formatUnit(timeRemaining.minutes)}:{formatUnit(timeRemaining.seconds)}
                </p>
              ) : nextShift ? (
                <p className="text-base font-bold text-slate-200 leading-tight">
                  {format(parseISO(nextShift.shift_date), "dd/MM", { locale: ptBR })} • {nextShift.start_time}
                </p>
              ) : (
                <p className="text-sm text-slate-500 leading-tight">Sem escalas</p>
              )}
            </div>
          </div>
          {isOnDuty && (
            <div className="mt-3 h-2 bg-slate-700/80 rounded-full overflow-hidden border border-slate-600/50">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 transition-all duration-1000 rounded-full shadow-lg"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // FULL VERSION - Timer completo e sofisticado
  return (
    <Card className="bg-gradient-to-br from-slate-800/95 via-slate-850/95 to-slate-900/95 border-2 border-slate-700/60 shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-amber-500/10">
      <CardContent className="p-0">
        {isOnDuty && currentShift ? (
          <div className="space-y-0">
            {/* Header com status */}
            <div className="bg-gradient-to-r from-emerald-600/30 via-emerald-500/15 to-transparent p-4 border-b-2 border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Shield className="h-7 w-7 text-emerald-400 drop-shadow-lg" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
                  </div>
                  <span className="text-sm font-black text-emerald-400 uppercase tracking-wider">Em Serviço</span>
                </div>
                <Badge className="bg-emerald-500/25 text-emerald-400 border-2 border-emerald-500/50 text-xs px-3 py-1 font-bold shadow-lg shadow-emerald-500/20">
                  24H
                </Badge>
              </div>
            </div>

            {/* Data do plantão atual */}
            <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700/40">
              <div className="flex items-center justify-center gap-2 text-slate-300">
                <Calendar className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold">
                  {format(parseISO(currentShift.shift_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>

            {/* Relógio atual */}
            <div className="px-5 py-4 bg-gradient-to-b from-slate-900/90 to-slate-900/50">
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase tracking-[0.25em] mb-2 font-semibold">Horário Atual</p>
                <p className="text-4xl font-mono font-black text-white tracking-wider drop-shadow-lg">
                  {format(currentTime, 'HH:mm:ss')}
                </p>
              </div>
            </div>

            {/* Timer principal - Tempo decorrido */}
            <div className="p-5 space-y-4">
              <div className="text-center">
                <p className="text-xs text-amber-400 uppercase tracking-[0.2em] font-bold mb-3">
                  Tempo em Serviço
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="bg-gradient-to-b from-amber-500/25 to-amber-600/15 rounded-xl px-4 py-2.5 border-2 border-amber-500/40 shadow-lg shadow-amber-500/20">
                    <span className="font-mono text-3xl font-black text-amber-400">{formatUnit(timeElapsed.hours)}</span>
                  </div>
                  <span className="text-2xl font-black text-amber-400 animate-pulse">:</span>
                  <div className="bg-gradient-to-b from-amber-500/25 to-amber-600/15 rounded-xl px-4 py-2.5 border-2 border-amber-500/40 shadow-lg shadow-amber-500/20">
                    <span className="font-mono text-3xl font-black text-amber-400">{formatUnit(timeElapsed.minutes)}</span>
                  </div>
                  <span className="text-2xl font-black text-amber-400 animate-pulse">:</span>
                  <div className="bg-gradient-to-b from-amber-500/25 to-amber-600/15 rounded-xl px-4 py-2.5 border-2 border-amber-500/40 shadow-lg shadow-amber-500/20">
                    <span className="font-mono text-3xl font-black text-amber-400">{formatUnit(timeElapsed.seconds)}</span>
                  </div>
                </div>
                <div className="flex justify-center gap-8 mt-2 text-xs text-slate-400 uppercase font-semibold">
                  <span>hrs</span>
                  <span>min</span>
                  <span>seg</span>
                </div>
              </div>

              {/* Progress bar elegante */}
              <div className="relative">
                <div className="h-3 bg-slate-800/80 rounded-full overflow-hidden border-2 border-slate-700/60">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 transition-all duration-1000 rounded-full shadow-lg"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-slate-400 font-medium">{currentShift.start_time}</span>
                  <span className="text-amber-400 font-black text-sm">{progress.toFixed(0)}%</span>
                  <span className="text-slate-400 font-medium">{currentShift.start_time}</span>
                </div>
              </div>

              {/* Tempo restante */}
              <div className="bg-slate-800/60 rounded-xl p-4 border-2 border-slate-700/50 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Timer className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm text-slate-300 uppercase font-semibold">Restante</span>
                  </div>
                  <span className="font-mono text-lg font-black text-emerald-400">
                    {formatUnit(timeRemaining.hours)}:{formatUnit(timeRemaining.minutes)}:{formatUnit(timeRemaining.seconds)}
                  </span>
                </div>
              </div>
            </div>

            {/* Próximo plantão */}
            {nextShift && (
              <div className="px-3 py-2 bg-slate-800/30 border-t border-slate-700/30">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <ArrowRight className="h-3 w-3" />
                    <span>Próximo</span>
                  </div>
                  <span className="text-slate-300 font-medium">
                    {format(parseISO(nextShift.shift_date), "EEE dd/MM", { locale: ptBR })} • {nextShift.start_time}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {nextShift ? (
              <CountdownToShift shift={nextShift} currentTime={currentTime} />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500 py-6">
                <AlertCircle className="h-8 w-8 text-slate-600" />
                <p className="text-sm font-medium">Nenhum plantão agendado</p>
                <p className="text-[10px] text-center max-w-[200px]">
                  Configure sua escala na aba "Plantões"
                </p>
              </div>
            )}
            
            {/* Toggle de lembrete */}
            {nextShift && (
              <div className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/40">
                <div className="flex items-center gap-2">
                  {reminderEnabled ? (
                    <Bell className="h-4 w-4 text-amber-400" />
                  ) : (
                    <BellOff className="h-4 w-4 text-slate-500" />
                  )}
                  <span className="text-xs text-slate-300">Lembrete 1h antes</span>
                </div>
                <Switch
                  checked={reminderEnabled}
                  onCheckedChange={toggleReminder}
                  className="scale-75"
                />
              </div>
            )}

            {/* Lista de próximos plantões */}
            {upcomingShifts.length > 1 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider px-1">Próximos</p>
                {upcomingShifts.slice(1, 3).map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
                    <span className="text-xs text-slate-400 capitalize">
                      {format(parseISO(shift.shift_date), "EEE, dd/MM", { locale: ptBR })}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-400 border-slate-600">
                      {shift.start_time}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Countdown para próximo plantão
function CountdownToShift({ shift, currentTime }: { shift: Shift; currentTime: Date }) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateCountdown = () => {
      const now = currentTime;
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
  }, [shift, currentTime]);

  const formatUnit = (value: number) => value.toString().padStart(2, '0');

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-center gap-2">
        <Clock className="h-4 w-4 text-amber-400" />
        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Próximo Plantão</span>
      </div>

      {/* Data */}
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-200 capitalize">
          {format(parseISO(shift.shift_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">Início às {shift.start_time}</p>
      </div>
      
      {/* Countdown compacto */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="bg-slate-800/60 rounded-lg p-2 text-center border border-slate-700/40">
          <span className="font-mono text-xl font-bold text-amber-400 block">{formatUnit(countdown.days)}</span>
          <span className="text-[8px] text-slate-500 uppercase">dias</span>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2 text-center border border-slate-700/40">
          <span className="font-mono text-xl font-bold text-amber-400 block">{formatUnit(countdown.hours)}</span>
          <span className="text-[8px] text-slate-500 uppercase">hrs</span>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2 text-center border border-slate-700/40">
          <span className="font-mono text-xl font-bold text-amber-400 block">{formatUnit(countdown.minutes)}</span>
          <span className="text-[8px] text-slate-500 uppercase">min</span>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2 text-center border border-slate-700/40">
          <span className="font-mono text-xl font-bold text-amber-400 block animate-pulse">{formatUnit(countdown.seconds)}</span>
          <span className="text-[8px] text-slate-500 uppercase">seg</span>
        </div>
      </div>
    </div>
  );
}
