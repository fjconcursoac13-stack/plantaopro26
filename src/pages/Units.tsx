import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, Users, Building2, ChevronRight, Shield, Sword, Target, Phone, Mail, MapPinned, User } from 'lucide-react';

interface Unit {
  id: string;
  name: string;
  municipality: string;
  director_name?: string;
  coordinator_name?: string;
  address?: string;
  email?: string;
  phone?: string;
}

interface UnitStats {
  unit_id: string;
  total: number;
  alfa: number;
  bravo: number;
  charlie: number;
  delta: number;
}

const teamConfigs = {
  ALFA: { icon: Shield, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  BRAVO: { icon: Sword, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  CHARLIE: { icon: Target, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  DELTA: { icon: Users, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
};

export default function Units() {
  const { user, isLoading, masterSession, isAdmin } = useAuth();
  const { agent, isLoading: isLoadingAgent } = useAgentProfile();
  const navigate = useNavigate();
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitStats, setUnitStats] = useState<Record<string, UnitStats>>({});
  const [loading, setLoading] = useState(true);

  // Check if user is admin or master (can see all units)
  const canSeeAllUnits = isAdmin || !!masterSession;

  // Redirect only after loading is complete
  useEffect(() => {
    if (isLoading) return;
    
    // Don't redirect if we have any valid session
    if (user || masterSession) return;
    
    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      navigate('/auth', { replace: true });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [user, isLoading, masterSession, navigate]);

  useEffect(() => {
    if ((user || masterSession) && !isLoadingAgent) {
      fetchUnitsAndStats();
    }
  }, [user, masterSession, isLoadingAgent, agent]);

  const fetchUnitsAndStats = async () => {
    try {
      // If agent (not admin/master), only fetch their own unit
      if (!canSeeAllUnits && agent?.unit_id) {
        const { data: unitData, error: unitError } = await supabase
          .from('units')
          .select('*')
          .eq('id', agent.unit_id)
          .single();

        if (unitError) throw unitError;
        setUnits(unitData ? [unitData] : []);

        // Fetch agents for this unit
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('unit_id, team')
          .eq('unit_id', agent.unit_id)
          .eq('is_active', true);

        if (agentsError) throw agentsError;

        // Calculate stats for this unit
        const stats: Record<string, UnitStats> = {};
        if (unitData) {
          stats[unitData.id] = {
            unit_id: unitData.id,
            total: 0,
            alfa: 0,
            bravo: 0,
            charlie: 0,
            delta: 0,
          };

          (agentsData || []).forEach(agentItem => {
            if (agentItem.unit_id && stats[agentItem.unit_id]) {
              stats[agentItem.unit_id].total++;
              if (agentItem.team === 'ALFA') stats[agentItem.unit_id].alfa++;
              else if (agentItem.team === 'BRAVO') stats[agentItem.unit_id].bravo++;
              else if (agentItem.team === 'CHARLIE') stats[agentItem.unit_id].charlie++;
              else if (agentItem.team === 'DELTA') stats[agentItem.unit_id].delta++;
            }
          });
        }
        setUnitStats(stats);
      } else {
        // Admin/Master: fetch all units
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('*')
          .order('municipality, name');

        if (unitsError) throw unitsError;
        setUnits(unitsData || []);

        // Fetch all agents to calculate stats
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('unit_id, team')
          .eq('is_active', true);

        if (agentsError) throw agentsError;

        // Calculate stats per unit
        const stats: Record<string, UnitStats> = {};
        
        (unitsData || []).forEach(unit => {
          stats[unit.id] = {
            unit_id: unit.id,
            total: 0,
            alfa: 0,
            bravo: 0,
            charlie: 0,
            delta: 0,
          };
        });

        (agentsData || []).forEach(agentItem => {
          if (agentItem.unit_id && stats[agentItem.unit_id]) {
            stats[agentItem.unit_id].total++;
            if (agentItem.team === 'ALFA') stats[agentItem.unit_id].alfa++;
            else if (agentItem.team === 'BRAVO') stats[agentItem.unit_id].bravo++;
            else if (agentItem.team === 'CHARLIE') stats[agentItem.unit_id].charlie++;
            else if (agentItem.team === 'DELTA') stats[agentItem.unit_id].delta++;
          }
        });

        setUnitStats(stats);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group units by municipality
  const groupedUnits = units.reduce((acc, unit) => {
    if (!acc[unit.municipality]) {
      acc[unit.municipality] = [];
    }
    acc[unit.municipality].push(unit);
    return acc;
  }, {} as Record<string, Unit[]>);

  if (isLoading || isLoadingAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !masterSession) return null;

  // For regular agents - show a more detailed view of their own unit
  if (!canSeeAllUnits && units.length === 1) {
    const myUnit = units[0];
    const stats = unitStats[myUnit.id] || { total: 0, alfa: 0, bravo: 0, charlie: 0, delta: 0 };

    return (
      <div className="min-h-screen flex bg-slate-900">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              {/* Page Header */}
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-amber-500" />
                <div>
                  <h1 className="text-2xl font-bold text-white">Minha Unidade</h1>
                  <p className="text-slate-400">{myUnit.name}</p>
                </div>
              </div>

              {/* Unit Details Card */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-400">
                    <Building2 className="h-5 w-5" />
                    {myUnit.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Location */}
                  <div className="flex items-center gap-3 text-slate-300">
                    <MapPin className="h-5 w-5 text-amber-500" />
                    <span>{myUnit.municipality}</span>
                  </div>

                  {/* Director */}
                  {myUnit.director_name && (
                    <div className="flex items-center gap-3 text-slate-300">
                      <User className="h-5 w-5 text-blue-400" />
                      <div>
                        <span className="text-xs text-slate-500 block">Diretor(a)</span>
                        <span>{myUnit.director_name}</span>
                      </div>
                    </div>
                  )}

                  {/* Coordinator */}
                  {myUnit.coordinator_name && (
                    <div className="flex items-center gap-3 text-slate-300">
                      <Shield className="h-5 w-5 text-green-400" />
                      <div>
                        <span className="text-xs text-slate-500 block">Coordenador(a) de Segurança</span>
                        <span>{myUnit.coordinator_name}</span>
                      </div>
                    </div>
                  )}

                  {/* Address */}
                  {myUnit.address && (
                    <div className="flex items-center gap-3 text-slate-300">
                      <MapPinned className="h-5 w-5 text-purple-400" />
                      <span>{myUnit.address}</span>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-700">
                    {myUnit.phone && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Phone className="h-4 w-4 text-amber-400" />
                        <span className="text-sm">{myUnit.phone}</span>
                      </div>
                    )}
                    {myUnit.email && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Mail className="h-4 w-4 text-amber-400" />
                        <span className="text-sm">{myUnit.email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Team Stats Card */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-amber-500" />
                      Equipes
                    </span>
                    <Badge className="bg-amber-500/20 text-amber-400">
                      {stats.total} Agentes
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'] as const).map((team) => {
                      const config = teamConfigs[team];
                      const count = team === 'ALFA' ? stats.alfa : 
                                   team === 'BRAVO' ? stats.bravo : 
                                   team === 'CHARLIE' ? stats.charlie : stats.delta;
                      const isMyTeam = agent?.team === team;
                      
                      return (
                        <div 
                          key={team} 
                          className={`flex flex-col items-center p-4 rounded-xl ${config.bgColor} ${isMyTeam ? 'ring-2 ring-amber-500' : ''}`}
                        >
                          <config.icon className={`h-8 w-8 ${config.color}`} />
                          <span className={`text-lg font-bold mt-2 ${config.color}`}>{team}</span>
                          <span className="text-2xl font-bold text-white mt-1">{count}</span>
                          <span className="text-xs text-slate-400">agentes</span>
                          {isMyTeam && (
                            <Badge className="mt-2 bg-amber-500 text-black text-xs">
                              Sua Equipe
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Developer Credit */}
              <p className="text-center text-xs text-muted-foreground">
                Desenvolvido por <span className="text-primary font-medium">Franc D'nis</span>
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Admin/Master view - show all units
  return (
    <div className="min-h-screen flex bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  Unidades Socioeducativas
                </h1>
                <p className="text-muted-foreground">
                  Clique em uma unidade para ver detalhes e agentes
                </p>
              </div>
              <Badge variant="outline" className="text-amber-400 border-amber-400/50">
                {units.length} Unidades
              </Badge>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedUnits).map(([municipality, municipalityUnits]) => (
                  <div key={municipality}>
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-5 w-5 text-amber-500" />
                      <h2 className="text-lg font-semibold text-white">{municipality}</h2>
                      <Badge variant="secondary" className="ml-2">
                        {municipalityUnits.length} {municipalityUnits.length === 1 ? 'unidade' : 'unidades'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {municipalityUnits.map((unit) => {
                        const stats = unitStats[unit.id] || { total: 0, alfa: 0, bravo: 0, charlie: 0, delta: 0 };
                        
                        return (
                          <Card 
                            key={unit.id} 
                            className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-all cursor-pointer group"
                            onClick={() => navigate(`/unit/${unit.id}`)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                  <Building2 className="h-5 w-5 text-amber-400" />
                                  {unit.name}
                                </CardTitle>
                                <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {/* Total Agents */}
                              <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-slate-400" />
                                  <span className="text-sm text-slate-300">Total de Agentes</span>
                                </div>
                                <Badge className="bg-amber-500/20 text-amber-400">
                                  {stats.total}
                                </Badge>
                              </div>
                              
                              {/* Team Stats */}
                              <div className="grid grid-cols-4 gap-2">
                                {(['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'] as const).map((team) => {
                                  const config = teamConfigs[team];
                                  const count = team === 'ALFA' ? stats.alfa : 
                                               team === 'BRAVO' ? stats.bravo : 
                                               team === 'CHARLIE' ? stats.charlie : stats.delta;
                                  return (
                                    <div 
                                      key={team} 
                                      className={`flex flex-col items-center p-2 rounded-lg ${config.bgColor}`}
                                    >
                                      <config.icon className={`h-4 w-4 ${config.color}`} />
                                      <span className="text-xs text-slate-300 mt-1">{team[0]}</span>
                                      <span className={`text-sm font-bold ${config.color}`}>{count}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              <Button 
                                variant="ghost" 
                                className="w-full text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/unit/${unit.id}`);
                                }}
                              >
                                Ver Painel da Unidade
                                <ChevronRight className="h-4 w-4 ml-2" />
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Developer Credit */}
            <p className="text-center text-xs text-muted-foreground">
              Desenvolvido por <span className="text-primary font-medium">Franc D'nis</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
