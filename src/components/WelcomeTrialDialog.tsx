import { useEffect, useState } from 'react';
import { Shield, Gift, Clock, CheckCircle, Sparkles, Users, Calendar, MessageCircle, Bell, Smartphone, ArrowRightLeft, CalendarDays, Droplet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeTrialDialogProps {
  agentName: string;
  onClose: () => void;
}

export function WelcomeTrialDialog({ agentName, onClose }: WelcomeTrialDialogProps) {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  
  const AUTO_CLOSE_SECONDS = 20;

  const features = [
    { icon: Calendar, label: 'Escala Automática', desc: 'Geração e gestão de plantões 24x72' },
    { icon: Clock, label: 'Banco de Horas', desc: 'Controle preciso de horas extras' },
    { icon: Users, label: 'Equipe', desc: 'Visualize sua equipe e colegas' },
    { icon: MessageCircle, label: 'Chat Integrado', desc: 'Comunicação em tempo real' },
    { icon: ArrowRightLeft, label: 'Permutas', desc: 'Solicite trocas de plantão' },
    { icon: CalendarDays, label: 'Agenda', desc: 'Organize compromissos pessoais' },
    { icon: Bell, label: 'Notificações', desc: 'Alertas de plantões e eventos' },
    { icon: Smartphone, label: 'PWA', desc: 'Instale como app no celular' },
  ];

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

    // Feature rotation
    const featureInterval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 2500);

    // Auto close
    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, AUTO_CLOSE_SECONDS * 1000);

    return () => {
      clearTimeout(fadeInTimer);
      clearInterval(interval);
      clearInterval(featureInterval);
      clearTimeout(closeTimer);
    };
  }, [onClose, features.length]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const CurrentFeatureIcon = features[currentFeature].icon;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 transition-all duration-300 overflow-hidden",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Modal - Adaptive to screen */}
      <div 
        className={cn(
          "relative w-full max-w-md transform transition-all duration-500 max-h-[100dvh] flex flex-col",
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        )}
      >
        {/* Glow effect - Hidden on mobile for performance */}
        <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/40 via-amber-600/30 to-amber-500/40 rounded-3xl blur-2xl opacity-60 animate-pulse hidden sm:block" />
        
        <div className="relative bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 rounded-xl sm:rounded-2xl border border-amber-500/50 overflow-hidden shadow-2xl flex flex-col max-h-[98dvh]">
          {/* Top accent stripe */}
          <div className="h-1 sm:h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 shrink-0" />
          
          {/* Progress bar with timer */}
          <div className="relative h-1 bg-slate-700 shrink-0">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
            <span className="absolute right-2 top-0.5 text-[8px] text-slate-400 font-mono">
              {Math.ceil(progress / 100 * AUTO_CLOSE_SECONDS)}s
            </span>
          </div>

          {/* Content - Compact layout */}
          <div className="p-3 sm:p-5 flex flex-col gap-2.5 sm:gap-3 flex-1 overflow-hidden">
            {/* Header Row - Icon + Welcome inline on mobile */}
            <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
              <div className="relative shrink-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Gift className="h-6 w-6 sm:h-8 sm:w-8 text-slate-900" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center border-2 border-slate-800">
                  <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                </div>
              </div>
              <div className="sm:text-center">
                <h2 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 leading-tight">
                  Bem-vindo(a), {agentName.split(' ')[0]}! 🎉
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  Cadastro no <span className="font-bold text-amber-400">Plantão Pro</span> realizado!
                </p>
              </div>
            </div>

            {/* App Description - Compact */}
            <div className="bg-slate-800/60 rounded-lg p-2.5 sm:p-3 border border-slate-600/50">
              <p className="text-center text-xs sm:text-sm text-slate-200 leading-snug">
                Sistema de gestão de escalas para <span className="font-semibold text-amber-300">agentes de segurança</span> do 
                <span className="font-semibold text-green-400"> ISE/ACRE</span>
              </p>
            </div>

            {/* Trial + Price Row - Side by side on mobile */}
            <div className="grid grid-cols-2 gap-2">
              {/* Trial Info */}
              <div className="bg-gradient-to-br from-green-500/15 to-emerald-500/5 rounded-lg p-2.5 border border-green-500/40">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                  <span className="font-bold text-green-400 text-xs">1º Mês GRÁTIS!</span>
                </div>
                <p className="text-slate-300 text-[10px] leading-snug">
                  Todos os recursos sem custo por 30 dias
                </p>
              </div>

              {/* Pricing Info */}
              <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-600">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-[10px] text-slate-400">Depois</span>
                </div>
                <p className="text-lg font-black text-white leading-none">
                  R$ 20<span className="text-xs text-slate-400 font-normal">/mês</span>
                </p>
              </div>
            </div>

            {/* Animated Feature Showcase - Compact */}
            <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700">
              <div className="flex items-center gap-3">
                <div 
                  key={currentFeature}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/30 shrink-0"
                >
                  <CurrentFeatureIcon className="h-5 w-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-xs truncate">{features[currentFeature].label}</p>
                  <p className="text-slate-400 text-[10px] truncate">{features[currentFeature].desc}</p>
                </div>
              </div>
              {/* Feature dots indicator */}
              <div className="flex justify-center gap-1 mt-2">
                {features.map((_, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      idx === currentFeature 
                        ? "w-3 bg-amber-500" 
                        : "w-1 bg-slate-600"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleClose}
              className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:via-amber-500 hover:to-amber-600 text-slate-900 font-black rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/30 text-sm sm:text-base tracking-wide active:scale-[0.98] shrink-0"
            >
              🚀 Começar a Usar
            </button>

            {/* Auto close note */}
            <p className="text-center text-[9px] text-slate-500 shrink-0">
              Toque para fechar ou aguarde {Math.ceil(progress / 100 * AUTO_CLOSE_SECONDS)}s
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}