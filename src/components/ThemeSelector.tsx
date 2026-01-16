import { useTheme, themes, ThemeType } from '@/contexts/ThemeContext';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { Check, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeSelectorProps {
  onSelect?: () => void;
  compact?: boolean;
}

export function ThemeSelector({ onSelect, compact = false }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();
  const { playSound, isSoundEnabled, toggleSound } = useSoundEffects();

  const handleSelect = (themeId: ThemeType) => {
    playSound('theme-change');
    setTheme(themeId);
    // Auto-close after theme selection
    setTimeout(() => {
      onSelect?.();
    }, 150);
  };

  const handleToggleSound = () => {
    toggleSound();
    if (!isSoundEnabled) {
      setTimeout(() => {
        const audio = new AudioContext();
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.frequency.value = 500;
        gain.gain.value = 0.1;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.1);
        osc.stop(audio.currentTime + 0.1);
      }, 50);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {Object.values(themes).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg",
                "border-2",
                theme === t.id
                  ? "border-primary bg-primary/25 scale-110 shadow-primary/30"
                  : "border-slate-600 bg-slate-800/60 hover:border-primary/50 hover:bg-slate-700/70 hover:scale-105"
              )}
              title={t.name}
            >
              <Icon className="h-6 w-6" style={{ color: theme === t.id ? `hsl(${t.colors.primary})` : undefined }} />
            </button>
          );
        })}
        <button
          onClick={handleToggleSound}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg",
            "border-2 border-slate-600 bg-slate-800/60 hover:border-amber-500/50 hover:bg-slate-700/70",
            isSoundEnabled && "text-amber-400 border-amber-500/50 bg-amber-500/10"
          )}
          title={isSoundEnabled ? 'Desativar sons' : 'Ativar sons'}
        >
          {isSoundEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20 border border-primary/40">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">Tema Visual</p>
            <p className="text-sm text-muted-foreground">Escolha seu estilo operacional</p>
          </div>
        </div>
        <button
          onClick={handleToggleSound}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 text-sm font-semibold",
            "border-2 shadow-lg",
            isSoundEnabled 
              ? "bg-amber-500/15 border-amber-500/50 text-amber-400 hover:bg-amber-500/25" 
              : "bg-slate-800/60 border-slate-600 text-slate-400 hover:border-slate-500 hover:bg-slate-700/60"
          )}
        >
          {isSoundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          <span>{isSoundEnabled ? 'Som Ativo' : 'Som Mudo'}</span>
        </button>
      </div>
      
      {/* Theme Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Object.values(themes).map((t) => {
          const Icon = t.icon;
          const isSelected = theme === t.id;
          
          return (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={cn(
                "relative p-5 rounded-2xl border-3 transition-all duration-300 text-left group overflow-hidden",
                "bg-gradient-to-br from-slate-800/90 via-slate-800/70 to-slate-900/90",
                isSelected
                  ? "border-primary shadow-xl shadow-primary/25 scale-[1.02]"
                  : "border-slate-700/60 hover:border-slate-600 hover:shadow-lg hover:scale-[1.01]"
              )}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/50">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              
              {/* Background glow for selected */}
              {isSelected && (
                <div 
                  className="absolute inset-0 opacity-20 blur-xl"
                  style={{ background: `linear-gradient(135deg, hsl(${t.colors.gradientFrom}) 0%, hsl(${t.colors.gradientTo}) 100%)` }}
                />
              )}
              
              {/* Icon and name */}
              <div className="flex items-center gap-4 mb-3 relative">
                <div 
                  className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300",
                    isSelected ? "scale-110" : "group-hover:scale-105"
                  )}
                  style={{ background: `linear-gradient(135deg, hsl(${t.colors.gradientFrom}) 0%, hsl(${t.colors.gradientTo}) 100%)` }}
                >
                  <Icon className="h-7 w-7 text-white drop-shadow-lg" />
                </div>
                <span className={cn(
                  "text-lg font-bold transition-colors",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {t.name}
                </span>
              </div>
              
              {/* Description */}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 relative">{t.description}</p>
              
              {/* Color preview */}
              <div className="flex gap-2 relative">
                <div 
                  className="w-7 h-7 rounded-full border-2 border-slate-600/50 shadow-md transition-transform group-hover:scale-110"
                  style={{ background: `hsl(${t.colors.primary})` }}
                  title="Cor primária"
                />
                <div 
                  className="w-7 h-7 rounded-full border-2 border-slate-600/50 shadow-md transition-transform group-hover:scale-110"
                  style={{ background: `hsl(${t.colors.accent})` }}
                  title="Cor de destaque"
                />
                <div 
                  className="w-7 h-7 rounded-full border-2 border-slate-600/50 shadow-md transition-transform group-hover:scale-110"
                  style={{ background: `hsl(${t.colors.background})` }}
                  title="Fundo"
                />
                <div 
                  className="w-7 h-7 rounded-full border-2 border-slate-600/50 shadow-md transition-transform group-hover:scale-110"
                  style={{ background: `hsl(${t.colors.card})` }}
                  title="Card"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
