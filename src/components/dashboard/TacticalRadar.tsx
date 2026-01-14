import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radar, Users, Activity, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSoundEffects } from '@/hooks/useSoundEffects';

interface AgentBlip {
  id: string;
  name: string;
  team: string | null;
  isActive: boolean;
  position: { angle: number; distance: number };
  lastActivity?: string;
}

interface TacticalRadarProps {
  unitId?: string;
  className?: string;
  compact?: boolean;
}

export function TacticalRadar({ unitId, className, compact = false }: TacticalRadarProps) {
  const [agents, setAgents] = useState<AgentBlip[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { playSound } = useSoundEffects();

  // Fetch agents and generate blip positions
  useEffect(() => {
    const fetchAgents = async () => {
      let query = supabase
        .from('agents')
        .select('id, name, team, is_active, updated_at')
        .eq('is_active', true);

      if (unitId) {
        query = query.eq('unit_id', unitId);
      }

      const { data, error } = await query.limit(20);

      if (!error && data) {
        const blips: AgentBlip[] = data.map((agent, index) => ({
          id: agent.id,
          name: agent.name,
          team: agent.team,
          isActive: agent.is_active ?? true,
          position: {
            angle: (360 / data.length) * index + Math.random() * 30,
            distance: 20 + Math.random() * 60,
          },
          lastActivity: agent.updated_at,
        }));
        setAgents(blips);
        setLastUpdate(new Date());
      }
    };

    fetchAgents();
    const interval = setInterval(fetchAgents, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [unitId]);

  // Radar sweep animation trigger
  useEffect(() => {
    const sweepInterval = setInterval(() => {
      setIsScanning(prev => !prev);
      // Play subtle radar ping
      if (agents.length > 0) {
        playSound('tactical-hover');
      }
    }, 4000);

    return () => clearInterval(sweepInterval);
  }, [agents.length, playSound]);

  const teamColors: Record<string, string> = {
    ALFA: 'bg-blue-400 shadow-blue-400/50',
    BRAVO: 'bg-red-400 shadow-red-400/50',
    CHARLIE: 'bg-emerald-400 shadow-emerald-400/50',
    DELTA: 'bg-violet-400 shadow-violet-400/50',
    default: 'bg-primary shadow-primary/50',
  };

  const rings = useMemo(() => [20, 40, 60, 80], []);

  const radarSize = compact ? 140 : 200;
  const centerX = radarSize / 2;
  const centerY = radarSize / 2;

  return (
    <Card className={cn("glass glass-border shadow-card tactical-card overflow-hidden", className)}>
      <CardHeader className={cn("pb-2", compact && "p-3 pb-1")}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radar className={cn("text-primary", compact ? "h-4 w-4" : "h-5 w-5")} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <span className={compact ? "text-sm" : ""}>Radar Tático</span>
          </div>
          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/40">
            <Wifi className="h-3 w-3 mr-1" />
            LIVE
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("flex flex-col items-center gap-3", compact && "p-3 pt-1")}>
        {/* Radar Display */}
        <div 
          className="relative rounded-full border border-primary/30 bg-background/50"
          style={{ width: radarSize, height: radarSize }}
        >
          {/* Grid rings */}
          {rings.map((ring) => (
            <div
              key={ring}
              className="absolute rounded-full border border-primary/20"
              style={{
                width: `${ring}%`,
                height: `${ring}%`,
                top: `${(100 - ring) / 2}%`,
                left: `${(100 - ring) / 2}%`,
              }}
            />
          ))}

          {/* Cross lines */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
          </div>

          {/* Sweep animation */}
          <div 
            className={cn(
              "absolute inset-0 rounded-full transition-opacity duration-500",
              isScanning ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: 'conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary) / 0.4) 30deg, transparent 60deg)',
              animation: 'spin 4s linear infinite',
            }}
          />

          {/* Center point */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-glow z-10" />

          {/* Agent blips */}
          {agents.map((agent, index) => {
            const radians = (agent.position.angle * Math.PI) / 180;
            const x = centerX + Math.cos(radians) * (agent.position.distance * centerX / 100) - 4;
            const y = centerY + Math.sin(radians) * (agent.position.distance * centerY / 100) - 4;
            const colorClass = teamColors[agent.team || 'default'] || teamColors.default;

            return (
              <div
                key={agent.id}
                className={cn(
                  "absolute w-2 h-2 rounded-full z-20 cursor-pointer transition-all duration-300 hover:scale-150",
                  colorClass,
                  "animate-pulse"
                )}
                style={{
                  left: x,
                  top: y,
                  animationDelay: `${index * 0.2}s`,
                  boxShadow: '0 0 8px currentColor',
                }}
                title={`${agent.name}${agent.team ? ` - ${agent.team}` : ''}`}
                onClick={() => playSound('tactical-click')}
              />
            );
          })}

          {/* Scan line effect */}
          <div 
            className="absolute left-1/2 top-1/2 h-1/2 w-[2px] origin-top -translate-x-1/2"
            style={{
              background: 'linear-gradient(to bottom, hsl(var(--primary)), transparent)',
              animation: 'spin 4s linear infinite',
            }}
          />
        </div>

        {/* Stats */}
        <div className={cn("flex items-center gap-4 text-xs", compact && "gap-2")}>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-primary">{agents.length}</span>
            <span className="text-muted-foreground">detectados</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-emerald-400" />
            <span className="text-muted-foreground">
              Atualizado {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Team legend */}
        {!compact && (
          <div className="flex flex-wrap justify-center gap-2 text-[10px]">
            {Object.entries(teamColors).filter(([k]) => k !== 'default').map(([team, color]) => (
              <div key={team} className="flex items-center gap-1">
                <div className={cn("w-2 h-2 rounded-full", color.split(' ')[0])} />
                <span className="text-muted-foreground">{team}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}