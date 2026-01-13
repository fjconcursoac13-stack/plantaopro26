import React, { useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
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
import { Bell, LogOut, Menu, Settings, User, Building2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MobileSidebar } from './MobileSidebar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const Header = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>((props, ref) => {
  const { user, signOut, userRole, masterSession } = useAuth();
  const { agent } = useAgentProfile();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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
      <div className="hidden lg:block">
        <h2 className="text-sm font-medium text-muted-foreground">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </h2>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 pl-2 pr-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium truncate max-w-[150px]">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground">{getRoleBadge()}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
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
