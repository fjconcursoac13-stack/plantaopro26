import React, { useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, LogOut, Menu, Settings, User, Volume2, VolumeX } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MobileSidebar } from './MobileSidebar';
import { OperationalStatus } from './OperationalStatus';
import { cn } from '@/lib/utils';

export const Header = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>((props, ref) => {
  const { user, signOut, userRole, masterSession } = useAuth();
  const { agent } = useAgentProfile();
  const { playSound, isSoundEnabled, toggleSound } = useSoundEffects();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (path: string) => {
    playSound('tactical-click');
    navigate(path);
  };

  const handleSignOut = async () => {
    playSound('radio-static');
    await signOut();
    navigate('/auth');
  };

  const handleNotificationClick = () => {
    playSound('tactical-click');
  };

  const getInitials = () => {
    if (agent?.name) {
      const names = agent.name.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return agent.name.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (masterSession) {
      return `Admin: ${masterSession}`;
    }
    if (agent?.name) {
      return agent.name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Usuário';
  };

  const getRoleBadge = () => {
    if (masterSession) {
      return 'Master Admin';
    }
    switch (userRole) {
      case 'master':
        return 'Master';
      case 'admin':
        return 'Admin';
      default:
        // Show agent's actual role
        const agentRole = agent?.role;
        if (agentRole === 'team_leader') {
          return 'Chefe de Equipe';
        } else if (agentRole === 'support') {
          return 'Apoio';
        }
        return agent?.team ? `Equipe ${agent.team}` : 'Agente';
    }
  };

  return (
    <header ref={ref} {...props} className={cn("h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6", props.className)}>
      {/* Mobile Menu */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <MobileSidebar onNavigate={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Search / Title - placeholder for now */}
      <div className="hidden lg:flex items-center gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </h2>
      </div>

      {/* Operational Status - Center */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
        <OperationalStatus />
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Sound Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={() => {
            toggleSound();
            playSound('tactical-click');
          }}
          title={isSoundEnabled ? 'Desativar sons' : 'Ativar sons'}
        >
          {isSoundEnabled ? (
            <Volume2 className="h-4 w-4 text-primary" />
          ) : (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-8 w-8"
          onClick={handleNotificationClick}
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 pl-2 pr-3 h-9"
              onClick={() => playSound('tactical-hover')}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium truncate max-w-[120px]">{getDisplayName()}</p>
                <p className="text-[10px] text-muted-foreground">{getRoleBadge()}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleNavigate('/settings')}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
