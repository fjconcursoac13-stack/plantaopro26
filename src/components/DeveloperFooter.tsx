import { cn } from '@/lib/utils';
import { Shield, Zap, Radio } from 'lucide-react';

interface DeveloperFooterProps {
  className?: string;
  variant?: 'light' | 'dark' | 'transparent';
}

export function DeveloperFooter({ className, variant = 'transparent' }: DeveloperFooterProps) {
  return (
    <div className={cn(
      "text-center py-2 px-4",
      variant === 'light' && "bg-background/60 backdrop-blur-sm",
      variant === 'dark' && "bg-slate-900/80 backdrop-blur-sm",
      variant === 'transparent' && "bg-transparent",
      className
    )}>
      <div className="flex items-center justify-center gap-2">
        {/* Tactical Badge */}
        <div className="relative">
          <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary animate-pulse" />
          <div className="absolute inset-0 blur-sm bg-primary/30 rounded-full" />
        </div>
        
        {/* Developer Name with Tactical Effect */}
        <div className="relative group">
          <span className={cn(
            "text-[10px] sm:text-xs font-black tracking-[0.2em] uppercase",
            "bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent",
            "drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]",
            "animate-pulse"
          )}
          style={{
            textShadow: '0 0 20px hsl(var(--primary) / 0.4), 0 0 40px hsl(var(--primary) / 0.2)',
            animationDuration: '3s',
          }}
          >
            FRANC D'NIS
          </span>
          
          {/* Glow underline */}
          <div 
            className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"
            style={{
              boxShadow: '0 0 10px hsl(var(--primary) / 0.6)',
            }}
          />
        </div>
        
        {/* Secondary Badge */}
        <div className="relative">
          <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" />
        </div>
        
        {/* Location - subtle */}
        <span className="text-[8px] sm:text-[9px] text-muted-foreground/50 tracking-wider hidden sm:inline">
          FEIJÓ/AC
        </span>
        
        {/* Tactical indicator */}
        <Radio className="h-2.5 w-2.5 text-green-500 animate-pulse hidden sm:block" />
      </div>
    </div>
  );
}
