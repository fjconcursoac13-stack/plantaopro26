import { useEffect, useState } from 'react';
import { Shield, Gift, Clock, CheckCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeTrialDialogProps {
  agentName: string;
  onClose: () => void;
}

export function WelcomeTrialDialog({ agentName, onClose }: WelcomeTrialDialogProps) {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(false);
  
  const AUTO_CLOSE_SECONDS = 15;

  useEffect(() => {
    // Fade in animation
    const fadeInTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Progress countdown
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (AUTO_CLOSE_SECONDS * 10));
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 100);

    // Auto close
    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, AUTO_CLOSE_SECONDS * 1000);

    return () => {
      clearTimeout(fadeInTimer);
      clearInterval(interval);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div 
        className={cn(
          "relative w-full max-w-md transform transition-all duration-500",
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        )}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 via-amber-600/20 to-amber-500/30 rounded-2xl blur-xl opacity-60" />
        
        <div className="relative bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 rounded-2xl border border-amber-500/40 overflow-hidden shadow-2xl">
          {/* Top accent stripe */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
          
          {/* Progress bar */}
          <div className="h-0.5 bg-slate-700">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-6 space-y-5">
            {/* Icon Header */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Gift className="h-8 w-8 text-slate-900" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-slate-800">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>

            {/* Welcome Text */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-white">
                Bem-vindo(a), {agentName.split(' ')[0]}! 🎉
              </h2>
              <p className="text-sm text-slate-300">
                Seu cadastro foi realizado com sucesso!
              </p>
            </div>

            {/* Trial Info Card */}
            <div className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent rounded-xl p-4 border border-green-500/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-400 text-sm">
                    🎁 Primeiro Mês GRÁTIS!
                  </h3>
                  <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                    Aproveite todos os recursos do sistema sem custo durante o primeiro mês.
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing Info */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Após o período gratuito</p>
                    <p className="text-lg font-bold text-white">R$ 20,00<span className="text-sm text-slate-400 font-normal">/mês</span></p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                Este valor ajuda a cobrir os custos de desenvolvimento e hospedagem, 
                mantendo o aplicativo funcionando e sempre atualizado para você.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Clock, label: 'Gestão de Escalas' },
                { icon: Shield, label: 'Banco de Horas' },
              ].map(({ icon: Icon, label }) => (
                <div 
                  key={label}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 rounded-lg border border-slate-700/50"
                >
                  <Icon className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[11px] text-slate-300 font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={handleClose}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-bold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 text-sm"
            >
              Começar a Usar
            </button>

            {/* Auto close note */}
            <p className="text-center text-[10px] text-slate-500">
              Esta tela fechará automaticamente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}