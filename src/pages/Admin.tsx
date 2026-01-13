import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, Users, Loader2, Database, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: string | null;
}

interface SystemStats {
  totalUsers: number;
  totalAgents: number;
  totalShifts: number;
  totalOvertime: number;
}

export default function Admin() {
  const { user, isLoading, isAdmin, masterSession } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalAgents: 0,
    totalShifts: 0,
    totalOvertime: 0,
  });
  const [loadingData, setLoadingData] = useState(true);

  // Redirect only after loading is complete
  useEffect(() => {
    if (isLoading) return;
    
    // Check if user is authenticated (user or master session)
    if (!user && !masterSession) {
      const timer = setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 200);
      return () => clearTimeout(timer);
    }
    
    // Check if user has admin access (or is master)
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

      // Fetch system stats
      const [agentsRes, shiftsRes, overtimeRes] = await Promise.all([
        supabase.from('agents').select('*', { count: 'exact', head: true }),
        supabase.from('shifts').select('*', { count: 'exact', head: true }),
        supabase.from('overtime_bank').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: usersWithRoles.length,
        totalAgents: agentsRes.count || 0,
        totalShifts: shiftsRes.count || 0,
        totalOvertime: overtimeRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (isLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if ((!user || !isAdmin) && !masterSession) return null;

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Administração
              </h1>
              <p className="text-muted-foreground">
                Painel de controle administrativo
              </p>
            </div>

            {/* System Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass glass-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Usuários</p>
                      <p className="text-2xl font-bold">{stats.totalUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass glass-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Agentes</p>
                      <p className="text-2xl font-bold">{stats.totalAgents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass glass-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Escalas</p>
                      <p className="text-2xl font-bold">{stats.totalShifts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass glass-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Database className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Registros BH</p>
                      <p className="text-2xl font-bold">{stats.totalOvertime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Users Table */}
            <Card className="glass glass-border shadow-card">
              <CardHeader>
                <CardTitle>Usuários do Sistema</CardTitle>
                <CardDescription>
                  Lista de todos os usuários cadastrados
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
