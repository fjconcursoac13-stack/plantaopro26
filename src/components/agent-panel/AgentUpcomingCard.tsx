import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Palmtree, CalendarDays, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AgentUpcomingCardProps {
  agentId: string;
}

interface UpcomingShift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface UpcomingLeave {
  id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
}

interface UpcomingBH {
  id: string;
  created_at: string;
  hours: number;
  operation_type: string;
  description: string | null;
}

interface UpcomingEvent {
  id: string;
  event_date: string;
  title: string;
  event_type: string;
  start_time: string | null;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  vacation: 'Férias',
  medical: 'Atestado Médico',
  personal: 'Folga Pessoal',
  training: 'Treinamento',
  other: 'Outro',
};

export function AgentUpcomingCard({ agentId }: AgentUpcomingCardProps) {
  const [shifts, setShifts] = useState<UpcomingShift[]>([]);
  const [leaves, setLeaves] = useState<UpcomingLeave[]>([]);
  const [bhEntries, setBhEntries] = useState<UpcomingBH[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (agentId) {
      fetchUpcomingData();
    }
  }, [agentId]);

  const fetchUpcomingData = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = addDays(new Date(), 30).toISOString().split('T')[0];

      // Fetch upcoming shifts (next 5)
      const { data: shiftsData } = await supabase
        .from('agent_shifts')
        .select('id, shift_date, start_time, end_time, status')
        .eq('agent_id', agentId)
        .gte('shift_date', today)
        .neq('status', 'vacation')
        .order('shift_date', { ascending: true })
        .limit(5);

      // Fetch upcoming leaves
      const { data: leavesData } = await supabase
        .from('agent_leaves')
        .select('id, start_date, end_date, leave_type, status')
        .eq('agent_id', agentId)
        .gte('end_date', today)
        .in('status', ['approved', 'pending'])
        .order('start_date', { ascending: true })
        .limit(5);

      // Fetch recent BH entries (last 5)
      const { data: bhData } = await supabase
        .from('overtime_bank')
        .select('id, created_at, hours, operation_type, description')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch upcoming events
      const { data: eventsData } = await supabase
        .from('agent_events')
        .select('id, event_date, title, event_type, start_time')
        .eq('agent_id', agentId)
        .gte('event_date', today)
        .lte('event_date', nextMonth)
        .order('event_date', { ascending: true })
        .limit(5);

      setShifts(shiftsData || []);
      setLeaves(leavesData || []);
      setBhEntries(bhData || []);
      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching upcoming data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-amber-500" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasNoData = shifts.length === 0 && leaves.length === 0 && bhEntries.length === 0 && events.length === 0;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5 text-amber-500" />
          Próximos Eventos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasNoData ? (
          <div className="text-center py-6 text-slate-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum evento próximo</p>
          </div>
        ) : (
          <>
            {/* Upcoming Shifts */}
            {shifts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
                  <Calendar className="h-4 w-4" />
                  <span>Próximos Plantões</span>
                </div>
                <div className="space-y-1.5">
                  {shifts.slice(0, 3).map(shift => (
                    <div 
                      key={shift.id} 
                      className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg border border-blue-500/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {format(new Date(shift.shift_date + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })}
                        </span>
                        <span className="text-xs text-slate-400">
                          {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                        </span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={shift.status === 'scheduled' ? 'border-blue-500/50 text-blue-400' : 'border-green-500/50 text-green-400'}
                      >
                        {shift.status === 'scheduled' ? 'Agendado' : shift.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Leaves */}
            {leaves.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-green-400">
                  <Palmtree className="h-4 w-4" />
                  <span>Folgas Programadas</span>
                </div>
                <div className="space-y-1.5">
                  {leaves.slice(0, 3).map(leave => (
                    <div 
                      key={leave.id} 
                      className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg border border-green-500/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {format(new Date(leave.start_date + 'T12:00:00'), "dd/MM", { locale: ptBR })}
                          {leave.start_date !== leave.end_date && (
                            <> - {format(new Date(leave.end_date + 'T12:00:00'), "dd/MM", { locale: ptBR })}</>
                          )}
                        </span>
                        <span className="text-xs text-slate-400">
                          {LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}
                        </span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={leave.status === 'approved' ? 'border-green-500/50 text-green-400' : 'border-amber-500/50 text-amber-400'}
                      >
                        {leave.status === 'approved' ? 'Aprovada' : 'Pendente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent BH Entries */}
            {bhEntries.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
                  <Clock className="h-4 w-4" />
                  <span>Últimos Lançamentos BH</span>
                </div>
                <div className="space-y-1.5">
                  {bhEntries.slice(0, 3).map(bh => (
                    <div 
                      key={bh.id} 
                      className="flex items-center justify-between p-2 bg-amber-500/10 rounded-lg border border-amber-500/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {format(new Date(bh.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="text-xs text-slate-400 truncate max-w-[120px]">
                          {bh.description || 'Sem descrição'}
                        </span>
                      </div>
                      <Badge 
                        className={bh.operation_type === 'credit' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                      >
                        {bh.operation_type === 'credit' ? '+' : '-'}{bh.hours}h
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events/Agenda */}
            {events.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-purple-400">
                  <CalendarDays className="h-4 w-4" />
                  <span>Agenda</span>
                </div>
                <div className="space-y-1.5">
                  {events.slice(0, 3).map(event => (
                    <div 
                      key={event.id} 
                      className="flex items-center justify-between p-2 bg-purple-500/10 rounded-lg border border-purple-500/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {format(new Date(event.event_date + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })}
                        </span>
                        <span className="text-xs text-slate-400 truncate max-w-[120px]">
                          {event.title}
                        </span>
                      </div>
                      {event.start_time && (
                        <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                          {event.start_time.slice(0, 5)}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
