import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  agent: {
    name: string;
  } | null;
}

export function ShiftCalendar() {
  const [date, setDate] = useState<Date>(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedDateShifts, setSelectedDateShifts] = useState<Shift[]>([]);

  useEffect(() => {
    fetchShifts();
  }, [date]);

  const fetchShifts = async () => {
    const start = format(startOfMonth(date), 'yyyy-MM-dd');
    const end = format(endOfMonth(date), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('shifts')
      .select(`
        id,
        shift_date,
        start_time,
        end_time,
        shift_type,
        agent:agents(name)
      `)
      .gte('shift_date', start)
      .lte('shift_date', end);

    if (!error && data) {
      setShifts(data as unknown as Shift[]);
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const dayShifts = shifts.filter(s => s.shift_date === dateStr);
      setSelectedDateShifts(dayShifts);
    }
  };

  const hasShifts = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return shifts.some(s => s.shift_date === dateStr);
  };

  return (
    <Card className="glass glass-border shadow-card h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Calendário de Escalas
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDate(new Date(date.setMonth(date.getMonth() - 1)))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {format(date, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDate(new Date(date.setMonth(date.getMonth() + 1)))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            locale={ptBR}
            className="rounded-md border-0"
            modifiers={{
              hasShifts: (day) => hasShifts(day),
            }}
            modifiersClassNames={{
              hasShifts: 'bg-primary/20 text-primary font-bold',
            }}
          />
          
          <div className="flex-1 min-w-[200px]">
            <h4 className="text-sm font-semibold mb-3">
              Plantões em {format(date, "d 'de' MMMM", { locale: ptBR })}
            </h4>
            {selectedDateShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum plantão agendado
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDateShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="p-3 rounded-lg bg-secondary/50 border border-border"
                  >
                    <p className="font-medium text-sm">
                      {shift.agent?.name || 'Agente não encontrado'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {shift.start_time} - {shift.end_time}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                      {shift.shift_type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
