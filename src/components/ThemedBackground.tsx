import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState, useMemo } from 'react';

export function ThemedBackground() {
  const { theme, themeConfig } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoize particles to prevent re-renders
  const particles = useMemo(() => {
    const particleCount = theme === 'cyber' ? 40 : theme === 'military' ? 25 : 30;
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      size: Math.random() * 3 + 1,
      duration: 4 + Math.random() * 6,
    }));
  }, [theme]);

  // Security grid lines
  const gridLines = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      isHorizontal: i < 4,
      position: 20 + (i % 4) * 20,
      delay: i * 0.3,
    }));
  }, []);

  const getBackgroundPattern = () => {
    switch (theme) {
      case 'tactical':
        return (
          <>
            {/* Tactical grid */}
            <div className="absolute inset-0 opacity-[0.03]">
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
                  linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
                `,
                backgroundSize: '80px 80px',
              }} />
            </div>
            {/* Scanning line */}
            <div className="absolute inset-0 overflow-hidden">
              <div 
                className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent animate-scan"
                style={{ animationDuration: '4s' }}
              />
            </div>
            {/* Corner brackets */}
            <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-amber-500/20" />
            <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-amber-500/20" />
            <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-amber-500/20" />
            <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-amber-500/20" />
          </>
        );
      case 'military':
        return (
          <>
            {/* Military camo dots */}
            <div className="absolute inset-0 opacity-[0.08]">
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  radial-gradient(circle at 25% 25%, hsl(var(--primary)) 2px, transparent 2px),
                  radial-gradient(circle at 75% 75%, hsl(var(--primary) / 0.5) 1.5px, transparent 1.5px)
                `,
                backgroundSize: '40px 40px',
              }} />
            </div>
            {/* Full radar system */}
            <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2">
              {/* Radar circles */}
              <div className="absolute inset-0 rounded-full border border-green-500/10" />
              <div className="absolute inset-[12%] rounded-full border border-green-500/15" />
              <div className="absolute inset-[25%] rounded-full border border-green-500/20" />
              <div className="absolute inset-[37%] rounded-full border border-green-500/25" />
              <div className="absolute inset-[50%] rounded-full border border-green-500/15" />
              {/* Radar crosshairs */}
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-gradient-to-b from-transparent via-green-500/20 to-transparent" />
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
              {/* Radar sweep */}
              <div 
                className="absolute inset-0 rounded-full animate-radar"
                style={{
                  background: `conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary) / 0.4) 20deg, transparent 40deg)`,
                }}
              />
              {/* Blips */}
              <div className="absolute top-[30%] left-[40%] w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
              <div className="absolute top-[60%] left-[70%] w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" style={{ animationDelay: '0.5s' }} />
              <div className="absolute top-[45%] left-[25%] w-1 h-1 bg-green-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.5)]" style={{ animationDelay: '1s' }} />
            </div>
          </>
        );
      case 'cyber':
        return (
          <>
            {/* Matrix rain effect */}
            <div className="absolute inset-0 opacity-20">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 text-cyan-400 font-mono text-xs opacity-50 animate-scan"
                  style={{
                    left: `${5 + i * 5}%`,
                    animationDuration: `${3 + Math.random() * 4}s`,
                    animationDelay: `${Math.random() * 3}s`,
                  }}
                >
                  {Array.from({ length: 15 }).map((_, j) => (
                    <div key={j} className="my-1" style={{ opacity: 1 - j * 0.06 }}>
                      {String.fromCharCode(0x30A0 + Math.random() * 96)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* Hexagonal grid */}
            <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="hexagons" patternUnits="userSpaceOnUse" width="60" height="52">
                  <polygon 
                    points="30,0 60,15 60,37 30,52 0,37 0,15" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="0.5" 
                    className="text-cyan-500" 
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hexagons)" />
            </svg>
            {/* Glowing lines */}
            <div className="absolute top-0 left-[20%] w-[1px] h-full bg-gradient-to-b from-cyan-500/0 via-cyan-500/30 to-cyan-500/0" />
            <div className="absolute top-0 right-[20%] w-[1px] h-full bg-gradient-to-b from-purple-500/0 via-purple-500/30 to-purple-500/0" />
            {/* HUD corners */}
            <div className="absolute top-6 left-6 w-24 h-24">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500 to-transparent" />
              <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-cyan-500 to-transparent" />
              <div className="absolute top-4 left-4 text-[8px] font-mono text-cyan-500/60">SYS:ACTIVE</div>
            </div>
            <div className="absolute top-6 right-6 w-24 h-24">
              <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-purple-500 to-transparent" />
              <div className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-purple-500 to-transparent" />
            </div>
          </>
        );
      case 'classic':
        return (
          <>
            {/* Institutional pattern */}
            <div className="absolute inset-0 opacity-[0.04]">
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  linear-gradient(45deg, hsl(var(--primary)) 25%, transparent 25%),
                  linear-gradient(-45deg, hsl(var(--primary)) 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, hsl(var(--primary)) 75%),
                  linear-gradient(-45deg, transparent 75%, hsl(var(--primary)) 75%)
                `,
                backgroundSize: '30px 30px',
                backgroundPosition: '0 0, 0 15px, 15px -15px, -15px 0px',
              }} />
            </div>
            {/* Subtle waves */}
            <div className="absolute bottom-0 left-0 right-0 h-40 overflow-hidden opacity-10">
              <div 
                className="absolute bottom-0 left-0 right-0 h-20 animate-pulse"
                style={{
                  background: 'linear-gradient(to top, hsl(var(--primary) / 0.3), transparent)',
                  borderRadius: '50% 50% 0 0',
                }}
              />
            </div>
          </>
        );
      case 'light':
        return (
          <>
            {/* Light theme subtle pattern */}
            <div className="absolute inset-0 opacity-[0.03]">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
              }} />
            </div>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-500/5" />
          </>
        );
      default:
        return null;
    }
  };

  const getParticleStyle = () => {
    switch (theme) {
      case 'cyber':
        return 'bg-cyan-400 shadow-[0_0_12px_rgba(0,255,255,0.9)]';
      case 'military':
        return 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.7)]';
      case 'classic':
        return 'bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]';
      case 'light':
        return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
      default:
        return 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]';
    }
  };

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Base gradient */}
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `
            radial-gradient(ellipse at 30% 0%, hsl(var(--primary) / 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 100%, hsl(var(--accent) / 0.08) 0%, transparent 50%)
          `,
        }}
      />

      {/* Theme-specific pattern */}
      {getBackgroundPattern()}

      {/* Animated grid lines */}
      {gridLines.map((line) => (
        <div
          key={line.id}
          className={`absolute bg-gradient-to-r from-transparent via-primary/10 to-transparent ${
            line.isHorizontal ? 'h-[1px] left-0 right-0' : 'w-[1px] top-0 bottom-0'
          }`}
          style={{
            [line.isHorizontal ? 'top' : 'left']: `${line.position}%`,
            animation: `pulse 4s ease-in-out ${line.delay}s infinite`,
          }}
        />
      ))}

      {/* Floating particles */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`absolute rounded-full ${getParticleStyle()} animate-float`}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Glow orbs with animation */}
      <div 
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl transition-all duration-1000 animate-pulse"
        style={{ 
          background: `hsl(var(--primary) / 0.12)`,
          animationDuration: '4s',
        }}
      />
      <div 
        className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl transition-all duration-1000 animate-pulse"
        style={{ 
          background: `hsl(var(--accent) / 0.1)`,
          animationDuration: '5s',
          animationDelay: '1s',
        }}
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-50 animate-pulse"
        style={{ 
          background: `radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)`,
          animationDuration: '6s',
          animationDelay: '2s',
        }}
      />

      {/* Vignette effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, hsl(var(--background) / 0.4) 100%)',
        }}
      />
    </div>
  );
}
