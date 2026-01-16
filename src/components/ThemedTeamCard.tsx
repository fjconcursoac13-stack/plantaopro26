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
        {/* Intense rotating border glow */}
        <div 
          className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500"
          style={{ 
            background: `conic-gradient(from 0deg, ${teamColors[team as keyof typeof teamColors]?.primary || '#fff'}, transparent 30%, ${teamColors[team as keyof typeof teamColors]?.primary || '#fff'} 60%, transparent 90%, ${teamColors[team as keyof typeof teamColors]?.primary || '#fff'})`,
            animation: 'spin 2s linear infinite',
            filter: 'blur(8px)'
          }}
        />
        
        {/* Pulsing mega glow layer 1 */}
        <div 
          className="absolute -inset-4 rounded-2xl opacity-0 group-hover:opacity-70 transition-all duration-500 blur-2xl"
          style={{ 
            backgroundColor: teamColors[team as keyof typeof teamColors]?.primary || '#fff',
          }}
        />
        
        {/* Pulsing mega glow layer 2 - slower pulse */}
        <div 
          className="absolute -inset-6 rounded-3xl opacity-0 group-hover:opacity-40 transition-all duration-700 blur-3xl"
          style={{ 
            backgroundColor: teamColors[team as keyof typeof teamColors]?.glow || 'rgba(255,255,255,0.3)',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
        
        {/* Electric spark effect corners */}
        <div className="absolute -inset-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div 
            className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 rounded-tl-lg"
            style={{ 
              borderColor: teamColors[team as keyof typeof teamColors]?.primary,
              animation: 'electricPulse 0.5s ease-in-out infinite'
            }}
          />
          <div 
            className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 rounded-tr-lg"
            style={{ 
              borderColor: teamColors[team as keyof typeof teamColors]?.primary,
              animation: 'electricPulse 0.5s ease-in-out infinite 0.1s'
            }}
          />
          <div 
            className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 rounded-bl-lg"
            style={{ 
              borderColor: teamColors[team as keyof typeof teamColors]?.primary,
              animation: 'electricPulse 0.5s ease-in-out infinite 0.2s'
            }}
          />
          <div 
            className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 rounded-br-lg"
            style={{ 
              borderColor: teamColors[team as keyof typeof teamColors]?.primary,
              animation: 'electricPulse 0.5s ease-in-out infinite 0.3s'
            }}
          />
        </div>
        
        {/* Enhanced Glare effect */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-200 rounded-xl overflow-hidden"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity * 2}) 0%, transparent 50%)`,
          }}
        />
        
        {/* Main Card - Optimized for both portrait and landscape */}
        <div 
          className={cn(
            "relative overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl",
            "border-2 md:border-3 transition-all duration-300 group-hover:shadow-2xl group-hover:border-opacity-100",
            // Portrait: taller cards. Landscape: shorter to fit 4 in row
            "w-full min-h-[120px] h-[calc(32vh-2rem)] landscape:min-h-[80px] landscape:h-[calc(70vh-4rem)] sm:min-h-[180px] sm:h-auto md:min-h-[260px] lg:min-h-[320px] xl:min-h-[380px] 2xl:min-h-[450px]"
          )}
          style={{ 
            borderColor: teamColors[team as keyof typeof teamColors]?.primary || '#fff',
            boxShadow: `0 0 0 rgba(0,0,0,0)`,
          }}
        >
          {/* Team Poster Background - Full coverage with zoom effect */}
          <div 
            className="absolute inset-0 transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
            style={{ 
              backgroundImage: `url(${teamPosters[team as keyof typeof teamPosters]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
            }}
          />
          
          {/* Dark overlay - lifts on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30 group-hover:from-black/80 group-hover:via-black/30 group-hover:to-transparent transition-all duration-500" />
          
          {/* Top gradient stripe with team color - expands on hover */}
          <div 
            className="absolute top-0 left-0 right-0 h-1 md:h-1.5 transition-all duration-500 group-hover:h-2 md:group-hover:h-3" 
            style={{ 
              backgroundColor: teamColors[team as keyof typeof teamColors]?.primary,
              boxShadow: `0 0 20px ${teamColors[team as keyof typeof teamColors]?.glow}`
            }}
          />
          
          {/* Animated scan lines - multiple for intensity */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div 
              className="absolute w-full h-32 -translate-y-full bg-gradient-to-b from-transparent via-white/20 to-transparent"
              style={{ animation: 'scan 1.5s ease-in-out infinite' }}
            />
            <div 
              className="absolute w-full h-16 -translate-y-full bg-gradient-to-b from-transparent via-white/10 to-transparent"
              style={{ animation: 'scan 2s ease-in-out infinite 0.5s' }}
            />
          </div>
          
          {/* Holographic overlay effect */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, transparent 25%, ${teamColors[team as keyof typeof teamColors]?.primary}20 50%, transparent 75%)`,
              backgroundSize: '200% 200%',
              animation: 'shimmer 3s ease-in-out infinite'
            }}
          />
          
          {/* Status indicator - enhanced with ring */}
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            <div className="relative">
              <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-green-500 animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-green-400 animate-ping opacity-50" />
            </div>
          </div>
          
          {/* Content - Bottom aligned, compact on mobile */}
          <div className="absolute inset-x-0 bottom-0 p-2 sm:p-4 md:p-5 lg:p-6 z-10">
            <div className="flex flex-col items-center">
              {/* Icon with team color - enhanced glow and scale */}
              <div 
                className="w-10 h-10 sm:w-14 sm:h-14 md:w-18 md:h-18 lg:w-22 lg:h-22 xl:w-24 xl:h-24 rounded-full flex items-center justify-center mb-1.5 sm:mb-3 shadow-2xl group-hover:scale-125 group-hover:rotate-6 transition-all duration-500 border-2 md:border-3 border-white/50 group-hover:border-white/80"
                style={{ 
                  backgroundColor: teamColors[team as keyof typeof teamColors]?.primary,
                  boxShadow: `0 0 30px ${teamColors[team as keyof typeof teamColors]?.glow}, 0 0 60px ${teamColors[team as keyof typeof teamColors]?.glow}60, inset 0 0 20px rgba(255,255,255,0.2)`,
                }}
              >
                <Icon className="h-5 w-5 sm:h-7 sm:w-7 md:h-9 md:w-9 lg:h-11 lg:w-11 xl:h-12 xl:w-12 text-white drop-shadow-lg group-hover:animate-pulse" />
              </div>
              
              {/* Team name - enhanced glow effect */}
              <div className="flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-3">
                <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 text-white/80 group-hover:text-yellow-300 group-hover:animate-spin shrink-0 transition-colors duration-300" style={{ animationDuration: '2s' }} />
                <h3 
                  className="text-base sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black tracking-[0.08em] sm:tracking-[0.15em] text-white drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                  style={{ 
                    textShadow: `0 2px 8px ${teamColors[team as keyof typeof teamColors]?.glow}, 0 0 30px ${teamColors[team as keyof typeof teamColors]?.glow}, 0 0 60px ${teamColors[team as keyof typeof teamColors]?.primary}80`,
                  }}
                >
                  {team}
                </h3>
                <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 text-white/80 group-hover:text-yellow-300 group-hover:animate-spin shrink-0 transition-colors duration-300" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
              </div>
              
              {/* Description - Hidden on mobile, visible on larger screens */}
              <p className="hidden md:block text-white/90 text-xs lg:text-sm text-center font-medium mb-2 md:mb-3 max-w-full line-clamp-2 group-hover:text-white transition-colors duration-300">
                {descriptions.description}
              </p>
              
              {/* Access button - Enhanced with glow and animation */}
              <div 
                className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-md sm:rounded-lg md:rounded-xl bg-black/70 backdrop-blur-sm border-2 transition-all duration-300 group-hover:bg-black/90 group-hover:scale-110 group-hover:shadow-lg"
                style={{ 
                  borderColor: teamColors[team as keyof typeof teamColors]?.primary,
                  boxShadow: `0 0 0 transparent`,
                }}
              >
                <Radio className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-green-400 animate-pulse shrink-0" />
                <span className="text-[10px] sm:text-sm md:text-base font-bold text-white tracking-wider uppercase group-hover:tracking-[0.2em] transition-all duration-300">
                  ACESSAR
                </span>
              </div>
            </div>
          </div>
          
          {/* Bottom accent line with team color - grows on hover */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-0.5 md:h-1 group-hover:h-1 md:group-hover:h-1.5 opacity-80 group-hover:opacity-100 transition-all duration-300"
            style={{ 
              backgroundColor: teamColors[team as keyof typeof teamColors]?.primary,
              boxShadow: `0 0 15px ${teamColors[team as keyof typeof teamColors]?.glow}`
            }}
          />
        </div>
      </div>
    </div>
  );
}
