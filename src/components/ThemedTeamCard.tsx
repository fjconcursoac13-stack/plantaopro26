import { useState, useRef, MouseEvent, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';
import { Radio, Zap, Star } from 'lucide-react';
import { getThemeAssets } from '@/lib/themeAssets';

interface ThemedTeamCardProps {
  team: string;
  selected?: boolean;
  onClick: () => void;
}

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
  const { theme, resolvedTheme } = useTheme();
  const { ref, transform, glare, handleMouseMove, handleMouseLeave } = use3DTilt();
  const hasPlayedHover = useRef(false);
  
  const themeAssets = getThemeAssets(theme, resolvedTheme);
  const teamKey = team as 'ALFA' | 'BRAVO' | 'CHARLIE' | 'DELTA';
  const Icon = themeAssets.teamIcons[teamKey];
  const colors = themeAssets.teamColors[teamKey];
  const descriptions = themeAssets.teamDescriptions[teamKey];
  
  // Extract color name from class like "text-blue-400" -> "blue"
  const colorMatch = colors.color.match(/text-(\w+)-/);
  const colorName = colorMatch ? colorMatch[1] : 'blue';
  const gradient = `from-${colorName}-500 via-${colorName}-600 to-${colorName}-800`;

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
        {/* Intense animated glow ring on hover */}
        <div 
          className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-lg group-hover:blur-xl"
          style={{ 
            background: `conic-gradient(from 0deg, ${colors.glowColor.replace('shadow-', '').replace('/30', '')} 0deg, transparent 60deg, ${colors.glowColor.replace('shadow-', '').replace('/30', '')} 120deg, transparent 180deg, ${colors.glowColor.replace('shadow-', '').replace('/30', '')} 240deg, transparent 300deg, ${colors.glowColor.replace('shadow-', '').replace('/30', '')} 360deg)`,
            animation: 'spin 3s linear infinite'
          }}
        />
        
        {/* Pulsing outer mega glow */}
        <div 
          className={cn(
            "absolute -inset-3 rounded-xl opacity-0 group-hover:opacity-80 transition-all duration-500 blur-2xl",
            colors.glowColor
          )}
          style={{ animationDuration: '1.5s' }}
        />
        
        {/* Secondary pulse layer */}
        <div 
          className={cn(
            "absolute -inset-4 rounded-2xl opacity-0 group-hover:opacity-40 transition-all duration-700 blur-3xl animate-pulse",
            colors.glowColor
          )}
          style={{ animationDuration: '2s' }}
        />
        
        {/* Enhanced Glare effect */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-200 rounded-xl overflow-hidden"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity * 1.5}) 0%, transparent 50%)`,
          }}
        />
        
        {/* Main Card */}
        <div 
          className={cn(
            "relative overflow-hidden rounded-lg md:rounded-xl backdrop-blur-sm",
            "bg-gradient-to-br",
            colors.bgGradient,
            "border-2 transition-all duration-300",
            colors.borderColor,
            "group-hover:border-opacity-100 group-hover:shadow-2xl",
          )}
        >
          {/* Top gradient stripe - animated on hover */}
          <div className={cn(
            "h-0.5 md:h-1.5 w-full bg-gradient-to-r transition-all duration-300 group-hover:h-1 md:group-hover:h-2", 
            gradient
          )} />
          
          {/* Animated scan line - more visible */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div 
              className="absolute w-full h-16 -translate-y-full bg-gradient-to-b from-transparent via-white/20 to-transparent"
              style={{ animation: 'scan 1.5s ease-in-out infinite' }}
            />
          </div>
          
          {/* Shimmer effect on hover */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 55%, transparent 60%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite'
            }}
          />
          
          {/* Corner accents - Hidden on mobile for cleaner look */}
          <div className={cn("absolute top-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-t-2 transition-all hidden sm:block", colors.borderColor, "group-hover:border-opacity-100 group-hover:w-4 group-hover:h-4 md:group-hover:w-5 md:group-hover:h-5")} />
          <div className={cn("absolute top-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-t-2 transition-all hidden sm:block", colors.borderColor, "group-hover:border-opacity-100 group-hover:w-4 group-hover:h-4 md:group-hover:w-5 md:group-hover:h-5")} />
          <div className={cn("absolute bottom-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-b-2 transition-all hidden sm:block", colors.borderColor, "group-hover:border-opacity-100 group-hover:w-4 group-hover:h-4 md:group-hover:w-5 md:group-hover:h-5")} />
          <div className={cn("absolute bottom-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-b-2 transition-all hidden sm:block", colors.borderColor, "group-hover:border-opacity-100 group-hover:w-4 group-hover:h-4 md:group-hover:w-5 md:group-hover:h-5")} />
          
          {/* Status dots - more animated on hover */}
          <div className="absolute top-2 right-2 flex gap-0.5 md:gap-1">
            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse group-hover:w-1.5 group-hover:h-1.5 transition-all" />
            <div className="w-1 h-1 rounded-full bg-green-500/50 animate-pulse group-hover:bg-green-500 transition-all" style={{ animationDelay: '0.3s' }} />
          </div>
          
          {/* Content - landscape optimized */}
          <div className="p-3 landscape:p-2 sm:p-5 md:p-6 relative">
            <div className="flex flex-col landscape:flex-row landscape:items-center landscape:gap-3 items-center" style={{ transform: 'translateZ(30px)' }}>
              {/* Icon container with animated rings */}
              <div className="relative mb-2 landscape:mb-0 md:mb-4">
                {/* Outer ring animation - Hidden on mobile */}
                <div className={cn(
                  "absolute -inset-3 rounded-full border opacity-30 group-hover:opacity-80 transition-opacity animate-[spin_10s_linear_infinite] hidden md:block",
                  colors.borderColor
                )}>
                  <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gradient-to-r group-hover:w-3 group-hover:h-3 transition-all", gradient)} />
                </div>
                
                {/* Icon background - with hover scale */}
                <div 
                  className={cn(
                    "relative w-10 h-10 landscape:w-12 landscape:h-12 sm:w-14 sm:h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110",
                    gradient,
                    "border-2 border-white/20 group-hover:border-white/50"
                  )}
                >
                  <Icon className="h-5 w-5 landscape:h-6 landscape:w-6 sm:h-7 sm:w-7 md:h-10 md:w-10 text-white drop-shadow-lg group-hover:drop-shadow-2xl transition-all" />
                  
                  {/* Inner glow - more intense on hover */}
                  <div className="absolute inset-0 rounded-full bg-white/10 group-hover:bg-white/30 transition-colors duration-300" />
                </div>
                
                {/* Status indicator with enhanced glow */}
                <div className="absolute -bottom-0.5 -right-0.5">
                  <div className="w-2.5 h-2.5 md:w-4 md:h-4 rounded-full bg-green-500 border-2 border-slate-800 shadow-lg shadow-green-500/50 animate-pulse group-hover:shadow-green-500/80 group-hover:shadow-xl transition-all" />
                </div>
              </div>
              
              {/* Text content - landscape optimized */}
              <div className="flex flex-col items-center landscape:items-start landscape:flex-1">
                {/* Team identifier */}
                <div className="flex items-center gap-1 mb-0.5 landscape:mb-0 md:mb-2">
                  <Star className={cn("h-2 w-2 md:h-3 md:w-3 group-hover:animate-pulse", colors.color)} />
                  <h3 className={cn(
                    "text-sm landscape:text-base sm:text-lg md:text-xl font-black tracking-[0.1em] md:tracking-[0.2em] group-hover:tracking-[0.15em] md:group-hover:tracking-[0.25em] transition-all",
                    colors.color
                  )}>
                    {team}
                  </h3>
                  <Star className={cn("h-2 w-2 md:h-3 md:w-3 group-hover:animate-pulse", colors.color)} />
                </div>
                
                {/* Description - hidden in landscape mobile */}
                <p className="text-slate-300 text-[9px] landscape:hidden sm:text-xs md:text-sm text-center landscape:text-left font-semibold tracking-wider mb-0.5 md:mb-2 leading-tight">
                  {descriptions.description}
                </p>
                
                {/* Slogan - hidden in landscape mobile */}
                <p className={cn("text-[8px] landscape:hidden sm:text-[10px] md:text-xs text-center landscape:text-left font-medium tracking-widest opacity-80 group-hover:opacity-100 transition-opacity", colors.color)}>
                  {descriptions.slogan}
                </p>
              </div>
              
              {/* Action button - landscape optimized */}
              <div className="mt-2 landscape:mt-0 md:mt-5 w-full landscape:w-auto">
                <div className={cn(
                  "flex items-center justify-center gap-1.5 md:gap-3 px-2 py-1.5 landscape:px-3 md:px-4 md:py-3 rounded-lg",
                  "bg-gradient-to-r from-slate-700/80 to-slate-800/80",
                  "border transition-all duration-300",
                  colors.borderColor,
                  "group-hover:from-slate-600/90 group-hover:to-slate-700/90",
                  "group-hover:shadow-lg group-hover:scale-105"
                )}>
                  <Radio className="w-2.5 h-2.5 md:w-4 md:h-4 text-green-400 animate-pulse" />
                  <span className="text-[8px] landscape:text-[9px] sm:text-xs md:text-sm font-bold text-white tracking-[0.05em] md:tracking-[0.15em] uppercase">
                    Acessar Sistema
                  </span>
                  <Zap className={cn("w-2.5 h-2.5 md:w-4 md:h-4 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-all", colors.color)} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom accent line - animated */}
          <div className={cn(
            "h-0.5 w-full bg-gradient-to-r opacity-50 group-hover:opacity-100 group-hover:h-1 transition-all duration-300",
            gradient
          )} />
        </div>
      </div>
    </div>
  );
}
