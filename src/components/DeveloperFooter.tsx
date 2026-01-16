import { cn } from '@/lib/utils';
import { Shield, Zap, Radio, Code2 } from 'lucide-react';

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
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        {/* Tactical Badge */}
        <div className="relative p-1.5 sm:p-2 rounded-lg bg-primary/10 border border-primary/30">
          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <div className="absolute inset-0 blur-md bg-primary/20 rounded-lg" />
        </div>
        
        {/* Developer Name with Tactical Effect */}
        <div className="relative group">
          <div className="flex items-center gap-2">
            <Code2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
            <span className={cn(
              "text-xs sm:text-sm font-black tracking-[0.15em] uppercase",
              "bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent"
            )}
            style={{
              textShadow: '0 0 20px hsl(var(--primary) / 0.4), 0 0 40px hsl(var(--primary) / 0.2)',
            }}
            >
              FRANC D'NIS
            </span>
          </div>
          
          {/* Glow underline */}
          <div 
            className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            style={{
              boxShadow: '0 0 8px hsl(var(--primary) / 0.5)',
            }}
          />
        </div>
        
        {/* Secondary Badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30">
          <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
          <span className="text-[10px] sm:text-xs font-semibold text-amber-400 tracking-wider">
            DEV
          </span>
        </div>
        
        {/* Location */}
        <div className="hidden sm:flex items-center gap-2 text-slate-500">
          <span className="text-xs font-medium tracking-wider">
            FEIJÓ/AC
          </span>
          <Radio className="h-3 w-3 text-green-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
