import { useState, useRef, MouseEvent } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';
import { Shield, Sword, Target, Users, LucideIcon } from 'lucide-react';

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
  description: string;
}

const teamConfigs: Record<string, TeamThemeConfig> = {
  ALFA: {
    icon: Shield,
    gradient: 'from-blue-600 via-blue-700 to-blue-900',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    glowColor: 'rgba(59, 130, 246, 0.3)',
    description: 'Primeira Linha de Defesa',
  },
  BRAVO: {
    icon: Sword,
    gradient: 'from-red-600 via-red-700 to-red-900',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/40',
    glowColor: 'rgba(239, 68, 68, 0.3)',
    description: 'Força de Resposta Rápida',
  },
  CHARLIE: {
    icon: Target,
    gradient: 'from-emerald-600 via-emerald-700 to-emerald-900',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    glowColor: 'rgba(16, 185, 129, 0.3)',
    description: 'Operações Especializadas',
  },
  DELTA: {
    icon: Users,
    gradient: 'from-violet-600 via-violet-700 to-violet-900',
    textColor: 'text-violet-400',
    borderColor: 'border-violet-500/40',
    glowColor: 'rgba(139, 92, 246, 0.3)',
    description: 'Suporte e Coordenação',
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
    
    const rotateX = (y - centerY) / 15;
    const rotateY = (centerX - x) / 15;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    setGlare({ 
      x: (x / rect.width) * 100, 
      y: (y / rect.height) * 100,
      opacity: 0.1
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
  const { ref, transform, glare, handleMouseMove, handleMouseLeave } = use3DTilt();
  const config = teamConfigs[team] || teamConfigs.ALFA;
  const Icon = config.icon;

  const handleClick = () => {
    playSound('click');
    onClick();
  };

  return (
    <div 
      ref={ref}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full cursor-pointer transition-all duration-300 ease-out group"
      style={{ transform, transformStyle: 'preserve-3d' }}
    >
      <div className="relative">
        {/* Glow effect on hover */}
        <div 
          className="absolute -inset-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
          style={{ background: config.glowColor }}
        />
        
        {/* Glare effect */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300 rounded-lg"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}) 0%, transparent 60%)`,
          }}
        />
        
        {/* Main Card */}
        <div 
          className={cn(
            "relative bg-gradient-to-b from-slate-800/95 via-slate-850/95 to-slate-900/95",
            "border-2 rounded-lg",
            config.borderColor,
            "group-hover:border-opacity-80",
            "transition-all duration-300",
            "overflow-hidden backdrop-blur-sm"
          )}
        >
          {/* Top security stripe */}
          <div className={cn("h-0.5 md:h-1 w-full bg-gradient-to-r", config.gradient)} />
          
          {/* Scan line effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-30"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
                animation: 'scan 2s linear infinite',
              }}
            />
          </div>
          
          {/* Corner brackets - Smaller on mobile */}
          <div className="absolute top-1 left-1 md:top-2 md:left-2 w-2 h-2 md:w-3 md:h-3 border-l border-t md:border-l-2 md:border-t-2 border-slate-500/50" />
          <div className="absolute top-1 right-1 md:top-2 md:right-2 w-2 h-2 md:w-3 md:h-3 border-r border-t md:border-r-2 md:border-t-2 border-slate-500/50" />
          <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 w-2 h-2 md:w-3 md:h-3 border-l border-b md:border-l-2 md:border-b-2 border-slate-500/50" />
          <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 w-2 h-2 md:w-3 md:h-3 border-r border-b md:border-r-2 md:border-b-2 border-slate-500/50" />
          
          <div className="p-3 md:p-4 relative">
            <div className="flex flex-col items-center" style={{ transform: 'translateZ(20px)' }}>
              {/* Icon container - Smaller on mobile */}
              <div className="relative mb-2 md:mb-3">
                <div 
                  className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br", config.gradient,
                    "shadow-lg border border-white/10 md:border-2"
                  )}
                >
                  <Icon className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow-md" />
                </div>
                
                {/* Status indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500 border border-slate-800 md:border-2 animate-pulse" />
              </div>
              
              {/* Team name */}
              <h3 className={cn(
                "text-sm md:text-base font-black tracking-[0.15em] mb-0.5",
                config.textColor
              )}>
                {team}
              </h3>
              
              {/* Description - Hidden on very small screens */}
              <p className="text-slate-400 text-[8px] md:text-[10px] text-center font-medium tracking-wide hidden xs:block">
                {config.description}
              </p>
              
              {/* Action indicator - Compact */}
              <div className="mt-2 md:mt-3 flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-slate-700/50 rounded border border-slate-600/50 group-hover:border-slate-500 group-hover:bg-slate-700/70 transition-all">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[8px] md:text-[9px] font-semibold text-slate-300 tracking-widest uppercase">
                  Entrar
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
