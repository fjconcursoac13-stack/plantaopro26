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
    onSelect?.();
  };

  const handleToggleSound = () => {
    toggleSound();
    if (!isSoundEnabled) {
      // Will play after toggle enables it
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
      <div className="flex items-center gap-2">
        {Object.values(themes).map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t.id)}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all",
              "border-2",
              theme === t.id
                ? "border-primary bg-primary/20 scale-110"
                : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/50"
            )}
            title={t.name}
          >
            {t.icon}
          </button>
        ))}
        <button
          onClick={handleToggleSound}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
            "border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-700/50",
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
        <p className="text-sm text-muted-foreground">Escolha seu tema visual</p>
        <button
          onClick={handleToggleSound}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm",
            "border border-slate-600 hover:border-slate-500 hover:bg-slate-700/50",
            isSoundEnabled && "text-primary border-primary/50"
          )}
        >
          {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <span>{isSoundEnabled ? 'Som Ativo' : 'Som Mudo'}</span>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Object.values(themes).map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t.id)}
            className={cn(
              "relative p-4 rounded-xl border-2 transition-all text-left group",
              "bg-gradient-to-br from-slate-800/80 to-slate-900/80",
              theme === t.id
                ? "border-primary shadow-lg shadow-primary/20"
                : "border-slate-700 hover:border-slate-600"
            )}
          >
            {theme === t.id && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{t.icon}</span>
              <span className="font-semibold text-white">{t.name}</span>
            </div>
            <p className="text-xs text-slate-400">{t.description}</p>
            {/* Color preview */}
            <div className="flex gap-1 mt-3">
              <div 
                className="w-4 h-4 rounded-full border border-slate-600"
                style={{ background: `hsl(${t.colors.primary})` }}
              />
              <div 
                className="w-4 h-4 rounded-full border border-slate-600"
                style={{ background: `hsl(${t.colors.accent})` }}
              />
              <div 
                className="w-4 h-4 rounded-full border border-slate-600"
                style={{ background: `hsl(${t.colors.background})` }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
