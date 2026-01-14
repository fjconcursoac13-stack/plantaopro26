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
        "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Modal */}
      <div 
        className={cn(
          "relative w-full max-w-lg transform transition-all duration-500",
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        )}
      >
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/40 via-amber-600/30 to-amber-500/40 rounded-3xl blur-2xl opacity-60 animate-pulse" />
        
        <div className="relative bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 rounded-2xl border border-amber-500/50 overflow-hidden shadow-2xl">
          {/* Top accent stripe */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
          
          {/* Progress bar with timer */}
          <div className="relative h-1 bg-slate-700">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
            <span className="absolute right-2 -top-0.5 text-[9px] text-slate-400 font-mono">
              {Math.ceil(progress / 100 * AUTO_CLOSE_SECONDS)}s
            </span>
          </div>

          <div className="p-6 space-y-4">
            {/* Icon Header */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/40 animate-pulse">
                  <Gift className="h-10 w-10 text-slate-900" />
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center border-2 border-slate-800 shadow-lg">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>

            {/* Welcome Text */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500">
                Bem-vindo(a), {agentName.split(' ')[0]}! 🎉
              </h2>
              <p className="text-sm text-slate-300">
                Seu cadastro no <span className="font-bold text-amber-400">Plantão Pro</span> foi realizado com sucesso!
              </p>
            </div>

            {/* App Description */}
            <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/40 rounded-xl p-4 border border-slate-600/50">
              <p className="text-center text-sm text-slate-200 leading-relaxed">
                <span className="font-bold text-amber-400">Plantão Pro</span> é um sistema completo de gestão de escalas 
                desenvolvido especialmente para <span className="font-semibold text-amber-300">agentes de segurança pública</span> do 
                <span className="font-semibold text-green-400"> ISE/ACRE</span>.
              </p>
            </div>

            {/* Trial Info Card */}
            <div className="bg-gradient-to-r from-green-500/15 via-green-500/10 to-emerald-500/5 rounded-xl p-4 border border-green-500/40 shadow-inner">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-green-500/30">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-green-400 text-base flex items-center gap-2">
                    🎁 Primeiro Mês GRÁTIS!
                  </h3>
                  <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                    Aproveite <span className="font-semibold text-white">todos os recursos</span> sem custo durante 30 dias.
                  </p>
                </div>
              </div>
            </div>

            {/* Animated Feature Showcase */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 overflow-hidden">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-3 text-center">
                Recursos Disponíveis
              </p>
              <div className="flex items-center justify-center gap-4 min-h-[60px]">
                <div 
                  key={currentFeature}
                  className="flex flex-col items-center gap-2 animate-fade-in"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/30">
                    <CurrentFeatureIcon className="h-7 w-7 text-amber-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-white text-sm">{features[currentFeature].label}</p>
                    <p className="text-slate-400 text-xs">{features[currentFeature].desc}</p>
                  </div>
                </div>
              </div>
              {/* Feature dots indicator */}
              <div className="flex justify-center gap-1.5 mt-3">
                {features.map((_, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all duration-300",
                      idx === currentFeature 
                        ? "w-4 bg-amber-500" 
                        : "bg-slate-600"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Pricing Info */}
            <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/40 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Shield className="h-6 w-6 text-slate-900" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Após o período gratuito</p>
                    <p className="text-2xl font-black text-white">R$ 20<span className="text-base text-slate-400 font-normal">,00/mês</span></p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Valor simbólico para cobrir custos de <span className="text-slate-300">desenvolvimento</span> e 
                <span className="text-slate-300"> hospedagem</span>, mantendo o app sempre atualizado.
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleClose}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:via-amber-500 hover:to-amber-600 text-slate-900 font-black rounded-xl transition-all duration-200 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 text-base tracking-wide hover:scale-[1.02] active:scale-[0.98]"
            >
              🚀 Começar a Usar
            </button>

            {/* Auto close note */}
            <p className="text-center text-[10px] text-slate-500">
              Toque em qualquer lugar ou aguarde para fechar automaticamente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}