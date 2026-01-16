import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { ArrowRightLeft, Plus, Loader2, Check, X, Clock, User, FileText, Download, ArrowLeft, CalendarDays, Sparkles, Edit2 } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface SwapRequestsCardProps {
  agentId: string;
  unitId: string | null;
  team: string | null;
}

interface SwapRequest {
  id: string;
  requester_id: string;
  target_id: string;
  requester_shift_id: string;
  target_shift_id: string | null;
  status: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
  requester?: { name: string; matricula?: string; phone?: string };
  target?: { name: string; matricula?: string; phone?: string };
  requester_shift?: { shift_date: string; start_time: string; end_time: string };
  target_shift?: { shift_date: string; start_time: string; end_time: string };
}

interface AgentShift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
}

interface TeamAgent {
  id: string;
  name: string;
  matricula: string | null;
  phone: string | null;
}

// Template reasons for swap requests
const REASON_TEMPLATES = [
  { id: 'personal', label: '📋 Compromisso pessoal', text: 'Solicito permuta devido a compromisso pessoal inadiável na data do meu plantão.' },
  { id: 'medical', label: '🏥 Consulta médica', text: 'Solicito permuta para realizar consulta médica/exame agendado previamente.' },
  { id: 'family', label: '👨‍👩‍👧 Motivo familiar', text: 'Solicito permuta por motivo familiar que requer minha presença.' },
  { id: 'academic', label: '📚 Compromisso acadêmico', text: 'Solicito permuta devido a compromisso acadêmico (prova, aula, apresentação).' },
  { id: 'travel', label: '✈️ Viagem', text: 'Solicito permuta pois estarei em viagem na data do plantão.' },
  { id: 'other', label: '📝 Outro motivo', text: '' },
];

