import { useState, useRef, MouseEvent, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';
import { Radio, Star } from 'lucide-react';
import { getThemeAssets } from '@/lib/themeAssets';
import { teamPosters, teamColors } from '@/lib/teamAssets';

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
            background: `conic-gradient(from 0deg, ${teamColors[team as keyof typeof teamColors]?.primary || '#fff'} 0deg, transparent 60deg, ${teamColors[team as keyof typeof teamColors]?.primary || '#fff'} 120deg, transparent 180deg, ${teamColors[team as keyof typeof teamColors]?.primary || '#fff'} 240deg, transparent 300deg, ${teamColors[team as keyof typeof teamColors]?.primary || '#fff'} 360deg)`,
            animation: 'spin 3s linear infinite'
          }}
        />
        
        {/* Pulsing outer mega glow with team color */}
        <div 
          className="absolute -inset-3 rounded-xl opacity-0 group-hover:opacity-60 transition-all duration-500 blur-2xl"
          style={{ 
            backgroundColor: teamColors[team as keyof typeof teamColors]?.primary || '#fff',
            animationDuration: '1.5s' 
          }}
        />
        
        {/* Secondary pulse layer */}
        <div 
          className="absolute -inset-4 rounded-2xl opacity-0 group-hover:opacity-30 transition-all duration-700 blur-3xl animate-pulse"
          style={{ 
            backgroundColor: teamColors[team as keyof typeof teamColors]?.glow || 'rgba(255,255,255,0.3)',
            animationDuration: '2s' 
          }}
        />
        
        {/* Enhanced Glare effect */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-200 rounded-xl overflow-hidden"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity * 1.5}) 0%, transparent 50%)`,
          }}
        />
        
        {/* Main Card - Fixed aspect ratio */}
        <div 
          className={cn(
            "relative overflow-hidden rounded-lg md:rounded-xl",
            "border-2 transition-all duration-300",
            "aspect-[3/4] landscape:aspect-[4/3]",
          )}
          style={{ 
            borderColor: teamColors[team as keyof typeof teamColors]?.primary || '#fff',
          }}
        >
          {/* Team Poster Background - Full coverage */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-110"
            style={{ 
              backgroundImage: `url(${teamPosters[team as keyof typeof teamPosters]})`,
            }}
          />
          {/* Dark overlay for readability - stronger at bottom for text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/20 group-hover:from-black/90 group-hover:via-black/40 group-hover:to-black/10 transition-all duration-300" />
          
          {/* Top gradient stripe with team color */}
          <div 
            className="absolute top-0 left-0 right-0 h-1 md:h-2 transition-all duration-300 group-hover:h-1.5 md:group-hover:h-2.5" 
            style={{ backgroundColor: teamColors[team as keyof typeof teamColors]?.primary }}
          />
          
          {/* Animated scan line */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div 
              className="absolute w-full h-16 -translate-y-full bg-gradient-to-b from-transparent via-white/20 to-transparent"
              style={{ animation: 'scan 1.5s ease-in-out infinite' }}
            />
          </div>
          
          {/* Status indicator */}
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          
          {/* Content - Bottom aligned for better image visibility */}
          <div className="absolute inset-x-0 bottom-0 p-2 landscape:p-2 sm:p-4 z-10">
            <div className="flex flex-col items-center landscape:flex-row landscape:items-center landscape:gap-3">
              {/* Icon with team color */}
              <div 
                className="w-8 h-8 landscape:w-10 landscape:h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-1 landscape:mb-0 sm:mb-2 shadow-xl group-hover:scale-110 transition-transform duration-300"
                style={{ 
                  backgroundColor: teamColors[team as keyof typeof teamColors]?.primary,
                  boxShadow: `0 0 20px ${teamColors[team as keyof typeof teamColors]?.glow}`,
                }}
              >
                <Icon className="h-4 w-4 landscape:h-5 landscape:w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-white drop-shadow-lg" />
              </div>
              
              {/* Team name - Fixed positioning */}
              <div className="flex flex-col items-center landscape:items-start landscape:flex-1 min-w-0 max-w-full">
                <div className="flex items-center gap-1 mb-0.5">
                  <Star className="h-2 w-2 md:h-3 md:w-3 text-white/80 group-hover:animate-pulse shrink-0" />
                  <h3 
                    className="text-sm landscape:text-base sm:text-lg md:text-2xl font-black tracking-widest text-white drop-shadow-lg truncate"
                    style={{ 
                      textShadow: `0 0 20px ${teamColors[team as keyof typeof teamColors]?.glow}`,
                    }}
                  >
                    {team}
                  </h3>
                  <Star className="h-2 w-2 md:h-3 md:w-3 text-white/80 group-hover:animate-pulse shrink-0" />
                </div>
                
                {/* Description - Hidden on small screens */}
                <p className="hidden sm:block text-white/90 text-[10px] md:text-xs text-center landscape:text-left font-medium truncate max-w-full">
                  {descriptions.description}
                </p>
              </div>
              
              {/* Access button - simplified */}
              <div className="mt-1.5 landscape:mt-0 sm:mt-3 w-full landscape:w-auto">
                <div 
                  className="flex items-center justify-center gap-1.5 px-2 py-1 landscape:px-3 sm:px-4 sm:py-2 rounded-lg bg-black/60 backdrop-blur-sm border transition-all duration-300 group-hover:bg-black/80 group-hover:scale-105"
                  style={{ 
                    borderColor: teamColors[team as keyof typeof teamColors]?.primary,
                  }}
                >
                  <Radio className="w-2 h-2 sm:w-3 sm:h-3 text-green-400 animate-pulse shrink-0" />
                  <span className="text-[8px] sm:text-[10px] md:text-xs font-bold text-white tracking-wider uppercase whitespace-nowrap">
                    ACESSAR
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom accent line with team color */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-0.5 md:h-1 opacity-80 group-hover:opacity-100 transition-all duration-300"
            style={{ backgroundColor: teamColors[team as keyof typeof teamColors]?.primary }}
          />
        </div>
      </div>
    </div>
  );
}
