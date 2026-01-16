import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CalendarOff, Loader2, Trash2, Palmtree, Stethoscope, Star, GraduationCap, CalendarPlus, Users, User } from 'lucide-react';
import { format, parseISO, differenceInDays, isAfter, startOfDay, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeaveRequestCardProps {
  agentId: string;
  agentTeam?: string | null;
  agentUnitId?: string | null;
}

interface AgentLeave {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
  agent_id?: string;
}

interface TeamMemberLeave extends AgentLeave {
  agent_name: string;
}

const leaveTypes = [
  { value: 'special', label: 'Folga Especial', icon: Star, color: 'text-amber-400', bgColor: 'bg-amber-500/20 border-amber-500/30' },
  { value: 'vacation', label: 'Férias', icon: Palmtree, color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30' },
  { value: 'medical', label: 'Licença Médica', icon: Stethoscope, color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30' },
  { value: 'training', label: 'Treinamento', icon: GraduationCap, color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30' },
];

const leaveTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  vacation: { label: 'Férias', icon: <Palmtree className="h-4 w-4" />, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  medical: { label: 'Licença Médica', icon: <Stethoscope className="h-4 w-4" />, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  special: { label: 'Folga Especial', icon: <Star className="h-4 w-4" />, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  training: { label: 'Treinamento', icon: <GraduationCap className="h-4 w-4" />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  approved: { label: 'Aprovado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  rejected: { label: 'Rejeitado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export function LeaveRequestCard({ agentId, agentTeam, agentUnitId }: LeaveRequestCardProps) {
  const [leaves, setLeaves] = useState<AgentLeave[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<TeamMemberLeave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedType, setSelectedType] = useState('special');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [leaveDates, setLeaveDates] = useState<Date[]>([]);
  const [teamLeaveDates, setTeamLeaveDates] = useState<Date[]>([]);
  const [leaveDescription, setLeaveDescription] = useState('');
  const [activeTab, setActiveTab] = useState('minhas');

  useEffect(() => {
    fetchLeaves();
    if (agentTeam && agentUnitId) {
      fetchTeamLeaves();
    }
  }, [agentId, agentTeam, agentUnitId]);

  const fetchLeaves = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('agent_leaves')
        .select('*')
        .eq('agent_id', agentId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      const leavesData = (data || []) as AgentLeave[];
      setLeaves(leavesData);

      const dates: Date[] = [];
      leavesData.forEach(leave => {
        const startDate = parseISO(leave.start_date);
        const endDate = parseISO(leave.end_date);
        let currentDate = startDate;
        while (currentDate <= endDate) {
          dates.push(new Date(currentDate));
          currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
        }
      });
      setLeaveDates(dates);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamLeaves = async () => {
    if (!agentTeam || !agentUnitId) return;
    
    try {
      const { data: teamMembers, error: teamError } = await supabase
        .from('agents')
        .select('id, name')
        .eq('team', agentTeam)
        .eq('unit_id', agentUnitId)
        .neq('id', agentId);

      if (teamError) throw teamError;

      if (teamMembers && teamMembers.length > 0) {
        const memberIds = teamMembers.map(m => m.id);
        const today = new Date();
        const thirtyDaysLater = addDays(today, 30);
        
        const { data: leavesData, error: leavesError } = await (supabase as any)
          .from('agent_leaves')
          .select('*')
          .in('agent_id', memberIds)
          .gte('end_date', format(today, 'yyyy-MM-dd'))
          .lte('start_date', format(thirtyDaysLater, 'yyyy-MM-dd'))
          .order('start_date', { ascending: true });

        if (leavesError) throw leavesError;

        const leavesWithNames = (leavesData || []).map((leave: any) => {
          const member = teamMembers.find(m => m.id === leave.agent_id);
          return { ...leave, agent_name: member?.name || 'Agente' };
        });

        setTeamLeaves(leavesWithNames);

        const teamDates: Date[] = [];
        leavesWithNames.forEach((leave: TeamMemberLeave) => {
          const startDate = parseISO(leave.start_date);
          const endDate = parseISO(leave.end_date);
          let currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            teamDates.push(new Date(currentDate));
            currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
          }
        });
        setTeamLeaveDates(teamDates);
      }
    } catch (error) {
      console.error('Error fetching team leaves:', error);
    }
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    
    const alreadyRegistered = leaveDates.some(d => isSameDay(d, date));
    
    if (alreadyRegistered) {
      toast.error('Este dia já possui folga registrada');
      return;
    }

    setSelectedDate(date);
    setSelectedType('special');
    setLeaveDescription('');
    setShowConfirmDialog(true);
  };

  const handleConfirmLeave = async () => {
    if (!selectedDate) return;

    try {
      setIsSubmitting(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { error } = await (supabase as any)
        .from('agent_leaves')
        .insert({
          agent_id: agentId,
          leave_type: selectedType,
          start_date: dateStr,
          end_date: dateStr,
          reason: leaveDescription.trim() || null,
        });

      if (error) throw error;

      const typeLabel = leaveTypes.find(t => t.value === selectedType)?.label || selectedType;
      toast.success(`${typeLabel} registrada para ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`);
      setShowConfirmDialog(false);
      setSelectedDate(undefined);
      setLeaveDescription('');
      fetchLeaves();
    } catch (error) {
      console.error('Error submitting leave:', error);
      toast.error('Erro ao registrar folga');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (leaveId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('agent_leaves')
        .delete()
        .eq('id', leaveId);

      if (error) throw error;
      toast.success('Folga cancelada');
      fetchLeaves();
    } catch (error) {
      console.error('Error deleting leave:', error);
      toast.error('Erro ao cancelar folga');
    }
  };

  const pendingLeaves = leaves.filter(l => l.status === 'pending');
  const approvedLeaves = leaves.filter(l => l.status === 'approved');

  return (
    <Card className="card-night-purple bg-gradient-to-br from-[hsl(222,60%,3%)] via-[hsl(222,55%,5%)] to-[hsl(270,40%,8%)] border-3 border-purple-500/50 overflow-hidden transition-all duration-300 hover:border-purple-400/70 group relative">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader className="pb-4 relative">
        <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/30 to-violet-500/20 border border-purple-500/40">
            <CalendarOff className="h-6 w-6 md:h-7 md:w-7 text-purple-400" />
          </div>
          <span className="font-bold bg-gradient-to-r from-purple-200 to-violet-300 bg-clip-text text-transparent">
            Folgas Programadas
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/80 border-2 border-purple-500/30 rounded-xl p-1.5 h-auto">
            <TabsTrigger value="minhas" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 rounded-lg py-2.5 px-4 font-semibold transition-all duration-200">
              <User className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              <span className="text-sm md:text-base">Minhas Folgas</span>
            </TabsTrigger>
            <TabsTrigger value="equipe" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 rounded-lg py-2.5 px-4 font-semibold transition-all duration-200">
              <Users className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              <span className="text-sm md:text-base">Equipe</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="minhas" className="space-y-4 mt-4">
            {/* Calendar for clicking dates */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-slate-300">Clique na data para registrar folga</span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-2">
                <Calendar
                  mode="single"
                  selected={undefined}
                  month={selectedMonth}
                  onMonthChange={setSelectedMonth}
                  onSelect={handleDateClick}
                  locale={ptBR}
                  disabled={(date) => !isAfter(date, startOfDay(new Date())) && !isSameDay(date, new Date())}
                  modifiers={{ leave: leaveDates }}
                  modifiersStyles={{
                    leave: {
                      backgroundColor: 'rgba(251, 191, 36, 0.3)',
                      color: '#fbbf24',
                      fontWeight: 'bold',
                      borderRadius: '50%'
                    }
                  }}
                  className="rounded-md pointer-events-auto"
                />
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                  <span className="text-slate-400">Dias com folga registrada</span>
                </div>
              </div>
            </div>

            {/* Leaves List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : leaves.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-slate-400 text-sm">Nenhuma folga programada.</p>
                <p className="text-xs text-slate-500 mt-1">Clique em uma data no calendário para registrar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingLeaves.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-yellow-400 mb-2">Pendentes de Aprovação</h4>
                    <div className="space-y-2">
                      {pendingLeaves.map((leave) => (
                        <LeaveItem key={leave.id} leave={leave} onDelete={handleDelete} />
                      ))}
                    </div>
                  </div>
                )}
                
                {approvedLeaves.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-400 mb-2">Aprovadas</h4>
                    <div className="space-y-2">
                      {approvedLeaves.map((leave) => (
                        <LeaveItem key={leave.id} leave={leave} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="equipe" className="space-y-4 mt-4">
            {/* Team Calendar */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-slate-300">Folgas da Equipe (próximos 30 dias)</span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-2">
                <Calendar
                  mode="single"
                  selected={undefined}
                  month={selectedMonth}
                  onMonthChange={setSelectedMonth}
                  locale={ptBR}
                  modifiers={{ teamLeave: teamLeaveDates }}
                  modifiersStyles={{
                    teamLeave: {
                      backgroundColor: 'rgba(59, 130, 246, 0.3)',
                      color: '#60a5fa',
                      fontWeight: 'bold',
                      borderRadius: '50%'
                    }
                  }}
                  className="rounded-md pointer-events-auto"
                />
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500/50" />
                  <span className="text-slate-400">Colegas de folga</span>
                </div>
              </div>
            </div>

            {/* Team Leaves List */}
            {teamLeaves.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-slate-400 text-sm">Nenhuma folga programada pela equipe nos próximos 30 dias.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {teamLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${leaveTypeLabels[leave.leave_type]?.color || 'bg-slate-600'}`}>
                        {leaveTypeLabels[leave.leave_type]?.icon || <Star className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-white">{leave.agent_name}</p>
                        <p className="text-sm text-slate-400">
                          {leaveTypeLabels[leave.leave_type]?.label || leave.leave_type} • {format(parseISO(leave.start_date), "dd/MM", { locale: ptBR })}
                          {leave.start_date !== leave.end_date && ` - ${format(parseISO(leave.end_date), "dd/MM", { locale: ptBR })}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={statusLabels[leave.status]?.color || ''}>
                      {statusLabels[leave.status]?.label || leave.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Registrar Folga</DialogTitle>
            <DialogDescription className="text-slate-400">
              Selecione o tipo de folga para o dia escolhido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedDate && (
              <>
                <p className="text-lg text-white font-medium text-center">
                  {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                
                {/* Leave Type Selection */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Tipo de Folga</Label>
                  <RadioGroup
                    value={selectedType}
                    onValueChange={setSelectedType}
                    className="grid grid-cols-2 gap-2"
                  >
                    {leaveTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <div key={type.value}>
                          <RadioGroupItem
                            value={type.value}
                            id={`type-${type.value}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`type-${type.value}`}
                            className={`flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition-all
                              ${selectedType === type.value 
                                ? `border-amber-500 ${type.bgColor}` 
                                : 'border-slate-600 hover:border-slate-500'
                              }`}
                          >
                            <IconComponent className={`h-4 w-4 ${type.color}`} />
                            <span className={`text-sm ${selectedType === type.value ? type.color : 'text-slate-300'}`}>
                              {type.label}
                            </span>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Descrição (opcional)</Label>
                  <Textarea
                    value={leaveDescription}
                    onChange={(e) => setLeaveDescription(e.target.value)}
                    placeholder="Motivo ou observações sobre a folga..."
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 resize-none"
                    rows={2}
                  />
                </div>

                {/* Summary */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const type = leaveTypes.find(t => t.value === selectedType);
                      if (!type) return null;
                      const IconComponent = type.icon;
                      return (
                        <>
                          <div className={`p-2 rounded-lg ${type.bgColor}`}>
                            <IconComponent className={`h-5 w-5 ${type.color}`} />
                          </div>
                          <div>
                            <p className={`font-medium ${type.color}`}>{type.label}</p>
                            <p className="text-sm text-slate-400">
                              {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })} (1 dia)
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="border-slate-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmLeave}
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Confirmar Folga'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function LeaveItem({ leave, onDelete }: { leave: AgentLeave; onDelete?: (id: string) => void }) {
  const typeInfo = leaveTypeLabels[leave.leave_type] || { label: leave.leave_type, icon: null, color: '' };
  const statusInfo = statusLabels[leave.status] || { label: leave.status, color: '' };
  const startDate = parseISO(leave.start_date);
  const endDate = parseISO(leave.end_date);
  const days = differenceInDays(endDate, startDate) + 1;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${typeInfo.color}`}>
          {typeInfo.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{typeInfo.label}</span>
            <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-sm text-slate-400">
            {format(startDate, "dd/MM", { locale: ptBR })}{days > 1 ? ` - ${format(endDate, "dd/MM/yyyy", { locale: ptBR })}` : `/${format(startDate, "yyyy", { locale: ptBR })}`} ({days} dia{days > 1 ? 's' : ''})
          </p>
          {leave.reason && (
            <p className="text-xs text-slate-500 mt-1 italic">"{leave.reason}"</p>
          )}
        </div>
      </div>
      {leave.status === 'pending' && onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(leave.id)}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
