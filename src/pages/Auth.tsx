import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, BadgeCheck, AlertTriangle, Lock, Eye, EyeOff, UserCheck, ArrowLeft, Home, Mail, KeyRound, WifiOff } from 'lucide-react';
import { 
  validateCPF, 
  formatCPF
} from '@/lib/validators';
import { SavedCredentials, saveCredential, getAutoLoginCredential } from '@/components/auth/SavedCredentials';
import loginBackground from '@/assets/login-background.jpg';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { checkOfflineLicense, isOnline } from '@/hooks/useOfflineLicenseCache';

interface Unit {
  id: string;
  name: string;
  municipality: string;
}

const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'];

export default function Auth() {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ cpf?: string; password?: string; email?: string }>({});
  const [saveCpfEnabled, setSaveCpfEnabled] = useState(false);
  const [savePasswordEnabled, setSavePasswordEnabled] = useState(false);
  const [foundAgent, setFoundAgent] = useState<{ name: string } | null>(null);
  const [isSearchingAgent, setIsSearchingAgent] = useState(false);
  
  // Email login state
  const [loginMethod, setLoginMethod] = useState<'cpf' | 'email'>('cpf');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  
  // Registration form state - SIMPLIFIED (only essential fields)
  const [units, setUnits] = useState<Unit[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    unit_id: '',
    team: '',
    registerPassword: '',
    confirmPassword: '',
  });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [showRegPassword, setShowRegPassword] = useState(false);
  
  // Master admin state
  const [masterUsername, setMasterUsername] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [isMasterLogin, setIsMasterLogin] = useState(false);
  
  const { signIn, signUp, user, isLoading, setMasterSession } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    fetchUnits();
  }, []);

  // No longer needed - birth_date moved to profile completion

  // Auto-login effect on page load
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  
  useEffect(() => {
    if (!autoLoginAttempted && !isSubmitting && !user) {
      const autoLoginCred = getAutoLoginCredential();
      if (autoLoginCred) {
        setAutoLoginAttempted(true);
        setCpf(formatCPF(autoLoginCred.cpf));
        setPassword(autoLoginCred.password);
        
        // Auto-submit after a brief delay
        setTimeout(() => {
          const form = document.querySelector('form[data-login-form="true"]') as HTMLFormElement;
          if (form) {
            form.requestSubmit();
          }
        }, 500);
      }
    }
  }, [autoLoginAttempted, isSubmitting, user]);

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('municipality, name');

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const validateForm = () => {
    const newErrors: { cpf?: string; password?: string; email?: string } = {};
    
    if (loginMethod === 'cpf') {
      const cleanCpf = cpf.replace(/\D/g, '');
      if (!cleanCpf || cleanCpf.length !== 11) {
        newErrors.cpf = 'CPF inválido';
      }
      
      if (!password || password.length < 6) {
        newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
      }
    } else {
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        newErrors.email = 'Email inválido';
      }
      
      if (!emailPassword || emailPassword.length < 6) {
        newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegistration = () => {
    const errors: Record<string, string> = {};
    
    // Name validation (no numbers, minimum 3 chars)
    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Nome deve ter pelo menos 3 caracteres';
    } else if (/\d/.test(formData.name)) {
      errors.name = 'Nome não pode conter números';
    }
    
    // CPF validation
    if (!formData.cpf) {
      errors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(formData.cpf)) {
      errors.cpf = 'CPF inválido';
    }
    
    // Unit validation
    if (!formData.unit_id) {
      errors.unit_id = 'Selecione uma unidade';
    }
    
    // Team validation
    if (!formData.team) {
      errors.team = 'Selecione uma equipe';
    }
    
    // Password validation
    if (!formData.registerPassword) {
      errors.registerPassword = 'Senha é obrigatória';
    } else if (formData.registerPassword.length < 6) {
      errors.registerPassword = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    // Confirm password
    if (formData.registerPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'As senhas não conferem';
    }
    
    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guarantee separation: any master session must not carry into agent login
    setMasterSession(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    if (loginMethod === 'email') {
      // Email login - for admin or users with email
      const { error } = await signIn(email, emailPassword);
      
      if (error) {
        toast({
          title: 'Erro ao entrar',
          description: error.message === 'Invalid login credentials' 
            ? 'Email ou senha incorretos' 
            : error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Bem-vindo!',
          description: 'Login realizado com sucesso.',
        });
        navigate('/dashboard');
      }
      
      setIsSubmitting(false);
      return;
    }

    // CPF login flow
    const cleanCpf = cpf.replace(/\D/g, '');
    const authEmail = `${cleanCpf}@agent.plantaopro.com`;
    
    // Check if we're offline - use cached license validation
    if (!isOnline()) {
      console.log('[Auth] Offline mode - checking local license cache');
      const offlineResult = checkOfflineLicense(cleanCpf);
      
      if (!offlineResult.license) {
        toast({
          title: 'Modo Offline',
          description: 'Não foi possível verificar sua licença offline. CPF não encontrado no cache local.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      if (!offlineResult.valid) {
        const reasonMessages: Record<string, string> = {
          blocked: 'Sua licença foi bloqueada.',
          expired: 'Sua licença expirou.',
          not_found: 'CPF não encontrado no cache offline.',
          no_cache: 'Cache offline não disponível.',
          error: 'Erro ao verificar licença offline.',
        };
        
        toast({
          title: 'Licença Inválida (Offline)',
          description: reasonMessages[offlineResult.reason || 'error'] + ' Conecte-se à internet para atualizar.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      // Valid offline license - show offline mode message
      toast({
        title: 'Modo Offline',
        description: `Bem-vindo, ${offlineResult.license.name}! Funcionalidades limitadas sem conexão.`,
        duration: 5000,
      });
      
      // Note: In true offline mode, we can't actually authenticate with Supabase
      // The offline license check is just validation - user would need connectivity to login
      // This shows the message but continues to try the actual login
    }
    
    // Online mode - check the agent's license status from database
    try {
      const { data: agentData, error: agentError } = await (supabase as any)
        .from('agents')
        .select('id, name, license_status, license_expires_at, is_active')
        .eq('cpf', cleanCpf)
        .maybeSingle();
      
      if (agentError) throw agentError;
      
      if (agentData) {
        // Check if agent is inactive
        if (!agentData.is_active) {
          toast({
            title: 'Acesso Bloqueado',
            description: 'Sua conta está inativa. Entre em contato com o administrador.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
        
        // Check license status
        const licenseStatus = agentData.license_status || 'active';
        const licenseExpiry = agentData.license_expires_at ? new Date(agentData.license_expires_at) : null;
        const isExpired = licenseExpiry && licenseExpiry < new Date();
        
        if (licenseStatus === 'blocked') {
          toast({
            title: 'Licença Bloqueada',
            description: 'Sua licença foi bloqueada. Entre em contato com o administrador para regularizar.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
        
        if (licenseStatus === 'expired' || isExpired) {
          toast({
            title: 'Licença Expirada',
            description: 'Sua licença expirou. Entre em contato com o administrador para renovação.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
        
        if (licenseStatus === 'pending') {
          toast({
            title: 'Licença Pendente',
            description: 'Sua licença está pendente de aprovação. Aguarde a liberação pelo administrador.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking license:', error);
      
      // If online check fails, try offline cache as fallback
      const offlineFallback = checkOfflineLicense(cleanCpf);
      if (offlineFallback.license && !offlineFallback.valid) {
        toast({
          title: 'Licença Inválida',
          description: 'Sua licença não está válida. Entre em contato com o administrador.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      // Continue with login if we can't check license
    }
    
    const { error } = await signIn(authEmail, password);
    
    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'CPF ou senha incorretos' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      // Save credentials if enabled
      if (saveCpfEnabled) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('name')
          .eq('cpf', cleanCpf)
          .maybeSingle();
        saveCredential(cleanCpf, agentData?.name, savePasswordEnabled ? password : undefined);
      }
      
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      navigate('/dashboard');
    }
    
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guarantee separation: master session must not carry into signup
    setMasterSession(null);

    if (!validateRegistration()) return;

    setIsSubmitting(true);
    
    try {
      const cleanCpf = formData.cpf.replace(/\D/g, '');

      // First, check if CPF already exists
      const { data: existingAgent, error: checkError } = await supabase
        .from('agents')
        .select('id, cpf')
        .eq('cpf', cleanCpf)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingAgent) {
        toast({
          title: 'CPF já cadastrado!',
          description: 'Redirecionando para a tela de login...',
          variant: 'default',
        });

        setTimeout(() => {
          setCpf(formData.cpf);
          setFormData(prev => ({ ...prev, cpf: '' }));
          const loginTab = document.querySelector('[value="login"]') as HTMLButtonElement;
          if (loginTab) loginTab.click();
        }, 1500);

        setIsSubmitting(false);
        return;
      }

      // Generate email using CPF
      const authEmail = `${cleanCpf}@agent.plantaopro.com`;

      // Create user account with user's chosen password
      const { error: signUpError } = await signUp(
        authEmail,
        formData.registerPassword,
        formData.name.toUpperCase()
      );

      if (signUpError) throw signUpError;

      // Wait for session to be established after signup
      let sessionUserId: string | null = null;
      for (let i = 0; i < 10; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          sessionUserId = session.user.id;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (!sessionUserId) {
        throw new Error('Não foi possível estabelecer a sessão. Tente novamente.');
      }

      // Create agent record with ONLY essential fields (IMPORTANT: id must match auth user id)
      const { error: agentError } = await supabase.from('agents').insert({
        id: sessionUserId,
        name: formData.name.toUpperCase().trim(),
        cpf: cleanCpf,
        unit_id: formData.unit_id,
        team: formData.team,
      });

      if (agentError) {
        console.error('Agent creation error:', agentError);
        throw agentError;
      }

      // Sign out immediately after registration to prevent auto-redirect
      // User must login manually with their credentials
      await supabase.auth.signOut();

      toast({
        title: 'Cadastro Realizado!',
        description: `Seu CPF (${formData.cpf}) é seu usuário. Use a senha que você criou para acessar.`,
        duration: 8000,
      });

      // Set CPF in login form and switch to login tab
      const registeredCpf = formData.cpf;
      
      // Reset form
      setFormData({
        name: '',
        cpf: '',
        unit_id: '',
        team: '',
        registerPassword: '',
        confirmPassword: '',
      });
      
      // Switch to login tab with CPF pre-filled
      setTimeout(() => {
        setCpf(registeredCpf);
        const loginTab = document.querySelector('[value="login"]') as HTMLButtonElement;
        if (loginTab) loginTab.click();
      }, 500);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      let message = 'Não foi possível criar a conta.';
      if (error.message?.includes('User already registered')) {
        message = 'Este CPF já está cadastrado.';
      } else if (error.message?.includes('duplicate key')) {
        if (error.message.includes('cpf')) {
          message = 'CPF já cadastrado.';
        } else if (error.message.includes('matricula')) {
          message = 'Matrícula já cadastrada.';
        }
      }
      
      toast({
        title: 'Erro ao cadastrar',
        description: message,
        variant: 'destructive',
      });
    }
    
    setIsSubmitting(false);
  };

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!masterUsername || !masterPassword) {
      toast({
        title: 'Erro',
        description: 'Preencha usuário e senha.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Guarantee separation: master login cannot share a normal user session
      await supabase.auth.signOut();

      const { data, error } = await supabase.rpc('verify_master_admin', {
        p_username: masterUsername,
        p_password: masterPassword,
      });
      
      if (error) throw error;
      
      if (data) {
        setMasterSession(masterUsername);
        toast({
          title: 'Bem-vindo, Administrador!',
          description: 'Acesso master autorizado.',
        });
        navigate('/master');
      } else {
        toast({
          title: 'Acesso negado',
          description: 'Usuário ou senha incorretos.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Master login error:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao verificar credenciais.',
        variant: 'destructive',
      });
    }
    
    setIsSubmitting(false);
  };

  // Input handlers with formatting
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\d/g, '').toUpperCase();
    setFormData({ ...formData, name: value });
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, cpf: formatCPF(e.target.value) });
  };

  const handleLoginCPFChange = async (value: string) => {
    const formatted = formatCPF(value);
    setCpf(formatted);
    
    const cleanCpf = formatted.replace(/\D/g, '');
    
    if (cleanCpf.length === 11) {
      setIsSearchingAgent(true);
      try {
        const { data } = await supabase
          .from('agents')
          .select('name')
          .eq('cpf', cleanCpf)
          .maybeSingle();
        
        setFoundAgent(data);
      } catch (error) {
        setFoundAgent(null);
      }
      setIsSearchingAgent(false);
    } else {
      setFoundAgent(null);
    }
  };

  // Get selected unit info
  const selectedUnit = units.find(u => u.id === formData.unit_id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Login Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginBackground})` }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-slate-900/70" />
      
      {/* Back to Home Button - Fixed Position */}
      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white hover:bg-slate-800/50 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Voltar</span>
          <Home className="h-4 w-4 sm:hidden" />
        </Button>
      </div>

      <div className="w-full max-w-lg animate-fade-in relative z-10">
        {/* Security Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30 mb-4 border-4 border-amber-400/50">
            <Shield className="h-10 w-10 text-slate-900" />
          </div>
          <h1 className="text-3xl font-bold text-white">SEGURANÇA PÚBLICA</h1>
          <p className="text-amber-400 font-semibold mt-1 text-xl">Plantão Pro App</p>
          <p className="text-slate-400 text-sm mt-2">Sistema Integrado de Gestão de Escalas</p>
        </div>

        <Card className="bg-slate-800/80 backdrop-blur-xl border-slate-700 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2 text-white">
              {isMasterLogin ? (
                <>
                  <BadgeCheck className="h-5 w-5 text-amber-500" />
                  Acesso Master
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5 text-amber-500" />
                  Acesso ao Sistema
                </>
              )}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {isMasterLogin 
                ? 'Área restrita para administrador'
                : 'Entre com seu CPF ou Email para continuar'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isMasterLogin ? (
              <form onSubmit={handleMasterLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="master-user" className="text-slate-300">Usuário</Label>
                  <Input
                    id="master-user"
                    type="text"
                    placeholder="Usuário master"
                    value={masterUsername}
                    onChange={(e) => setMasterUsername(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="master-pass" className="text-slate-300">Senha</Label>
                  <Input
                    id="master-pass"
                    type="password"
                    placeholder="••••••••"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <BadgeCheck className="mr-2 h-4 w-4" />
                      Entrar como Master
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white hover:bg-slate-700"
                  onClick={() => setIsMasterLogin(false)}
                >
                  Voltar ao login normal
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Login Method Tabs */}
                <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as 'cpf' | 'email')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
                    <TabsTrigger value="cpf" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
                      <KeyRound className="h-4 w-4 mr-2" />
                      CPF
                    </TabsTrigger>
                    <TabsTrigger value="email" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="cpf" className="space-y-4 mt-4">
                    {/* Info Box for CPF Login */}
                    <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-slate-400">
                          Use seu <strong className="text-amber-400">CPF</strong> como usuário e a <strong className="text-amber-400">senha que você criou</strong> no cadastro.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleSignIn} className="space-y-4" data-login-form="true">
                      <div className="space-y-2">
                        <Label htmlFor="login-cpf" className="text-slate-300">CPF</Label>
                        <Input
                          id="login-cpf"
                          type="text"
                          placeholder="000.000.000-00"
                          value={cpf}
                          onChange={(e) => handleLoginCPFChange(e.target.value)}
                          required
                          maxLength={14}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        />
                        {errors.cpf && (
                          <p className="text-sm text-red-400">{errors.cpf}</p>
                        )}
                        
                        {/* Show found agent info */}
                        {foundAgent && (
                          <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/40 animate-fade-in">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-3 w-3 text-green-400" />
                              <span className="text-green-400 font-medium text-xs">Agente: {foundAgent.name}</span>
                            </div>
                          </div>
                        )}
                        
                        {cpf.replace(/\D/g, '').length === 11 && !foundAgent && !isSearchingAgent && (
                          <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/40 animate-fade-in">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-3 w-3 text-amber-400" />
                              <span className="text-amber-400 font-medium text-xs">CPF não cadastrado</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-slate-300">Senha</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Sua senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-sm text-red-400">{errors.password}</p>
                        )}
                      </div>
                      
                      <SavedCredentials
                        onSelectCredential={(selectedCpf, savedPassword) => {
                          handleLoginCPFChange(selectedCpf);
                          if (savedPassword) {
                            setPassword(savedPassword);
                          }
                        }}
                        onSaveChange={(cpf, pwd) => {
                          setSaveCpfEnabled(cpf);
                          setSavePasswordEnabled(pwd);
                        }}
                        saveCpf={saveCpfEnabled}
                        savePassword={savePasswordEnabled}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Entrando...
                          </>
                        ) : (
                          'Entrar'
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="email" className="space-y-4 mt-4">
                    {/* Info Box for Email Login */}
                    <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-start gap-2 text-sm">
                        <Mail className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-slate-400">
                          Login por <strong className="text-amber-400">email</strong> para administradores e usuários cadastrados.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-slate-300">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        />
                        {errors.email && (
                          <p className="text-sm text-red-400">{errors.email}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-password" className="text-slate-300">Senha</Label>
                        <div className="relative">
                          <Input
                            id="email-password"
                            type={showEmailPassword ? "text" : "password"}
                            placeholder="Sua senha"
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            required
                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmailPassword(!showEmailPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showEmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-sm text-red-400">{errors.password}</p>
                        )}
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Entrando...
                          </>
                        ) : (
                          'Entrar com Email'
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                {/* Info for admins */}
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30 mt-4">
                  <p className="text-xs text-amber-400 text-center">
                    <strong>Administradores:</strong> Use a aba "Email" para login com francdenisbr@gmail.com
                  </p>
                </div>
              </div>
            )}
            
            {!isMasterLogin && (
              <div className="mt-6 pt-4 border-t border-slate-700">
                <Button
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-amber-500 hover:bg-slate-700"
                  onClick={() => setIsMasterLogin(true)}
                >
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  Acesso Administrador Master
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Developer Credit */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-400">
            Desenvolvido por <span className="text-amber-500 font-semibold">Franc D'nis</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Feijó, Acre • © {new Date().getFullYear()} PlantãoPro</p>
        </div>
      </div>
    </div>
  );
}
