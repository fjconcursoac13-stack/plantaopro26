import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Shield, 
  Users, 
  Loader2, 
  Database, 
  Activity, 
  Building2, 
  KeyRound, 
  CreditCard,
  UserCheck,
  History,
  MapPin,
  Phone,
  Mail,
  Crown,
  User2,
  Calendar,
  Clock,
  Snowflake,
  Unlock,
  Lock,
  TrendingUp,
  AlertTriangle,
  ArrowRightLeft
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LicenseManagementDialog } from '@/components/admin/LicenseManagementDialog';
import { AdminTransferDialog } from '@/components/admin/AdminTransferDialog';
import { LicenseActivationCodeManager } from '@/components/admin/LicenseActivationCodeManager';
import { BulkLicenseActivator } from '@/components/admin/BulkLicenseActivator';
import { OfflineLicenseCacheManager } from '@/components/admin/OfflineLicenseCacheManager';
import { toast } from 'sonner';
import { HardDrive, Zap } from 'lucide-react';

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
  address: string | null;
  phone: string | null;
  email: string | null;
  director_name: string | null;
  coordinator_name: string | null;
  agentsCount: number;
}

interface AgentWithLicense {
  id: string;
  name: string;
  matricula: string | null;
  team: string | null;
  unit_id: string | null;
  unit_name: string | null;
  license_status: string | null;
  license_expires_at: string | null;
  is_frozen: boolean;
  is_active: boolean;
}

interface AccessLog {
  id: string;
  agent_id: string;
  agent_name: string;
  unit_name: string | null;
  team: string | null;
  action: string;
  created_at: string;
}

