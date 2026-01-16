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
import { Loader2, Users, MessageCircle, Calendar, Clock, ArrowRightLeft, CalendarOff, Settings, User, CalendarDays, Calculator, LogOut, Home, WifiOff, RefreshCw, Droplet, Radar, Gift, Shield, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
            {/* Professional Header Bar with Agent Info */}
            <div className="bg-gradient-to-r from-slate-900/98 via-slate-800/95 to-slate-900/98 rounded-lg border border-amber-500/50 shadow-xl backdrop-blur-md overflow-hidden">
              <div className="flex items-center gap-2 p-2">
                {/* Left: Back Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="border border-slate-600/50 hover:border-amber-500/50 hover:bg-amber-900/20 text-slate-300 hover:text-amber-400 h-9 px-2"
                >
                  <ArrowRightLeft className="h-4 w-4 rotate-180" />
                </Button>

                {/* Center: Agent Profile - Compact */}
                <div 
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-opacity px-2 py-1 rounded-lg hover:bg-slate-700/30"
                  onClick={() => navigate('/agent-profile')}
                >
                  <Avatar className="w-9 h-9 border-2 border-amber-500/60 shadow-md flex-shrink-0">
                    {(agent as any).avatar_url && <AvatarImage src={(agent as any).avatar_url} alt={agent.name} />}
                    <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-black text-black">
                      {agent.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 hidden sm:block">
                    <h1 className="text-sm font-bold text-amber-200 truncate leading-tight">
                      {agent.name}
                    </h1>
                    <div className="flex items-center gap-1 flex-wrap">
                      {agent.team && (
                        <span className="text-[10px] text-amber-400/80 font-medium">{agent.team}</span>
                      )}
                      {(agent as any).blood_type && (
                        <span className="text-[10px] text-red-400/80 flex items-center gap-0.5">
                          <Droplet className="h-2.5 w-2.5" />
                          {(agent as any).blood_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getRoleBadge((agent as any).role)}
                  <AgentRoleSelector agentId={agent.id} currentRole={(agent as any).role || 'agent'} />
                  <NotificationsPanel agentId={agent.id} />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWelcomeDialog(true)}
                    className="text-amber-400 hover:bg-amber-900/30 h-9 px-2"
                  >
                    <Gift className="h-4 w-4" />
                    <span className="ml-1 text-[10px] font-bold bg-amber-500/30 px-1 py-0.5 rounded-full">
                      {getRemainingTrialDays()}d
                    </span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/')}
                    className="text-slate-300 hover:text-blue-400 hover:bg-blue-900/20 h-9 px-2"
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      navigate('/');
                    }}
                    className="text-red-400 hover:bg-red-900/30 h-9 px-2"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Tabs - Professional Control Panel */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
              <div className="bg-gradient-to-r from-slate-900/98 via-slate-800/95 to-slate-900/98 rounded-lg border border-slate-600/50 shadow-lg backdrop-blur-md p-1.5">
                <div className="flex items-center gap-1 mb-1.5 px-2">
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Painel de Controle</span>
                  <Zap className="h-3 w-3 text-amber-500/60" />
                </div>
                <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1 h-auto grid grid-cols-5 lg:grid-cols-9 gap-1 rounded-lg">
                  <TabsTrigger 
                    value="equipe" 
                    className="flex flex-col items-center justify-center gap-0.5 text-[9px] md:text-[10px] p-1.5 md:p-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-md rounded-md font-bold transition-all duration-150 hover:bg-slate-700/50 min-h-[40px] md:min-h-[44px]"
                  >
                    <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>Equipe</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="plantoes" 
                    className="flex flex-col items-center justify-center gap-0.5 text-[9px] md:text-[10px] p-1.5 md:p-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-md rounded-md font-bold transition-all duration-150 hover:bg-slate-700/50 min-h-[40px] md:min-h-[44px]"
                  >
                    <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>Plantões</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="bh" 
                    className="flex flex-col items-center justify-center gap-0.5 text-[9px] md:text-[10px] p-1.5 md:p-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-400 data-[state=active]:to-teal-500 data-[state=active]:text-black data-[state=active]:shadow-md rounded-md font-bold transition-all duration-150 hover:bg-slate-700/50 min-h-[40px] md:min-h-[44px]"
                  >
                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>BH</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="folgas" 
                    className="flex flex-col items-center justify-center gap-0.5 text-[9px] md:text-[10px] p-1.5 md:p-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-400 data-[state=active]:to-violet-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md font-bold transition-all duration-150 hover:bg-slate-700/50 min-h-[40px] md:min-h-[44px]"
                  >
                    <CalendarOff className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>Folgas</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="agenda" 
                    className="flex flex-col items-center justify-center gap-0.5 text-[9px] md:text-[10px] p-1.5 md:p-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-400 data-[state=active]:to-blue-500 data-[state=active]:text-black data-[state=active]:shadow-md rounded-md font-bold transition-all duration-150 hover:bg-slate-700/50 min-h-[40px] md:min-h-[44px]"
                  >
                    <CalendarDays className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>Agenda</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="planejador" 
                    className="flex flex-col items-center justify-center gap-0.5 text-[9px] md:text-[10px] p-1.5 md:p-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-rose-400 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md font-bold transition-all duration-150 hover:bg-slate-700/50 min-h-[40px] md:min-h-[44px]"
                  >
                    <Calculator className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>Plan</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="permutas" 
                    className="flex flex-col items-center justify-center gap-0.5 text-[9px] md:text-[10px] p-1.5 md:p-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-md rounded-md font-bold transition-all duration-150 hover:bg-slate-700/50 min-h-[40px] md:min-h-[44px]"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>Troca</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="chat" 
                    className="flex flex-col items-center justify-center gap-0.5 text-[9px] md:text-[10px] p-1.5 md:p-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-400 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md font-bold transition-all duration-150 hover:bg-slate-700/50 min-h-[40px] md:min-h-[44px]"
                  >
                    <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>Chat</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="config" 
                    className="flex flex-col items-center justify-center gap-0.5 text-[9px] md:text-[10px] p-1.5 md:p-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-slate-400 data-[state=active]:to-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md font-bold transition-all duration-150 hover:bg-slate-700/50 min-h-[40px] md:min-h-[44px]"
                  >
                    <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>Config</span>
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
