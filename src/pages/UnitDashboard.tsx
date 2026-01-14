import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { WelcomeTrialDialog } from '@/components/WelcomeTrialDialog';
import { 
  Loader2, 
  MapPin, 
  Users, 
  Shield, 
  Sword, 
  Target, 
  Calendar,
  Building2,
  User
} from 'lucide-react';

interface Unit {
  id: string;
  name: string;
  municipality: string;
}

interface Agent {
  id: string;
  name: string;
  team: string | null;
  is_active: boolean | null;
  matricula: string | null;
}

interface TeamStats {
  name: string;
  agents: Agent[];
  icon: any;
  color: string;
  bgColor: string;
}

const teamConfigs: Record<string, { icon: any; color: string; bgColor: string }> = {
  ALFA: { icon: Shield, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  BRAVO: { icon: Sword, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  CHARLIE: { icon: Target, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  DELTA: { icon: Users, color: 'text-violet-400', bgColor: 'bg-violet-500/20' },
};

export default function UnitDashboard() {
  const { unitId } = useParams<{ unitId: string }>();
  const { user, isLoading: authLoading, masterSession } = useAuth();
  const { agent: currentAgent } = useAgentProfile();
  const navigate = useNavigate();
  
  const [unit, setUnit] = useState<Unit | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  // Redirect only after loading is complete
  useEffect(() => {
    if (authLoading) return;
    
    // Don't redirect if we have any valid session
    if (user || masterSession) return;
    
    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      navigate('/auth', { replace: true });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [user, authLoading, masterSession, navigate]);

  // Check for first access welcome dialog
  useEffect(() => {
    const firstAccessData = localStorage.getItem('plantaopro_first_access');
    if (firstAccessData) {
      try {
        const data = JSON.parse(firstAccessData);
        if (!data.shown) {
          const timeSinceRegistration = Date.now() - data.timestamp;
          const DELAY_MS = 60 * 1000; // 1 minute
          
          if (timeSinceRegistration >= DELAY_MS) {
            // Show immediately if 1 minute has passed
            setWelcomeName(data.name);
            setShowWelcomeDialog(true);
            localStorage.setItem('plantaopro_first_access', JSON.stringify({ ...data, shown: true }));
          } else {
            // Schedule to show after remaining time
            const remainingTime = DELAY_MS - timeSinceRegistration;
            const timer = setTimeout(() => {
              setWelcomeName(data.name);
              setShowWelcomeDialog(true);
              localStorage.setItem('plantaopro_first_access', JSON.stringify({ ...data, shown: true }));
            }, remainingTime);
            return () => clearTimeout(timer);
          }
        }
      } catch (e) {
        console.error('Error parsing first access data:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (unitId && (user || masterSession)) {
      fetchUnitData();
    }
  }, [unitId, user, masterSession]);

  const fetchUnitData = async () => {
    try {
      setIsLoading(true);

      // Fetch unit info
      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .select('*')
        .eq('id', unitId)
        .single();

      if (unitError) throw unitError;
      setUnit(unitData);

      // Fetch agents for this unit
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, name, team, is_active, matricula')
        .eq('unit_id', unitId)
        .eq('is_active', true)
        .order('team, name');

      if (agentsError) throw agentsError;

      // Group agents by team
      const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'];
      const stats: TeamStats[] = teams.map(team => ({
        name: team,
        agents: agentsData?.filter(a => a.team === team) || [],
        ...teamConfigs[team],
      }));

      setTeamStats(stats);
    } catch (error) {
      console.error('Error fetching unit data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user && !masterSession) {
    return null;
  }

  const totalAgents = teamStats.reduce((acc, team) => acc + team.agents.length, 0);

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Welcome Trial Dialog */}
      {showWelcomeDialog && (
        <WelcomeTrialDialog 
          agentName={welcomeName} 
          onClose={() => setShowWelcomeDialog(false)} 
        />
      )}

      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 p-3 md:p-4 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-3 md:space-y-4 animate-fade-in">
            {/* Welcome Card for Current Agent - Compact */}
            {currentAgent && currentAgent.unit_id === unitId && (
              <div className="p-3 bg-gradient-to-r from-amber-500/15 via-amber-600/5 to-transparent rounded-lg border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Bem-vindo(a),</p>
                    <h2 className="text-base md:text-lg font-bold text-white truncate">{currentAgent.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {currentAgent.team && (
                        <Badge className={`${teamConfigs[currentAgent.team]?.bgColor} ${teamConfigs[currentAgent.team]?.color} text-[10px] px-1.5 py-0`}>
                          {currentAgent.team}
                        </Badge>
                      )}
                      <span className="text-[10px] text-slate-500">Mat: {currentAgent.matricula}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Unit Header - Compact */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shrink-0">
                  <Building2 className="h-6 w-6 text-slate-900" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg md:text-xl font-bold text-white truncate">{unit?.name}</h1>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs">{unit?.municipality}</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-amber-400 border-amber-400/40 text-xs shrink-0">
                {totalAgents} Agentes
              </Badge>
            </div>

            {/* Stats Cards - Compact */}
            <div className="grid grid-cols-4 gap-2">
              {teamStats.map((team) => (
                <Card 
                  key={team.name} 
                  className={`${team.bgColor} border-slate-700/50 hover:border-slate-600 transition-colors`}
                >
                  <CardContent className="p-2 md:p-3 text-center">
                    <team.icon className={`h-4 w-4 ${team.color} mx-auto mb-1`} />
                    <div className="text-lg md:text-xl font-bold text-white">{team.agents.length}</div>
                    <p className="text-[9px] md:text-[10px] text-slate-400 truncate">{team.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Teams Grid - Compact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teamStats.map((team) => (
                <Card key={team.name} className="bg-slate-800/40 border-slate-700/50">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <div className={`p-1.5 rounded ${team.bgColor}`}>
                        <team.icon className={`h-3.5 w-3.5 ${team.color}`} />
                      </div>
                      <span className="text-white text-sm">Equipe {team.name}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] h-5">
                        {team.agents.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {team.agents.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-3">
                        Nenhum agente
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {team.agents.map((agent) => (
                          <div 
                            key={agent.id}
                            className="flex items-center gap-2 p-2 rounded bg-slate-900/40 hover:bg-slate-900/60 transition-colors cursor-pointer"
                            onClick={() => navigate(`/agents/${agent.id}`)}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className={`${team.bgColor} ${team.color} text-[10px]`}>
                                {agent.name.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white truncate">
                                {agent.name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {agent.matricula || 'N/A'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions - Compact */}
            <div className="grid grid-cols-2 gap-2">
              <Card 
                className="bg-slate-800/40 border-slate-700/50 hover:border-amber-500/40 cursor-pointer transition-colors group"
                onClick={() => navigate('/shifts')}
              >
                <CardContent className="p-3 flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">Escalas</p>
                    <p className="text-[10px] text-slate-400">Ver plantões</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className="bg-slate-800/40 border-slate-700/50 hover:border-amber-500/40 cursor-pointer transition-colors group"
                onClick={() => navigate('/agents')}
              >
                <CardContent className="p-3 flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">Agentes</p>
                    <p className="text-[10px] text-slate-400">Gerenciar equipe</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
