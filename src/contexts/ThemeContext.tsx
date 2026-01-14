import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Shield, Crosshair, Cpu, Award, Sun, Monitor, Flame, Snowflake, Radar, Eye } from 'lucide-react';

export type ThemeType = 'tactical' | 'military' | 'cyber' | 'classic' | 'light' | 'system' | 'crimson' | 'arctic' | 'stealth' | 'sentinel';

export interface ThemeConfig {
  id: ThemeType;
  name: string;
  description: string;
  icon: typeof Shield;
  emoji: string;
  colors: {
    primary: string;
    primaryForeground: string;
    accent: string;
    background: string;
    card: string;
    border: string;
    gradientFrom: string;
    gradientTo: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    isLight: boolean;
  };
  effects: {
    glowIntensity: 'low' | 'medium' | 'high';
    particleColor: string;
    scanlineOpacity: number;
  };
}

// Helper to detect system preference
const getSystemTheme = (): 'light' | 'tactical' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'tactical';
  }
  return 'tactical';
};

export const themes: Record<ThemeType, ThemeConfig> = {
  tactical: {
    id: 'tactical',
    name: 'Tático',
    description: 'Operações táticas com cores âmbar',
    icon: Crosshair,
    emoji: '🎯',
    colors: {
      primary: '38 92% 50%',
      primaryForeground: '222 47% 6%',
      accent: '38 92% 50%',
      background: '222 47% 6%',
      card: '222 47% 8%',
      border: '222 30% 18%',
      gradientFrom: '38 92% 50%',
      gradientTo: '25 95% 53%',
      foreground: '210 40% 98%',
      muted: '222 30% 12%',
      mutedForeground: '215 20% 55%',
      isLight: false,
    },
    effects: {
      glowIntensity: 'medium',
      particleColor: 'rgba(251, 191, 36, 0.6)',
      scanlineOpacity: 0.03,
    },
  },
  military: {
    id: 'military',
    name: 'Militar',
    description: 'Estilo militar verde oliva',
    icon: Shield,
    emoji: '🪖',
    colors: {
      primary: '142 76% 36%',
      primaryForeground: '210 40% 98%',
      accent: '142 76% 36%',
      background: '160 30% 6%',
      card: '160 30% 8%',
      border: '160 20% 18%',
      gradientFrom: '142 76% 36%',
      gradientTo: '120 60% 30%',
      foreground: '210 40% 98%',
      muted: '160 20% 12%',
      mutedForeground: '160 15% 55%',
      isLight: false,
    },
    effects: {
      glowIntensity: 'low',
      particleColor: 'rgba(34, 197, 94, 0.5)',
      scanlineOpacity: 0.05,
    },
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber',
    description: 'Futurista com cores neon',
    icon: Cpu,
    emoji: '💻',
    colors: {
      primary: '187 85% 53%',
      primaryForeground: '222 47% 6%',
      accent: '280 85% 60%',
      background: '240 20% 5%',
      card: '240 20% 8%',
      border: '240 15% 18%',
      gradientFrom: '187 85% 53%',
      gradientTo: '280 85% 60%',
      foreground: '210 40% 98%',
      muted: '240 15% 12%',
      mutedForeground: '240 10% 55%',
      isLight: false,
    },
    effects: {
      glowIntensity: 'high',
      particleColor: 'rgba(6, 182, 212, 0.7)',
      scanlineOpacity: 0.08,
    },
  },
  classic: {
    id: 'classic',
    name: 'Clássico',
    description: 'Azul institucional profissional',
    icon: Award,
    emoji: '🛡️',
    colors: {
      primary: '217 91% 50%',
      primaryForeground: '210 40% 98%',
      accent: '217 91% 60%',
      background: '222 47% 6%',
      card: '222 47% 8%',
      border: '217 30% 18%',
      gradientFrom: '217 91% 50%',
      gradientTo: '200 85% 45%',
      foreground: '210 40% 98%',
      muted: '222 30% 12%',
      mutedForeground: '217 20% 55%',
      isLight: false,
    },
    effects: {
      glowIntensity: 'medium',
      particleColor: 'rgba(59, 130, 246, 0.5)',
      scanlineOpacity: 0.02,
    },
  },
  crimson: {
    id: 'crimson',
    name: 'Força Especial',
    description: 'Vermelho operacional de elite',
    icon: Flame,
    emoji: '🔥',
    colors: {
      primary: '0 84% 50%',
      primaryForeground: '210 40% 98%',
      accent: '15 90% 55%',
      background: '0 20% 5%',
      card: '0 20% 8%',
      border: '0 15% 18%',
      gradientFrom: '0 84% 50%',
      gradientTo: '15 90% 45%',
      foreground: '210 40% 98%',
      muted: '0 15% 12%',
      mutedForeground: '0 10% 55%',
      isLight: false,
    },
    effects: {
      glowIntensity: 'high',
      particleColor: 'rgba(239, 68, 68, 0.6)',
      scanlineOpacity: 0.04,
    },
  },
  arctic: {
    id: 'arctic',
    name: 'Ártico',
    description: 'Operações frias e precisas',
    icon: Snowflake,
    emoji: '❄️',
    colors: {
      primary: '200 95% 48%',
      primaryForeground: '222 47% 6%',
      accent: '180 85% 50%',
      background: '210 25% 8%',
      card: '210 25% 10%',
      border: '210 20% 20%',
      gradientFrom: '200 95% 48%',
      gradientTo: '180 85% 45%',
      foreground: '210 40% 98%',
      muted: '210 20% 14%',
      mutedForeground: '210 15% 55%',
      isLight: false,
    },
    effects: {
      glowIntensity: 'medium',
      particleColor: 'rgba(56, 189, 248, 0.5)',
      scanlineOpacity: 0.02,
    },
  },
  stealth: {
    id: 'stealth',
    name: 'Furtivo',
    description: 'Operações cobertas noturnas',
    icon: Eye,
    emoji: '🌑',
    colors: {
      primary: '270 50% 45%',
      primaryForeground: '210 40% 98%',
      accent: '280 60% 55%',
      background: '270 15% 4%',
      card: '270 15% 7%',
      border: '270 12% 15%',
      gradientFrom: '270 50% 45%',
      gradientTo: '280 60% 40%',
      foreground: '270 10% 90%',
      muted: '270 12% 10%',
      mutedForeground: '270 8% 50%',
      isLight: false,
    },
    effects: {
      glowIntensity: 'low',
      particleColor: 'rgba(139, 92, 246, 0.4)',
      scanlineOpacity: 0.06,
    },
  },
  sentinel: {
    id: 'sentinel',
    name: 'Sentinela',
    description: 'Vigilância com radar verde',
    icon: Radar,
    emoji: '📡',
    colors: {
      primary: '120 100% 35%',
      primaryForeground: '0 0% 5%',
      accent: '140 80% 40%',
      background: '120 20% 4%',
      card: '120 20% 6%',
      border: '120 15% 14%',
      gradientFrom: '120 100% 35%',
      gradientTo: '140 80% 30%',
      foreground: '120 50% 90%',
      muted: '120 15% 10%',
      mutedForeground: '120 10% 50%',
      isLight: false,
    },
    effects: {
      glowIntensity: 'high',
      particleColor: 'rgba(34, 197, 94, 0.7)',
      scanlineOpacity: 0.1,
    },
  },
  light: {
    id: 'light',
    name: 'Diurno',
    description: 'Tema claro profissional',
    icon: Sun,
    emoji: '☀️',
    colors: {
      primary: '217 91% 40%',
      primaryForeground: '0 0% 100%',
      accent: '217 91% 45%',
      background: '210 40% 98%',
      card: '0 0% 100%',
      border: '214 32% 80%',
      gradientFrom: '217 91% 40%',
      gradientTo: '200 85% 45%',
      foreground: '222 47% 11%',
      muted: '210 40% 94%',
      mutedForeground: '215 25% 35%',
      isLight: true,
    },
    effects: {
      glowIntensity: 'low',
      particleColor: 'rgba(59, 130, 246, 0.3)',
      scanlineOpacity: 0,
    },
  },
  system: {
    id: 'system',
    name: 'Automático',
    description: 'Segue preferência do sistema',
    icon: Monitor,
    emoji: '🖥️',
    colors: {
      primary: '38 92% 50%',
      primaryForeground: '222 47% 6%',
      accent: '38 92% 50%',
      background: '222 47% 6%',
      card: '222 47% 8%',
      border: '222 30% 18%',
      gradientFrom: '38 92% 50%',
      gradientTo: '25 95% 53%',
      foreground: '210 40% 98%',
      muted: '222 30% 12%',
      mutedForeground: '215 20% 55%',
      isLight: false,
    },
    effects: {
      glowIntensity: 'medium',
      particleColor: 'rgba(251, 191, 36, 0.6)',
      scanlineOpacity: 0.03,
    },
  },
};

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  themeConfig: ThemeConfig;
  resolvedTheme: Exclude<ThemeType, 'system'>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('plantaopro-theme');
    return (saved as ThemeType) || 'tactical';
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'tactical'>(getSystemTheme);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'light' : 'tactical');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('plantaopro-theme', newTheme);
  }, []);

  // Resolve 'system' to actual theme
  const resolvedTheme: Exclude<ThemeType, 'system'> = theme === 'system' ? systemTheme : theme;

  // Get the actual config to apply
  const activeConfig = themes[resolvedTheme];

  // Apply theme CSS variables
  useEffect(() => {
    const config = activeConfig;
    const root = document.documentElement;
    
    // Core colors
    root.style.setProperty('--primary', config.colors.primary);
    root.style.setProperty('--primary-foreground', config.colors.primaryForeground);
    root.style.setProperty('--accent', config.colors.accent);
    root.style.setProperty('--accent-foreground', config.colors.primaryForeground);
    root.style.setProperty('--background', config.colors.background);
    root.style.setProperty('--foreground', config.colors.foreground);
    root.style.setProperty('--card', config.colors.card);
    root.style.setProperty('--card-foreground', config.colors.foreground);
    root.style.setProperty('--popover', config.colors.card);
    root.style.setProperty('--popover-foreground', config.colors.foreground);
    root.style.setProperty('--muted', config.colors.muted);
    root.style.setProperty('--muted-foreground', config.colors.mutedForeground);
    root.style.setProperty('--border', config.colors.border);
    root.style.setProperty('--input', config.colors.isLight ? config.colors.muted : config.colors.muted);
    root.style.setProperty('--ring', config.colors.primary);
    
    // Secondary colors
    root.style.setProperty('--secondary', config.colors.muted);
    root.style.setProperty('--secondary-foreground', config.colors.foreground);
    
    // Sidebar colors
    root.style.setProperty('--sidebar-background', config.colors.isLight ? config.colors.card : config.colors.background);
    root.style.setProperty('--sidebar-foreground', config.colors.isLight ? config.colors.mutedForeground : config.colors.foreground);
    root.style.setProperty('--sidebar-primary', config.colors.primary);
    root.style.setProperty('--sidebar-primary-foreground', config.colors.primaryForeground);
    root.style.setProperty('--sidebar-accent', config.colors.muted);
    root.style.setProperty('--sidebar-accent-foreground', config.colors.foreground);
    root.style.setProperty('--sidebar-border', config.colors.border);
    root.style.setProperty('--sidebar-ring', config.colors.primary);
    
    // Update gradient
    root.style.setProperty('--gradient-primary', 
      `linear-gradient(135deg, hsl(${config.colors.gradientFrom}) 0%, hsl(${config.colors.gradientTo}) 100%)`
    );
    
    // Update gradient dark for light theme
    if (config.colors.isLight) {
      root.style.setProperty('--gradient-dark', 
        `linear-gradient(180deg, hsl(${config.colors.background}) 0%, hsl(210 40% 96%) 100%)`
      );
    } else {
      root.style.setProperty('--gradient-dark', 
        `linear-gradient(180deg, hsl(${config.colors.card}) 0%, hsl(${config.colors.background}) 100%)`
      );
    }
    
    // Add/remove light theme class
    if (config.colors.isLight) {
      root.classList.add('light-theme');
      root.classList.remove('dark');
    } else {
      root.classList.remove('light-theme');
      root.classList.add('dark');
    }
  }, [activeConfig]);

  // For display purposes, use the stored theme but provide resolved config
  const displayConfig = theme === 'system' ? themes.system : themes[theme];

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      themeConfig: displayConfig,
      resolvedTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
