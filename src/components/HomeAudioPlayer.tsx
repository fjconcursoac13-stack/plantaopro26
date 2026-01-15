import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

interface HomeAudioPlayerProps {
  className?: string;
}

// Key for localStorage to persist user preference
const AUDIO_PREFERENCE_KEY = 'plantaopro_audio_enabled';

export function HomeAudioPlayer({ className }: HomeAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Load user preference on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem(AUDIO_PREFERENCE_KEY);
    // Default is OFF - audio only plays when user explicitly enables it
    if (savedPreference === 'true') {
      // User previously enabled audio - but don't auto-play
      // They need to click play again
    }
  }, []);
  
  // Create audio element
  useEffect(() => {
    audioRef.current = new Audio('/audio/plantao1.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;
    
    audioRef.current.addEventListener('ended', () => {
      // Switch to second track when first ends
      if (audioRef.current) {
        audioRef.current.src = '/audio/plantao2.mp3';
        audioRef.current.play();
      }
    });
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      localStorage.setItem(AUDIO_PREFERENCE_KEY, 'false');
    } else {
      audioRef.current.play().catch(() => {
        // Browser blocked autoplay
        console.log('Audio playback blocked');
      });
      setIsPlaying(true);
      setHasInteracted(true);
      localStorage.setItem(AUDIO_PREFERENCE_KEY, 'true');
    }
  };
  
  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className={cn(
      "flex items-center gap-1",
      className
    )}>
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={cn(
          "p-1.5 rounded-lg transition-all duration-300",
          isPlaying 
            ? "bg-primary/20 text-primary border border-primary/40 shadow-lg shadow-primary/20" 
            : "bg-muted/30 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 border border-transparent"
        )}
        title={isPlaying ? "Pausar música" : "Tocar música de abertura"}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
      </button>
      
      {/* Volume Button - only show when playing */}
      {isPlaying && (
        <button
          onClick={toggleMute}
          className={cn(
            "p-1.5 rounded-lg transition-all duration-300",
            "bg-muted/30 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50"
          )}
          title={isMuted ? "Ativar som" : "Silenciar"}
        >
          {isMuted ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>
      )}
      
      {/* Playing indicator */}
      {isPlaying && !isMuted && (
        <div className="flex items-center gap-0.5 ml-1">
          <div className="w-0.5 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-0.5 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-0.5 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          <div className="w-0.5 h-2.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
        </div>
      )}
    </div>
  );
}
