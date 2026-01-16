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
            {/* Professional Header Bar */}
            <div className="bg-gradient-to-r from-slate-900/98 via-slate-800/95 to-slate-900/98 rounded-xl border-2 border-amber-500/40 shadow-2xl backdrop-blur-md overflow-hidden">
              <div className="flex items-center justify-between p-2 md:p-3">
                {/* Left: Agent Avatar + Info */}
                <div 
                  className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-90 transition-all duration-200 p-1.5 md:p-2 rounded-xl hover:bg-slate-700/40 group"
                  onClick={() => navigate('/agent-profile')}
                >
                  <Avatar className="w-11 h-11 md:w-14 md:h-14 border-2 border-amber-500/70 shadow-lg flex-shrink-0 ring-2 ring-amber-400/20 group-hover:ring-amber-400/50 transition-all">
                    {(agent as any).avatar_url && <AvatarImage src={(agent as any).avatar_url} alt={agent.name} className="object-cover" />}
                    <AvatarFallback className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-lg md:text-xl font-black text-black">
                      {agent.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block min-w-0">
                    <h1 className="text-sm md:text-base font-bold text-amber-100 truncate leading-tight max-w-[120px] md:max-w-[180px]">
                      {agent.name.split(' ')[0]}
                    </h1>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {agent.team && (
                        <Badge variant="outline" className="text-[9px] md:text-[10px] border-amber-500/50 text-amber-400 bg-amber-500/10 px-1.5 py-0 h-4">
                          {agent.team}
                        </Badge>
                      )}
                      {(agent as any).blood_type && (
                        <span className="text-[9px] md:text-[10px] text-red-400/90 flex items-center gap-0.5 bg-red-500/10 px-1 py-0.5 rounded">
                          <Droplet className="h-2.5 w-2.5" />
                          {(agent as any).blood_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center: Status Indicators */}
                <div className="flex items-center gap-2 md:gap-3">
                  {/* Online Status */}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/15 border border-green-500/40">
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-60" />
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold text-green-400 uppercase tracking-wide hidden md:inline">Online</span>
                  </div>
                  
                  {/* Role Badge */}
                  <div className="hidden sm:block">
                    {getRoleBadge((agent as any).role)}
                  </div>
                  
                  {/* Trial Badge */}
                  <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <Gift className="h-3 w-3 text-amber-400" />
                    <span className="text-[9px] font-bold text-amber-400">{getRemainingTrialDays()}d</span>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-1 md:gap-1.5">
                  <AgentRoleSelector agentId={agent.id} currentRole={(agent as any).role || 'agent'} />
                  <NotificationsPanel agentId={agent.id} />
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowWelcomeDialog(true)}
                          className="text-amber-400 hover:bg-amber-500/20 h-9 w-9 md:h-10 md:w-10 lg:hidden"
                        >
                          <Gift className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Trial: {getRemainingTrialDays()} dias</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate('/')}
                          className="text-blue-400 hover:bg-blue-500/20 h-9 w-9 md:h-10 md:w-10"
                        >
                          <Home className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Início</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            await supabase.auth.signOut();
                            navigate('/');
                          }}
                          className="text-red-400 hover:bg-red-500/20 h-9 w-9 md:h-10 md:w-10"
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Sair</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            {/* Main Tabs - Professional Control Panel */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <div className="bg-gradient-to-br from-slate-900/98 via-slate-800/95 to-slate-900/98 rounded-xl border-2 border-amber-500/30 shadow-2xl backdrop-blur-md p-3 md:p-4">
                {/* Control Panel Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-lg">
                      <Shield className="h-5 w-5 text-black" />
                    </div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-amber-100 tracking-wide">PAINEL DE CONTROLE</h2>
                      <p className="text-[10px] text-amber-400/70 uppercase tracking-widest">Sistema Operacional</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-amber-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-medium">ATIVO</span>
                  </div>
                </div>
                
                {/* Tabs Grid - Larger and More Professional */}
                <TabsList className="bg-slate-800/60 border-2 border-slate-700/50 p-2 h-auto grid grid-cols-5 lg:grid-cols-9 gap-2 rounded-xl">
                  <TabsTrigger 
                    value="equipe" 
                    className="flex flex-col items-center justify-center gap-1 text-[10px] md:text-xs p-2 md:p-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg font-bold transition-all duration-200 hover:bg-slate-700/60 min-h-[52px] md:min-h-[60px] border border-transparent data-[state=active]:border-amber-300"
                  >
                    <Users className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Equipe</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="plantoes" 
                    className="flex flex-col items-center justify-center gap-1 text-[10px] md:text-xs p-2 md:p-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg font-bold transition-all duration-200 hover:bg-slate-700/60 min-h-[52px] md:min-h-[60px] border border-transparent data-[state=active]:border-amber-300"
                  >
                    <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Plantões</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="bh" 
                    className="flex flex-col items-center justify-center gap-1 text-[10px] md:text-xs p-2 md:p-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-400 data-[state=active]:to-teal-500 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg font-bold transition-all duration-200 hover:bg-slate-700/60 min-h-[52px] md:min-h-[60px] border border-transparent data-[state=active]:border-emerald-300"
                  >
                    <Clock className="h-4 w-4 md:h-5 md:w-5" />
                    <span>BH</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="folgas" 
                    className="flex flex-col items-center justify-center gap-1 text-[10px] md:text-xs p-2 md:p-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-400 data-[state=active]:to-violet-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg font-bold transition-all duration-200 hover:bg-slate-700/60 min-h-[52px] md:min-h-[60px] border border-transparent data-[state=active]:border-purple-300"
                  >
                    <CalendarOff className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Folgas</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="agenda" 
                    className="flex flex-col items-center justify-center gap-1 text-[10px] md:text-xs p-2 md:p-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-400 data-[state=active]:to-blue-500 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg font-bold transition-all duration-200 hover:bg-slate-700/60 min-h-[52px] md:min-h-[60px] border border-transparent data-[state=active]:border-cyan-300"
                  >
                    <CalendarDays className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Agenda</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="planejador" 
                    className="flex flex-col items-center justify-center gap-1 text-[10px] md:text-xs p-2 md:p-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-rose-400 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg font-bold transition-all duration-200 hover:bg-slate-700/60 min-h-[52px] md:min-h-[60px] border border-transparent data-[state=active]:border-rose-300"
                  >
                    <Calculator className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Plan</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="permutas" 
                    className="flex flex-col items-center justify-center gap-1 text-[10px] md:text-xs p-2 md:p-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg font-bold transition-all duration-200 hover:bg-slate-700/60 min-h-[52px] md:min-h-[60px] border border-transparent data-[state=active]:border-amber-300"
                  >
                    <ArrowRightLeft className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Troca</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="chat" 
                    className="flex flex-col items-center justify-center gap-1 text-[10px] md:text-xs p-2 md:p-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-400 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg font-bold transition-all duration-200 hover:bg-slate-700/60 min-h-[52px] md:min-h-[60px] border border-transparent data-[state=active]:border-blue-300"
                  >
                    <MessageCircle className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Chat</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="config" 
                    className="flex flex-col items-center justify-center gap-1 text-[10px] md:text-xs p-2 md:p-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-slate-400 data-[state=active]:to-slate-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg font-bold transition-all duration-200 hover:bg-slate-700/60 min-h-[52px] md:min-h-[60px] border border-transparent data-[state=active]:border-slate-300"
                  >
                    <Settings className="h-4 w-4 md:h-5 md:w-5" />
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

              <TabsContent value="equipe" className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-3">
                    <TeamMembersCard 
                      unitId={agent.unit_id} 
                      team={agent.team} 
                      currentAgentId={agent.id}
                    />
                  </div>
                  <div className="lg:col-span-1 space-y-4">
                    <TacticalRadar 
                      unitId={agent.unit_id || undefined}
                      compact={true}
                    />
                    <BirthdayCard 
                      agentId={agent.id}
                      team={agent.team}
                      unitId={agent.unit_id}
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
