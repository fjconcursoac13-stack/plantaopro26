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
  CHARLIE: { icon: Target, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  DELTA: { icon: Users, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
};

export default function UnitDashboard() {
  const { unitId } = useParams<{ unitId: string }>();
  const { user, isLoading: authLoading, masterSession } = useAuth();
  const { agent: currentAgent } = useAgentProfile();
  const navigate = useNavigate();
  
  const [unit, setUnit] = useState<Unit | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Welcome Card for Current Agent */}
            {currentAgent && currentAgent.unit_id === unitId && (
              <div className="p-4 bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-transparent rounded-xl border border-amber-500/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Bem-vindo(a),</p>
                    <h2 className="text-xl font-bold text-white">{currentAgent.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {currentAgent.team && (
                        <Badge className={`${teamConfigs[currentAgent.team]?.bgColor} ${teamConfigs[currentAgent.team]?.color}`}>
                          Equipe {currentAgent.team}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500">Mat: {currentAgent.matricula}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Unit Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                  <Building2 className="h-8 w-8 text-slate-900" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{unit?.name}</h1>
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="h-4 w-4" />
                    <span>{unit?.municipality}</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-amber-400 border-amber-400/50">
                {totalAgents} Agentes
              </Badge>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {teamStats.map((team) => (
                <Card 
                  key={team.name} 
                  className={`${team.bgColor} border-slate-700 hover:border-slate-600 transition-colors`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <team.icon className={`h-5 w-5 ${team.color}`} />
                      <span className={team.color}>Equipe {team.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-white">{team.agents.length}</div>
                    <p className="text-xs text-slate-400">agentes ativos</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {teamStats.map((team) => (
                <Card key={team.name} className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${team.bgColor}`}>
                        <team.icon className={`h-5 w-5 ${team.color}`} />
                      </div>
                      <span className="text-white">Equipe {team.name}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {team.agents.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {team.agents.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-4">
                        Nenhum agente cadastrado
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {team.agents.map((agent) => (
                          <div 
                            key={agent.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900/70 transition-colors cursor-pointer"
                            onClick={() => navigate(`/agents/${agent.id}`)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className={`${team.bgColor} ${team.color} text-xs`}>
                                {agent.name.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {agent.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                Mat: {agent.matricula || 'N/A'}
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

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card 
                className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 cursor-pointer transition-colors group"
                onClick={() => navigate('/shifts')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Escalas</p>
                    <p className="text-xs text-slate-400">Ver plantões</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 cursor-pointer transition-colors group"
                onClick={() => navigate('/agents')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20 text-green-400 group-hover:scale-110 transition-transform">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Agentes</p>
                    <p className="text-xs text-slate-400">Gerenciar equipe</p>
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
