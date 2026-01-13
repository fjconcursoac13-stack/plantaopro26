import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowRightLeft, Check, X, Loader2, History, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TransferRequest {
  id: string;
  agent_id: string;
  from_unit_id: string;
  to_unit_id: string;
  from_team: string;
  to_team: string;
  reason: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  agent: {
    name: string;
    cpf: string | null;
    matricula: string | null;
  };
  from_unit: {
    name: string;
    municipality: string;
  };
  to_unit: {
    name: string;
    municipality: string;
  };
}

interface TransferApprovalPanelProps {
  showHistory?: boolean;
}

export function TransferApprovalPanel({ showHistory = false }: TransferApprovalPanelProps) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [showHistory]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('transfer_requests')
        .select(`
          *,
          agent:agents(name, cpf, matricula),
          from_unit:units!transfer_requests_from_unit_id_fkey(name, municipality),
          to_unit:units!transfer_requests_to_unit_id_fkey(name, municipality)
        `)
        .order('created_at', { ascending: false });

      if (!showHistory) {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests((data as unknown as TransferRequest[]) || []);
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as solicitações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setProcessing(true);
    try {
      const newStatus = actionType === 'approve' ? 'approved' : 'rejected';

      // Update the transfer request
      const { error: updateError } = await supabase
        .from('transfer_requests')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'Admin',
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // If approved, update the agent's unit and team
      if (actionType === 'approve') {
        const { error: agentError } = await supabase
          .from('agents')
          .update({
            unit_id: selectedRequest.to_unit_id,
            team: selectedRequest.to_team,
          })
          .eq('id', selectedRequest.agent_id);

        if (agentError) throw agentError;
      }

      toast({
        title: actionType === 'approve' ? 'Transferência Aprovada' : 'Transferência Rejeitada',
        description: actionType === 'approve' 
          ? 'O agente foi transferido com sucesso.' 
          : 'A solicitação foi rejeitada.',
      });

      setSelectedRequest(null);
      setActionType(null);
      setNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error processing transfer:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('transfer_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Excluído',
        description: 'Solicitação de transferência excluída.',
      });

      fetchRequests();
    } catch (error) {
      console.error('Error deleting transfer request:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a solicitação.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Aprovada</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card className="glass glass-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {showHistory ? (
              <>
                <History className="h-5 w-5 text-primary" />
                Histórico de Transferências
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Solicitações de Transferência
              </>
            )}
          </CardTitle>
          <CardDescription>
            {showHistory 
              ? 'Histórico completo de solicitações de transferência'
              : 'Aprovar ou rejeitar solicitações pendentes'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {showHistory 
                ? 'Nenhuma transferência no histórico'
                : 'Nenhuma solicitação pendente'
              }
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Agente</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  {!showHistory && <TableHead className="w-32">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id} className="border-border">
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.agent?.name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                          Mat: {request.agent?.matricula || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{request.from_unit?.name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                          {request.from_unit?.municipality} - {request.from_team}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{request.to_unit?.name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                          {request.to_unit?.municipality} - {request.to_team}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    {!showHistory && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType('approve');
                            }}
                            title="Aprovar transferência"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType('reject');
                            }}
                            title="Negar transferência"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-100"
                            onClick={() => handleDeleteRequest(request.id)}
                            title="Excluir solicitação"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
        setNotes('');
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Aprovar Transferência' : 'Rejeitar Transferência'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Ao aprovar, o agente será transferido imediatamente.'
                : 'Ao rejeitar, a solicitação será arquivada.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p><strong>Agente:</strong> {selectedRequest.agent?.name}</p>
                <p><strong>De:</strong> {selectedRequest.from_unit?.name} - {selectedRequest.from_team}</p>
                <p><strong>Para:</strong> {selectedRequest.to_unit?.name} - {selectedRequest.to_team}</p>
                {selectedRequest.reason && (
                  <p><strong>Motivo:</strong> {selectedRequest.reason}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder="Adicione observações sobre esta decisão..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-input"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setActionType(null);
                setNotes('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : actionType === 'approve' ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Aprovar
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Rejeitar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
