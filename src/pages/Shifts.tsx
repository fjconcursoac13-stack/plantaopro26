import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Loader2, Pencil, Trash2, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BackButton } from '@/components/BackButton';
import { ShiftReportPDF } from '@/components/reports/ShiftReportPDF';
import { useBackNavigation } from '@/hooks/useBackNavigation';

interface Unit {
  id: string;
  name: string;
  municipality: string;
}

interface Agent {
  id: string;
  name: string;
  team: string | null;
  unit_id: string | null;
}

interface Shift {
  id: string;
  agent_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  notes: string | null;
  agent: Agent | null;
}

const shiftTypes = [
  { value: 'regular', label: 'Regular' },
  { value: 'noturno', label: 'Noturno' },
  { value: 'extra', label: 'Extra' },
  { value: 'plantao', label: 'Plantão' },
];

const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'];

export default function Shifts() {
  const { user, isLoading, isAdmin, masterSession } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Enable ESC key navigation
  useBackNavigation();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [filteredShifts, setFilteredShifts] = useState<Shift[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    agent_id: '',
    shift_date: '',
    start_time: '',
    end_time: '',
    shift_type: 'regular',
    notes: '',
  });

  // Filter state
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    unit_id: '',
    team: '',
    shift_type: '',
  });

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
    if (user || masterSession) {
      fetchShifts();
      fetchAgents();
      fetchUnits();
    }
  }, [user, masterSession]);

  useEffect(() => {
    applyFilters();
  }, [shifts, filters]);

  const fetchUnits = async () => {
    const { data } = await supabase
      .from('units')
      .select('*')
      .order('municipality, name');
    if (data) setUnits(data);
  };

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          agent:agents(id, name, team, unit_id)
        `)
        .order('shift_date', { ascending: false });

      if (error) throw error;
      setShifts(data as unknown as Shift[]);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as escalas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    const { data } = await supabase
      .from('agents')
      .select('id, name, team, unit_id')
      .eq('is_active', true)
      .order('name');
    if (data) setAgents(data);
  };

  const applyFilters = () => {
    let result = [...shifts];

    // Filter by date range
    if (filters.startDate) {
      result = result.filter(s => s.shift_date >= filters.startDate);
    }
    if (filters.endDate) {
      result = result.filter(s => s.shift_date <= filters.endDate);
    }

    // Filter by unit
    if (filters.unit_id) {
      result = result.filter(s => s.agent?.unit_id === filters.unit_id);
    }

    // Filter by team
    if (filters.team) {
      result = result.filter(s => s.agent?.team === filters.team);
    }

    // Filter by shift type
    if (filters.shift_type) {
      result = result.filter(s => s.shift_type === filters.shift_type);
    }

    setFilteredShifts(result);
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      unit_id: '',
      team: '',
      shift_type: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agent_id || !formData.shift_date || !formData.start_time || !formData.end_time) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingShift) {
        const { error } = await supabase
          .from('shifts')
          .update({
            agent_id: formData.agent_id,
            shift_date: formData.shift_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            shift_type: formData.shift_type,
            notes: formData.notes || null,
          })
          .eq('id', editingShift.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Escala atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase.from('shifts').insert({
          agent_id: formData.agent_id,
          shift_date: formData.shift_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          shift_type: formData.shift_type,
          notes: formData.notes || null,
        });

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Escala criada com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingShift(null);
      setFormData({
        agent_id: '',
        shift_date: '',
        start_time: '',
        end_time: '',
        shift_type: 'regular',
        notes: '',
      });
      fetchShifts();
    } catch (error) {
      console.error('Error saving shift:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a escala.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      agent_id: shift.agent_id,
      shift_date: shift.shift_date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      shift_type: shift.shift_type,
      notes: shift.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta escala?')) return;

    try {
      const { error } = await supabase.from('shifts').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Escala excluída com sucesso.',
      });
      fetchShifts();
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a escala.',
        variant: 'destructive',
      });
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'extra':
        return 'destructive';
      case 'noturno':
        return 'secondary';
      case 'plantao':
        return 'default';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !masterSession) return null;

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Back Button */}
            <BackButton />

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-primary" />
                  Escalas
                </h1>
                <p className="text-muted-foreground">
                  Gerencie as escalas e plantões
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className={hasActiveFilters ? "border-primary" : ""}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2">
                      {Object.values(filters).filter(v => v !== '').length}
                    </Badge>
                  )}
                </Button>
                {isAdmin && <ShiftReportPDF units={units} />}
                {isAdmin && (
                  <Dialog
                    open={isDialogOpen}
                    onOpenChange={(open) => {
                      setIsDialogOpen(open);
                      if (!open) {
                        setEditingShift(null);
                        setFormData({
                          agent_id: '',
                          shift_date: '',
                          start_time: '',
                          end_time: '',
                          shift_type: 'regular',
                          notes: '',
                        });
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-primary hover:opacity-90">
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Escala
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle>
                          {editingShift ? 'Editar Escala' : 'Nova Escala'}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Agente *</Label>
                          <Select
                            value={formData.agent_id}
                            onValueChange={(value) => setFormData({ ...formData, agent_id: value })}
                          >
                            <SelectTrigger className="bg-input">
                              <SelectValue placeholder="Selecione um agente" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                              {agents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.name} {agent.team && `(${agent.team})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="shift_date">Data *</Label>
                          <Input
                            id="shift_date"
                            type="date"
                            value={formData.shift_date}
                            onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                            className="bg-input"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="start_time">Início *</Label>
                            <Input
                              id="start_time"
                              type="time"
                              value={formData.start_time}
                              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                              className="bg-input"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="end_time">Fim *</Label>
                            <Input
                              id="end_time"
                              type="time"
                              value={formData.end_time}
                              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                              className="bg-input"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select
                            value={formData.shift_type}
                            onValueChange={(value) => setFormData({ ...formData, shift_type: value })}
                          >
                            <SelectTrigger className="bg-input">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                              {shiftTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Observações</Label>
                          <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Observações opcionais"
                            className="bg-input"
                          />
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90">
                            {editingShift ? 'Salvar' : 'Criar'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <Card className="glass glass-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Filter className="h-5 w-5 text-primary" />
                      Filtros Avançados
                    </CardTitle>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Date Range */}
                    <div className="space-y-2">
                      <Label className="text-sm">Data Início</Label>
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="bg-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Data Fim</Label>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="bg-input"
                      />
                    </div>

                    {/* Unit */}
                    <div className="space-y-2">
                      <Label className="text-sm">Unidade</Label>
                      <Select
                        value={filters.unit_id}
                        onValueChange={(value) => setFilters({ ...filters, unit_id: value })}
                      >
                        <SelectTrigger className="bg-input">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="">Todas</SelectItem>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Team */}
                    <div className="space-y-2">
                      <Label className="text-sm">Equipe</Label>
                      <Select
                        value={filters.team}
                        onValueChange={(value) => setFilters({ ...filters, team: value })}
                      >
                        <SelectTrigger className="bg-input">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="">Todas</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team} value={team}>
                              {team}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Shift Type */}
                    <div className="space-y-2">
                      <Label className="text-sm">Tipo</Label>
                      <Select
                        value={filters.shift_type}
                        onValueChange={(value) => setFilters({ ...filters, shift_type: value })}
                      >
                        <SelectTrigger className="bg-input">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="">Todos</SelectItem>
                          {shiftTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Count */}
            {hasActiveFilters && (
              <div className="text-sm text-muted-foreground">
                {filteredShifts.length} {filteredShifts.length === 1 ? 'escala encontrada' : 'escalas encontradas'}
              </div>
            )}

            {/* Table */}
            <Card className="glass glass-border shadow-card">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredShifts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {hasActiveFilters ? 'Nenhuma escala encontrada com os filtros aplicados' : 'Nenhuma escala cadastrada'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Agente</TableHead>
                        <TableHead>Equipe</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Observações</TableHead>
                        {isAdmin && <TableHead className="w-24">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShifts.map((shift) => (
                        <TableRow key={shift.id} className="border-border">
                          <TableCell className="font-medium">
                            {shift.agent?.name || 'Agente não encontrado'}
                          </TableCell>
                          <TableCell>
                            {shift.agent?.team ? (
                              <Badge variant="outline">{shift.agent.team}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(shift.shift_date + 'T00:00:00'), "dd 'de' MMM, yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getTypeBadgeVariant(shift.shift_type)}>
                              {shiftTypes.find((t) => t.value === shift.shift_type)?.label || shift.shift_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {shift.notes || '-'}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(shift)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(shift.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Developer Credit */}
            <p className="text-center text-xs text-muted-foreground mt-8">
              Desenvolvido por <span className="text-primary font-medium">Franc Denis</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
