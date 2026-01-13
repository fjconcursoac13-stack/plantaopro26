import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  Users,
  Clock,
  LayoutDashboard,
  Settings,
  Shield,
  UserCircle,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: UserCircle, label: 'Meu Painel', href: '/agent-panel' },
  { icon: Calendar, label: 'Escalas', href: '/shifts' },
  { icon: Users, label: 'Agentes', href: '/agents' },
  { icon: Clock, label: 'Banco de Horas', href: '/overtime' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
];

const adminItems = [
  { icon: Shield, label: 'Administração', href: '/admin' },
];

interface MobileSidebarProps {
  onNavigate: () => void;
}

export function MobileSidebar({ onNavigate }: MobileSidebarProps) {
  const location = useLocation();
  const { isAdmin, masterSession } = useAuth();

  const masterItems = [
    { icon: Shield, label: 'Painel Master', href: '/master' },
  ];

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Calendar className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-gradient">PlantaoPro</h1>
            <p className="text-xs text-muted-foreground">Gestão de Escalas</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary shadow-soft'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Admin Section */}
        {isAdmin && !masterSession && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary shadow-soft'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </>
        )}

        {/* Master Section */}
        {masterSession && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Master
              </p>
            </div>
            {masterItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary shadow-soft'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground text-center">
          PlantaoPro v1.0
        </p>
      </div>
    </div>
  );
}
