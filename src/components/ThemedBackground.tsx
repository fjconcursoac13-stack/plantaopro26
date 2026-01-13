import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';

export function ThemedBackground() {
  const { theme, themeConfig } = useTheme();
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; size: number }>>([]);

  useEffect(() => {
    // Generate particles based on theme
    const particleCount = theme === 'cyber' ? 30 : theme === 'military' ? 15 : 20;
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      size: Math.random() * 3 + 1,
    }));
    setParticles(newParticles);
  }, [theme]);

  const getBackgroundPattern = () => {
    switch (theme) {
      case 'tactical':
        return (
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }} />
          </div>
        );
      case 'military':
        return (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                radial-gradient(circle at 25% 25%, hsl(var(--primary) / 0.3) 2px, transparent 2px),
                radial-gradient(circle at 75% 75%, hsl(var(--primary) / 0.2) 1px, transparent 1px)
              `,
              backgroundSize: '30px 30px',
            }} />
            {/* Radar sweep effect */}
            <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20">
              <div className="absolute inset-0 rounded-full border border-primary/30" />
              <div className="absolute inset-[15%] rounded-full border border-primary/20" />
              <div className="absolute inset-[30%] rounded-full border border-primary/10" />
              <div 
                className="absolute inset-0 rounded-full animate-radar"
                style={{
                  background: `conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary) / 0.3) 30deg, transparent 60deg)`,
                }}
              />
            </div>
          </div>
        );
      case 'cyber':
        return (
          <div className="absolute inset-0 opacity-15">
            {/* Circuit pattern */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="circuit" patternUnits="userSpaceOnUse" width="100" height="100">
                  <path d="M10 10 H40 V40 H70 V70 H40 V100" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-primary" />
                  <path d="M60 0 V30 H100" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-accent" />
                  <circle cx="10" cy="10" r="2" fill="currentColor" className="text-primary" />
                  <circle cx="40" cy="40" r="2" fill="currentColor" className="text-accent" />
                  <circle cx="70" cy="70" r="2" fill="currentColor" className="text-primary" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#circuit)" />
            </svg>
            {/* Scan line effect */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)',
              }}
            />
          </div>
        );
      case 'classic':
        return (
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(45deg, hsl(var(--primary)) 25%, transparent 25%),
                linear-gradient(-45deg, hsl(var(--primary)) 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, hsl(var(--primary)) 75%),
                linear-gradient(-45deg, transparent 75%, hsl(var(--primary)) 75%)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }} />
          </div>
        );
      default:
        return null;
    }
  };

  const getParticleStyle = () => {
    switch (theme) {
      case 'cyber':
        return 'bg-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.8)]';
      case 'military':
        return 'bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.6)]';
      case 'classic':
        return 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.7)]';
      default:
        return 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]';
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Base gradient */}
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.15) 0%, transparent 60%)`,
        }}
      />

      {/* Theme-specific pattern */}
      {getBackgroundPattern()}

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
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Glow orbs */}
      <div 
        className="absolute -top-40 -left-40 w-80 h-80 rounded-full blur-3xl transition-all duration-1000"
        style={{ background: `hsl(var(--primary) / 0.1)` }}
      />
      <div 
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl transition-all duration-1000"
        style={{ background: `hsl(var(--accent) / 0.08)` }}
      />
    </div>
  );
}
