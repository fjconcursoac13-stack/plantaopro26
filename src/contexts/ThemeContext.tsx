import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeType = 'tactical' | 'military' | 'cyber' | 'classic';

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
    
    root.style.setProperty('--primary', config.colors.primary);
    root.style.setProperty('--primary-foreground', config.colors.primaryForeground);
    root.style.setProperty('--accent', config.colors.accent);
    root.style.setProperty('--background', config.colors.background);
    root.style.setProperty('--card', config.colors.card);
    root.style.setProperty('--border', config.colors.border);
    root.style.setProperty('--ring', config.colors.primary);
    root.style.setProperty('--sidebar-primary', config.colors.primary);
    
    // Update gradient
    root.style.setProperty('--gradient-primary', 
      `linear-gradient(135deg, hsl(${config.colors.gradientFrom}) 0%, hsl(${config.colors.gradientTo}) 100%)`
    );
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
