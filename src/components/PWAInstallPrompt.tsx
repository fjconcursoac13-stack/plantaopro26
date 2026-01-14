import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Download, 
  X, 
  Smartphone, 
  Share, 
  Plus, 
  CheckCircle2,
  Zap,
  Bell,
  Wifi
} from 'lucide-react';
import { toast } from 'sonner';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isIOS, promptInstall, dismissInstallPrompt } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  useEffect(() => {
    // Show banner after a short delay if installable
    if (isInstallable || (isIOS && !isInstalled)) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isIOS, isInstalled]);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSDialog(true);
      return;
    }

    const success = await promptInstall();
    if (success) {
      toast.success('App instalado com sucesso!', {
        description: 'O PlantãoPro foi adicionado à sua tela inicial.',
      });
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    setShowBanner(false);
  };

  if (isInstalled || !showBanner) {
    return null;
  }

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-fade-in">
        <Card className="bg-gradient-to-r from-slate-800 via-slate-800/95 to-amber-900/30 border-amber-500/30 shadow-2xl shadow-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* App Icon */}
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                <Smartphone className="h-7 w-7 text-black" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-lg">
                  Instalar PlantãoPro
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Adicione à tela inicial para acesso rápido e offline
                </p>
                
                {/* Benefits */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                    <Zap className="h-3 w-3" />
                    Rápido
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-green-400">
                    <Bell className="h-3 w-3" />
                    Notificações
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-blue-400">
                    <Wifi className="h-3 w-3" />
                    Offline
                  </span>
                </div>
              </div>
              
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Action Button */}
            <Button
              onClick={handleInstall}
              className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              <Download className="h-4 w-4 mr-2" />
              Instalar Agora
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* iOS Install Instructions Dialog */}
      <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-amber-500" />
              Instalar no iPhone/iPad
            </DialogTitle>
            <DialogDescription>
              Siga os passos abaixo para instalar o app
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-amber-400 font-bold">1</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">
                  Toque no botão de Compartilhar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Procure o ícone <Share className="h-3 w-3 inline-block mx-1" /> na barra do Safari
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-amber-400 font-bold">2</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">
                  Role e toque em "Adicionar à Tela de Início"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Procure a opção com o ícone <Plus className="h-3 w-3 inline-block mx-1" />
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">
                  Confirme tocando em "Adicionar"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  O app aparecerá na sua tela inicial
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowIOSDialog(false)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
