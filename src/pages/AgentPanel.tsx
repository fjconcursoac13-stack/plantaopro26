import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { useLicenseCheck } from '@/hooks/useLicenseCheck';
import { useLicenseExpiryNotification } from '@/hooks/useLicenseExpiryNotification';
import { useShiftNotifications } from '@/hooks/useShiftNotifications';
import { useBHReminder } from '@/hooks/useBHReminder';
import { useBHReminderHour } from '@/components/agent-panel/BHReminderSettings';
import { TeamMembersCard } from '@/components/agent-panel/TeamMembersCard';
import { ProfessionalShiftTimer } from '@/components/agent-panel/ProfessionalShiftTimer';
import { BHTracker } from '@/components/agent-panel/BHTracker';
import { ShiftScheduleCard } from '@/components/agent-panel/ShiftScheduleCard';
import { ChatPanel } from '@/components/agent-panel/ChatPanel';
import { NotificationsPanel } from '@/components/agent-panel/NotificationsPanel';
import { SwapRequestsCard } from '@/components/agent-panel/SwapRequestsCard';
import { AgentRoleSelector } from '@/components/agent-panel/AgentRoleSelector';
import { LeaveRequestCard } from '@/components/agent-panel/LeaveRequestCard';
import { ShiftSetupPrompt } from '@/components/agent-panel/ShiftSetupPrompt';
import { ShiftAlertsBanner } from '@/components/agent-panel/ShiftAlertsBanner';
import { NotificationSettings } from '@/components/agent-panel/NotificationSettings';
import { AgentSettingsCard } from '@/components/agent-panel/AgentSettingsCard';
import { AgentEventsCard } from '@/components/agent-panel/AgentEventsCard';
import ShiftPlannerCard from '@/components/agent-panel/ShiftPlannerCard';
import { ShiftCalendarOverview } from '@/components/agent-panel/ShiftCalendarOverview';
import { BHReminderSettings } from '@/components/agent-panel/BHReminderSettings';
import { BHEvolutionChart } from '@/components/agent-panel/BHEvolutionChart';
import { BirthdayCard } from '@/components/agent-panel/BirthdayCard';
import { ProfileCompletionAlert } from '@/components/agent-panel/ProfileCompletionAlert';
import { LicenseWarningBanner } from '@/components/LicenseWarningBanner';
import { TacticalRadar } from '@/components/dashboard/TacticalRadar';
import { SessionMonitorBanner } from '@/components/SessionMonitorBanner';
import { DiagnosticReportButton } from '@/components/DiagnosticReportButton';
import { SafeModeToggle } from '@/components/SafeModeToggle';
import { ThemedPanelBackground } from '@/components/ThemedPanelBackground';
import { WelcomeTrialDialog, shouldShowWelcomeToday, getRemainingTrialDays } from '@/components/WelcomeTrialDialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, MessageCircle, Calendar, Clock, ArrowRightLeft, CalendarOff, Settings, User, CalendarDays, Calculator, LogOut, Home, WifiOff, RefreshCw, Droplet, Radar, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function AgentPanel() {
  const { user, isLoading, masterSession } = useAuth();
  const { agent, isLoading: isLoadingAgent } = useAgentProfile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('equipe');
  const [hasShifts, setHasShifts] = useState(true);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

  // Check for first access or daily welcome
  useEffect(() => {
    if (!agent?.name) return;
    
    // Check if we should show welcome today (once per day on first access)
    if (shouldShowWelcomeToday()) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        setShowWelcomeDialog(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [agent?.name]);

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

  // License check with warning banner
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

  // License expiry notification - alerts 7 days before
  const { daysUntilExpiry, isExpiringSoon } = useLicenseExpiryNotification({
    licenseExpiresAt: agent?.license_expires_at ?? null,
    agentId: agent?.id ?? null,
    enabled: !!agent && !masterSession,
    warningDaysBefore: 7,
  });

  // Shift notifications - checks for upcoming shifts and sends reminders
  useShiftNotifications({
    agentId: agent?.id || '',
    enabled: !!agent?.id,
    reminderHoursBefore: [24, 1], // 24h and 1h before
  });

  // Get saved BH reminder hour preference
  const bhReminderHour = useBHReminderHour(agent?.id || '');

  // BH daily reminder - reminds to register BH if not done today
  useBHReminder({
    agentId: agent?.id || '',
    enabled: !!agent?.id,
    reminderHour: bhReminderHour, // Use saved preference
  });

  useEffect(() => {
    if (agent?.id) {
      checkAgentShifts();
    }
  }, [agent?.id]);

  const checkAgentShifts = async () => {
    if (!agent?.id) return;
    try {
      const { count, error } = await (supabase as any)
        .from('agent_shifts')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id);

      if (!error) {
        setHasShifts((count || 0) > 0);
      }
    } catch (error) {
      console.error('Error checking shifts:', error);
    }
  };

  // Redirect only if master session is accessing agent panel (not allowed)
  // IMPORTANT: Do NOT redirect to home when user is temporarily null - this causes session loops
  useEffect(() => {
    if (isLoading || isLoadingAgent) return;

    // Master session must never access the agent panel
    if (masterSession && !user) {
      navigate('/master', { replace: true });
    }
  }, [user, masterSession, isLoading, isLoadingAgent, navigate]);

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'team_leader':
        return <Badge className="bg-amber-500 text-black">Chefe de Equipe</Badge>;
      case 'support':
        return <Badge variant="secondary">Apoio</Badge>;
      default:
        return <Badge variant="outline">Agente</Badge>;
    }
  };

  // Show loading while auth is hydrating - AFTER all hooks
  if (isLoading || isLoadingAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Show error state if no agent - AFTER all hooks
  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
        <div className="max-w-md w-full rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-center space-y-4">
          <h1 className="text-xl font-bold text-white">Perfil não carregou</h1>
          <p className="text-slate-300 text-sm">
            Não foi possível localizar seus dados de agente. Isso acontece quando o CPF da conta não está vinculado a um registro de agente.
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-slate-600 hover:bg-slate-800"
            >
              Recarregar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/auth');
              }}
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <ThemedPanelBackground team={agent?.team || null} showTeamImage={true}>
      {/* License Warning Banner */}
      {showLicenseWarning && (
        <LicenseWarningBanner
          licenseStatus={licenseStatus}
          expiresAt={agent?.license_expires_at || null}
          secondsUntilLogout={secondsUntilLogout}
          onContactAdmin={() => {
            toast({
              title: 'Contato do Administrador',
              description: 'Entre em contato pelo e-mail: admin@plantaopro.app',
            });
          }}
        />
      )}

      {/* Session Monitor Banner - Visual session status */}
      <SessionMonitorBanner />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <main className={`flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto overflow-x-hidden pb-safe ${showLicenseWarning ? 'pt-28' : ''}`}>
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 animate-fade-in">
            {/* Professional Header Bar */}
            <div className="bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 rounded-2xl border-2 border-amber-500/30 p-4 md:p-5 shadow-2xl shadow-black/50 backdrop-blur-md">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Navigation */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => navigate(-1)}
                    className="border-2 border-slate-600/50 hover:border-amber-500/50 hover:bg-amber-900/20 text-slate-300 hover:text-amber-400 transition-all duration-300 px-4 py-3 h-auto"
                  >
                    <ArrowRightLeft className="h-5 w-5 mr-2 rotate-180" />
                    <span className="font-semibold text-sm md:text-base">Voltar</span>
                  </Button>
                </div>

                {/* Center: Title Badge */}
                <div className="hidden md:flex items-center gap-3">
                  <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full px-6 py-2 border border-amber-500/40">
                    <span className="text-amber-400 font-bold text-sm tracking-wider uppercase">
                      Painel do Agente
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 md:gap-3">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setShowWelcomeDialog(true)}
                    className="border-2 border-amber-600/50 text-amber-400 hover:bg-amber-900/30 hover:border-amber-500 transition-all duration-300 px-3 md:px-4 py-2 h-auto"
                    title={`${getRemainingTrialDays()} dias restantes`}
                  >
                    <Gift className="h-5 w-5" />
                    <span className="ml-2 hidden sm:inline font-semibold">Trial</span>
                    <span className="ml-2 text-xs font-bold bg-amber-500/30 px-2 py-1 rounded-full">
                      {getRemainingTrialDays()}d
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => navigate('/')}
                    className="border-2 border-slate-500/50 hover:border-blue-500/50 hover:bg-blue-900/20 text-slate-300 hover:text-blue-400 transition-all duration-300 px-3 md:px-4 py-2 h-auto"
                  >
                    <Home className="h-5 w-5" />
                    <span className="ml-2 hidden sm:inline font-semibold">Início</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      navigate('/');
                    }}
                    className="border-2 border-red-600/50 text-red-400 hover:bg-red-900/30 hover:border-red-500 transition-all duration-300 px-3 md:px-4 py-2 h-auto"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="ml-2 hidden sm:inline font-semibold">Sair</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Tabs - Painel de Controle na parte SUPERIOR */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 md:space-y-8">
              {/* Tab Container com destaque profissional - PRIMEIRO */}
              <div className="relative">
                {/* Glow Effect Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 rounded-3xl blur-xl" />
                
                <TabsList className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border-3 border-amber-500/40 p-3 md:p-4 h-auto flex flex-wrap gap-2.5 md:gap-3 rounded-2xl shadow-2xl shadow-black/50 backdrop-blur-md">
                  {/* Header Label */}
                  <div className="absolute -top-3 left-4 md:left-6">
                    <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-black text-[10px] md:text-xs font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wider">
                      ⚡ Painel de Controle
                    </span>
                  </div>
                  
                  <TabsTrigger value="equipe" className="flex items-center gap-2.5 text-sm md:text-base px-4 py-3 md:px-6 md:py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-400 data-[state=active]:via-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-xl data-[state=active]:shadow-amber-500/40 data-[state=active]:scale-105 rounded-xl font-bold transition-all duration-300 hover:bg-slate-700/50 border border-transparent data-[state=active]:border-amber-300/50">
                    <Users className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="hidden sm:inline">Equipe</span>
                  </TabsTrigger>
                  <TabsTrigger value="plantoes" className="flex items-center gap-2.5 text-sm md:text-base px-4 py-3 md:px-6 md:py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-400 data-[state=active]:via-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-xl data-[state=active]:shadow-amber-500/40 data-[state=active]:scale-105 rounded-xl font-bold transition-all duration-300 hover:bg-slate-700/50 border border-transparent data-[state=active]:border-amber-300/50">
                    <Calendar className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="hidden sm:inline">Plantões</span>
                  </TabsTrigger>
                  <TabsTrigger value="bh" className="flex items-center gap-2.5 text-sm md:text-base px-4 py-3 md:px-6 md:py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-400 data-[state=active]:via-green-500 data-[state=active]:to-teal-500 data-[state=active]:text-black data-[state=active]:shadow-xl data-[state=active]:shadow-green-500/40 data-[state=active]:scale-105 rounded-xl font-bold transition-all duration-300 hover:bg-slate-700/50 border border-transparent data-[state=active]:border-green-300/50">
                    <Clock className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="font-extrabold">BH</span>
                  </TabsTrigger>
                  <TabsTrigger value="folgas" className="flex items-center gap-2.5 text-sm md:text-base px-4 py-3 md:px-6 md:py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-400 data-[state=active]:via-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-purple-500/40 data-[state=active]:scale-105 rounded-xl font-bold transition-all duration-300 hover:bg-slate-700/50 border border-transparent data-[state=active]:border-purple-300/50">
                    <CalendarOff className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="hidden sm:inline">Folgas</span>
                  </TabsTrigger>
                  <TabsTrigger value="agenda" className="flex items-center gap-2.5 text-sm md:text-base px-4 py-3 md:px-6 md:py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-400 data-[state=active]:via-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-black data-[state=active]:shadow-xl data-[state=active]:shadow-cyan-500/40 data-[state=active]:scale-105 rounded-xl font-bold transition-all duration-300 hover:bg-slate-700/50 border border-transparent data-[state=active]:border-cyan-300/50">
                    <CalendarDays className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="hidden sm:inline">Agenda</span>
                  </TabsTrigger>
                  <TabsTrigger value="planejador" className="flex items-center gap-2.5 text-sm md:text-base px-4 py-3 md:px-6 md:py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-rose-400 data-[state=active]:via-pink-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-rose-500/40 data-[state=active]:scale-105 rounded-xl font-bold transition-all duration-300 hover:bg-slate-700/50 border border-transparent data-[state=active]:border-rose-300/50">
                    <Calculator className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="hidden sm:inline">Plan</span>
                  </TabsTrigger>
                  <TabsTrigger value="permutas" className="flex items-center gap-2.5 text-sm md:text-base px-4 py-3 md:px-6 md:py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-400 data-[state=active]:via-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-xl data-[state=active]:shadow-amber-500/40 data-[state=active]:scale-105 rounded-xl font-bold transition-all duration-300 hover:bg-slate-700/50 border border-transparent data-[state=active]:border-amber-300/50">
                    <ArrowRightLeft className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="hidden sm:inline">Troca</span>
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="flex items-center gap-2.5 text-sm md:text-base px-4 py-3 md:px-6 md:py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-400 data-[state=active]:via-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-500/40 data-[state=active]:scale-105 rounded-xl font-bold transition-all duration-300 hover:bg-slate-700/50 border border-transparent data-[state=active]:border-blue-300/50">
                    <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="hidden sm:inline">Chat</span>
                  </TabsTrigger>
                  <TabsTrigger value="config" className="flex items-center gap-2.5 text-sm md:text-base px-4 py-3 md:px-6 md:py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-slate-400 data-[state=active]:via-slate-500 data-[state=active]:to-slate-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-slate-500/40 data-[state=active]:scale-105 rounded-xl font-bold transition-all duration-300 hover:bg-slate-700/50 border border-transparent data-[state=active]:border-slate-300/50">
                    <Settings className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="hidden sm:inline">Config</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Profile Completion Alert */}
              <ProfileCompletionAlert agentId={agent.id} agentName={agent.name} />

              {/* Shift Alert Banner */}
              <ShiftAlertsBanner agentId={agent.id} />

              {/* Shift Setup Prompt */}
              <ShiftSetupPrompt
                agentId={agent.id}
                agentName={agent.name}
                hasShifts={hasShifts}
                onComplete={checkAgentShifts}
              />

              {/* Agent Header - COMPACTO */}
              <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-amber-950/30 rounded-2xl p-4 md:p-6 border-2 border-amber-500/40 shadow-xl shadow-amber-500/10 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                  <div 
                    className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition-all duration-300 flex-1 min-w-0"
                    onClick={() => navigate('/agent-profile')}
                    title="Editar meu perfil"
                  >
                    <Avatar className="w-14 h-14 md:w-18 md:h-18 border-3 border-amber-500/60 shadow-lg shadow-amber-500/20 flex-shrink-0 ring-2 ring-amber-400/20 ring-offset-2 ring-offset-slate-900">
                      {(agent as any).avatar_url && <AvatarImage src={(agent as any).avatar_url} alt={agent.name} />}
                      <AvatarFallback className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-xl md:text-2xl font-black text-black">
                        {agent.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 tracking-wide truncate">
                        {agent.name}
                      </h1>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {getRoleBadge((agent as any).role)}
                        {(agent as any).blood_type && (
                          <Badge className="bg-red-500/25 text-red-300 border-red-500/50 flex items-center gap-1 text-xs px-2 py-0.5 font-semibold">
                            <Droplet className="h-3 w-3" />
                            {(agent as any).blood_type}
                          </Badge>
                        )}
                        {agent.team && (
                          <Badge className="bg-slate-700/90 text-amber-300 border-amber-500/40 text-xs px-2 py-0.5 font-semibold">
                            {agent.team}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <AgentRoleSelector agentId={agent.id} currentRole={(agent as any).role || 'agent'} />
                    <NotificationsPanel agentId={agent.id} />
                  </div>
                </div>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <ProfessionalShiftTimer agentId={agent.id} compact />
                <BHTracker agentId={agent.id} compact />
              </div>

              <TabsContent value="equipe" className="space-y-5 md:space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
                  <div className="lg:col-span-2 space-y-5 md:space-y-6">
                    <TeamMembersCard 
                      unitId={agent.unit_id} 
                      team={agent.team} 
                      currentAgentId={agent.id}
                    />
                    <BirthdayCard 
                      agentId={agent.id}
                      team={agent.team}
                      unitId={agent.unit_id}
                    />
                  </div>
                  <div className="lg:col-span-1 h-fit">
                    <TacticalRadar 
                      unitId={agent.unit_id || undefined}
                      compact={false}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="plantoes" className="space-y-5 md:space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  <ProfessionalShiftTimer agentId={agent.id} />
                  <ShiftScheduleCard agentId={agent.id} />
                </div>
                <ShiftCalendarOverview agentId={agent.id} />
              </TabsContent>

              <TabsContent value="bh" className="space-y-5 md:space-y-6 animate-fade-in">
                <BHTracker agentId={agent.id} />
              </TabsContent>

              <TabsContent value="folgas" className="space-y-4 animate-fade-in">
                <LeaveRequestCard 
                  agentId={agent.id} 
                  agentTeam={agent.team}
                  agentUnitId={agent.unit_id}
                />
              </TabsContent>

              <TabsContent value="agenda" className="space-y-4 animate-fade-in">
                <AgentEventsCard agentId={agent.id} />
              </TabsContent>

              <TabsContent value="planejador" className="space-y-4 animate-fade-in">
                <ShiftPlannerCard agentId={agent.id} />
              </TabsContent>

              <TabsContent value="permutas" className="space-y-4 animate-fade-in">
                <SwapRequestsCard 
                  agentId={agent.id} 
                  unitId={agent.unit_id}
                  team={agent.team}
                />
              </TabsContent>

              <TabsContent value="chat" className="space-y-4 animate-fade-in">
                <ChatPanel 
                  agentId={agent.id} 
                  unitId={agent.unit_id}
                  team={agent.team}
                  agentName={agent.name}
                  agentRole={(agent as any).role}
                />
              </TabsContent>

              <TabsContent value="config" className="space-y-5 md:space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 md:gap-6">
                  <AgentSettingsCard
                    agentId={agent.id}
                    agentName={agent.name}
                    currentEmail={agent.email}
                    currentAvatarUrl={(agent as any).avatar_url}
                    onUpdate={() => window.location.reload()}
                  />
                  <div className="space-y-5 md:space-y-6">
                    <NotificationSettings />
                    <BHReminderSettings agentId={agent.id} />
                    
                    {/* Diagnostic Tools Section */}
                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-slate-600/50 rounded-2xl p-5 md:p-6 space-y-4 shadow-lg">
                      <h3 className="font-semibold text-base md:text-lg flex items-center gap-2 text-slate-200">
                        <Settings className="h-5 w-5 text-amber-400" />
                        Ferramentas de Diagnóstico
                      </h3>
                      <p className="text-sm text-slate-400">
                        Use estas ferramentas para resolver problemas de conexão ou sessão.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <DiagnosticReportButton />
                        <SafeModeToggle variant="compact" />
                      </div>
                    </div>
                  </div>
                </div>
                <BHEvolutionChart agentId={agent.id} />
              </TabsContent>
            </Tabs>

            {/* Footer Credits */}
            <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/30">
              <p>Desenvolvido por <span className="text-primary font-semibold">Franc D'nis</span></p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Feijó, Acre • © {new Date().getFullYear()} PlantãoPro</p>
            </div>
          </div>
        </main>
      </div>
    </ThemedPanelBackground>

    {/* Welcome Trial Dialog */}
    {showWelcomeDialog && agent && (
      <WelcomeTrialDialog 
        agentName={agent.name} 
        onClose={() => setShowWelcomeDialog(false)} 
      />
    )}
    </>
  );
}
