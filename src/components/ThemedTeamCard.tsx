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
        {/* Animated glow ring on hover */}
        <div 
          className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md"
          style={{ background: `linear-gradient(135deg, ${colors.glowColor.replace('shadow-', 'var(--').replace('/30', ', 0.3)')}, transparent, ${colors.glowColor.replace('shadow-', 'var(--').replace('/30', ', 0.3)')})` }}
        />
        
        {/* Pulsing outer glow */}
        <div 
          className={cn(
            "absolute -inset-2 rounded-xl opacity-0 group-hover:opacity-60 transition-opacity duration-700 blur-xl animate-pulse",
            colors.glowColor
          )}
          style={{ animationDuration: '2s' }}
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
            "relative overflow-hidden rounded-lg md:rounded-xl backdrop-blur-sm",
            "bg-gradient-to-br",
            colors.bgGradient,
            "border-2 transition-all duration-300",
            colors.borderColor,
            "group-hover:border-opacity-100 group-hover:shadow-xl",
          )}
        >
          {/* Top gradient stripe */}
          <div className={cn("h-0.5 md:h-1.5 w-full bg-gradient-to-r", gradient)} />
          
          {/* Animated scan line */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div 
              className={cn("absolute w-full h-12 -translate-y-full animate-scan", colors.glowColor)}
              style={{ animationDuration: '2s' }}
            />
          </div>
          
          {/* Corner accents - Hidden on mobile for cleaner look */}
          <div className={cn("absolute top-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-t-2 transition-colors hidden sm:block", colors.borderColor, "group-hover:border-opacity-100")} />
          <div className={cn("absolute top-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-t-2 transition-colors hidden sm:block", colors.borderColor, "group-hover:border-opacity-100")} />
          <div className={cn("absolute bottom-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-b-2 transition-colors hidden sm:block", colors.borderColor, "group-hover:border-opacity-100")} />
          <div className={cn("absolute bottom-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-b-2 transition-colors hidden sm:block", colors.borderColor, "group-hover:border-opacity-100")} />
          
          {/* Status dots */}
          <div className="absolute top-2 right-2 flex gap-0.5 md:gap-1">
            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
            <div className="w-1 h-1 rounded-full bg-green-500/50 animate-pulse" style={{ animationDelay: '0.3s' }} />
          </div>
          
          <div className="p-2.5 sm:p-3 md:p-5 relative">
            <div className="flex flex-col items-center" style={{ transform: 'translateZ(30px)' }}>
              {/* Icon container with animated rings */}
              <div className="relative mb-2 md:mb-4">
                {/* Outer ring animation - Hidden on mobile */}
                <div className={cn(
                  "absolute -inset-2 rounded-full border opacity-30 group-hover:opacity-60 transition-opacity animate-[spin_10s_linear_infinite] hidden md:block",
                  colors.borderColor
                )}>
                  <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r", gradient)} />
                </div>
                
                {/* Icon background */}
                <div 
                  className={cn(
                    "relative w-10 h-10 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br shadow-xl",
                    gradient,
                    "border-2 border-white/20 group-hover:border-white/40 transition-all duration-300"
                  )}
                >
                  <Icon className="h-5 w-5 sm:h-5.5 sm:w-5.5 md:h-7 md:w-7 text-white drop-shadow-lg" />
                  
                  {/* Inner glow */}
                  <div className="absolute inset-0 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors" />
                </div>
                
                {/* Status indicator with glow */}
                <div className="absolute -bottom-0.5 -right-0.5">
                  <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-green-500 border-2 border-slate-800 shadow-lg shadow-green-500/50 animate-pulse" />
                </div>
              </div>
              
              {/* Team identifier */}
              <div className="flex items-center gap-1 mb-0.5 md:mb-1">
                <Star className={cn("h-2 w-2 md:h-2.5 md:w-2.5", colors.color)} />
                <h3 className={cn(
                  "text-sm sm:text-base md:text-lg font-black tracking-[0.15em] md:tracking-[0.2em]",
                  colors.color
                )}>
                  {team}
                </h3>
                <Star className={cn("h-2 w-2 md:h-2.5 md:w-2.5", colors.color)} />
              </div>
              
              {/* Description */}
              <p className="text-slate-300 text-[8px] sm:text-[9px] md:text-[10px] text-center font-semibold tracking-wider mb-0.5 md:mb-1 leading-tight">
                {descriptions.description}
              </p>
              
              {/* Slogan - Hidden on smallest screens */}
              <p className={cn("text-[7px] sm:text-[8px] md:text-[9px] text-center font-medium tracking-widest opacity-80 hidden xs:block", colors.color)}>
                {descriptions.slogan}
              </p>
              
              {/* Action button */}
              <div className="mt-2 md:mt-4 w-full">
                <div className={cn(
                  "flex items-center justify-center gap-1.5 md:gap-2 px-2 py-1.5 md:px-3 md:py-2.5 rounded-md md:rounded-lg",
                  "bg-gradient-to-r from-slate-700/80 to-slate-800/80",
                  "border transition-all duration-300",
                  colors.borderColor,
                  "group-hover:from-slate-600/80 group-hover:to-slate-700/80",
                  "group-hover:shadow-lg"
                )}>
                  <Radio className="w-2.5 h-2.5 md:w-3 md:h-3 text-green-400 animate-pulse" />
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-white tracking-[0.1em] md:tracking-[0.15em] uppercase">
                    Acessar Sistema
                  </span>
                  <Zap className={cn("w-2.5 h-2.5 md:w-3 md:h-3 opacity-0 group-hover:opacity-100 transition-opacity", colors.color)} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom accent line */}
          <div className={cn(
            "h-0.5 w-full bg-gradient-to-r opacity-50 group-hover:opacity-100 transition-opacity",
            gradient
          )} />
        </div>
      </div>
    </div>
  );
}
