import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, BadgeCheck, AlertTriangle, Lock, Eye, EyeOff, UserCheck } from 'lucide-react';
import { z } from 'zod';
import { 
  validateCPF, 
  formatCPF, 
  formatMatricula, 
  formatBirthDate, 
  parseBirthDate, 
  calculateAge,
  formatPhone 
} from '@/lib/validators';
import { SavedCredentials, saveCredential } from '@/components/auth/SavedCredentials';

const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');

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
  const [errors, setErrors] = useState<{ cpf?: string; password?: string }>({});
  const [saveCredentialsEnabled, setSaveCredentialsEnabled] = useState(false);
  const [foundAgent, setFoundAgent] = useState<{ name: string } | null>(null);
  const [isSearchingAgent, setIsSearchingAgent] = useState(false);
  
  // Registration form state
  const [units, setUnits] = useState<Unit[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    matricula: '',
    unit_id: '',
    team: '',
    birth_date: '',
    phone: '',
    address: '',
    registerEmail: '',
    registerPassword: '',
    confirmPassword: '',
  });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
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

  // Calculate age when birth_date changes
  useEffect(() => {
    if (formData.birth_date.length === 10) {
      const date = parseBirthDate(formData.birth_date);
      if (date) {
        setCalculatedAge(calculateAge(date));
      } else {
        setCalculatedAge(null);
      }
    } else {
      setCalculatedAge(null);
    }
  }, [formData.birth_date]);

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
    const newErrors: { cpf?: string; password?: string } = {};
    
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!cleanCpf || cleanCpf.length !== 11) {
      newErrors.cpf = 'CPF inválido';
    }
    
    if (!password || password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
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
    
    // Matricula validation (9 digits)
    const matriculaNumbers = formData.matricula.replace(/\D/g, '');
    if (!matriculaNumbers) {
      errors.matricula = 'Matrícula é obrigatória';
    } else if (matriculaNumbers.length !== 9) {
      errors.matricula = 'Matrícula deve ter 9 dígitos';
    }
    
    // Unit validation
    if (!formData.unit_id) {
      errors.unit_id = 'Selecione uma unidade';
    }
    
    // Team validation
    if (!formData.team) {
      errors.team = 'Selecione uma equipe';
    }
    
    // Birth date validation (optional but if provided must be valid)
    if (formData.birth_date && formData.birth_date.length > 0) {
      if (formData.birth_date.length !== 10) {
        errors.birth_date = 'Data incompleta (DD-MM-AAAA)';
      } else if (!parseBirthDate(formData.birth_date)) {
        errors.birth_date = 'Data de nascimento inválida';
      }
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

    // Generate email from CPF for authentication
    const cleanCpf = cpf.replace(/\D/g, '');
    const authEmail = `${cleanCpf}@agent.plantaopro.com`;
    
    // First, check the agent's license status before attempting login
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
      if (saveCredentialsEnabled) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('name')
          .eq('cpf', cleanCpf)
          .maybeSingle();
        saveCredential(cleanCpf, agentData?.name);
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
      // First, check if CPF or matricula already exists
      const { data: existingAgent, error: checkError } = await supabase
        .from('agents')
        .select('id, cpf, matricula')
        .or(`cpf.eq.${formData.cpf.replace(/\D/g, '')},matricula.eq.${formData.matricula}`)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingAgent) {
        if (existingAgent.cpf === formData.cpf.replace(/\D/g, '')) {
          toast({
            title: 'CPF já cadastrado!',
            description: 'Redirecionando para a tela de login...',
            variant: 'default',
          });
          
          // Set login CPF and switch to login tab after a short delay
          setTimeout(() => {
            setCpf(formData.cpf);
            setFormData(prev => ({ ...prev, cpf: '' }));
            // Find and click the login tab
            const loginTab = document.querySelector('[value="login"]') as HTMLButtonElement;
            if (loginTab) loginTab.click();
          }, 1500);
          
          setIsSubmitting(false);
          return;
        } else {
          setRegErrors({ matricula: 'Matrícula já cadastrada' });
          setIsSubmitting(false);
          return;
        }
      }

      // Parse birth date if provided
      let birthDate: string | null = null;
      let age: number | null = null;
      if (formData.birth_date.length === 10) {
        const date = parseBirthDate(formData.birth_date);
        if (date) {
          birthDate = date.toISOString().split('T')[0];
          age = calculateAge(date);
        }
      }

      // Generate email using CPF
      const authEmail = `${formData.cpf.replace(/\D/g, '')}@agent.plantaopro.com`;
      
      // Create user account with user's chosen password
      const { error: signUpError } = await signUp(
        authEmail, 
        formData.registerPassword, 
        formData.name.toUpperCase()
      );
      
      if (signUpError) throw signUpError;

      // Create agent record
      const { error: agentError } = await supabase.from('agents').insert({
        name: formData.name.toUpperCase().trim(),
        cpf: formData.cpf.replace(/\D/g, ''),
        matricula: formData.matricula,
        unit_id: formData.unit_id,
        team: formData.team,
        birth_date: birthDate,
        age: age,
        email: formData.registerEmail || null,
        phone: formData.phone || null,
        address: formData.address || null,
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
        matricula: '',
        unit_id: '',
        team: '',
        birth_date: '',
        phone: '',
        address: '',
        registerEmail: '',
        registerPassword: '',
        confirmPassword: '',
      });
      setCalculatedAge(null);
      
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

  const handleMatriculaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, matricula: formatMatricula(e.target.value) });
  };

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, birth_date: formatBirthDate(e.target.value) });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: formatPhone(e.target.value) });
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
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
                : 'Entre com seu CPF para continuar'
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
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-700/50">
                  <TabsTrigger value="login" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">Entrar</TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">Cadastrar</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  {/* Info Box for Login */}
                  <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600 mb-4">
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-slate-400">
                        Use seu <strong className="text-amber-400">CPF</strong> como usuário e a <strong className="text-amber-400">senha que você criou</strong> no cadastro.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
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
                      onSelectCredential={(selectedCpf) => handleLoginCPFChange(selectedCpf)}
                      onSaveChange={setSaveCredentialsEnabled}
                      saveCredentials={saveCredentialsEnabled}
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
                
                <TabsContent value="register">
                  {/* Info Box */}
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30 mb-4">
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="text-slate-300">
                        <p className="font-medium text-amber-400 mb-1">Informação Importante</p>
                        <p>
                          Seu <strong>CPF</strong> será seu usuário. Crie uma <strong>senha segura</strong> que você irá lembrar. 
                          Você pode alterá-la no seu painel.
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="register-name" className="text-slate-300">Nome Completo *</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="NOME COMPLETO"
                        value={formData.name}
                        onChange={handleNameChange}
                        className="bg-slate-700/50 border-slate-600 text-white uppercase placeholder:text-slate-500"
                        required
                      />
                      {regErrors.name && (
                        <p className="text-sm text-red-400">{regErrors.name}</p>
                      )}
                    </div>

                    {/* CPF and Matricula */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-cpf" className="text-slate-300">CPF *</Label>
                        <Input
                          id="register-cpf"
                          type="text"
                          placeholder="000.000.000-00"
                          value={formData.cpf}
                          onChange={handleCPFChange}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                          maxLength={14}
                          required
                        />
                        {regErrors.cpf && (
                          <p className="text-sm text-red-400">{regErrors.cpf}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-matricula" className="text-slate-300">Matrícula *</Label>
                        <Input
                          id="register-matricula"
                          type="text"
                          placeholder="000000000"
                          value={formData.matricula}
                          onChange={handleMatriculaChange}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                          maxLength={9}
                          required
                        />
                        {regErrors.matricula && (
                          <p className="text-sm text-red-400">{regErrors.matricula}</p>
                        )}
                      </div>
                    </div>

                    {/* Unit and Team */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Unidade *</Label>
                        <Select
                          value={formData.unit_id}
                          onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
                        >
                          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id} className="text-white hover:bg-slate-700">
                                {unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {regErrors.unit_id && (
                          <p className="text-sm text-red-400">{regErrors.unit_id}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Equipe *</Label>
                        <Select
                          value={formData.team}
                          onValueChange={(value) => setFormData({ ...formData, team: value })}
                        >
                          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {teams.map((team) => (
                              <SelectItem key={team} value={team} className="text-white hover:bg-slate-700">
                                {team}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {regErrors.team && (
                          <p className="text-sm text-red-400">{regErrors.team}</p>
                        )}
                      </div>
                    </div>

                    {/* Municipality Display */}
                    {selectedUnit && (
                      <div className="p-3 bg-slate-700/30 rounded-lg text-sm">
                        <span className="text-slate-400">Município: </span>
                        <span className="font-medium text-white">{selectedUnit.municipality}</span>
                      </div>
                    )}

                    {/* Birth Date */}
                    <div className="space-y-2">
                      <Label htmlFor="register-birth" className="text-slate-300">Data de Nascimento</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="register-birth"
                          type="text"
                          placeholder="DD-MM-AAAA"
                          value={formData.birth_date}
                          onChange={handleBirthDateChange}
                          className="bg-slate-700/50 border-slate-600 text-white flex-1 placeholder:text-slate-500"
                          maxLength={10}
                        />
                        {calculatedAge !== null && (
                          <div className="px-3 py-2 bg-amber-500/20 rounded-lg text-sm font-medium text-amber-400 whitespace-nowrap">
                            {calculatedAge} anos
                          </div>
                        )}
                      </div>
                      {regErrors.birth_date && (
                        <p className="text-sm text-red-400">{regErrors.birth_date}</p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-slate-300">Criar Senha *</Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showRegPassword ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          value={formData.registerPassword}
                          onChange={(e) => setFormData({ ...formData, registerPassword: e.target.value })}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {regErrors.registerPassword && (
                        <p className="text-sm text-red-400">{regErrors.registerPassword}</p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-slate-300">Confirmar Senha *</Label>
                      <Input
                        id="confirm-password"
                        type={showRegPassword ? "text" : "password"}
                        placeholder="Repita a senha"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        required
                      />
                      {regErrors.confirmPassword && (
                        <p className="text-sm text-red-400">{regErrors.confirmPassword}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="register-phone" className="text-slate-300">Telefone</Label>
                      <Input
                        id="register-phone"
                        type="text"
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        maxLength={15}
                      />
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <Label htmlFor="register-address" className="text-slate-300">Endereço</Label>
                      <Input
                        id="register-address"
                        type="text"
                        placeholder="Seu endereço"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        maxLength={255}
                      />
                    </div>

                    {/* Email (optional) */}
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-slate-300">Email (opcional)</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.registerEmail}
                        onChange={(e) => setFormData({ ...formData, registerEmail: e.target.value })}
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
                          Cadastrando...
                        </>
                      ) : (
                        'Criar Conta'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
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
        <p className="text-center text-xs text-slate-500 mt-6">
          Desenvolvido por <span className="text-amber-500 font-medium">Franc Denis</span>
        </p>
      </div>
    </div>
  );
}
