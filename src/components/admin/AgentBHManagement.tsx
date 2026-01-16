import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  DollarSign,
  Edit3,
  Loader2,
  Plus,
  Minus,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Settings2,
  History,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Agent {
  id: string;
  name: string;
  matricula: string | null;
  team: string | null;
  unit_id: string | null;
  unit_name: string | null;
  bh_hourly_rate: number | null;
  bh_limit: number | null;
}

interface BHEntry {
  id: string;
  agent_id: string;
  agent_name: string;
  hours: number;
  operation_type: string;
  description: string | null;
  created_at: string;
}

interface AgentBHSummary {
  agent: Agent;
  balance: number;
  totalCredits: number;
  totalDebits: number;
  lastEntry: string | null;
  estimatedValue: number;
}

interface Props {
  onDataChange?: () => void;
}

export function AgentBHManagement({ onDataChange }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [bhEntries, setBhEntries] = useState<BHEntry[]>([]);
  const [summaries, setSummaries] = useState<AgentBHSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterBalance, setFilterBalance] = useState<string>('all');
  
  // Dialog states
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'remove' | 'settings'>('add');
  
  // Form states
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [bhLimit, setBhLimit] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [agentsRes, unitsRes, bhRes] = await Promise.all([
        supabase.from('agents').select('id, name, matricula, team, unit_id, bh_hourly_rate, bh_limit').eq('is_active', true),
        supabase.from('units').select('id, name'),
        supabase.from('overtime_bank').select('*').order('created_at', { ascending: false }),
      ]);

      const agentsWithUnits: Agent[] = (agentsRes.data || []).map(agent => ({
        ...agent,
        unit_name: unitsRes.data?.find(u => u.id === agent.unit_id)?.name || null,
      }));
      setAgents(agentsWithUnits);

      const entriesWithNames: BHEntry[] = (bhRes.data || []).map(entry => ({
        ...entry,
        agent_name: agentsRes.data?.find(a => a.id === entry.agent_id)?.name || 'Desconhecido',
      }));
      setBhEntries(entriesWithNames);

      // Calculate summaries
      const agentSummaries: AgentBHSummary[] = agentsWithUnits.map(agent => {
        const agentEntries = entriesWithNames.filter(e => e.agent_id === agent.id);
        const credits = agentEntries.filter(e => e.operation_type === 'credit').reduce((sum, e) => sum + Number(e.hours), 0);
        const debits = agentEntries.filter(e => e.operation_type === 'debit').reduce((sum, e) => sum + Math.abs(Number(e.hours)), 0);
        const balance = credits - debits;
        const lastEntry = agentEntries[0]?.created_at || null;
        const rate = agent.bh_hourly_rate || 15;
        
        return {
          agent,
          balance,
          totalCredits: credits,
          totalDebits: debits,
          lastEntry,
          estimatedValue: balance * rate,
        };
      });
      
      setSummaries(agentSummaries);
    } catch (error) {
      console.error('Error fetching BH data:', error);
      toast.error('Erro ao carregar dados de BH');
    } finally {
      setIsLoading(false);
    }
  };

  const openDialog = (agent: Agent, mode: 'add' | 'remove' | 'settings') => {
    setSelectedAgent(agent);
    setDialogMode(mode);
    setHours('');
    setDescription('');
    setHourlyRate(agent.bh_hourly_rate?.toString() || '15');
    setBhLimit(agent.bh_limit?.toString() || '40');
    setDialogOpen(true);
  };

  const handleSaveBH = async () => {
    if (!selectedAgent) return;
    
    try {
      setIsSaving(true);
      
      if (dialogMode === 'settings') {
        const { error } = await supabase
          .from('agents')
          .update({
            bh_hourly_rate: parseFloat(hourlyRate) || 15,
            bh_limit: parseFloat(bhLimit) || 40,
          })
          .eq('id', selectedAgent.id);
          
        if (error) throw error;
        toast.success('Configurações de BH atualizadas!');
      } else {
        const hoursValue = parseFloat(hours);
        if (isNaN(hoursValue) || hoursValue <= 0) {
          toast.error('Informe um valor válido de horas');
          return;
        }
        
        const { error } = await supabase
          .from('overtime_bank')
          .insert({
            agent_id: selectedAgent.id,
            hours: dialogMode === 'add' ? hoursValue : -hoursValue,
            operation_type: dialogMode === 'add' ? 'credit' : 'debit',
            description: description || (dialogMode === 'add' ? 'Adição pelo Admin' : 'Remoção pelo Admin'),
          });
          
        if (error) throw error;
        toast.success(dialogMode === 'add' ? 'Horas adicionadas!' : 'Horas removidas!');
      }
      
      setDialogOpen(false);
      fetchData();
      onDataChange?.();
    } catch (error) {
      console.error('Error saving BH:', error);
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter summaries
  const filteredSummaries = summaries.filter(s => {
    const matchesSearch = s.agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.agent.matricula?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = filterTeam === 'all' || s.agent.team === filterTeam;
    const matchesBalance = filterBalance === 'all' ||
                          (filterBalance === 'positive' && s.balance > 0) ||
                          (filterBalance === 'negative' && s.balance < 0) ||
                          (filterBalance === 'zero' && s.balance === 0);
    return matchesSearch && matchesTeam && matchesBalance;
  });

  // Stats
  const totalBalance = summaries.reduce((sum, s) => sum + s.balance, 0);
  const totalValue = summaries.reduce((sum, s) => sum + s.estimatedValue, 0);
  const agentsWithBH = summaries.filter(s => s.balance > 0).length;
  const agentsNegative = summaries.filter(s => s.balance < 0).length;

  const teams = [...new Set(agents.map(a => a.team).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-slate-800/60 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Clock className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Saldo Total</p>
                <p className="text-xl font-bold text-emerald-400">{totalBalance.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-cyan-500/10 to-slate-800/60 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <DollarSign className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Valor Total</p>
                <p className="text-xl font-bold text-cyan-400">R$ {totalValue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-slate-800/60 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Com Saldo</p>
                <p className="text-xl font-bold text-blue-400">{agentsWithBH}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500/10 to-slate-800/60 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Negativos</p>
                <p className="text-xl font-bold text-red-400">{agentsNegative}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar agente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-700/50 border-slate-600"
              />
            </div>
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="w-full md:w-40 bg-slate-700/50 border-slate-600">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Equipes</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team} value={team!}>{team}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterBalance} onValueChange={setFilterBalance}>
              <SelectTrigger className="w-full md:w-40 bg-slate-700/50 border-slate-600">
                <Wallet className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Saldo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Saldos</SelectItem>
                <SelectItem value="positive">Positivo</SelectItem>
                <SelectItem value="negative">Negativo</SelectItem>
                <SelectItem value="zero">Zero</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData} className="border-slate-600">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agents Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Banco de Horas - Todos os Agentes
          </CardTitle>
          <CardDescription>
            Gerencie o banco de horas de cada agente
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[450px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Agente</TableHead>
                  <TableHead className="text-slate-400">Equipe</TableHead>
                  <TableHead className="text-slate-400 text-center">Saldo</TableHead>
                  <TableHead className="text-slate-400 text-center">Valor Est.</TableHead>
                  <TableHead className="text-slate-400 text-center">Taxa/h</TableHead>
                  <TableHead className="text-slate-400">Última Atividade</TableHead>
                  <TableHead className="text-slate-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummaries.map((summary) => (
                  <TableRow key={summary.agent.id} className="border-slate-700/50 hover:bg-slate-800/30">
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{summary.agent.name}</p>
                        {summary.agent.matricula && (
                          <p className="text-xs text-slate-500">{summary.agent.matricula}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {summary.agent.team ? (
                        <Badge variant="outline" className={`text-xs ${
                          summary.agent.team === 'ALFA' ? 'text-red-400 border-red-500/30' :
                          summary.agent.team === 'BRAVO' ? 'text-blue-400 border-blue-500/30' :
                          summary.agent.team === 'CHARLIE' ? 'text-green-400 border-green-500/30' :
                          'text-amber-400 border-amber-500/30'
                        }`}>
                          {summary.agent.team}
                        </Badge>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`font-mono ${
                        summary.balance > 0 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : summary.balance < 0 
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      }`}>
                        {summary.balance > 0 ? '+' : ''}{summary.balance.toFixed(1)}h
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-medium ${
                        summary.estimatedValue > 0 ? 'text-cyan-400' : 
                        summary.estimatedValue < 0 ? 'text-red-400' : 'text-slate-400'
                      }`}>
                        R$ {summary.estimatedValue.toFixed(0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-slate-400 text-sm">
                      R$ {summary.agent.bh_hourly_rate || 15}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {summary.lastEntry 
                        ? format(new Date(summary.lastEntry), 'dd/MM/yy HH:mm', { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(summary.agent, 'add')}
                          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          title="Adicionar Horas"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(summary.agent, 'remove')}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Remover Horas"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(summary.agent, 'settings')}
                          className="text-slate-400 hover:text-white"
                          title="Configurações"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <History className="h-5 w-5 text-purple-500" />
            Atividade Recente de BH
          </CardTitle>
          <CardDescription>
            Últimos 50 registros de banco de horas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Data/Hora</TableHead>
                  <TableHead className="text-slate-400">Agente</TableHead>
                  <TableHead className="text-slate-400">Operação</TableHead>
                  <TableHead className="text-slate-400">Horas</TableHead>
                  <TableHead className="text-slate-400">Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bhEntries.slice(0, 50).map((entry) => (
                  <TableRow key={entry.id} className="border-slate-700/50 hover:bg-slate-800/30">
                    <TableCell className="text-slate-400 text-sm">
                      {format(new Date(entry.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium text-white">{entry.agent_name}</TableCell>
                    <TableCell>
                      {entry.operation_type === 'credit' ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Crédito
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Débito
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={`font-mono font-medium ${
                      entry.operation_type === 'credit' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {entry.operation_type === 'credit' ? '+' : ''}{Number(entry.hours).toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm max-w-[200px] truncate">
                      {entry.description || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {dialogMode === 'add' && <Plus className="h-5 w-5 text-emerald-400" />}
              {dialogMode === 'remove' && <Minus className="h-5 w-5 text-red-400" />}
              {dialogMode === 'settings' && <Settings2 className="h-5 w-5 text-blue-400" />}
              {dialogMode === 'add' && 'Adicionar Horas'}
              {dialogMode === 'remove' && 'Remover Horas'}
              {dialogMode === 'settings' && 'Configurações de BH'}
            </DialogTitle>
            <DialogDescription>
              Agente: <span className="text-white font-medium">{selectedAgent?.name}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {dialogMode !== 'settings' ? (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-300">Quantidade de Horas</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    placeholder="Ex: 2.5"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="bg-slate-700/50 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Descrição (opcional)</Label>
                  <Textarea
                    placeholder="Motivo da operação..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 resize-none"
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-300">Valor por Hora (R$)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="1"
                    placeholder="15"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="bg-slate-700/50 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Limite de Horas Mensais</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="40"
                    value={bhLimit}
                    onChange={(e) => setBhLimit(e.target.value)}
                    className="bg-slate-700/50 border-slate-600"
                  />
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-600">
              Cancelar
            </Button>
            <Button
              onClick={handleSaveBH}
              disabled={isSaving}
              className={
                dialogMode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' :
                dialogMode === 'remove' ? 'bg-red-600 hover:bg-red-700' :
                'bg-blue-600 hover:bg-blue-700'
              }
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : dialogMode === 'add' ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : dialogMode === 'remove' ? (
                <AlertTriangle className="h-4 w-4 mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {isSaving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
