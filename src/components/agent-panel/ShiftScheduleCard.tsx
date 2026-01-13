import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Plus, Loader2, RefreshCw, Check, X, AlertTriangle, Palmtree } from 'lucide-react';
import { format, parseISO, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShiftScheduleCardProps {
  agentId: string;
}

interface AgentShift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  status: string;
  notes: string | null;
  compensation_date: string | null;
  is_vacation: boolean;
  completed_at: string | null;
}

export function ShiftScheduleCard({ agentId }: ShiftScheduleCardProps) {
  const [shifts, setShifts] = useState<AgentShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [firstShiftDate, setFirstShiftDate] = useState<Date | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<AgentShift | null>(null);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [compensationDate, setCompensationDate] = useState<Date | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchShifts();
  }, [agentId]);

  const fetchShifts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('agent_shifts')
        .select('*')
        .eq('agent_id', agentId)
        .order('shift_date', { ascending: true });

      if (error) throw error;
      setShifts((data || []) as AgentShift[]);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateShifts = async () => {
    if (!firstShiftDate) {
      toast.error('Selecione a data do primeiro plantão');
      return;
    }

    try {
      setIsGenerating(true);
      
      const { data, error } = await supabase.rpc('generate_agent_shifts', {
        p_agent_id: agentId,
        p_first_shift_date: format(firstShiftDate, 'yyyy-MM-dd'),
        p_months_ahead: 6
      });

      if (error) throw error;

      toast.success(`${data} plantões gerados com sucesso!`);
      setShowConfig(false);
      fetchShifts();
    } catch (error) {
      console.error('Error generating shifts:', error);
      toast.error('Erro ao gerar plantões');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShiftClick = (shift: AgentShift) => {
    setSelectedShift(shift);
    setEditStatus(shift.status);
    setEditNotes(shift.notes || '');
    setCompensationDate(shift.compensation_date ? parseISO(shift.compensation_date) : undefined);
    setShowShiftDialog(true);
  };

  const handleSaveShift = async () => {
    if (!selectedShift) return;

    try {
      setIsSaving(true);
      
      const updateData: any = {
        status: editStatus,
        notes: editNotes || null,
        compensation_date: compensationDate ? format(compensationDate, 'yyyy-MM-dd') : null,
        is_vacation: editStatus === 'vacation',
        updated_at: new Date().toISOString()
      };

      if (editStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('agent_shifts')
        .update(updateData)
        .eq('id', selectedShift.id);

      if (error) throw error;

      toast.success('Plantão atualizado com sucesso!');
      setShowShiftDialog(false);
      fetchShifts();
    } catch (error) {
      console.error('Error updating shift:', error);
      toast.error('Erro ao atualizar plantão');
    } finally {
      setIsSaving(false);
    }
  };

  const getShiftDates = () => {
    return shifts.map(s => parseISO(s.shift_date));
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'bg-green-500/30', icon: Check, label: 'Cumprido', textColor: 'text-green-400' };
      case 'missed':
        return { color: 'bg-red-500/30', icon: X, label: 'Faltou', textColor: 'text-red-400' };
      case 'compensated':
        return { color: 'bg-blue-500/30', icon: RefreshCw, label: 'Compensado', textColor: 'text-blue-400' };
      case 'vacation':
        return { color: 'bg-purple-500/30', icon: Palmtree, label: 'Férias', textColor: 'text-purple-400' };
      default:
        return { color: 'bg-amber-500/30', icon: AlertTriangle, label: 'Agendado', textColor: 'text-amber-400' };
    }
  };

  const upcomingShifts = shifts
    .filter(s => parseISO(s.shift_date) >= startOfDay(new Date()))
    .slice(0, 5);

  const pastShifts = shifts
    .filter(s => isBefore(parseISO(s.shift_date), startOfDay(new Date())))
    .slice(-5)
    .reverse();

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5 text-amber-500" />
            <span>Escala de Plantões</span>
          </CardTitle>
          <Dialog open={showConfig} onOpenChange={setShowConfig}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                {shifts.length === 0 ? (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Configurar
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reconfigurar
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle>Configurar Escala de Plantões</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <p className="text-sm text-slate-400">
                  Selecione a data do seu primeiro plantão. O sistema irá gerar automaticamente 
                  os próximos plantões seguindo o padrão <strong className="text-amber-400">24h de serviço + 72h de descanso</strong>.
                </p>
                
                <div className="space-y-2">
                  <Label>Data do Primeiro Plantão</Label>
                  <Calendar
                    mode="single"
                    selected={firstShiftDate}
                    onSelect={setFirstShiftDate}
                    locale={ptBR}
                    className="rounded-md border border-slate-600 bg-slate-700/50"
                  />
                </div>

                {firstShiftDate && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-400">
                      <strong>Primeiro plantão:</strong> {format(firstShiftDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Serão gerados plantões para os próximos 6 meses
                    </p>
                  </div>
                )}
                
                <Button 
                  onClick={generateShifts} 
                  disabled={!firstShiftDate || isGenerating}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    'Gerar Escala'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-6">
            <CalendarIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nenhum plantão configurado.</p>
            <p className="text-xs text-slate-500 mt-1">
              Clique em "Configurar" para definir sua escala.
            </p>
          </div>
        ) : (
          <>
            {/* Mini Calendar View */}
            <div className="bg-slate-700/30 rounded-lg p-2">
              <Calendar
                mode="single"
                selected={undefined}
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                locale={ptBR}
                modifiers={{
                  shift: getShiftDates(),
                  today: [new Date()]
                }}
                modifiersStyles={{
                  shift: {
                    backgroundColor: 'rgba(245, 158, 11, 0.3)',
                    color: '#fbbf24',
                    fontWeight: 'bold',
                    borderRadius: '50%'
                  }
                }}
                className="rounded-md"
                onDayClick={(date) => {
                  const shift = shifts.find(s => 
                    format(parseISO(s.shift_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                  );
                  if (shift) {
                    handleShiftClick(shift);
                  }
                }}
              />
            </div>

            {/* Past Shifts - Recently Completed */}
            {pastShifts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Plantões Recentes</h4>
                <div className="space-y-2">
                  {pastShifts.map((shift) => {
                    const shiftDate = parseISO(shift.shift_date);
                    const statusInfo = getStatusInfo(shift.status);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <div
                        key={shift.id}
                        onClick={() => handleShiftClick(shift)}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${statusInfo.color}`}
                      >
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${statusInfo.textColor}`} />
                          <div>
                            <p className={`font-medium ${statusInfo.textColor}`}>
                              {format(shiftDate, "EEEE", { locale: ptBR })}
                            </p>
                            <p className="text-sm text-slate-400">
                              {format(shiftDate, "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`${statusInfo.textColor} border-current`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming Shifts List */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Próximos Plantões</h4>
              <div className="space-y-2">
                {upcomingShifts.map((shift) => {
                  const shiftDate = parseISO(shift.shift_date);
                  const isTodayShift = isToday(shiftDate);
                  const statusInfo = getStatusInfo(shift.status);
                  
                  return (
                    <div
                      key={shift.id}
                      onClick={() => handleShiftClick(shift)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                        isTodayShift
                          ? 'bg-green-500/20 border border-green-500/30'
                          : shift.is_vacation 
                            ? 'bg-purple-500/20 border border-purple-500/30'
                            : 'bg-slate-700/30'
                      }`}
                    >
                      <div>
                        <p className={`font-medium ${isTodayShift ? 'text-green-400' : shift.is_vacation ? 'text-purple-400' : 'text-white'}`}>
                          {format(shiftDate, "EEEE", { locale: ptBR })}
                        </p>
                        <p className="text-sm text-slate-400">
                          {format(shiftDate, "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        {shift.is_vacation && (
                          <Palmtree className="h-4 w-4 text-purple-400" />
                        )}
                        <Badge
                          variant="outline"
                          className={isTodayShift
                            ? 'text-green-400 border-green-500/50'
                            : 'text-amber-400 border-amber-500/50'
                          }
                        >
                          {shift.start_time}
                        </Badge>
                        {isTodayShift && (
                          <p className="text-xs text-green-400">Hoje</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                <span className="text-xs text-slate-400">Agendado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="text-xs text-slate-400">Cumprido</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <span className="text-xs text-slate-400">Falta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500/50" />
                <span className="text-xs text-slate-400">Férias</span>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Shift Edit Dialog */}
      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>
              Plantão - {selectedShift && format(parseISO(selectedShift.shift_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Status do Plantão</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="completed">Cumprido</SelectItem>
                  <SelectItem value="missed">Faltou</SelectItem>
                  <SelectItem value="compensated">Compensado</SelectItem>
                  <SelectItem value="vacation">Férias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editStatus === 'missed' && (
              <div className="space-y-2">
                <Label>Data de Compensação (opcional)</Label>
                <Calendar
                  mode="single"
                  selected={compensationDate}
                  onSelect={setCompensationDate}
                  locale={ptBR}
                  disabled={(date) => isBefore(date, new Date())}
                  className="rounded-md border border-slate-600 bg-slate-700/50"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Descreva o que aconteceu, motivo da falta, etc."
                className="bg-slate-700 border-slate-600 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowShiftDialog(false)}
              className="border-slate-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveShift}
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
