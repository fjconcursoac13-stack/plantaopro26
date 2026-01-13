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
import { Mail, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCPF } from '@/lib/validators';

export function ForgotPasswordDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'cpf' | 'success' | 'no-email'>('cpf');
  const [cpf, setCpf] = useState('');
  const [agentEmail, setAgentEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      toast({
        title: 'CPF Inválido',
        description: 'Digite um CPF válido com 11 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Check if agent exists and has email
      const { data: agent } = await supabase
        .from('agents')
        .select('email, name')
        .eq('cpf', cleanCpf)
        .maybeSingle();

      if (!agent) {
        toast({
          title: 'CPF não encontrado',
          description: 'Não existe agente cadastrado com este CPF.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!agent.email) {
        setStep('no-email');
        setLoading(false);
        return;
      }

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(agent.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      setAgentEmail(agent.email);
      setStep('success');
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar o email.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setStep('cpf');
      setCpf('');
      setAgentEmail(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="link" className="text-amber-400 hover:text-amber-300 p-0 h-auto text-sm">
          Esqueceu sua senha?
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Mail className="h-5 w-5 text-amber-400" />
            Recuperar Senha
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'cpf' && 'Digite seu CPF para recuperar o acesso'}
            {step === 'success' && 'Email enviado com sucesso!'}
            {step === 'no-email' && 'Sem email cadastrado'}
          </DialogDescription>
        </DialogHeader>

        {step === 'cpf' && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-slate-300">CPF</Label>
              <Input
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                className="bg-slate-700/50 border-slate-600 text-white text-center"
                maxLength={14}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Email de Recuperação
                </>
              )}
            </Button>
          </form>
        )}

        {step === 'success' && (
          <div className="space-y-4 pt-2 text-center">
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <div className="space-y-2">
              <p className="text-white font-medium">Email enviado!</p>
              <p className="text-slate-400 text-sm">
                Enviamos um link de recuperação para:
              </p>
              <p className="text-amber-400 font-mono text-sm">
                {agentEmail?.replace(/(.{3})(.*)(@.*)/, '$1***$3')}
              </p>
              <p className="text-slate-500 text-xs mt-4">
                Verifique sua caixa de entrada e spam.
              </p>
            </div>
            <Button
              onClick={handleClose}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white"
            >
              Fechar
            </Button>
          </div>
        )}

        {step === 'no-email' && (
          <div className="space-y-4 pt-2 text-center">
            <div className="w-16 h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="space-y-2">
              <p className="text-white font-medium">Sem email cadastrado</p>
              <p className="text-slate-400 text-sm">
                Este agente não possui email cadastrado no sistema.
              </p>
              <p className="text-slate-500 text-xs mt-4">
                Entre em contato com o administrador do sistema para redefinir sua senha.
              </p>
            </div>
            <Button
              onClick={handleClose}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white"
            >
              Entendi
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
