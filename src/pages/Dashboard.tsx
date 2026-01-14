import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useLicenseCheck } from '@/hooks/useLicenseCheck';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ShiftTracker } from '@/components/agent-panel/ShiftTracker';
import { AgentUpcomingCard } from '@/components/agent-panel/AgentUpcomingCard';
import { ShiftCalendar } from '@/components/dashboard/ShiftCalendar';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { OvertimeChart } from '@/components/dashboard/OvertimeChart';
import { TeamShiftsPanel } from '@/components/dashboard/TeamShiftsPanel';
import { ShiftConflictsBanner } from '@/components/dashboard/ShiftConflictsBanner';
import { useShiftConflictDetection } from '@/hooks/useShiftConflictDetection';
import { ContributionMessage } from '@/components/ContributionMessage';
import { UnitInfoCard } from '@/components/dashboard/UnitInfoCard';
import { TeamUnlinkDialog } from '@/components/agents/TeamUnlinkDialog';
import { TransferRequestDialog } from '@/components/agents/TransferRequestDialog';
import { LicenseWarningBanner } from '@/components/LicenseWarningBanner';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { Users, Clock, Calendar, TrendingUp, Loader2, MapPin, Shield, Building2, Settings, MessageSquare, ArrowLeft, WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';

interface DashboardStats {
  totalAgents: number;
  activeShifts: number;
  totalHoursThisMonth: number;
  overtimeBalance: number;
  pendingTransfers: number;
  pendingLeaves: number;
}

export default function Dashboard() {
  const { user, isLoading, isAdmin, masterSession } = useAuth();
  const { agent, isLoading: isLoadingAgent } = useAgentProfile();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    activeShifts: 0,
    totalHoursThisMonth: 0,
    overtimeBalance: 0,
    pendingTransfers: 0,
    pendingLeaves: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [showContribution, setShowContribution] = useState(false);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [showTransferRequest, setShowTransferRequest] = useState(false);

  // Shift conflict detection for admins
  const {
    conflicts,
    isChecking: isCheckingConflicts,
    checkForConflicts,
    dismissConflict,
  } = useShiftConflictDetection({
    enabled: true,
    isAdmin: isAdmin || !!masterSession,
    unitId: agent?.unit_id || null,
  });

  // ESC key navigation - goes back to previous page or home
  useBackNavigation({ enabled: true, fallbackPath: '/' });

  // Session persistence with retry logic
  const { 
    isOnline, 
    isRetrying, 
    retryCount, 
    maxRetries,
    manualRetry 
  } = useSessionPersistence({
    onConnectionLost: () => {
      toast({
        title: 'Conexão perdida',
        description: 'Tentando reconectar automaticamente...',
        variant: 'destructive',
      });
    },
    onConnectionRestored: () => {
      toast({
        title: 'Conexão restaurada',
        description: 'Sua sessão foi recuperada com sucesso.',
      });
    },
    onMaxRetriesReached: () => {
      toast({
        title: 'Falha na reconexão',
        description: 'Não foi possível restaurar a sessão. Por favor, faça login novamente.',
        variant: 'destructive',
      });
    },
  });

  // License check with warning banner (skip for master admin)
  const {
    showWarning: showLicenseWarning,
    secondsUntilLogout,
    licenseStatus,
  } = useLicenseCheck({
    licenseStatus: agent?.license_status ?? null,
    licenseExpiresAt: agent?.license_expires_at ?? null,
    enabled: !!agent && !masterSession,
    warningDurationSeconds: 15,
    autoLogout: false,
    skipForMaster: true,
    isMasterSession: !!masterSession,
  });

  // Check if we should show contribution message (first access of the day)
  useEffect(() => {
    const lastShown = localStorage.getItem('contribution_last_shown');
    const today = new Date().toDateString();
    
    if (lastShown !== today && user) {
      // Show after a brief delay
      const timer = setTimeout(() => {
        setShowContribution(true);
        localStorage.setItem('contribution_last_shown', today);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Redirect only after loading is complete and we're sure there's no session
  useEffect(() => {
    if (isLoading) return;
    
    // Don't redirect if we have any valid session
    if (user || masterSession) return;
    
    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      navigate('/auth', { replace: true });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [user, isLoading, navigate, masterSession]);

  useEffect(() => {
    if (user || masterSession) {
      fetchStats();
    }
  }, [user, masterSession]);

  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      
      // Fetch agents count
      const { count: agentsCount } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      // Fetch today's shifts from agent_shifts
      const today = new Date().toISOString().split('T')[0];
      const { count: shiftsCount } = await supabase
        .from('agent_shifts')
        .select('*', { count: 'exact', head: true })
        .eq('shift_date', today)
        .neq('status', 'vacation');
      
      // Calculate overtime balance
      const { data: overtimeData } = await supabase
        .from('overtime_bank')
        .select('hours, operation_type');
      
      let overtimeBalance = 0;
      if (overtimeData) {
        overtimeBalance = overtimeData.reduce((acc, item) => {
          return item.operation_type === 'credit' 
            ? acc + Number(item.hours) 
            : acc - Number(item.hours);
        }, 0);
      }

      // Fetch pending transfer requests
      const { count: pendingTransfers } = await supabase
        .from('transfer_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch pending leave requests
      const { count: pendingLeaves } = await supabase
        .from('agent_leaves')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      setStats({
        totalAgents: agentsCount || 0,
        activeShifts: shiftsCount || 0,
        totalHoursThisMonth: 0,
        overtimeBalance,
        pendingTransfers: pendingTransfers || 0,
        pendingLeaves: pendingLeaves || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only allow authenticated agent users or Master Admin
  if (!user && !masterSession) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* License Warning Banner */}
      {showLicenseWarning && (
        <LicenseWarningBanner
          licenseStatus={licenseStatus}
          expiresAt={(agent as any)?.license_expires_at || null}
          secondsUntilLogout={secondsUntilLogout}
          onContactAdmin={() => {
            toast({
              title: 'Contato do Administrador',
              description: 'Entre em contato pelo e-mail: admin@plantaopro.app',
            });
          }}
        />
      )}

      {/* Connection Status Banners */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-yellow-600 text-white px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Sem conexão com a internet</span>
        </div>
      )}

      {isRetrying && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">
            Reconectando... (tentativa {retryCount}/{maxRetries})
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 ml-2"
            onClick={manualRetry}
          >
            Tentar agora
          </Button>
        </div>
      )}

      {showContribution && (
        <ContributionMessage onClose={() => setShowContribution(false)} />
      )}
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className={`flex-1 p-3 md:p-4 overflow-auto ${showLicenseWarning ? 'pt-32' : ''} ${(!isOnline || isRetrying) ? 'pt-12' : ''}`}>
          <div className="max-w-7xl mx-auto space-y-4 animate-fade-in">
            {/* Compact Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3">
                {masterSession && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/master')}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Master
                  </Button>
                )}
                <div>
                  <h1 className="text-lg md:text-xl font-bold">Dashboard</h1>
                  <p className="text-xs text-muted-foreground">
                    Sistema de Escalas
                  </p>
                </div>
              </div>
              
              {/* Compact Agent Unit Card */}
              {agent && agent.unit && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500/20 to-amber-600/10 rounded-lg border border-amber-500/30">
                  <Building2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white truncate">{agent.unit.name}</span>
                      {agent.team && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-400 border-amber-400/50">
                          Eq. {agent.team}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="h-2.5 w-2.5" />
                      <span>{agent.unit.municipality}</span>
                    </div>
                  </div>
                  {agent.team && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTeamManagement(true)}
                      className="h-7 w-7 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Shift Conflicts Banner - Admin only */}
            {(isAdmin || masterSession) && conflicts.length > 0 && (
              <ShiftConflictsBanner
                conflicts={conflicts}
                isChecking={isCheckingConflicts}
                onRefresh={checkForConflicts}
                onDismiss={dismissConflict}
              />
            )}

            {/* Compact Stats Grid - 2x2 on mobile, 4 cols on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatsCard
                title="Agentes"
                value={stats.totalAgents}
                icon={Users}
                loading={isLoadingStats}
              />
              <StatsCard
                title="Plantões Hoje"
                value={stats.activeShifts}
                icon={Calendar}
                loading={isLoadingStats}
              />
              <StatsCard
                title="Horas/Mês"
                value={stats.totalHoursThisMonth}
                icon={Clock}
                loading={isLoadingStats}
              />
              <StatsCard
                title="Banco de Horas"
                value={`${stats.overtimeBalance > 0 ? '+' : ''}${stats.overtimeBalance.toFixed(0)}h`}
                icon={TrendingUp}
                trend={stats.overtimeBalance >= 0 ? 'positivo' : ''}
                loading={isLoadingStats}
              />
            </div>

            {/* Agent Shift Timer and Upcoming Events - Compact Grid */}
            {agent && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <ShiftTracker agentId={agent.id} />
                <AgentUpcomingCard agentId={agent.id} />
              </div>
            )}

            {/* Compact Quick Access */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { 
                  icon: Building2, 
                  text: 'Unidades', 
                  color: 'text-blue-400', 
                  bg: 'from-blue-500/20 to-blue-600/10', 
                  route: '/units',
                  count: null
                },
                { 
                  icon: Users, 
                  text: 'Equipes', 
                  color: 'text-green-400', 
                  bg: 'from-green-500/20 to-green-600/10', 
                  route: '/agents',
                  count: stats.pendingTransfers
                },
                { 
                  icon: Clock, 
                  text: 'BH', 
                  color: 'text-amber-400', 
                  bg: 'from-amber-500/20 to-amber-600/10', 
                  route: '/overtime',
                  count: null
                },
                { 
                  icon: MessageSquare, 
                  text: 'Meu Painel', 
                  color: 'text-purple-400', 
                  bg: 'from-purple-500/20 to-purple-600/10', 
                  route: '/agent-panel',
                  count: stats.pendingLeaves
                },
              ].map((feature, i) => (
                <div 
                  key={i}
                  onClick={() => navigate(feature.route)}
                  className={`relative flex items-center gap-2 p-2.5 bg-gradient-to-br ${feature.bg} rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer group`}
                >
                  <div className={`p-1.5 rounded bg-slate-800/50 ${feature.color} group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-300">{feature.text}</span>
                  {feature.count !== null && feature.count > 0 && (
                    <Badge className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] px-1 py-0 min-w-[16px] h-4 flex items-center justify-center">
                      {feature.count}
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Compact Charts and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2">
                <ShiftCalendar />
              </div>
              <div className="space-y-3">
                <RecentActivity />
                {agent?.unit_id && <UnitInfoCard unitId={agent.unit_id} />}
              </div>
            </div>

            {/* Team Shifts Panel - Admin only */}
            {(isAdmin || masterSession) && (
              <TeamShiftsPanel />
            )}

            {/* Overtime Chart - Admin only */}
            {isAdmin && (
              <OvertimeChart />
            )}

            {/* Overtime Chart */}
            {isAdmin && (
              <div>
                <OvertimeChart />
              </div>
            )}

            {/* Team Management Dialog */}
            {agent && (
              <>
                <TeamUnlinkDialog
                  open={showTeamManagement}
                  onOpenChange={setShowTeamManagement}
                  agentId={agent.id}
                  agentName={agent.name}
                  currentTeam={agent.team}
                  currentUnitName={agent.unit?.name || null}
                  onSuccess={() => window.location.reload()}
                  onRequestTransfer={() => setShowTransferRequest(true)}
                />
                <TransferRequestDialog
                  open={showTransferRequest}
                  onOpenChange={setShowTransferRequest}
                  agent={{
                    id: agent.id,
                    name: agent.name,
                    team: agent.team,
                    unit_id: agent.unit_id,
                    unit: agent.unit,
                  }}
                  onSuccess={() => window.location.reload()}
                />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