interface Payment {
  id: string;
  agent_id: string;
  agent_name: string;
  amount: number;
  payment_date: string;
  months_paid: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

interface SystemStats {
  totalUsers: number;
  totalAgents: number;
  totalShifts: number;
  totalOvertime: number;
  activeAgents: number;
  expiredLicenses: number;
  totalPayments: number;
}

export default function Admin() {
  const { user, isLoading, isAdmin, masterSession } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [agents, setAgents] = useState<AgentWithLicense[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalAgents: 0,
    totalShifts: 0,
    totalOvertime: 0,
    activeAgents: 0,
    expiredLicenses: 0,
    totalPayments: 0,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentWithLicense | null>(null);
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Redirect only after loading is complete
  useEffect(() => {
    if (isLoading) return;
    
    if (!user && !masterSession) {
      const timer = setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 200);
      return () => clearTimeout(timer);
    }
    
    if (!isAdmin && !masterSession) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, isAdmin, masterSession, navigate]);

  useEffect(() => {
    if ((user && isAdmin) || masterSession) {
      fetchData();
    }
  }, [user, isAdmin, masterSession]);

  const fetchData = async () => {
    try {
      setLoadingData(true);

      // Fetch all data in parallel
      const [
        profilesRes,
        rolesRes,
        unitsRes,
        agentsRes,
        shiftsRes,
        overtimeRes,
        logsRes,
        paymentsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, created_at'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('units').select('*'),
        supabase.from('agents').select('id, name, matricula, team, unit_id, license_status, license_expires_at, is_frozen, is_active'),
        supabase.from('shifts').select('*', { count: 'exact', head: true }),
        supabase.from('overtime_bank').select('*', { count: 'exact', head: true }),
        supabase.from('access_logs').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      // Process users
      const usersWithRoles: UserWithRole[] = (profilesRes.data || []).map((profile) => {
        const userRole = rolesRes.data?.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          email: profile.full_name || 'Usuário',
          created_at: profile.created_at,
          role: userRole?.role || 'user',
        };
      });
      setUsers(usersWithRoles);

      // Process units with agent counts
      const unitsWithCounts: Unit[] = (unitsRes.data || []).map(unit => ({
        ...unit,
        agentsCount: (agentsRes.data || []).filter(a => a.unit_id === unit.id && a.is_active).length,
      }));
      setUnits(unitsWithCounts);

      // Process agents with unit names
      const agentsWithUnits: AgentWithLicense[] = (agentsRes.data || []).map(agent => ({
        ...agent,
        is_frozen: agent.is_frozen || false,
        is_active: agent.is_active ?? true,
        unit_name: unitsRes.data?.find(u => u.id === agent.unit_id)?.name || null,
      }));
      setAgents(agentsWithUnits);

      // Process access logs with agent names
      const logsWithNames: AccessLog[] = (logsRes.data || []).map(log => {
        const agent = agentsRes.data?.find(a => a.id === log.agent_id);
        const unit = unitsRes.data?.find(u => u.id === agent?.unit_id);
        return {
          ...log,
          agent_name: agent?.name || 'Desconhecido',
          unit_name: unit?.name || null,
          team: agent?.team || null,
        };
      });
      setAccessLogs(logsWithNames);

      // Process payments with agent names
      const paymentsWithNames: Payment[] = (paymentsRes.data || []).map(payment => {
        const agent = agentsRes.data?.find(a => a.id === payment.agent_id);
        return {
          ...payment,
          agent_name: agent?.name || 'Desconhecido',
        };
      });
      setPayments(paymentsWithNames);

      // Calculate stats
      const now = new Date();
      const expiredCount = agentsWithUnits.filter(a => {
        if (!a.license_expires_at) return false;
        return new Date(a.license_expires_at) < now;
      }).length;

      const totalPaymentsAmount = paymentsWithNames.reduce((acc, p) => acc + Number(p.amount), 0);

      setStats({
        totalUsers: usersWithRoles.length,
        totalAgents: agentsWithUnits.length,
        totalShifts: shiftsRes.count || 0,
        totalOvertime: overtimeRes.count || 0,
        activeAgents: agentsWithUnits.filter(a => a.is_active).length,
        expiredLicenses: expiredCount,
        totalPayments: totalPaymentsAmount,
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoadingData(false);
    }
  };

  const getLicenseStatusBadge = (agent: AgentWithLicense) => {
    if (agent.is_frozen) {
      return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400"><Snowflake className="h-3 w-3 mr-1" />Congelado</Badge>;
    }
    
    if (!agent.license_expires_at) {
      return <Badge variant="outline" className="text-slate-400">Sem prazo</Badge>;
    }

    const expiresAt = new Date(agent.license_expires_at);
    const now = new Date();
    const daysUntil = differenceInDays(expiresAt, now);

    if (daysUntil < -3) {
      return <Badge variant="destructive"><Lock className="h-3 w-3 mr-1" />Bloqueado</Badge>;
    }
    if (daysUntil < 0) {
      return <Badge variant="destructive" className="bg-orange-500/20 text-orange-400"><AlertTriangle className="h-3 w-3 mr-1" />Carência</Badge>;
    }
    if (daysUntil <= 7) {
      return <Badge variant="secondary" className="bg-amber-500/20 text-amber-400"><Clock className="h-3 w-3 mr-1" />{daysUntil}d</Badge>;
    }
    return <Badge variant="default" className="bg-emerald-500/20 text-emerald-400"><UserCheck className="h-3 w-3 mr-1" />Ativo</Badge>;
  };

  const openLicenseDialog = (agent: AgentWithLicense) => {
    setSelectedAgent(agent);
    setLicenseDialogOpen(true);
  };

  const openTransferDialog = (agent: AgentWithLicense) => {
    setSelectedAgent(agent);
    setTransferDialogOpen(true);
  };

  if (isLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-slate-400 text-sm">Carregando painel...</span>
        </div>
      </div>
    );
  }

  if ((!user || !isAdmin) && !masterSession) return null;

  const adminId = user?.id || masterSession || '';

  return (
    <div className="min-h-screen flex bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  Painel Administrativo
                </h1>
                <p className="text-slate-400 mt-1">
                  Gestão completa do sistema
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Usuários</p>
                      <p className="text-xl font-bold text-white">{stats.totalUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <UserCheck className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Agentes Ativos</p>
                      <p className="text-xl font-bold text-white">{stats.activeAgents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Lic. Expiradas</p>
                      <p className="text-xl font-bold text-white">{stats.expiredLicenses}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Activity className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Escalas</p>
                      <p className="text-xl font-bold text-white">{stats.totalShifts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <Database className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Registros BH</p>
                      <p className="text-xl font-bold text-white">{stats.totalOvertime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Pagamentos</p>
                      <p className="text-xl font-bold text-white">R$ {stats.totalPayments.toFixed(0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1">
                <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
                  <Building2 className="h-4 w-4 mr-2" />
                  Unidades
                </TabsTrigger>
                <TabsTrigger value="licenses" className="data-[state=active]:bg-slate-700">
                  <KeyRound className="h-4 w-4 mr-2" />
                  Licenças
                </TabsTrigger>
                <TabsTrigger value="payments" className="data-[state=active]:bg-slate-700">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagamentos
                </TabsTrigger>
                <TabsTrigger value="logs" className="data-[state=active]:bg-slate-700">
                  <History className="h-4 w-4 mr-2" />
                  Logs
                </TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-slate-700">
                  <Users className="h-4 w-4 mr-2" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="offline" className="data-[state=active]:bg-slate-700">
                  <HardDrive className="h-4 w-4 mr-2" />
                  Offline
                </TabsTrigger>
              </TabsList>

              {/* Units Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {units.map((unit) => (
                    <Card key={unit.id} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50 hover:border-slate-600/50 transition-all">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base text-white">{unit.name}</CardTitle>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <MapPin className="h-3 w-3" />
                                {unit.municipality}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                            {unit.agentsCount} agentes
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {unit.director_name && (
                          <div className="flex items-center gap-2 p-2 bg-slate-700/30 rounded-lg">
                            <Crown className="h-4 w-4 text-amber-400" />
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase">Diretor(a)</p>
                              <p className="text-sm text-white">{unit.director_name}</p>
                            </div>
                          </div>
                        )}
                        {unit.coordinator_name && (
                          <div className="flex items-center gap-2 p-2 bg-slate-700/30 rounded-lg">
                            <User2 className="h-4 w-4 text-blue-400" />
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase">Coordenador(a)</p>
                              <p className="text-sm text-white">{unit.coordinator_name}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          {unit.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {unit.phone}
                            </div>
                          )}
                          {unit.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {unit.email}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Licenses Tab */}
              <TabsContent value="licenses">
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-primary" />
                      Gestão de Licenças
                    </CardTitle>
                    <CardDescription>
                      Controle de acesso e renovação de licenças
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700/50 hover:bg-transparent">
                            <TableHead className="text-slate-400">Agente</TableHead>
                            <TableHead className="text-slate-400">Unidade</TableHead>
                            <TableHead className="text-slate-400">Equipe</TableHead>
                            <TableHead className="text-slate-400">Status</TableHead>
                            <TableHead className="text-slate-400">Expira em</TableHead>
                            <TableHead className="text-slate-400 text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agents.filter(a => a.is_active).map((agent) => (
                            <TableRow key={agent.id} className="border-slate-700/50 hover:bg-slate-800/30">
                              <TableCell className="font-medium text-white">
                                <div>
                                  {agent.name}
                                  {agent.matricula && (
                                    <span className="text-xs text-slate-500 block">{agent.matricula}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-slate-400 text-sm">{agent.unit_name || '-'}</TableCell>
                              <TableCell className="text-slate-400 text-sm">{agent.team || '-'}</TableCell>
                              <TableCell>{getLicenseStatusBadge(agent)}</TableCell>
                              <TableCell className="text-slate-400 text-sm">
                                {agent.license_expires_at 
                                  ? format(new Date(agent.license_expires_at), 'dd/MM/yyyy', { locale: ptBR })
                                  : '-'
                                }
                              </TableCell>
                              <TableCell className="text-right space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openTransferDialog(agent)}
                                  className="text-slate-400 hover:text-white"
                                  title="Transferir"
                                >
                                  <ArrowRightLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openLicenseDialog(agent)}
                                  className="text-slate-400 hover:text-white"
                                  title="Gerenciar Licença"
                                >
                                  <KeyRound className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments">
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-emerald-500" />
                      Histórico de Pagamentos
                    </CardTitle>
                    <CardDescription>
                      Registro de pagamentos manuais
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                      {payments.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          Nenhum pagamento registrado
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-700/50 hover:bg-transparent">
                              <TableHead className="text-slate-400">Data</TableHead>
                              <TableHead className="text-slate-400">Agente</TableHead>
                              <TableHead className="text-slate-400">Valor</TableHead>
                              <TableHead className="text-slate-400">Meses</TableHead>
                              <TableHead className="text-slate-400">Método</TableHead>
                              <TableHead className="text-slate-400">Observações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payments.map((payment) => (
                              <TableRow key={payment.id} className="border-slate-700/50 hover:bg-slate-800/30">
                                <TableCell className="text-slate-400 text-sm">
                                  {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ptBR })}
                                </TableCell>
                                <TableCell className="font-medium text-white">{payment.agent_name}</TableCell>
                                <TableCell className="text-emerald-400 font-medium">
                                  R$ {Number(payment.amount).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-slate-400">{payment.months_paid}</TableCell>
                                <TableCell className="text-slate-400 capitalize">{payment.payment_method}</TableCell>
                                <TableCell className="text-slate-500 text-xs max-w-[200px] truncate">
                                  {payment.notes || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Logs Tab */}
              <TabsContent value="logs">
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <History className="h-5 w-5 text-purple-500" />
                      Logs de Acesso
                    </CardTitle>
                    <CardDescription>
                      Histórico de acessos ao sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                      {accessLogs.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          Nenhum log de acesso
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-700/50 hover:bg-transparent">
                              <TableHead className="text-slate-400">Data/Hora</TableHead>
                              <TableHead className="text-slate-400">Agente</TableHead>
                              <TableHead className="text-slate-400">Unidade</TableHead>
                              <TableHead className="text-slate-400">Equipe</TableHead>
                              <TableHead className="text-slate-400">Ação</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accessLogs.map((log) => (
                              <TableRow key={log.id} className="border-slate-700/50 hover:bg-slate-800/30">
                                <TableCell className="text-slate-400 text-sm">
                                  {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </TableCell>
                                <TableCell className="font-medium text-white">{log.agent_name}</TableCell>
                                <TableCell className="text-slate-400 text-sm">{log.unit_name || '-'}</TableCell>
                                <TableCell className="text-slate-400 text-sm">{log.team || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">
                                    {log.action}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users">
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Usuários do Sistema</CardTitle>
                    <CardDescription>
                      Lista de todos os usuários cadastrados
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                      {users.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          Nenhum usuário encontrado
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-700/50 hover:bg-transparent">
                              <TableHead className="text-slate-400">Nome</TableHead>
                              <TableHead className="text-slate-400">ID</TableHead>
                              <TableHead className="text-slate-400">Função</TableHead>
                              <TableHead className="text-slate-400">Cadastrado em</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.map((u) => (
                              <TableRow key={u.id} className="border-slate-700/50 hover:bg-slate-800/30">
                                <TableCell className="font-medium text-white">{u.email}</TableCell>
                                <TableCell className="font-mono text-xs text-slate-500">
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
                                    className={
                                      u.role === 'master'
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : u.role === 'admin'
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : ''
                                    }
                                  >
                                    {u.role === 'master' && 'Master'}
                                    {u.role === 'admin' && 'Admin'}
                                    {u.role === 'user' && 'Usuário'}
                                    {!u.role && 'Usuário'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-slate-400">
                                  {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Offline Tab */}
              <TabsContent value="offline" className="space-y-4">
                <BulkLicenseActivator onActivated={fetchData} />
                <LicenseActivationCodeManager />
                <OfflineLicenseCacheManager />
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
        </main>
      </div>

      {/* License Management Dialog */}
      <LicenseManagementDialog
        agentId={selectedAgent?.id || ''}
        agentName={selectedAgent?.name || ''}
        currentStatus={selectedAgent?.license_status || 'active'}
        currentExpiry={selectedAgent?.license_expires_at}
        onSuccess={fetchData}
      />

      {/* Transfer Dialog */}
      <AdminTransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        agent={selectedAgent}
        onSuccess={fetchData}
      />
    </div>
  );
}
