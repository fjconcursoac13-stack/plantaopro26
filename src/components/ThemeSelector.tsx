import { useTheme, themes, ThemeType } from '@/contexts/ThemeContext';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { Check, Volume2, VolumeX } from 'lucide-react';
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
      <div className="flex items-center gap-2 flex-wrap">
        {Object.values(themes).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                "border-2",
                theme === t.id
                  ? "border-primary bg-primary/20 scale-110"
                  : "border-muted hover:border-muted-foreground hover:bg-muted/50"
              )}
              title={t.name}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
        <button
          onClick={handleToggleSound}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
            "border-2 border-muted hover:border-muted-foreground hover:bg-muted/50",
            isSoundEnabled && "text-primary"
          )}
          title={isSoundEnabled ? 'Desativar sons' : 'Ativar sons'}
        >
          {isSoundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Escolha seu tema operacional</p>
        <button
          onClick={handleToggleSound}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm",
            "border border-muted hover:border-muted-foreground hover:bg-muted/50",
            isSoundEnabled && "text-primary border-primary/50"
          )}
        >
          {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <span>{isSoundEnabled ? 'Som Ativo' : 'Som Mudo'}</span>
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.values(themes).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all text-left group",
                "bg-gradient-to-br from-card/80 to-background/80",
                theme === t.id
                  ? "border-primary shadow-lg shadow-primary/20"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              {theme === t.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, hsl(${t.colors.gradientFrom}) 0%, hsl(${t.colors.gradientTo}) 100%)` }}
                >
                  <Icon className="h-5 w-5 text-white drop-shadow" />
                </div>
                <span className="font-semibold text-foreground">{t.name}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
              {/* Color preview */}
              <div className="flex gap-1.5 mt-3">
                <div 
                  className="w-5 h-5 rounded-full border border-border shadow-sm"
                  style={{ background: `hsl(${t.colors.primary})` }}
                  title="Cor primária"
                />
                <div 
                  className="w-5 h-5 rounded-full border border-border shadow-sm"
                  style={{ background: `hsl(${t.colors.accent})` }}
                  title="Cor de destaque"
                />
                <div 
                  className="w-5 h-5 rounded-full border border-border shadow-sm"
                  style={{ background: `hsl(${t.colors.background})` }}
                  title="Fundo"
                />
                <div 
                  className="w-5 h-5 rounded-full border border-border shadow-sm"
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
