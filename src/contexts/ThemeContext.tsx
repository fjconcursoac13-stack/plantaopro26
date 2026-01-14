import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeType = 'tactical' | 'military' | 'cyber' | 'classic' | 'light';

interface ThemeConfig {
  id: ThemeType;
  name: string;
  description: string;
  icon: string;
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
}

export const themes: Record<ThemeType, ThemeConfig> = {
  tactical: {
    id: 'tactical',
    name: 'Tático',
    description: 'Tema padrão com cores âmbar e slate',
    icon: '🎯',
    colors: {
      primary: '38 92% 50%', // amber
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
  },
  military: {
    id: 'military',
    name: 'Militar',
    description: 'Estilo militar verde oliva',
    icon: '🪖',
    colors: {
      primary: '142 76% 36%', // green
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
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber',
    description: 'Futurista com cores neon',
    icon: '💻',
    colors: {
      primary: '187 85% 53%', // cyan
      primaryForeground: '222 47% 6%',
      accent: '280 85% 60%', // purple
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
  },
  classic: {
    id: 'classic',
    name: 'Clássico',
    description: 'Azul profissional institucional',
    icon: '🛡️',
    colors: {
      primary: '217 91% 50%', // blue
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
  },
  light: {
    id: 'light',
    name: 'Claro',
    description: 'Tema claro e profissional',
    icon: '☀️',
    colors: {
      primary: '217 91% 45%', // deeper blue for better contrast
      primaryForeground: '0 0% 100%',
      accent: '217 91% 50%',
      background: '210 40% 98%', // slightly warm white
      card: '0 0% 100%', // pure white cards
      border: '214 32% 85%', // more visible borders
      gradientFrom: '217 91% 45%',
      gradientTo: '200 85% 50%',
      foreground: '222 47% 11%', // dark text
      muted: '210 40% 94%', // subtle background
      mutedForeground: '215 20% 40%', // darker muted text for readability
      isLight: true,
    },
  },
};

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  themeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('plantaopro-theme');
    return (saved as ThemeType) || 'tactical';
  });

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('plantaopro-theme', newTheme);
  };

  // Apply theme CSS variables
  useEffect(() => {
    const config = themes[theme];
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
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeConfig: themes[theme] }}>
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
