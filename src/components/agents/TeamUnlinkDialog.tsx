import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserMinus, ArrowRightLeft } from 'lucide-react';

interface TeamUnlinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  currentTeam: string | null;
  currentUnitName: string | null;
  onSuccess: () => void;
  onRequestTransfer: () => void;
}

export function TeamUnlinkDialog({
  open,
  onOpenChange,
  agentId,
  agentName,
  currentTeam,
  currentUnitName,
  onSuccess,
  onRequestTransfer,
}: TeamUnlinkDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();

  const handleUnlink = async () => {
    setIsSubmitting(true);

    try {
      // 1) Delete everything while authenticated (RLS)
      const result = await deleteAgentCompletely(agentId);
      if (!result.success) {
        console.error('Error deleting agent:', result.error);
      }

      // 2) Sign out after deletion
      await supabase.auth.signOut();

      toast({
        title: 'Conta Excluída',
        description: `Todos os dados de ${agentName} foram excluídos permanentemente.`,
      });

      setShowConfirmation(false);
      onOpenChange(false);

      // Force redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('Error removing agent:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a conta. Tente novamente.',
        variant: 'destructive',
      });
      // Sign out anyway for safety
      await supabase.auth.signOut();
      window.location.href = '/';
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferRequest = () => {
    onOpenChange(false);
    onRequestTransfer();
  };

  if (showConfirmation) {
    return (
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              ⚠️ ATENÇÃO: Exclusão Permanente
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Você está prestes a <strong className="text-destructive">EXCLUIR PERMANENTEMENTE</strong> sua conta e todos os seus dados:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Histórico de plantões</li>
                  <li>Banco de horas</li>
                  <li>Solicitações de folga</li>
                  <li>Eventos e configurações</li>
                  <li>Mensagens e alertas</li>
                </ul>
                <p className="font-semibold text-destructive">
                  Esta ação NÃO pode ser desfeita!
                </p>
                <p>
                  Você será <strong>deslogado automaticamente</strong> após a exclusão.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Excluir Minha Conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>Gerenciar Equipe</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p className="mb-4">
                Você está na <strong>Equipe {currentTeam}</strong>
                {currentUnitName && <> - {currentUnitName}</>}
              </p>
              <p>O que deseja fazer?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex flex-col gap-3 py-4">
          <Button
            variant="outline"
            className="justify-start gap-3 h-auto py-4"
            onClick={handleTransferRequest}
          >
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-medium">Solicitar Transferência</div>
              <div className="text-xs text-muted-foreground">
                Transferir para outra equipe ou unidade
              </div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="justify-start gap-3 h-auto py-4 border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => setShowConfirmation(true)}
          >
            <UserMinus className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Excluir Minha Conta</div>
              <div className="text-xs opacity-80">
                Remove todos os dados e desloga
              </div>
            </div>
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
