import { cn } from '@/lib/utils';
import { Heart } from 'lucide-react';

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
      <p className="text-[10px] sm:text-xs text-muted-foreground/70 flex items-center justify-center gap-1.5">
        <span>Desenvolvido com</span>
        <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
        <span>por</span>
        <strong className="text-foreground/80 font-semibold">Franc Denis de Souza e Silva</strong>
        <span className="hidden sm:inline">• Feijó, Acre</span>
      </p>
    </div>
  );
}
