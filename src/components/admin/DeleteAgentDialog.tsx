import { useState } from 'react';
import { deleteAgentCompletely } from '@/lib/deleteAgent';
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
      // Use centralized deletion function
      const result = await deleteAgentCompletely(agentId);

      if (!result.success) {
        throw new Error(result.error);
      }

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
