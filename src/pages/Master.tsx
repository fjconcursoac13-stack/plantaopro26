import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Users, Loader2, Database, Activity, LogOut, Calendar, MapPin, Search, ArrowRightLeft, Pencil, KeyRound, Check, Clock, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { TransferApprovalPanel } from '@/components/agents/TransferApprovalPanel';
import { AdminResetPasswordDialog } from '@/components/agents/AdminResetPasswordDialog';
import { EditAgentDialog } from '@/components/admin/EditAgentDialog';
import { EditUnitDialog } from '@/components/admin/EditUnitDialog';
import { DeleteAgentDialog } from '@/components/admin/DeleteAgentDialog';
import { LicenseManagementDialog } from '@/components/admin/LicenseManagementDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { formatCPF } from '@/lib/validators';
import { cn } from '@/lib/utils';

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: string | null;
}

interface Unit {
  id: string;
  name: string;
  municipality: string;
  director_name?: string | null;
  coordinator_name?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface Agent {
  id: string;
  name: string;
  cpf: string | null;
  matricula: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  team: string | null;
  is_active: boolean;
  unit_id: string | null;
  bh_limit?: number | null;
  bh_hourly_rate?: number | null;
  license_status?: string | null;
  license_expires_at?: string | null;
  license_notes?: string | null;
  unit: {
    name: string;
    municipality: string;
  } | null;
}

interface SystemStats {
  totalUsers: number;
  totalAgents: number;
  totalShifts: number;
  totalOvertime: number;
  totalUnits: number;
  pendingTransfers: number;
}

export default function Master() {
  const { masterSession, setMasterSession, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalAgents: 0,
    totalShifts: 0,
    totalOvertime: 0,
    totalUnits: 0,
    pendingTransfers: 0,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [agentSearchTerm, setAgentSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Edit dialogs state
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editAgentOpen, setEditAgentOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editUnitOpen, setEditUnitOpen] = useState(false);

  // Redirect only after loading is complete and we're sure there's no master session
  useEffect(() => {
    if (isLoading) return;
    
    // Don't redirect if we have master session
    if (masterSession) return;
    
    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      navigate('/auth', { replace: true });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [masterSession, isLoading, navigate]);

  useEffect(() => {
    if (masterSession) {
      fetchData();
    }
  }, [masterSession]);

  const fetchData = async () => {
    try {
      setLoadingData(true);

      // Fetch profiles with roles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, created_at');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          email: profile.full_name || 'Usuário',
          created_at: profile.created_at,
          role: userRole?.role || 'user',
        };
      });

      setUsers(usersWithRoles);

      // Fetch units
      const { data: unitsData } = await supabase
        .from('units')
        .select('*')
        .order('municipality, name');
      
      setUnits(unitsData || []);

      // Fetch agents with BH settings and license info
      const { data: agentsData } = await (supabase as any)
        .from('agents')
        .select(`
          id, name, cpf, matricula, email, phone, address, team, is_active, unit_id,
          bh_limit, bh_hourly_rate, license_status, license_expires_at, license_notes,
          unit:units(name, municipality)
        `)
        .order('name');

      setAgents((agentsData as unknown as Agent[]) || []);

      // Fetch system stats
      const [agentsRes, shiftsRes, overtimeRes, unitsRes, transfersRes] = await Promise.all([
        supabase.from('agents').select('*', { count: 'exact', head: true }),
        supabase.from('shifts').select('*', { count: 'exact', head: true }),
        supabase.from('overtime_bank').select('*', { count: 'exact', head: true }),
        supabase.from('units').select('*', { count: 'exact', head: true }),
        supabase.from('transfer_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        totalUsers: usersWithRoles.length,
        totalAgents: agentsRes.count || 0,
        totalShifts: shiftsRes.count || 0,
        totalOvertime: overtimeRes.count || 0,
        totalUnits: unitsRes.count || 0,
        pendingTransfers: transfersRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // First check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole as 'admin' | 'user' | 'master' })
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: newRole as 'admin' | 'user' | 'master' }]);
        
        if (error) throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Função do usuário atualizada.',
      });
      
