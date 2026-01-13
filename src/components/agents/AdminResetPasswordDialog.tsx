import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Key, Loader2, Eye, EyeOff, Shield } from 'lucide-react';

interface AdminResetPasswordDialogProps {
  agentName: string;
  agentCpf: string;
  trigger?: React.ReactNode;
}

export function AdminResetPasswordDialog({ agentName, agentCpf, trigger }: AdminResetPasswordDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A confirmação da senha não confere.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get user email based on CPF
      const authEmail = `${agentCpf}@agent.plantaopro.com`;
      
      // Note: This requires admin privileges or a service role key
      // For now, we'll use the password reset flow via email
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast({
        title: 'Link Enviado!',
        description: `Um link de redefinição foi enviado para o email do agente ${agentName}.`,
      });

      setOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      
      // If email doesn't work, show manual reset option
      toast({
        title: 'Atenção',
        description: 'O agente não possui email válido. Informe a nova senha manualmente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Key className="h-4 w-4 mr-1" />
            Resetar Senha
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Resetar Senha do Agente
          </DialogTitle>
          <DialogDescription>
            Redefinir senha para: <span className="font-semibold text-foreground">{agentName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Um link de redefinição será enviado para o email do agente. 
              Se o agente não tiver email, a senha não poderá ser alterada por este método.
            </p>
          </div>

          <div className="space-y-2">
            <Label>CPF do Agente</Label>
            <Input
              value={agentCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
              disabled
              className="bg-muted font-mono"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Enviar Link de Redefinição
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
