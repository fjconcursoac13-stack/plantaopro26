import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { useLicenseCheck } from '@/hooks/useLicenseCheck';
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

  // Redirect only after loading is complete
  // IMPORTANT:
  // Do not force redirects here; route protection/recovery is centralized in ReconnectingGuard.
  // This prevents premature bounce to the home screen while auth is hydrating.
  useEffect(() => {
    if (isLoading || isLoadingAgent) return;

    // Master session must never access the agent panel
    if (masterSession && !user) {
      navigate('/master', { replace: true });
    }
  }, [user, masterSession, isLoading, isLoadingAgent, navigate]);

  if (isLoading || isLoadingAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

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

      <div className="flex-1 flex flex-col">
        <main className={`flex-1 p-4 md:p-6 lg:p-8 overflow-auto ${showLicenseWarning ? 'pt-28' : ''}`}>
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-fade-in">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <BackButton fallbackPath="/" />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWelcomeDialog(true)}
                  className="border-amber-600/50 text-amber-400 hover:bg-amber-900/20 hover:border-amber-500"
                  title={`${getRemainingTrialDays()} dias restantes`}
                >
                  <Gift className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Trial</span>
                  <span className="ml-1 text-xs bg-amber-500/20 px-1.5 py-0.5 rounded">
                    {getRemainingTrialDays()}d
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="border-slate-600 hover:bg-slate-800"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Início
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate('/');
                  }}
                  className="border-red-600 text-red-400 hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
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

            {/* Agent Header - LARGER e mais proporcional */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-800/95 to-amber-900/20 rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <div className="flex items-center justify-between gap-4">
                <div 
                  className="flex items-center gap-4 md:gap-5 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
                  onClick={() => navigate('/agent-profile')}
                  title="Editar meu perfil"
                >
                  <Avatar className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 border-3 md:border-4 border-amber-500/50 shadow-lg shadow-amber-500/20 flex-shrink-0">
                    {(agent as any).avatar_url && <AvatarImage src={(agent as any).avatar_url} alt={agent.name} />}
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-600 text-xl md:text-3xl lg:text-4xl font-bold text-black">
                      {agent.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    {/* Nome destacado - MAIOR */}
                    <h1 className="text-xl md:text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 tracking-wide truncate">
                      {agent.name}
                    </h1>
                    
                    {/* Badges em linha - MAIORES */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {getRoleBadge((agent as any).role)}
                      {(agent as any).blood_type && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/40 flex items-center gap-1 text-xs md:text-sm px-2 py-0.5">
                          <Droplet className="h-3 w-3 md:h-4 md:w-4" />
                          {(agent as any).blood_type}
                        </Badge>
                      )}
                      {agent.team && (
                        <Badge className="bg-slate-700/80 text-amber-400 border-amber-500/30 text-xs md:text-sm px-2 py-0.5 hidden sm:flex">
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

            {/* Quick Stats Row - MAIOR proporção */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <ProfessionalShiftTimer agentId={agent.id} compact />
              <BHTracker agentId={agent.id} compact />
            </div>

            {/* Main Tabs - Maior e mais visível */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
              <TabsList className="bg-slate-800/60 border border-slate-700/50 p-1 h-auto flex flex-wrap gap-1 rounded-xl">
                <TabsTrigger value="equipe" className="flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-4 md:py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg">
                  <Users className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Equipe</span>
                </TabsTrigger>
                <TabsTrigger value="plantoes" className="flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-4 md:py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Plantões</span>
                </TabsTrigger>
                <TabsTrigger value="bh" className="flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-4 md:py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg">
                  <Clock className="h-4 w-4 md:h-5 md:w-5" />
                  <span>BH</span>
                </TabsTrigger>
                <TabsTrigger value="folgas" className="flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-4 md:py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg">
                  <CalendarOff className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Folgas</span>
                </TabsTrigger>
                <TabsTrigger value="agenda" className="flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-4 md:py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg">
                  <CalendarDays className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Agenda</span>
                </TabsTrigger>
                <TabsTrigger value="planejador" className="flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-4 md:py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg">
                  <Calculator className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Plan</span>
                </TabsTrigger>
                <TabsTrigger value="permutas" className="flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-4 md:py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg">
                  <ArrowRightLeft className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Troca</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-4 md:py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg">
                  <MessageCircle className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Chat</span>
                </TabsTrigger>
                <TabsTrigger value="config" className="flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 md:px-4 md:py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg">
                  <Settings className="h-4 w-4 md:h-5 md:w-5" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="equipe" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-4">
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

              <TabsContent value="plantoes" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ProfessionalShiftTimer agentId={agent.id} />
                  <ShiftScheduleCard agentId={agent.id} />
                </div>
                <ShiftCalendarOverview agentId={agent.id} />
              </TabsContent>

              <TabsContent value="bh" className="space-y-4">
                <BHTracker agentId={agent.id} />
              </TabsContent>

              <TabsContent value="folgas" className="space-y-4">
                <LeaveRequestCard 
                  agentId={agent.id} 
                  agentTeam={agent.team}
                  agentUnitId={agent.unit_id}
                />
              </TabsContent>

              <TabsContent value="agenda" className="space-y-4">
                <AgentEventsCard agentId={agent.id} />
              </TabsContent>

              <TabsContent value="planejador" className="space-y-4">
                <ShiftPlannerCard agentId={agent.id} />
              </TabsContent>

              <TabsContent value="permutas" className="space-y-4">
                <SwapRequestsCard 
                  agentId={agent.id} 
                  unitId={agent.unit_id}
                  team={agent.team}
                />
              </TabsContent>

              <TabsContent value="chat" className="space-y-4">
                <ChatPanel 
                  agentId={agent.id} 
                  unitId={agent.unit_id}
                  team={agent.team}
                  agentName={agent.name}
                  agentRole={(agent as any).role}
                />
              </TabsContent>

              <TabsContent value="config" className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <AgentSettingsCard
                    agentId={agent.id}
                    agentName={agent.name}
                    currentEmail={agent.email}
                    currentAvatarUrl={(agent as any).avatar_url}
                    onUpdate={() => window.location.reload()}
                  />
                  <div className="space-y-4">
                    <NotificationSettings />
                    <BHReminderSettings agentId={agent.id} />
                    
                    {/* Diagnostic Tools Section */}
                    <div className="bg-card border rounded-lg p-4 space-y-3">
                      <h3 className="font-medium text-sm flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Ferramentas de Diagnóstico
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Use estas ferramentas para resolver problemas de conexão ou sessão.
                      </p>
                      <div className="flex flex-wrap gap-2">
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
              <p>Desenvolvido por <span className="text-primary font-semibold">Franc Denis de Souza e Silva</span></p>
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
