import { useEffect, useState } from 'react';
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
import { LicenseWarningBanner } from '@/components/LicenseWarningBanner';
import { TacticalRadar } from '@/components/dashboard/TacticalRadar';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, MessageCircle, Calendar, Clock, ArrowRightLeft, CalendarOff, Settings, User, CalendarDays, Calculator, LogOut, Home, WifiOff, RefreshCw, Droplet, Radar } from 'lucide-react';
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
  useEffect(() => {
    if (isLoading || isLoadingAgent) return;

    // Master session must never access the agent panel
    if (masterSession && !user) {
      navigate('/master', { replace: true });
      return;
    }

    // Don't redirect if we have user session
    if (user) return;

    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      navigate('/auth', { replace: true });
    }, 200);

    return () => clearTimeout(timer);
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
    <div className="min-h-screen flex flex-col bg-slate-900">
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

      {/* Connection Status Banner */}
      {!isOnline && (
        <div className="bg-yellow-600 text-white px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Sem conexão com a internet</span>
        </div>
      )}

      {isRetrying && (
        <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-2">
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

            {/* Shift Alert Banner */}
            <ShiftAlertsBanner agentId={agent.id} />

            {/* Shift Setup Prompt */}
            <ShiftSetupPrompt
              agentId={agent.id}
              agentName={agent.name}
              hasShifts={hasShifts}
              onComplete={checkAgentShifts}
            />

            {/* Agent Header - Compacto para mobile */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-800/95 to-amber-900/20 rounded-xl md:rounded-2xl p-3 md:p-5 border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <div className="flex items-center justify-between gap-3">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
                  onClick={() => navigate('/agent-profile')}
                  title="Editar meu perfil"
                >
                  <Avatar className="w-12 h-12 md:w-16 md:h-16 border-2 md:border-4 border-amber-500/50 shadow-lg shadow-amber-500/20 flex-shrink-0">
                    {(agent as any).avatar_url && <AvatarImage src={(agent as any).avatar_url} alt={agent.name} />}
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-600 text-lg md:text-2xl font-bold text-black">
                      {agent.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    {/* Nome destacado */}
                    <h1 className="text-lg md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 tracking-wide truncate">
                      {agent.name}
                    </h1>
                    
                    {/* Badges em linha compacta */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {getRoleBadge((agent as any).role)}
                      {(agent as any).blood_type && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/40 flex items-center gap-0.5 text-[10px] px-1.5 py-0">
                          <Droplet className="h-2.5 w-2.5" />
                          {(agent as any).blood_type}
                        </Badge>
                      )}
                      {agent.team && (
                        <Badge className="bg-slate-700/80 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 hidden sm:flex">
                          {agent.team}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <AgentRoleSelector agentId={agent.id} currentRole={(agent as any).role || 'agent'} />
                  <NotificationsPanel agentId={agent.id} />
                </div>
              </div>
            </div>

            {/* Quick Stats Row - Melhor proporção */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <ProfessionalShiftTimer agentId={agent.id} compact />
              <BHTracker agentId={agent.id} compact />
            </div>

            {/* Main Tabs - Compacto para mobile */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
              <TabsList className="bg-slate-800/60 border border-slate-700/50 p-0.5 h-auto flex flex-wrap gap-0.5 rounded-lg">
                <TabsTrigger value="equipe" className="flex items-center gap-1 text-xs px-2 py-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-md">
                  <Users className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Equipe</span>
                </TabsTrigger>
                <TabsTrigger value="plantoes" className="flex items-center gap-1 text-xs px-2 py-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-md">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Plantões</span>
                </TabsTrigger>
                <TabsTrigger value="bh" className="flex items-center gap-1 text-xs px-2 py-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-md">
                  <Clock className="h-3.5 w-3.5" />
                  <span>BH</span>
                </TabsTrigger>
                <TabsTrigger value="folgas" className="flex items-center gap-1 text-xs px-2 py-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-md">
                  <CalendarOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Folgas</span>
                </TabsTrigger>
                <TabsTrigger value="agenda" className="flex items-center gap-1 text-xs px-2 py-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-md">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Agenda</span>
                </TabsTrigger>
                <TabsTrigger value="planejador" className="flex items-center gap-1 text-xs px-2 py-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-md">
                  <Calculator className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Plan</span>
                </TabsTrigger>
                <TabsTrigger value="permutas" className="flex items-center gap-1 text-xs px-2 py-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-md">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Troca</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex items-center gap-1 text-xs px-2 py-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-md">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Chat</span>
                </TabsTrigger>
                <TabsTrigger value="config" className="flex items-center gap-1 text-xs px-2 py-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-md">
                  <Settings className="h-3.5 w-3.5" />
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
                  </div>
                </div>
                <BHEvolutionChart agentId={agent.id} />
              </TabsContent>
            </Tabs>

            {/* Footer Credits */}
            <div className="text-center text-xs text-slate-500 pt-4">
              Desenvolvido por <span className="text-amber-500">Franc Denis</span> • Plantão Pro App
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
