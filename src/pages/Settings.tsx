import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, User, Shield, Loader2, Palette, Sparkles, ArrowLeft } from 'lucide-react';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export default function Settings() {
  const { user, isLoading, userRole, masterSession } = useAuth();
  const navigate = useNavigate();
  const { themeConfig } = useTheme();
  
  // Enable ESC key navigation - get goBack function
  const { goBack } = useBackNavigation({ enabled: true, fallbackPath: '/dashboard' });
  useBackNavigation();

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
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <SettingsIcon className="h-6 w-6 text-primary" />
                Configurações
              </h1>
              <p className="text-muted-foreground">
                Gerencie suas preferências e configurações da conta
              </p>
            </div>

            {/* Theme Section */}
            <Card className="glass glass-border shadow-card overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/5">
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Tema Visual
                </CardTitle>
                <CardDescription>
                  Personalize a aparência do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Tema atual: <span className="font-medium text-primary">{themeConfig.emoji} {themeConfig.name}</span>
                  </span>
                </div>
                <ThemeSelector />
              </CardContent>
            </Card>

            {/* Profile Section */}
            <Card className="glass glass-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Perfil
                </CardTitle>
                <CardDescription>
                  Informações da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {masterSession && !user ? (
                  <>
                    <div className="space-y-2">
                      <Label>Usuário Master</Label>
                      <Input value={masterSession} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Sessão</Label>
                      <Input value="Administrador Master" disabled className="bg-muted" />
                    </div>
                  </>
                ) : user ? (
                  <>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={user.email || ''} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>ID do Usuário</Label>
                      <Input value={user.id} disabled className="bg-muted font-mono text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label>Conta criada em</Label>
                      <Input
                        value={new Date(user.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {/* Password Section - Only for regular users, not master session */}
            {user && (
              <Card className="glass glass-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Segurança
                  </CardTitle>
                  <CardDescription>
                    Altere sua senha de acesso
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Senha</p>
                      <p className="text-sm text-muted-foreground">
                        Mantenha sua conta segura com uma senha forte
                      </p>
                    </div>
                    <ChangePasswordDialog />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Role Section */}
            <Card className="glass glass-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Permissões
                </CardTitle>
                <CardDescription>
                  Seu nível de acesso no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Label>Função atual:</Label>
                  <Badge
                    variant={userRole === 'master' || userRole === 'admin' || masterSession ? 'default' : 'secondary'}
                    className="text-sm"
                  >
                    {masterSession && !userRole && 'Master'}
                    {userRole === 'master' && 'Master'}
                    {userRole === 'admin' && 'Administrador'}
                    {userRole === 'user' && 'Usuário'}
                    {!userRole && !masterSession && 'Usuário'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  {userRole === 'master' || userRole === 'admin' || masterSession
                    ? 'Você tem acesso total ao sistema, incluindo gestão de agentes, escalas e banco de horas.'
                    : 'Você tem acesso de visualização às escalas e informações do sistema.'}
                </p>
              </CardContent>
            </Card>

            {/* App Info */}
            <Card className="glass glass-border shadow-card">
              <CardHeader>
                <CardTitle>Sobre o PlantaoPro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Versão</span>
                  <span className="font-mono">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Build</span>
                  <span className="font-mono">2024.01</span>
                </div>
              </CardContent>
            </Card>

            {/* Developer Credit */}
            <p className="text-center text-xs text-muted-foreground">
              Desenvolvido por <span className="text-primary font-medium">Franc Denis</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
