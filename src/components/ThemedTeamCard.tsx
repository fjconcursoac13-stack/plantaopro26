import { useState, useRef, MouseEvent, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';
import { Shield, Sword, Target, Users, LucideIcon, Radio, Zap, Star } from 'lucide-react';

interface ThemedTeamCardProps {
  team: string;
  selected?: boolean;
  onClick: () => void;
}

interface TeamThemeConfig {
  icon: LucideIcon;
  gradient: string;
  textColor: string;
  borderColor: string;
  glowColor: string;
  accentColor: string;
  description: string;
  slogan: string;
}

const teamConfigs: Record<string, TeamThemeConfig> = {
  ALFA: {
    icon: Shield,
    gradient: 'from-blue-500 via-blue-600 to-blue-800',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/50',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    accentColor: 'blue',
    description: 'Primeira Linha de Defesa',
    slogan: 'Proteção & Vigilância',
  },
  BRAVO: {
    icon: Sword,
    gradient: 'from-red-500 via-red-600 to-red-800',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/50',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    accentColor: 'red',
    description: 'Força de Resposta Rápida',
    slogan: 'Ação & Determinação',
  },
  CHARLIE: {
    icon: Target,
    gradient: 'from-emerald-500 via-emerald-600 to-emerald-800',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    accentColor: 'emerald',
    description: 'Operações Especializadas',
    slogan: 'Precisão & Eficiência',
  },
  DELTA: {
    icon: Users,
    gradient: 'from-violet-500 via-violet-600 to-violet-800',
    textColor: 'text-violet-400',
    borderColor: 'border-violet-500/50',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    accentColor: 'violet',
    description: 'Suporte e Coordenação',
    slogan: 'União & Estratégia',
  },
};

// 3D Tilt Hook
function use3DTilt() {
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg)');
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 12;
    const rotateY = (centerX - x) / 12;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`);
    setGlare({ 
      x: (x / rect.width) * 100, 
      y: (y / rect.height) * 100,
      opacity: 0.15
    });
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlare({ x: 50, y: 50, opacity: 0 });
  };

  return { ref, transform, glare, handleMouseMove, handleMouseLeave };
}

export function ThemedTeamCard({ team, onClick }: ThemedTeamCardProps) {
  const { playSound } = useSoundEffects();
  const { theme } = useTheme();
  const { ref, transform, glare, handleMouseMove, handleMouseLeave } = use3DTilt();
  const config = teamConfigs[team] || teamConfigs.ALFA;
  const Icon = config.icon;
  const hasPlayedHover = useRef(false);

  const handleClick = () => {
    playSound('card-select');
    onClick();
  };

  const handleMouseEnterCard = useCallback(() => {
    if (!hasPlayedHover.current) {
      playSound('hover');
      hasPlayedHover.current = true;
    }
  }, [playSound]);

  const handleMouseLeaveCard = useCallback(() => {
    hasPlayedHover.current = false;
    handleMouseLeave();
  }, [handleMouseLeave]);

  return (
    <div 
      ref={ref}
      onClick={handleClick}
      onMouseEnter={handleMouseEnterCard}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeaveCard}
      className="w-full cursor-pointer transition-all duration-300 ease-out group"
      style={{ transform, transformStyle: 'preserve-3d' }}
    >
      <div className="relative">
        {/* Animated glow ring on hover */}
        <div 
          className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md"
          style={{ background: `linear-gradient(135deg, ${config.glowColor}, transparent, ${config.glowColor})` }}
        />
        
        {/* Pulsing outer glow */}
        <div 
          className="absolute -inset-2 rounded-xl opacity-0 group-hover:opacity-60 transition-opacity duration-700 blur-xl animate-pulse"
          style={{ 
            background: config.glowColor,
            animationDuration: '2s',
          }}
        />
        
        {/* Glare effect */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300 rounded-xl"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}) 0%, transparent 60%)`,
          }}
        />
        
        {/* Main Card */}
        <div 
          className={cn(
            "relative overflow-hidden rounded-xl backdrop-blur-sm",
            "bg-gradient-to-br from-slate-800/95 via-slate-850/95 to-slate-900/98",
            "border-2 transition-all duration-300",
            config.borderColor,
            "group-hover:border-opacity-100 group-hover:shadow-xl",
          )}
        >
          {/* Top gradient stripe */}
          <div className={cn("h-1 md:h-1.5 w-full bg-gradient-to-r", config.gradient)} />
          
          {/* Animated scan line */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div 
              className="absolute w-full h-12 -translate-y-full animate-scan"
              style={{
                background: `linear-gradient(180deg, transparent 0%, ${config.glowColor} 50%, transparent 100%)`,
                animationDuration: '2s',
              }}
            />
          </div>
          
          {/* Corner accents */}
          <div className={cn("absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 transition-colors", config.borderColor, "group-hover:border-opacity-100")} />
          <div className={cn("absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 transition-colors", config.borderColor, "group-hover:border-opacity-100")} />
          <div className={cn("absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 transition-colors", config.borderColor, "group-hover:border-opacity-100")} />
          <div className={cn("absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 transition-colors", config.borderColor, "group-hover:border-opacity-100")} />
          
          {/* Status dots */}
          <div className="absolute top-3 right-3 flex gap-1">
            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
            <div className="w-1 h-1 rounded-full bg-green-500/50 animate-pulse" style={{ animationDelay: '0.3s' }} />
          </div>
          
          <div className="p-4 md:p-5 relative">
            <div className="flex flex-col items-center" style={{ transform: 'translateZ(30px)' }}>
              {/* Icon container with animated rings */}
              <div className="relative mb-3 md:mb-4">
                {/* Outer ring animation */}
                <div className={cn(
                  "absolute -inset-2 rounded-full border opacity-30 group-hover:opacity-60 transition-opacity animate-[spin_10s_linear_infinite]",
                  config.borderColor
                )}>
                  <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r", config.gradient)} />
                </div>
                
                {/* Icon background */}
                <div 
                  className={cn(
                    "relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br shadow-xl",
                    config.gradient,
                    "border-2 border-white/20 group-hover:border-white/40 transition-all duration-300"
                  )}
                >
                  <Icon className="h-6 w-6 md:h-7 md:w-7 text-white drop-shadow-lg" />
                  
                  {/* Inner glow */}
                  <div className="absolute inset-0 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors" />
                </div>
                
                {/* Status indicator with glow */}
                <div className="absolute -bottom-0.5 -right-0.5">
                  <div className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-green-500 border-2 border-slate-800 shadow-lg shadow-green-500/50 animate-pulse" />
                </div>
              </div>
              
              {/* Team identifier */}
              <div className="flex items-center gap-1.5 mb-1">
                <Star className={cn("h-2.5 w-2.5", config.textColor)} />
                <h3 className={cn(
                  "text-base md:text-lg font-black tracking-[0.2em]",
                  config.textColor
                )}>
                  {team}
                </h3>
                <Star className={cn("h-2.5 w-2.5", config.textColor)} />
              </div>
              
              {/* Description */}
              <p className="text-slate-300 text-[9px] md:text-[10px] text-center font-semibold tracking-wider mb-1">
                {config.description}
              </p>
              
              {/* Slogan */}
              <p className={cn("text-[8px] md:text-[9px] text-center font-medium tracking-widest opacity-80", config.textColor)}>
                {config.slogan}
              </p>
              
              {/* Action button */}
              <div className="mt-3 md:mt-4 w-full">
                <div className={cn(
                  "flex items-center justify-center gap-2 px-3 py-2 md:py-2.5 rounded-lg",
                  "bg-gradient-to-r from-slate-700/80 to-slate-800/80",
                  "border transition-all duration-300",
                  config.borderColor,
                  "group-hover:from-slate-600/80 group-hover:to-slate-700/80",
                  "group-hover:shadow-lg"
                )}>
                  <Radio className="w-3 h-3 text-green-400 animate-pulse" />
                  <span className="text-[9px] md:text-[10px] font-bold text-white tracking-[0.15em] uppercase">
                    Acessar Sistema
                  </span>
                  <Zap className={cn("w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity", config.textColor)} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom accent line */}
          <div className={cn(
            "h-0.5 w-full bg-gradient-to-r opacity-50 group-hover:opacity-100 transition-opacity",
            config.gradient
          )} />
        </div>
      </div>
    </div>
  );
}
