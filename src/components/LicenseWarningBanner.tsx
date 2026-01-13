import { useState, useEffect } from 'react';
import { AlertTriangle, X, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface LicenseWarningBannerProps {
  licenseStatus: string;
  expiresAt: string | null;
  secondsUntilLogout: number;
  onDismiss?: () => void;
  onContactAdmin?: () => void;
}

export function LicenseWarningBanner({
  licenseStatus,
  expiresAt,
  secondsUntilLogout,
  onDismiss,
  onContactAdmin,
}: LicenseWarningBannerProps) {
  const [countdown, setCountdown] = useState(secondsUntilLogout);
  
  useEffect(() => {
    if (countdown <= 0) return;
    
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [countdown]);
  
  const progressValue = (countdown / secondsUntilLogout) * 100;
  
  const getStatusMessage = () => {
    switch (licenseStatus) {
      case 'blocked':
        return 'Sua licença foi bloqueada pelo administrador.';
      case 'expired':
        return 'Sua licença expirou.';
      case 'pending':
        return 'Sua licença está pendente de aprovação.';
      default:
        return expiresAt 
          ? `Sua licença expirou em ${new Date(expiresAt).toLocaleDateString('pt-BR')}.`
          : 'Sua licença está inválida.';
    }
  };
  
  const getStatusColor = () => {
    switch (licenseStatus) {
      case 'blocked':
        return 'bg-red-600';
      case 'expired':
        return 'bg-orange-600';
      case 'pending':
        return 'bg-yellow-600';
      default:
        return 'bg-red-600';
    }
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${getStatusColor()} text-white shadow-lg animate-fade-in`}>
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 bg-white/20 rounded-full">
            <AlertTriangle className="h-6 w-6" />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Aviso de Licença</h3>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={onDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <p className="text-sm opacity-90">
              {getStatusMessage()}
            </p>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>Você será desconectado automaticamente em:</span>
                <span className="font-mono font-bold">{countdown}s</span>
              </div>
              <Progress value={progressValue} className="h-2 bg-white/30" />
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={onContactAdmin}
              >
                <Phone className="h-4 w-4 mr-2" />
                Contatar Administrador
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={() => window.location.href = 'mailto:admin@plantaopro.app?subject=Renovação de Licença'}
              >
                <Mail className="h-4 w-4 mr-2" />
                Enviar E-mail
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