      // Update local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a função.',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    setMasterSession(null);
    navigate('/auth');
  };

  // Filter agents by CPF, Matricula, or Name
  const filteredAgents = agents.filter((agent) => {
    if (!agentSearchTerm) return true;
    
    const searchTerm = agentSearchTerm.toLowerCase().trim();
    const searchNumbers = searchTerm.replace(/\D/g, '');
    
    // Search by name (text)
    const name = agent.name.toLowerCase();
    if (name.includes(searchTerm)) return true;
    
    // Search by CPF (numbers)
    if (searchNumbers && agent.cpf) {
      if (agent.cpf.includes(searchNumbers)) return true;
    }
    
    // Search by Matricula (numbers)
    if (searchNumbers && agent.matricula) {
      if (agent.matricula.includes(searchNumbers)) return true;
    }
    
    return false;
  });

  if (isLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!masterSession) return null;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient">Painel Master</h1>
              <p className="text-muted-foreground">
                Bem-vindo, <span className="text-primary font-medium">{masterSession}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <Calendar className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="glass glass-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Usuários</p>
                  <p className="text-xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass glass-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Agentes</p>
                  <p className="text-xl font-bold">{stats.totalAgents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass glass-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unidades</p>
                  <p className="text-xl font-bold">{stats.totalUnits}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass glass-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Escalas</p>
                  <p className="text-xl font-bold">{stats.totalShifts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass glass-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Banco Horas</p>
                  <p className="text-xl font-bold">{stats.totalOvertime}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass glass-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <ArrowRightLeft className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transferências</p>
                  <p className="text-xl font-bold">{stats.pendingTransfers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="agents">Agentes</TabsTrigger>
            <TabsTrigger value="transfers">Transferências</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Units Table */}
            <Card className="glass glass-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Unidades Cadastradas
                </CardTitle>
                <CardDescription>
                  Unidades e municípios do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Unidade</TableHead>
                      <TableHead>Município</TableHead>
                      <TableHead>Diretor</TableHead>
                      <TableHead>Coordenador</TableHead>
                      <TableHead>Equipes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => (
                      <TableRow key={unit.id} className="border-border">
                        <TableCell>
                          <button
                            onClick={() => {
                              setEditingUnit(unit);
                              setEditUnitOpen(true);
                            }}
                            className="font-medium text-primary hover:underline cursor-pointer flex items-center gap-1"
                          >
                            {unit.name}
                            <Pencil className="h-3 w-3 opacity-50" />
                          </button>
                        </TableCell>
                        <TableCell>{unit.municipality}</TableCell>
                        <TableCell className="text-sm">{unit.director_name || '-'}</TableCell>
                        <TableCell className="text-sm">{unit.coordinator_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'].map((team) => (
                              <Badge key={team} variant="outline" className="text-xs">
                                {team}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-4 mt-6">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por CPF, Matrícula ou Nome..."
                value={agentSearchTerm}
                onChange={(e) => setAgentSearchTerm(e.target.value)}
                className="pl-10 bg-input"
              />
            </div>

            <Card className="glass glass-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Agentes Cadastrados
                </CardTitle>
                <CardDescription>
                  Busca avançada por CPF ou Matrícula Funcional
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {filteredAgents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {agentSearchTerm ? 'Nenhum agente encontrado' : 'Nenhum agente cadastrado'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Matrícula</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Equipe</TableHead>
                        <TableHead>Licença</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgents.map((agent) => {
                        const licenseStatus = agent.license_status || 'active';
                        const isLicenseExpired = agent.license_expires_at && new Date(agent.license_expires_at) < new Date();
                        const effectiveLicense = isLicenseExpired ? 'expired' : licenseStatus;
                        
                        return (
                          <TableRow key={agent.id} className="border-border">
                            <TableCell>
                              <button
                                onClick={() => {
                                  setEditingAgent(agent);
                                  setEditAgentOpen(true);
                                }}
                                className="font-medium text-primary hover:underline cursor-pointer flex items-center gap-1"
                              >
                                {agent.name}
                                <Pencil className="h-3 w-3 opacity-50" />
                              </button>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {agent.cpf ? formatCPF(agent.cpf) : '-'}
                            </TableCell>
                            <TableCell className="font-mono">{agent.matricula || '-'}</TableCell>
                            <TableCell>
                              {agent.unit ? (
                                <div>
                                  <div className="font-medium text-sm">{agent.unit.name}</div>
                                  <div className="text-xs text-muted-foreground">{agent.unit.municipality}</div>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {agent.team ? (
                                <Badge variant="outline">{agent.team}</Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  effectiveLicense === 'active' ? 'default' : 
                                  effectiveLicense === 'blocked' ? 'destructive' : 'secondary'
                                }
                                className={cn(
                                  'flex items-center gap-1 w-fit',
                                  effectiveLicense === 'active' && 'bg-green-500/20 text-green-400 border-green-500/30',
                                  effectiveLicense === 'expired' && 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                                  effectiveLicense === 'blocked' && 'bg-destructive/20 text-destructive border-destructive/30',
                                  effectiveLicense === 'pending' && 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                )}
                              >
                                {effectiveLicense === 'active' && <Check className="h-3 w-3" />}
                                {effectiveLicense === 'expired' && <Clock className="h-3 w-3" />}
                                {effectiveLicense === 'blocked' && <Ban className="h-3 w-3" />}
                                {effectiveLicense === 'pending' && <Clock className="h-3 w-3" />}
                                {effectiveLicense === 'active' && 'Ativo'}
                                {effectiveLicense === 'expired' && 'Expirado'}
                                {effectiveLicense === 'blocked' && 'Bloqueado'}
                                {effectiveLicense === 'pending' && 'Pendente'}
                              </Badge>
                              {agent.license_expires_at && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Exp: {format(new Date(agent.license_expires_at), 'dd/MM/yy')}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                                {agent.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {agent.cpf && (
                                  <AdminResetPasswordDialog 
                                    agentName={agent.name}
                                    agentCpf={agent.cpf}
                                  />
                                )}
                                <LicenseManagementDialog
                                  agentId={agent.id}
                                  agentName={agent.name}
                                  currentStatus={agent.license_status || 'active'}
                                  currentExpiry={agent.license_expires_at}
                                  currentNotes={agent.license_notes}
                                  onSuccess={fetchData}
                                  trigger={
                                    <Button variant="ghost" size="icon" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                                      <KeyRound className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                                <DeleteAgentDialog
                                  agentId={agent.id}
                                  agentName={agent.name}
                                  onSuccess={fetchData}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transfers Tab */}
          <TabsContent value="transfers" className="mt-6">
            <TransferApprovalPanel />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <TransferApprovalPanel showHistory />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <Card className="glass glass-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Gerenciar Usuários
                </CardTitle>
                <CardDescription>
                  Controle total sobre os usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {users.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum usuário encontrado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Nome</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Cadastrado em</TableHead>
                        <TableHead>Alterar Função</TableHead>
                        <TableHead className="w-20">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} className="border-border">
                          <TableCell className="font-medium">{u.email}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {u.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                u.role === 'master'
                                  ? 'default'
                                  : u.role === 'admin'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {u.role === 'master' && 'Master'}
                              {u.role === 'admin' && 'Admin'}
                              {u.role === 'user' && 'Usuário'}
                              {!u.role && 'Usuário'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={u.role || 'user'}
                              onValueChange={(value) => handleRoleChange(u.id, value)}
                            >
                              <SelectTrigger className="w-32 bg-input">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value="user">Usuário</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="master">Master</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <DeleteUserDialog 
                              userId={u.id} 
                              userName={u.email} 
                              onSuccess={fetchData} 
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Developer Credit */}
        <div className="text-center pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground">
            Desenvolvido por <span className="text-primary font-semibold">Franc D'nis</span>
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Feijó, Acre • © {new Date().getFullYear()} PlantãoPro</p>
        </div>
      </div>

      {/* Edit Agent Dialog */}
      <EditAgentDialog
        agent={editingAgent}
        open={editAgentOpen}
        onOpenChange={setEditAgentOpen}
        onSuccess={fetchData}
      />

      {/* Edit Unit Dialog */}
      <EditUnitDialog
        unit={editingUnit}
        open={editUnitOpen}
        onOpenChange={setEditUnitOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}
