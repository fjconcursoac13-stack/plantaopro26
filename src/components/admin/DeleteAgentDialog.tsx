import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';

interface DeleteAgentDialogProps {
  agentId: string;
  agentName: string;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function DeleteAgentDialog({ agentId, agentName, onSuccess, trigger }: DeleteAgentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // Delete all related data first (in order of dependencies)
      const tables = [
        'agent_shifts',
        'overtime_bank',
        'agent_events',
        'agent_leaves',
        'shift_alerts',
        'shift_planner_configs',
        'transfer_requests',
        'chat_room_members',
        'deleted_messages',
        'shifts',
        'access_logs',
        'payments',
      ];

      for (const table of tables) {
        const { error: tableError } = await supabase.from(table as any).delete().eq('agent_id', agentId);
        if (tableError) {
          console.warn(`Warning deleting from ${table}:`, tableError);
        }
      }

      // Delete user_roles if exists
      await supabase.from('user_roles').delete().eq('user_id', agentId);
      
      // Delete profile if exists
      await supabase.from('profiles').delete().eq('user_id', agentId);

      // Now PERMANENTLY delete the agent record (trigger will delete auth user)
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: 'Agente excluído',
        description: `${agentName} foi removido permanentemente do sistema.`,
      });

      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o agente. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">Excluir Agente Permanentemente</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você está prestes a excluir <strong className="text-foreground">{agentName}</strong> permanentemente.
            </p>
            <p className="text-destructive font-medium">
              Esta ação irá remover:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>Todos os plantões registrados</li>
              <li>Todo o banco de horas</li>
              <li>Histórico de eventos e férias</li>
              <li>Solicitações de transferência</li>
              <li>Mensagens e configurações</li>
            </ul>
            <p className="text-destructive font-bold pt-2">
              Esta ação NÃO pode ser desfeita!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Permanentemente
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
