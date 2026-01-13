import { useState, useRef, MouseEvent } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';
import { Shield, Sword, Target, Users, Crosshair, Radio, Cpu, Zap, Star, Anchor, Award, Crown, Hexagon, UserPlus } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface ThemedTeamCardProps {
  team: string;
  selected?: boolean;
  onClick: () => void;
  onRegisterClick?: () => void;
}

interface TeamThemeConfig {
  icon: LucideIcon;
  gradient: string;
  textColor: string;
  description: string;
  slogan: string;
  accentColor: string;
}

const getTeamConfigByTheme = (team: string, theme: string): TeamThemeConfig => {
  const configs: Record<string, Record<string, TeamThemeConfig>> = {
    tactical: {
      ALFA: {
        icon: Shield,
        gradient: 'from-blue-600 to-blue-900',
        textColor: 'text-blue-400',
        description: 'Primeira Linha de Defesa',
        slogan: 'Proteção e Vigilância',
        accentColor: '#3b82f6',
      },
      BRAVO: {
        icon: Sword,
        gradient: 'from-red-600 to-red-900',
        textColor: 'text-red-400',
        description: 'Força de Resposta Rápida',
        slogan: 'Ação e Determinação',
        accentColor: '#ef4444',
      },
      CHARLIE: {
        icon: Target,
        gradient: 'from-green-600 to-green-900',
        textColor: 'text-green-400',
        description: 'Operações Especializadas',
        slogan: 'Precisão e Eficiência',
        accentColor: '#22c55e',
      },
      DELTA: {
        icon: Users,
        gradient: 'from-purple-600 to-purple-900',
        textColor: 'text-purple-400',
        description: 'Suporte e Coordenação',
        slogan: 'União e Estratégia',
        accentColor: '#a855f7',
      },
    },
    military: {
      ALFA: {
        icon: Crosshair,
        gradient: 'from-olive-700 to-stone-900',
        textColor: 'text-green-500',
        description: 'Batalhão de Reconhecimento',
        slogan: 'Olhos na Escuridão',
        accentColor: '#84cc16',
      },
      BRAVO: {
        icon: Radio,
        gradient: 'from-amber-800 to-stone-900',
        textColor: 'text-amber-500',
        description: 'Comunicações Táticas',
        slogan: 'Conexão em Combate',
        accentColor: '#f59e0b',
      },
      CHARLIE: {
        icon: Anchor,
        gradient: 'from-teal-800 to-stone-900',
        textColor: 'text-teal-400',
        description: 'Operações Especiais',
        slogan: 'Força e Resistência',
        accentColor: '#14b8a6',
      },
      DELTA: {
        icon: Award,
        gradient: 'from-zinc-700 to-stone-900',
        textColor: 'text-gray-300',
        description: 'Comando Central',
        slogan: 'Liderança e Honra',
        accentColor: '#a1a1aa',
      },
    },
    cyber: {
      ALFA: {
        icon: Cpu,
        gradient: 'from-cyan-500 to-cyan-900',
        textColor: 'text-cyan-400',
        description: 'Núcleo de Processamento',
        slogan: 'Lógica e Precisão',
        accentColor: '#22d3ee',
      },
      BRAVO: {
        icon: Zap,
        gradient: 'from-violet-500 to-violet-900',
        textColor: 'text-violet-400',
        description: 'Matriz de Energia',
        slogan: 'Poder Infinito',
        accentColor: '#a78bfa',
      },
      CHARLIE: {
        icon: Hexagon,
        gradient: 'from-fuchsia-500 to-fuchsia-900',
        textColor: 'text-fuchsia-400',
        description: 'Firewall Neural',
        slogan: 'Defesa Absoluta',
        accentColor: '#e879f9',
      },
      DELTA: {
        icon: Star,
        gradient: 'from-emerald-500 to-emerald-900',
        textColor: 'text-emerald-400',
        description: 'Rede Principal',
        slogan: 'Conexão Total',
        accentColor: '#34d399',
      },
    },
    classic: {
      ALFA: {
        icon: Shield,
        gradient: 'from-blue-700 to-indigo-900',
        textColor: 'text-blue-300',
        description: 'Divisão Principal',
        slogan: 'Ordem e Proteção',
        accentColor: '#60a5fa',
      },
      BRAVO: {
        icon: Crown,
        gradient: 'from-amber-600 to-yellow-900',
        textColor: 'text-yellow-400',
        description: 'Guarda de Elite',
        slogan: 'Excelência Sempre',
        accentColor: '#fbbf24',
      },
      CHARLIE: {
        icon: Star,
        gradient: 'from-rose-600 to-red-900',
        textColor: 'text-rose-400',
        description: 'Força Tática',
        slogan: 'Coragem e Dever',
        accentColor: '#fb7185',
      },
      DELTA: {
        icon: Award,
        gradient: 'from-indigo-600 to-purple-900',
        textColor: 'text-indigo-300',
        description: 'Reserva Estratégica',
        slogan: 'Honra e Tradição',
        accentColor: '#818cf8',
      },
    },
  };

  return configs[theme]?.[team] || configs.tactical[team];
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
    
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`);
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

// TACTICAL THEME - Military Badge Style with Angular Design
function TacticalCard({ team, config, onClick, onRegisterClick }: { team: string; config: TeamThemeConfig; onClick: () => void; onRegisterClick?: () => void }) {
  const Icon = config.icon;
  const { ref, transform, glare, handleMouseMove, handleMouseLeave } = use3DTilt();
  
  const handleRegisterClick = (e: MouseEvent) => {
    e.stopPropagation();
    onRegisterClick?.();
  };
  
  return (
    <div 
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full cursor-pointer transition-all duration-300 ease-out"
      style={{ transform, transformStyle: 'preserve-3d' }}
    >
      <div className="relative">
        {/* Glare effect */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}) 0%, transparent 60%)`,
            clipPath: 'polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%)',
          }}
        />
        
        <div 
          className={cn(
            "relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
            "border-2 border-slate-600 hover:border-amber-500/70",
            "transition-colors duration-300",
            "overflow-hidden"
          )}
          style={{ clipPath: 'polygon(8% 0, 100% 0, 100% 92%, 92% 100%, 0 100%, 0 8%)' }}
        >
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-amber-500/50" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-amber-500/50" />
          
          <div className="p-5 relative">
            <div className="flex flex-col items-center" style={{ transform: 'translateZ(20px)' }}>
              {/* Hexagonal icon container */}
              <div className="relative mb-4">
                <div 
                  className={cn(
                    "w-20 h-20 flex items-center justify-center",
                    "bg-gradient-to-br", config.gradient
                  )}
                  style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                >
                  <Icon className="h-10 w-10 text-white drop-shadow-lg" />
                </div>
                <div className="absolute inset-[-4px] border-2 border-dashed border-amber-500/30 animate-spin-slow"
                  style={{ 
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    animation: 'spin 20s linear infinite'
                  }}
                />
              </div>
              
              <h3 className={cn("text-2xl font-black tracking-[0.3em]", config.textColor)}>
                {team}
              </h3>
              
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent my-3" />
              
              <p className="text-white/80 font-medium text-xs text-center">{config.description}</p>
              <p className="text-slate-500 text-[10px] italic mt-1">"{config.slogan}"</p>
              
              <div className="mt-4 flex flex-col gap-2 w-full">
                <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-600 hover:border-amber-500/50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">ACESSAR</span>
                </div>
                
                {onRegisterClick && (
                  <button
                    onClick={handleRegisterClick}
                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-green-600/20 border border-green-500/50 hover:bg-green-600/40 hover:border-green-400 transition-colors"
                  >
                    <UserPlus className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] font-bold text-green-400 tracking-wider">CADASTRAR</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// MILITARY THEME - Dog Tag Style
function MilitaryCard({ team, config, onClick, onRegisterClick }: { team: string; config: TeamThemeConfig; onClick: () => void; onRegisterClick?: () => void }) {
  const Icon = config.icon;
  const { ref, transform, glare, handleMouseMove, handleMouseLeave } = use3DTilt();
  
  const handleRegisterClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onRegisterClick?.();
  };
  
  return (
    <div 
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full cursor-pointer transition-all duration-300 ease-out"
      style={{ transform, transformStyle: 'preserve-3d' }}
    >
      <div className="relative">
        {/* Chain connector */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full border border-stone-500 bg-stone-700" />
          ))}
        </div>
        
        {/* Glare effect */}
        <div 
          className="absolute inset-0 mt-2 pointer-events-none z-10 transition-opacity duration-300 rounded-lg rounded-tl-3xl"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}) 0%, transparent 60%)`,
          }}
        />
        
        <div 
          className={cn(
            "relative mt-2 bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900",
            "border-2 border-stone-500 hover:border-green-600/70",
            "transition-colors duration-300 shadow-xl",
            "rounded-lg rounded-tl-3xl overflow-hidden"
          )}
        >
          <div className="absolute top-0 left-0 w-6 h-6 bg-stone-900 rounded-br-full border-r-2 border-b-2 border-stone-600" />
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-stone-900 border border-stone-500" />
          <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-stone-900 border border-stone-500" />
          
          <div className="p-5 relative">
            <div className="flex flex-col items-center" style={{ transform: 'translateZ(20px)' }}>
              <div className="relative mb-4">
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br from-stone-600 to-stone-800",
                  "border-4 border-stone-500 shadow-inner"
                )}>
                  <div className="absolute inset-2 rounded-full border-2 border-dashed border-stone-400/50" />
                  <Icon className={cn("h-9 w-9 relative z-10", config.textColor)} />
                </div>
              </div>
              
              <h3 className={cn("text-2xl font-black tracking-widest", config.textColor, "drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]")}>
                {team}
              </h3>
              
              <div className="flex items-center gap-2 my-3">
                <div className="w-4 h-[2px] bg-stone-500" />
                <Star className="w-3 h-3 text-stone-500 fill-current" />
                <div className="w-4 h-[2px] bg-stone-500" />
              </div>
              
              <p className="text-stone-300 font-medium text-xs text-center uppercase tracking-wider">{config.description}</p>
              <p className="text-stone-500 text-[10px] mt-1">"{config.slogan}"</p>
              
              <div className="mt-4 flex flex-col gap-2 w-full">
                <div className="px-4 py-1.5 bg-stone-700 border border-stone-500 rounded hover:bg-green-900/50 hover:border-green-600 transition-colors text-center">
                  <span className="text-[10px] font-bold text-stone-400 tracking-widest">ENTRAR</span>
                </div>
                
                {onRegisterClick && (
                  <div
                    onClick={handleRegisterClick}
                    className="flex items-center justify-center gap-2 px-4 py-1.5 bg-green-600/20 border border-green-500/50 rounded hover:bg-green-600/40 hover:border-green-400 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] font-bold text-green-400 tracking-widest">CADASTRAR</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// CYBER THEME - Hexagonal Circuit Style
function CyberCard({ team, config, onClick, onRegisterClick }: { team: string; config: TeamThemeConfig; onClick: () => void; onRegisterClick?: () => void }) {
  const Icon = config.icon;
  const { ref, transform, glare, handleMouseMove, handleMouseLeave } = use3DTilt();
  
  const handleRegisterClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onRegisterClick?.();
  };
  
  return (
    <div 
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full cursor-pointer transition-all duration-300 ease-out"
      style={{ transform, transformStyle: 'preserve-3d' }}
    >
      <div 
        className={cn(
          "relative bg-slate-950/90 backdrop-blur-sm",
          "border border-cyan-500/30 hover:border-cyan-400",
          "transition-colors duration-300 overflow-hidden"
        )}
        style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0 85%, 0 15%)' }}
      >
        {/* Glare effect */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(0,255,255,${glare.opacity * 1.5}) 0%, transparent 60%)`,
          }}
        />
        
        {/* Animated border */}
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            background: `linear-gradient(90deg, transparent, ${config.accentColor}40, transparent)`,
            animation: 'shimmer 2s infinite',
          }}
        />
        
        {/* Circuit lines */}
        <svg className="absolute inset-0 w-full h-full opacity-30">
          <line x1="0" y1="50%" x2="30%" y2="50%" stroke={config.accentColor} strokeWidth="1" />
          <line x1="70%" y1="50%" x2="100%" y2="50%" stroke={config.accentColor} strokeWidth="1" />
          <circle cx="30%" cy="50%" r="3" fill={config.accentColor} />
          <circle cx="70%" cy="50%" r="3" fill={config.accentColor} />
        </svg>
        
        {/* Scan lines */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)' }}
        />
        
        <div className="p-5 relative">
          <div className="flex flex-col items-center" style={{ transform: 'translateZ(30px)' }}>
            <div className="relative mb-4">
              <div 
                className="absolute -inset-3 border border-cyan-500/30"
                style={{ 
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  animation: 'spin 10s linear infinite'
                }}
              />
              
              <div 
                className={cn("w-20 h-20 flex items-center justify-center", "bg-gradient-to-br from-slate-800 to-slate-900", "border-2")}
                style={{ 
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  borderColor: config.accentColor,
                  boxShadow: `0 0 30px ${config.accentColor}40, inset 0 0 20px ${config.accentColor}20`
                }}
              >
                <Icon className={cn("h-10 w-10", config.textColor)} style={{ filter: `drop-shadow(0 0 8px ${config.accentColor})` }} />
              </div>
            </div>
            
            <h3 
              className={cn("text-2xl font-black tracking-widest", config.textColor)}
              style={{ textShadow: `0 0 20px ${config.accentColor}` }}
            >
              {team}
            </h3>
            
            <div className="flex items-center gap-1 my-3">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="w-2 h-1 bg-cyan-500/50" />
              ))}
            </div>
            
            <p className={cn("font-medium text-xs text-center opacity-80", config.textColor)}>{config.description}</p>
            <p className="text-slate-500 text-[10px] mt-1 font-mono">// {config.slogan}</p>
            
            <div className="mt-4 flex flex-col gap-2 w-full">
              <div 
                className="px-4 py-1.5 bg-slate-900/80 border hover:bg-cyan-900/30 transition-colors overflow-hidden relative text-center"
                style={{ borderColor: config.accentColor + '50' }}
              >
                <span className={cn("text-[10px] font-bold tracking-widest relative z-10", config.textColor)}>CONECTAR</span>
              </div>
              
              {onRegisterClick && (
                <div
                  onClick={handleRegisterClick}
                  className="flex items-center justify-center gap-2 px-4 py-1.5 bg-green-600/20 border border-green-500/50 hover:bg-green-600/40 hover:border-green-400 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3 h-3 text-green-400" />
                  <span className="text-[10px] font-bold text-green-400 tracking-widest">CADASTRAR</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// CLASSIC THEME - Elegant Shield Style
function ClassicCard({ team, config, onClick, onRegisterClick }: { team: string; config: TeamThemeConfig; onClick: () => void; onRegisterClick?: () => void }) {
  const Icon = config.icon;
  const { ref, transform, glare, handleMouseMove, handleMouseLeave } = use3DTilt();
  
  const handleRegisterClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onRegisterClick?.();
  };
  
  return (
    <div 
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full cursor-pointer transition-all duration-300 ease-out"
      style={{ transform, transformStyle: 'preserve-3d' }}
    >
      <div className="relative">
        {/* Glare effect */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300 rounded-t-xl"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,215,0,${glare.opacity}) 0%, transparent 60%)`,
            clipPath: 'polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)',
          }}
        />
        
        <div 
          className={cn(
            "relative bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900",
            "border-2 border-slate-600 hover:border-amber-500/60",
            "shadow-2xl transition-colors duration-300",
            "rounded-t-xl overflow-hidden"
          )}
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)' }}
        >
          <div className="absolute inset-2 border border-amber-500/20 rounded-t-lg" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)' }} />
          
          <div className="p-6 pb-12 relative">
            <div className="flex flex-col items-center" style={{ transform: 'translateZ(25px)' }}>
              <div className="relative mb-4">
                <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-amber-500/60" />
                <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-amber-500/60" />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-amber-500/60" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-amber-500/60" />
                
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br", config.gradient,
                  "border-4 border-amber-500/50 shadow-lg"
                )}>
                  <Icon className="h-10 w-10 text-white drop-shadow-lg" />
                </div>
              </div>
              
              <h3 className={cn("text-2xl font-serif font-bold tracking-wide", config.textColor)}>
                {team}
              </h3>
              
              <div className="flex items-center gap-2 my-3">
                <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-amber-500/60" />
                <div className="w-2 h-2 rotate-45 border border-amber-500/60" />
                <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-amber-500/60" />
              </div>
              
              <p className="text-slate-300 font-medium text-xs text-center">{config.description}</p>
              <p className="text-slate-500 text-[10px] italic mt-1">"{config.slogan}"</p>
              
              <div className="mt-4 flex flex-col gap-2 w-full">
                <div className="px-5 py-2 bg-gradient-to-r from-amber-600/20 via-amber-500/30 to-amber-600/20 border border-amber-500/40 rounded-full hover:from-amber-600/40 hover:to-amber-600/40 transition-all text-center">
                  <span className="text-[10px] font-semibold text-amber-400 tracking-wider">ACESSAR</span>
                </div>
                
                {onRegisterClick && (
                  <div
                    onClick={handleRegisterClick}
                    className="flex items-center justify-center gap-2 px-5 py-2 bg-green-600/20 border border-green-500/50 rounded-full hover:bg-green-600/40 hover:border-green-400 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] font-semibold text-green-400 tracking-wider">CADASTRAR</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Card wrapper with theme transition animation
function CardWrapper({ children, theme }: { children: React.ReactNode; theme: string }) {
  return (
    <div 
      key={theme}
      className="animate-theme-transition"
      style={{
        animation: 'themeTransition 0.4s ease-out',
      }}
    >
      {children}
    </div>
  );
}

export function ThemedTeamCard({ team, onClick, onRegisterClick }: ThemedTeamCardProps) {
  const { theme } = useTheme();
  const { playSound } = useSoundEffects();
  const config = getTeamConfigByTheme(team, theme);

  const handleClick = () => {
    playSound('click');
    onClick();
  };

  const handleRegister = () => {
    playSound('click');
    onRegisterClick?.();
  };

  const renderCard = () => {
    switch (theme) {
      case 'tactical':
        return <TacticalCard team={team} config={config} onClick={handleClick} onRegisterClick={onRegisterClick ? handleRegister : undefined} />;
      case 'military':
        return <MilitaryCard team={team} config={config} onClick={handleClick} onRegisterClick={onRegisterClick ? handleRegister : undefined} />;
      case 'cyber':
        return <CyberCard team={team} config={config} onClick={handleClick} onRegisterClick={onRegisterClick ? handleRegister : undefined} />;
      case 'classic':
        return <ClassicCard team={team} config={config} onClick={handleClick} onRegisterClick={onRegisterClick ? handleRegister : undefined} />;
      default:
        return <TacticalCard team={team} config={config} onClick={handleClick} onRegisterClick={onRegisterClick ? handleRegister : undefined} />;
    }
  };

  return (
    <CardWrapper theme={theme}>
      {renderCard()}
    </CardWrapper>
  );
}
