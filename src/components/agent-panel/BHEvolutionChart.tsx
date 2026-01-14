import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell, ReferenceLine, Tooltip } from 'recharts';
import { BarChart3, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BHEvolutionChartProps {
  agentId: string;
}

interface ChartDataPoint {
  label: string;
  month: string;
  fortnight: number;
  hours: number;
  entries: number;
}

export function BHEvolutionChart({ agentId }: BHEvolutionChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [agentId]);

  const fetchChartData = async () => {
    if (!agentId) return;
    
    setIsLoading(true);
    try {
      const { data: entries, error } = await supabase
        .from('overtime_bank')
        .select('hours, description, created_at')
        .eq('agent_id', agentId);

      if (error) throw error;

      // Generate last 6 months with fortnights
      const now = new Date();
      const dataMap = new Map<string, { hours: number; entries: number }>();

      // Initialize all fortnights for last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'MM/yyyy');
        dataMap.set(`${monthKey}-1`, { hours: 0, entries: 0 });
        dataMap.set(`${monthKey}-2`, { hours: 0, entries: 0 });
      }

      // Process entries
      (entries || []).forEach((entry) => {
        if (entry.description) {
          const match = entry.description.match(/BH - (\d{2})\/(\d{2}\/\d{4})/);
          if (match) {
            const day = parseInt(match[1], 10);
            const monthYear = match[2];
            const fortnight = day <= 15 ? 1 : 2;
            const key = `${monthYear}-${fortnight}`;
            
            if (dataMap.has(key)) {
              const current = dataMap.get(key)!;
              dataMap.set(key, {
                hours: current.hours + (entry.hours || 0),
                entries: current.entries + 1,
              });
            }
          }
        }
      });

      // Convert to chart data
      const result: ChartDataPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'MM/yyyy');
        const monthLabel = format(date, 'MMM', { locale: ptBR }).toUpperCase();
        
        const first = dataMap.get(`${monthKey}-1`) || { hours: 0, entries: 0 };
        const second = dataMap.get(`${monthKey}-2`) || { hours: 0, entries: 0 };
        
        result.push({
          label: `${monthLabel} 1ª`,
          month: monthLabel,
          fortnight: 1,
          hours: first.hours,
          entries: first.entries,
        });
        
        result.push({
          label: `${monthLabel} 2ª`,
          month: monthLabel,
          fortnight: 2,
          hours: second.hours,
          entries: second.entries,
        });
      }

      setChartData(result);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartConfig = {
    hours: {
      label: 'Horas',
      color: 'hsl(var(--primary))',
    },
  };

  const getBarColor = (value: number) => {
    if (value > 0) return '#22c55e'; // green
    if (value < 0) return '#ef4444'; // red
    return '#64748b'; // slate
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-500" />
          Evolução de BH (6 meses)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-[140px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[140px] flex items-center justify-center">
            <p className="text-xs text-slate-500">Nenhum dado disponível</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[140px] w-full">
            <BarChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 8, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis 
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}h`}
              />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as ChartDataPoint;
                  return (
                    <div className="bg-slate-800 border border-slate-600 rounded-lg p-2 shadow-lg">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-white text-xs">{data.label}</span>
                        <span className={`text-sm font-bold ${data.hours >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {data.hours >= 0 ? '+' : ''}{data.hours.toFixed(1)}h
                        </span>
                        <span className="text-slate-400 text-[10px]">{data.entries} registros</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar 
                dataKey="hours" 
                radius={[3, 3, 0, 0]}
                maxBarSize={16}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.hours)} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
        
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-green-500" />
            <span>Positivo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-red-500" />
            <span>Negativo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-slate-500" />
            <span>Zero</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
