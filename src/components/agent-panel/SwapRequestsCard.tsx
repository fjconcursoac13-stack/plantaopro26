import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowRightLeft, Plus, Loader2, Check, X, Clock, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  requester?: { name: string };
  target?: { name: string };
  requester_shift?: { shift_date: string };
  target_shift?: { shift_date: string };
}

interface AgentShift {
  id: string;
  shift_date: string;
  start_time: string;
}

interface TeamAgent {
  id: string;
  name: string;
}

export function SwapRequestsCard({ agentId, unitId, team }: SwapRequestsCardProps) {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [myShifts, setMyShifts] = useState<AgentShift[]>([]);
  const [teamAgents, setTeamAgents] = useState<TeamAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [agentId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch swap requests - using any for new tables
      const { data: requests, error: requestsError } = await (supabase as any)
        .from('shift_swaps')
        .select(`
          *,
          requester:agents!requester_id(name),
          target:agents!target_id(name),
          requester_shift:agent_shifts!requester_shift_id(shift_date),
          target_shift:agent_shifts!target_shift_id(shift_date)
        `)
        .or(`requester_id.eq.${agentId},target_id.eq.${agentId}`)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setSwapRequests((requests || []) as SwapRequest[]);

      // Fetch my future shifts
      const today = new Date().toISOString().split('T')[0];
      const { data: shifts, error: shiftsError } = await (supabase as any)
        .from('agent_shifts')
        .select('id, shift_date, start_time')
        .eq('agent_id', agentId)
        .gte('shift_date', today)
        .order('shift_date')
        .limit(20);

      if (shiftsError) throw shiftsError;
      setMyShifts((shifts || []) as AgentShift[]);

      // Fetch team agents
      if (unitId) {
        const { data: agents, error: agentsError } = await supabase
          .from('agents')
          .select('id, name')
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
  };

  const createSwapRequest = async () => {
    if (!selectedShift || !selectedAgent) {
      toast.error('Selecione o plantão e o agente');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create swap request
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
      const { error: notifError } = await (supabase as any)
        .from('notifications')
        .insert({
          agent_id: selectedAgent,
          type: 'swap',
          title: 'Nova solicitação de permuta',
          content: reason || 'Você recebeu uma solicitação de permuta de plantão'
        });

      if (notifError) console.error('Error creating notification:', notifError);

      toast.success('Solicitação de permuta enviada!');
      setShowNewRequest(false);
      setSelectedShift('');
      setSelectedAgent('');
      setReason('');
      fetchData();
    } catch (error) {
      console.error('Error creating swap request:', error);
      toast.error('Erro ao enviar solicitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const respondToRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await (supabase as any)
        .from('shift_swaps')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;

      // Find the request to notify the requester
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

  const pendingForMe = swapRequests.filter(
    r => r.target_id === agentId && r.status === 'pending'
  );
  const myRequests = swapRequests.filter(r => r.requester_id === agentId);

  return (
    <Card className="card-night-orange bg-gradient-to-br from-[hsl(222,60%,3%)] via-[hsl(222,55%,5%)] to-[hsl(25,40%,8%)] border-3 border-orange-500/50 overflow-hidden transition-all duration-300 hover:border-orange-400/70 group relative">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader className="pb-4 relative">
        <div className="flex items-center justify-between">
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
          <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-2 border-orange-500/50 text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-400/70 transition-all duration-200 font-semibold">
                <Plus className="h-4 w-4 mr-1.5" />
                Nova Permuta
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle>Solicitar Permuta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Meu Plantão</Label>
                  <Select value={selectedShift} onValueChange={setSelectedShift}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue placeholder="Selecione o plantão" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {myShifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {format(parseISO(shift.shift_date), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Permutar com</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue placeholder="Selecione o agente" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {teamAgents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Descreva o motivo da permuta..."
                    className="bg-slate-700 border-slate-600"
                  />
                </div>

                <Button
                  onClick={createSwapRequest}
                  disabled={!selectedShift || !selectedAgent || isSubmitting}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Solicitar Permuta'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                <div
                  key={request.id}
                  className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-white">
                        <span className="font-medium">{request.requester?.name}</span> quer permutar
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Plantão: {request.requester_shift?.shift_date && 
                          format(parseISO(request.requester_shift.shift_date), "dd/MM/yyyy", { locale: ptBR })
                        }
                      </p>
                      {request.reason && (
                        <p className="text-xs text-slate-300 mt-1">"{request.reason}"</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => respondToRequest(request.id, 'accepted')}
                        className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => respondToRequest(request.id, 'rejected')}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
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
            <div className="space-y-2">
              {myRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-3 bg-slate-700/30 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-white">{request.target?.name}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {request.requester_shift?.shift_date && 
                        format(parseISO(request.requester_shift.shift_date), "dd/MM/yyyy", { locale: ptBR })
                      }
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
