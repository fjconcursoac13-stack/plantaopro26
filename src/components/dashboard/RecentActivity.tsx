import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Activity, UserPlus, Clock, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: 'agent' | 'shift' | 'overtime';
  title: string;
  description: string;
  time: string;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      // Fetch recent agents
      const { data: agents } = await supabase
        .from('agents')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch recent shifts
      const { data: shifts } = await supabase
        .from('shifts')
        .select(`
          id,
          shift_date,
          created_at,
          agent:agents(name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch recent overtime entries
      const { data: overtime } = await supabase
        .from('overtime_bank')
        .select(`
          id,
          hours,
          operation_type,
          created_at,
          agent:agents(name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      const allActivities: ActivityItem[] = [];

      if (agents) {
        agents.forEach((agent) => {
          allActivities.push({
            id: agent.id,
            type: 'agent',
            title: 'Novo agente',
            description: agent.name,
            time: agent.created_at,
          });
        });
      }

      if (shifts) {
        shifts.forEach((shift: any) => {
          allActivities.push({
            id: shift.id,
            type: 'shift',
            title: 'Plantão criado',
            description: `${shift.agent?.name || 'Agente'} - ${shift.shift_date}`,
            time: shift.created_at,
          });
        });
      }

      if (overtime) {
        overtime.forEach((entry: any) => {
          allActivities.push({
            id: entry.id,
            type: 'overtime',
            title: entry.operation_type === 'credit' ? 'Horas adicionadas' : 'Horas utilizadas',
            description: `${entry.agent?.name || 'Agente'}: ${entry.hours}h`,
            time: entry.created_at,
          });
        });
      }

      // Sort by time and take top 5
      allActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivities(allActivities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'agent':
        return UserPlus;
      case 'shift':
        return Calendar;
      case 'overtime':
        return Clock;
      default:
        return Activity;
    }
  };

  return (
    <Card className="glass glass-border shadow-card h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-24 mb-1" />
                  <div className="h-3 bg-muted rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma atividade recente
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-secondary">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.time), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
