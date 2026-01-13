import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Calendar as CalendarIcon, Check, X, Clock, Ban } from 'lucide-react';
import { format, addMonths, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface LicenseManagementDialogProps {
  agentId: string;
  agentName: string;
  currentStatus?: string;
  currentExpiry?: string | null;
  currentNotes?: string | null;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

const licenseStatuses = [
  { value: 'active', label: 'Ativo', icon: Check, color: 'text-green-500' },
  { value: 'expired', label: 'Expirado', icon: Clock, color: 'text-yellow-500' },
  { value: 'blocked', label: 'Bloqueado', icon: Ban, color: 'text-destructive' },
  { value: 'pending', label: 'Pendente', icon: Clock, color: 'text-blue-500' },
];

export function LicenseManagementDialog({
  agentId,
  agentName,
  currentStatus = 'active',
  currentExpiry,
  currentNotes,
  onSuccess,
  trigger,
}: LicenseManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(
    currentExpiry ? new Date(currentExpiry) : undefined
  );
  const [notes, setNotes] = useState(currentNotes || '');
  const { toast } = useToast();

  useEffect(() => {
    setStatus(currentStatus);
    setExpiryDate(currentExpiry ? new Date(currentExpiry) : undefined);
    setNotes(currentNotes || '');
  }, [currentStatus, currentExpiry, currentNotes, open]);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const { error } = await (supabase as any)
        .from('agents')
        .update({
          license_status: status,
          license_expires_at: expiryDate?.toISOString() || null,
          license_notes: notes || null,
        })
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: 'Licença atualizada',
        description: `A licença de ${agentName} foi atualizada com sucesso.`,
      });

      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating license:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a licença.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickRenew = (months: number) => {
    const baseDate = expiryDate && expiryDate > new Date() ? expiryDate : new Date();
    setExpiryDate(addMonths(baseDate, months));
    setStatus('active');
  };

  const renewOneYear = () => {
    const baseDate = expiryDate && expiryDate > new Date() ? expiryDate : new Date();
    setExpiryDate(addYears(baseDate, 1));
    setStatus('active');
  };

  const getStatusBadge = (statusValue: string) => {
    const statusInfo = licenseStatuses.find(s => s.value === statusValue);
    if (!statusInfo) return null;
    
    const Icon = statusInfo.icon;
    return (
      <Badge variant={statusValue === 'active' ? 'default' : statusValue === 'blocked' ? 'destructive' : 'secondary'}>
        <Icon className={cn('h-3 w-3 mr-1', statusInfo.color)} />
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <KeyRound className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Gerenciar Licença
          </DialogTitle>
          <DialogDescription>
            Configure a licença de <strong>{agentName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Status atual:</span>
            {getStatusBadge(currentStatus)}
          </div>

          {/* Status Select */}
          <div className="space-y-2">
            <Label>Novo Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {licenseStatuses.map((s) => {
                  const Icon = s.icon;
                  return (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', s.color)} />
                        {s.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label>Data de Expiração</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal bg-input',
                    !expiryDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiryDate ? format(expiryDate, 'PPP', { locale: ptBR }) : 'Sem data definida'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                <Calendar
                  mode="single"
                  selected={expiryDate}
                  onSelect={setExpiryDate}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Quick Renewal Buttons */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Renovação rápida</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => quickRenew(1)}>
                +1 Mês
              </Button>
              <Button variant="outline" size="sm" onClick={() => quickRenew(3)}>
                +3 Meses
              </Button>
              <Button variant="outline" size="sm" onClick={() => quickRenew(6)}>
                +6 Meses
              </Button>
              <Button variant="outline" size="sm" onClick={renewOneYear}>
                +1 Ano
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExpiryDate(undefined)}>
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas sobre a licença..."
              className="bg-input resize-none"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
