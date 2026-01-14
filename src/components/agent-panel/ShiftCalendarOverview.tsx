import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, RefreshCw, Palmtree, AlertCircle, CheckCircle } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ShiftCalendarOverviewProps {
  agentId: string;
}

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  status: string;
  is_vacation: boolean;
  notes: string | null;
}

interface BHEntry {
  id: string;
  created_at: string;
  hours: number;
  operation_type: string;
}

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
}

type DayType = 'shift' | 'bh' | 'leave' | 'rest' | 'today' | 'vacation';

interface DayInfo {
  date: Date;
  types: DayType[];
  shift?: Shift;
  bhEntry?: BHEntry;
  leave?: LeaveRequest;
}

export function ShiftCalendarOverview({ agentId }: ShiftCalendarOverviewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [bhEntries, setBhEntries] = useState<BHEntry[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [agentId, currentMonth]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      // Fetch shifts
      const { data: shiftData } = await supabase
        .from('agent_shifts')
        .select('*')
        .eq('agent_id', agentId)
        .gte('shift_date', monthStart)
        .lte('shift_date', monthEnd);

      // Fetch BH entries
      const { data: bhData } = await supabase
        .from('overtime_bank')
        .select('*')
        .eq('agent_id', agentId)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      // Fetch leaves
      const { data: leaveData } = await supabase
        .from('agent_leaves')
        .select('*')
        .eq('agent_id', agentId)
        .gte('start_date', monthStart)
        .lte('end_date', monthEnd);

      setShifts((shiftData || []) as Shift[]);
      setBhEntries((bhData || []) as BHEntry[]);
      setLeaves((leaveData || []) as LeaveRequest[]);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDayInfo = (date: Date): DayInfo => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const types: DayType[] = [];
    let shift: Shift | undefined;
    let bhEntry: BHEntry | undefined;
    let leave: LeaveRequest | undefined;

    // Check if today
    if (isToday(date)) {
      types.push('today');
    }

    // Check for shifts
    shift = shifts.find(s => s.shift_date === dateStr);
    if (shift) {
      if (shift.is_vacation) {
        types.push('vacation');
      } else {
        types.push('shift');
      }
    }

    // Check for BH entries
    bhEntry = bhEntries.find(b => b.created_at.split('T')[0] === dateStr);
    if (bhEntry) {
      types.push('bh');
    }

    // Check for leaves
    leave = leaves.find(l => {
      const start = parseISO(l.start_date);
      const end = parseISO(l.end_date);
      return date >= start && date <= end;
    });
    if (leave) {
      types.push('leave');
    }

    // If no types, it's a rest day
    if (types.length === 0 || (types.length === 1 && types[0] === 'today')) {
      types.push('rest');
    }

    return { date, types, shift, bhEntry, leave };
  };

  const getDayColors = (types: DayType[]): string => {
    if (types.includes('shift')) return 'bg-amber-500/30 border-amber-500/50 text-amber-400';
    if (types.includes('vacation')) return 'bg-purple-500/30 border-purple-500/50 text-purple-400';
    if (types.includes('leave')) return 'bg-blue-500/30 border-blue-500/50 text-blue-400';
    if (types.includes('bh')) return 'bg-green-500/30 border-green-500/50 text-green-400';
    return 'bg-slate-800/30 border-slate-700/30 text-muted-foreground';
  };

  const getDayIcon = (types: DayType[]) => {
    if (types.includes('shift')) return <Clock className="h-2.5 w-2.5" />;
    if (types.includes('vacation')) return <Palmtree className="h-2.5 w-2.5" />;
    if (types.includes('leave')) return <RefreshCw className="h-2.5 w-2.5" />;
    if (types.includes('bh')) return <CheckCircle className="h-2.5 w-2.5" />;
    return null;
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Get the day of week for the first day (0 = Sunday)
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Stats for the month
  const shiftDays = shifts.filter(s => !s.is_vacation).length;
  const vacationDays = shifts.filter(s => s.is_vacation).length;
  const leaveDays = leaves.length;
  const totalBhHours = bhEntries.reduce((acc, b) => acc + (b.operation_type === 'credit' ? b.hours : -b.hours), 0);

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Calendário do Mês</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Month Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-400">{shiftDays}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Plantões</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-purple-400">{vacationDays}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Férias</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-blue-400">{leaveDays}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Folgas</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-green-400">{totalBhHours > 0 ? '+' : ''}{totalBhHours}</p>
            <p className="text-[10px] text-muted-foreground uppercase">BH (h)</p>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
              <div key={i} className="text-center text-[10px] text-muted-foreground font-medium uppercase">
                {day}
              </div>
            ))}
          </div>
          
          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the month starts */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {/* Actual days */}
            {days.map((day) => {
              const dayInfo = getDayInfo(day);
              const colors = getDayColors(dayInfo.types);
              const icon = getDayIcon(dayInfo.types);
              const isTodayDay = dayInfo.types.includes('today');
              
              return (
                <div
                  key={day.toISOString()}
                  className={`aspect-square rounded-lg border flex flex-col items-center justify-center text-xs font-medium transition-all ${colors} ${
                    isTodayDay ? 'ring-2 ring-primary ring-offset-1 ring-offset-slate-900' : ''
                  }`}
                >
                  <span className={isTodayDay ? 'font-bold' : ''}>{format(day, 'd')}</span>
                  {icon && <div className="mt-0.5">{icon}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-700/50">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500/50 border border-amber-500/50" />
            <span className="text-[10px] text-muted-foreground">Plantão</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-purple-500/50 border border-purple-500/50" />
            <span className="text-[10px] text-muted-foreground">Férias</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500/50 border border-blue-500/50" />
            <span className="text-[10px] text-muted-foreground">Folga</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500/50 border border-green-500/50" />
            <span className="text-[10px] text-muted-foreground">BH</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