export function SwapRequestsCard({ agentId, unitId, team }: SwapRequestsCardProps) {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [myShifts, setMyShifts] = useState<AgentShift[]>([]);
  const [teamAgents, setTeamAgents] = useState<TeamAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRequest, setEditingRequest] = useState<SwapRequest | null>(null);
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [reason, setReason] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [customDate, setCustomDate] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const { showNotification, playTacticalSound } = usePushNotifications();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch swap requests with agent data
      const { data: requests, error: requestsError } = await (supabase as any)
        .from('shift_swaps')
        .select(`
          *,
          requester:agents!requester_id(name, matricula, phone),
          target:agents!target_id(name, matricula, phone),
          requester_shift:agent_shifts!requester_shift_id(shift_date, start_time, end_time),
          target_shift:agent_shifts!target_shift_id(shift_date, start_time, end_time)
        `)
        .or(`requester_id.eq.${agentId},target_id.eq.${agentId}`)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setSwapRequests((requests || []) as SwapRequest[]);

      // Fetch my future shifts
      const today = new Date().toISOString().split('T')[0];
      const { data: shifts, error: shiftsError } = await (supabase as any)
        .from('agent_shifts')
        .select('id, shift_date, start_time, end_time')
        .eq('agent_id', agentId)
        .gte('shift_date', today)
        .order('shift_date')
        .limit(30);

      if (shiftsError) throw shiftsError;
      setMyShifts((shifts || []) as AgentShift[]);

      // Fetch team agents
      if (unitId) {
        const { data: agents, error: agentsError } = await supabase
          .from('agents')
          .select('id, name, matricula, phone')
          .eq('unit_id', unitId)
          .eq('is_active', true)
          .neq('id', agentId)
          .order('name');

        if (agentsError) throw agentsError;
        setTeamAgents(agents || []);
      }
    } catch (error) {
      console.error('Error fetching swap data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, unitId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription for swap requests
  useEffect(() => {
    const channel = supabase
      .channel(`swap-requests-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_swaps',
          filter: `requester_id=eq.${agentId}`,
        },
        (payload) => {
          handleRealtimeUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_swaps',
          filter: `target_id=eq.${agentId}`,
        },
        (payload) => {
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const handleRealtimeUpdate = async (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT') {
      if (newRecord.target_id === agentId) {
        playTacticalSound?.('notification');
        showNotification?.({
          title: '📋 Nova Solicitação de Permuta',
          body: 'Você recebeu uma nova solicitação de permuta de plantão',
          tag: `swap-${newRecord.id}`,
        });
        toast.success('Nova solicitação de permuta recebida!');
      }
      fetchData();
    } else if (eventType === 'UPDATE') {
      if (newRecord.requester_id === agentId && oldRecord?.status !== newRecord.status) {
        if (newRecord.status === 'accepted') {
          playTacticalSound?.('success');
          showNotification?.({
            title: '✅ Permuta Aceita!',
            body: 'Sua solicitação de permuta foi aceita',
            tag: `swap-${newRecord.id}`,
          });
          toast.success('Sua permuta foi aceita!');
        } else if (newRecord.status === 'rejected') {
          playTacticalSound?.('alert');
          showNotification?.({
            title: '❌ Permuta Recusada',
            body: 'Sua solicitação de permuta foi recusada',
            tag: `swap-${newRecord.id}`,
          });
          toast.error('Sua permuta foi recusada');
        }
      }
      fetchData();
    } else if (eventType === 'DELETE') {
      fetchData();
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = REASON_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setReason(template.text);
    }
  };

  const createSwapRequest = async () => {
    if (!selectedShift || !selectedAgent) {
      toast.error('Selecione o plantão e o agente');
      return;
    }

    try {
      setIsSubmitting(true);

      const { error: swapError } = await (supabase as any)
        .from('shift_swaps')
        .insert({
          requester_id: agentId,
          target_id: selectedAgent,
          requester_shift_id: selectedShift,
          reason: reason || null,
          status: 'pending'
        });

      if (swapError) throw swapError;

      // Create notification for target agent
      await (supabase as any)
        .from('notifications')
        .insert({
          agent_id: selectedAgent,
          type: 'swap',
          title: 'Nova solicitação de permuta',
          content: reason || 'Você recebeu uma solicitação de permuta de plantão'
        });

      toast.success('Solicitação de permuta enviada!');
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating swap request:', error);
      toast.error('Erro ao enviar solicitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateSwapRequest = async () => {
    if (!editingRequest) return;

    try {
      setIsSubmitting(true);

      const { error } = await (supabase as any)
        .from('shift_swaps')
        .update({
          reason: reason,
          requester_shift_id: selectedShift || editingRequest.requester_shift_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingRequest.id);

      if (error) throw error;

      toast.success('Permuta atualizada com sucesso!');
      setShowEditDialog(false);
      setEditingRequest(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error updating swap request:', error);
      toast.error('Erro ao atualizar permuta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowNewRequest(false);
    setSelectedShift('');
    setSelectedAgent('');
    setReason('');
    setSelectedTemplate('');
    setCustomDate(undefined);
  };

  const openEditDialog = (request: SwapRequest) => {
    setEditingRequest(request);
    setReason(request.reason || '');
    setSelectedShift(request.requester_shift_id);
    setShowEditDialog(true);
  };

  const respondToRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await (supabase as any)
        .from('shift_swaps')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      const request = swapRequests.find(r => r.id === requestId);
      if (request) {
        await (supabase as any)
          .from('notifications')
          .insert({
            agent_id: request.requester_id,
            type: 'swap',
            title: status === 'accepted' ? 'Permuta aceita!' : 'Permuta recusada',
            content: status === 'accepted'
              ? 'Sua solicitação de permuta foi aceita'
              : 'Sua solicitação de permuta foi recusada'
          });
      }

      toast.success(status === 'accepted' ? 'Permuta aceita!' : 'Permuta recusada');
      fetchData();
    } catch (error) {
      console.error('Error responding to swap:', error);
      toast.error('Erro ao responder solicitação');
    }
  };

  const exportSwapDocument = async () => {
    setIsExporting(true);
    try {
      const { data: currentAgent } = await supabase
        .from('agents')
        .select('name, matricula, phone, email, team')
        .eq('id', agentId)
        .single();

      const acceptedSwaps = swapRequests.filter(r => r.status === 'accepted');
      const now = new Date();

      const docContent = `
DOCUMENTO DE PERMUTA DE PLANTÃO
================================
PlantãoPro - Sistema de Escalas Operacionais
Gerado em: ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}

DADOS DO SOLICITANTE
--------------------
Nome: ${currentAgent?.name || 'N/A'}
Matrícula: ${currentAgent?.matricula || 'N/A'}
Telefone: ${currentAgent?.phone || 'N/A'}
Email: ${currentAgent?.email || 'N/A'}
Equipe: ${currentAgent?.team || 'N/A'}

PERMUTAS REALIZADAS (${acceptedSwaps.length})
------------------------------------------
${acceptedSwaps.length === 0 ? 'Nenhuma permuta aceita registrada.\n' : 
  acceptedSwaps.map((swap, idx) => `
${idx + 1}. PERMUTA #${swap.id.slice(0, 8)}
   Status: ACEITA
   Data da Solicitação: ${format(parseISO(swap.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
   
   Solicitante: ${swap.requester?.name || 'N/A'} (Mat: ${swap.requester?.matricula || 'N/A'})
   Plantão Original: ${swap.requester_shift?.shift_date ? format(parseISO(swap.requester_shift.shift_date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
   Horário: ${swap.requester_shift?.start_time || '07:00'} às ${swap.requester_shift?.end_time || '07:00'}
   
   Permutado com: ${swap.target?.name || 'N/A'} (Mat: ${swap.target?.matricula || 'N/A'})
   Telefone: ${swap.target?.phone || 'N/A'}
   
   Motivo: ${swap.reason || 'Não informado'}
`).join('\n')}

HISTÓRICO COMPLETO (${swapRequests.length})
------------------------------------------
${swapRequests.map((swap, idx) => `
${idx + 1}. PERMUTA #${swap.id.slice(0, 8)}
   Status: ${swap.status === 'pending' ? 'PENDENTE' : swap.status === 'accepted' ? 'ACEITA' : 'RECUSADA'}
   Data: ${format(parseISO(swap.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
   Solicitante: ${swap.requester?.name || 'N/A'}
   Destinatário: ${swap.target?.name || 'N/A'}
   Plantão: ${swap.requester_shift?.shift_date ? format(parseISO(swap.requester_shift.shift_date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
`).join('\n')}

================================
Documento gerado automaticamente pelo PlantãoPro
© ${now.getFullYear()} - Desenvolvido por FRANC D'NIS
`.trim();

      const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `permutas_${currentAgent?.matricula || agentId.slice(0, 8)}_${format(now, 'yyyy-MM-dd')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Documento de permutas exportado!');
      setShowExportDialog(false);
    } catch (error) {
      console.error('Error exporting swaps:', error);
      toast.error('Erro ao exportar documento');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pendente</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Aceita</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Recusada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="card-night-orange bg-gradient-to-br from-[hsl(222,60%,3%)] via-[hsl(222,55%,5%)] to-[hsl(25,40%,8%)] border-3 border-orange-500/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  const pendingForMe = swapRequests.filter(r => r.target_id === agentId && r.status === 'pending');
  const myRequests = swapRequests.filter(r => r.requester_id === agentId);

  return (
    <Card className="card-night-orange bg-gradient-to-br from-[hsl(222,60%,3%)] via-[hsl(222,55%,5%)] to-[hsl(25,40%,8%)] border-3 border-orange-500/50 overflow-hidden transition-all duration-300 hover:border-orange-400/70 group relative">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader className="pb-4 relative">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-500/20 border border-orange-500/40">
              <ArrowRightLeft className="h-6 w-6 md:h-7 md:w-7 text-orange-400" />
            </div>
            <span className="font-bold bg-gradient-to-r from-orange-200 to-amber-300 bg-clip-text text-transparent">
              Permutas de Plantão
            </span>
            {pendingForMe.length > 0 && (
              <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 shadow-lg shadow-red-500/30 px-3 py-1">
                {pendingForMe.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {/* Export Button */}
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-2 border-slate-500/50 text-slate-300 bg-slate-500/10 hover:bg-slate-500/20 hover:border-slate-400/70 transition-all duration-200 font-semibold">
                  <FileText className="h-4 w-4 mr-1.5" />
                  Exportar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <Download className="h-5 w-5 text-orange-400" />
                    Exportar Documento de Permutas
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Gera um documento com seus dados e histórico de permutas.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg space-y-2">
                    <p className="text-sm text-slate-300 font-medium">O documento incluirá:</p>
                    <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
                      <li>Seus dados pessoais (nome, matrícula, contato)</li>
                      <li>Permutas aceitas com detalhes completos</li>
                      <li>Histórico de todas as solicitações</li>
                    </ul>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-2xl font-bold text-green-400">{swapRequests.filter(r => r.status === 'accepted').length}</p>
                      <p className="text-xs text-slate-400">Aceitas</p>
                    </div>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-2xl font-bold text-amber-400">{swapRequests.length}</p>
                      <p className="text-xs text-slate-400">Total</p>
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowExportDialog(false)} className="border-slate-600 text-slate-300">
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Voltar
                  </Button>
                  <Button onClick={exportSwapDocument} disabled={isExporting} className="bg-orange-500 hover:bg-orange-600 text-white">
                    {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                    Baixar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* New Request Dialog */}
            <Dialog open={showNewRequest} onOpenChange={(open) => { if (!open) resetForm(); setShowNewRequest(open); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-2 border-orange-500/50 text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-400/70 transition-all duration-200 font-semibold">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Nova Permuta
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <ArrowRightLeft className="h-5 w-5 text-orange-400" />
                    Solicitar Permuta
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Selecione o plantão, colega e descreva o motivo.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* Shift Selection */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-amber-400" />
                      Meu Plantão
                    </Label>
                    <Select value={selectedShift} onValueChange={setSelectedShift}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Selecione o plantão" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600 max-h-[200px]">
                        {myShifts.length === 0 ? (
                          <SelectItem value="none" disabled>Nenhum plantão disponível</SelectItem>
                        ) : (
                          myShifts.map((shift) => (
                            <SelectItem key={shift.id} value={shift.id}>
                              {format(parseISO(shift.shift_date), "dd/MM/yyyy (EEE)", { locale: ptBR })} • {shift.start_time}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Agent Selection */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-400" />
                      Permutar com
                    </Label>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Selecione o agente" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600 max-h-[200px]">
                        {teamAgents.length === 0 ? (
                          <SelectItem value="none" disabled>Nenhum agente disponível</SelectItem>
                        ) : (
                          teamAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name} {agent.matricula && `(${agent.matricula})`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reason Templates */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      Modelo de Motivo
                    </Label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Escolha um modelo (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {REASON_TEMPLATES.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reason Text */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Motivo da Permuta</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Descreva o motivo da permuta..."
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 resize-none min-h-[100px]"
                      rows={4}
                    />
                    <p className="text-xs text-slate-500">
                      Você pode editar o texto gerado ou escrever seu próprio motivo.
                    </p>
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-4">
                  <Button variant="outline" onClick={resetForm} className="border-slate-600 text-slate-300">
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Voltar
                  </Button>
                  <Button
                    onClick={createSwapRequest}
                    disabled={!selectedShift || !selectedAgent || isSubmitting}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Solicitar Permuta
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Pending requests for me */}
        {pendingForMe.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Aguardando sua resposta
            </h4>
            <div className="space-y-2">
              {pendingForMe.map((request) => (
                <div key={request.id} className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-medium">{request.requester?.name}</span> quer permutar
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Plantão: {request.requester_shift?.shift_date && 
                          format(parseISO(request.requester_shift.shift_date), "dd/MM/yyyy (EEE)", { locale: ptBR })
                        }
                      </p>
                      {request.reason && (
                        <p className="text-xs text-slate-300 mt-1 italic line-clamp-2">"{request.reason}"</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => respondToRequest(request.id, 'accepted')} className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => respondToRequest(request.id, 'rejected')} className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My requests */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Minhas Solicitações</h4>
          {myRequests.length === 0 ? (
            <p className="text-center text-slate-400 py-4 text-sm">
              Você ainda não fez nenhuma solicitação de permuta.
            </p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
              {myRequests.map((request) => (
                <div key={request.id} className="p-3 bg-slate-700/30 rounded-lg flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-sm text-white truncate">{request.target?.name}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {request.requester_shift?.shift_date && 
                        format(parseISO(request.requester_shift.shift_date), "dd/MM/yyyy", { locale: ptBR })
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {request.status === 'pending' && (
                      <Button size="sm" variant="ghost" onClick={() => openEditDialog(request)} className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setEditingRequest(null); resetForm(); } setShowEditDialog(open); }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Edit2 className="h-5 w-5 text-blue-400" />
              Editar Permuta
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Altere o plantão ou motivo da solicitação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Change Shift */}
            <div className="space-y-2">
              <Label className="text-slate-300">Alterar Plantão</Label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione outro plantão (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 max-h-[200px]">
                  {myShifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {format(parseISO(shift.shift_date), "dd/MM/yyyy (EEE)", { locale: ptBR })} • {shift.start_time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason Templates */}
            <div className="space-y-2">
              <Label className="text-slate-300">Modelo de Motivo</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Escolha um modelo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {REASON_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label className="text-slate-300">Motivo</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo..."
                className="bg-slate-700 border-slate-600 text-white resize-none"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="border-slate-600 text-slate-300">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Voltar
            </Button>
            <Button onClick={updateSwapRequest} disabled={isSubmitting} className="bg-blue-500 hover:bg-blue-600 text-white">
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
