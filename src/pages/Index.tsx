import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, AlertTriangle, Eye, EyeOff, UserCheck, Lock, Sword, Target, Users } from 'lucide-react';
import { 
  validateCPF, 
  formatCPF, 
  formatMatricula,
  getMatriculaNumbers,
  formatBirthDate, 
  parseBirthDate, 
  calculateAge,
  formatPhone 
} from '@/lib/validators';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { ForgotPasswordDialog } from '@/components/ForgotPasswordDialog';
import { SavedCredentials, saveCredential } from '@/components/auth/SavedCredentials';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedBackground } from '@/components/ThemedBackground';
import { ThemedTeamCard } from '@/components/ThemedTeamCard';
import { useSoundEffects } from '@/hooks/useSoundEffects';

interface Unit {
  id: string;
  name: string;
  municipality: string;
}

interface TeamConfig {
  icon: any;
  color: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  description: string;
  slogan: string;
}

const teamConfigs: Record<string, TeamConfig> = {
  ALFA: {
    icon: Shield,
    color: 'text-blue-400',
    bgGradient: 'from-blue-900/80 via-blue-800/60 to-slate-900/90',
    borderColor: 'border-blue-500/60',
    glowColor: 'shadow-blue-500/30',
    description: 'Primeira Linha de Defesa',
    slogan: 'Proteção e Vigilância',
  },
  BRAVO: {
    icon: Sword,
    color: 'text-red-400',
    bgGradient: 'from-red-900/80 via-red-800/60 to-slate-900/90',
    borderColor: 'border-red-500/60',
    glowColor: 'shadow-red-500/30',
    description: 'Força de Resposta Rápida',
    slogan: 'Ação e Determinação',
  },
  CHARLIE: {
    icon: Target,
    color: 'text-green-400',
    bgGradient: 'from-green-900/80 via-green-800/60 to-slate-900/90',
    borderColor: 'border-green-500/60',
    glowColor: 'shadow-green-500/30',
    description: 'Operações Especializadas',
    slogan: 'Precisão e Eficiência',
  },
  DELTA: {
    icon: Users,
    color: 'text-purple-400',
    bgGradient: 'from-purple-900/80 via-purple-800/60 to-slate-900/90',
    borderColor: 'border-purple-500/60',
    glowColor: 'shadow-purple-500/30',
    description: 'Suporte e Coordenação',
    slogan: 'União e Estratégia',
  },
};

const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'];

export default function Index() {
  const { user, isLoading, signIn, signUp, setMasterSession } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playSound } = useSoundEffects();

  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showCpfCheck, setShowCpfCheck] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showMasterLogin, setShowMasterLogin] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingCpf, setIsCheckingCpf] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Master login
  const [masterUsername, setMasterUsername] = useState('');
  const [masterPassword, setMasterPassword] = useState('');

  // CPF check
  const [checkCpf, setCheckCpf] = useState('');
  const [foundAgent, setFoundAgent] = useState<{ name: string; team: string | null } | null>(null);
  const [isSearchingAgent, setIsSearchingAgent] = useState(false);
  
  // Login form
  const [loginCpf, setLoginCpf] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [saveCredentialsEnabled, setSaveCredentialsEnabled] = useState(false);

  // Registration form
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    matricula: '',
    unit_id: '',
    birth_date: '',
    phone: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<(() => void) | null>(null);
  
  // Real-time CPF validation state
  const [cpfValidation, setCpfValidation] = useState<{
    isValid: boolean;
    isChecking: boolean;
    exists: boolean;
    existingAgent: { name: string; team: string | null } | null;
  }>({ isValid: false, isChecking: false, exists: false, existingAgent: null });

  // Check if registration form has data
  const hasRegistrationData = Boolean(
    formData.name || 
    formData.matricula || 
    formData.birth_date || 
    formData.phone || 
    formData.address || 
    formData.email || 
    formData.password
  );

  useEffect(() => {
    if (!isLoading && user) {
      // Use replace to prevent back navigation to login page
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    fetchUnits();
  }, []);

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

  // Real-time CPF validation for registration form
  useEffect(() => {
    const cleanCpf = formData.cpf.replace(/\D/g, '');
    
    if (cleanCpf.length === 11) {
      const isValidFormat = validateCPF(formData.cpf);
      
      if (isValidFormat) {
        setCpfValidation(prev => ({ ...prev, isChecking: true }));
        
        const checkCpfExists = async () => {
          try {
            const { data } = await supabase
              .from('agents')
              .select('name, team')
              .eq('cpf', cleanCpf)
              .maybeSingle();
            
            setCpfValidation({
              isValid: true,
              isChecking: false,
              exists: !!data,
              existingAgent: data
            });
          } catch (error) {
            setCpfValidation({
              isValid: true,
              isChecking: false,
              exists: false,
              existingAgent: null
            });
          }
        };
        
        checkCpfExists();
      } else {
        setCpfValidation({ isValid: false, isChecking: false, exists: false, existingAgent: null });
      }
    } else {
      setCpfValidation({ isValid: false, isChecking: false, exists: false, existingAgent: null });
    }
  }, [formData.cpf]);

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

  const handleTeamClick = (team: string) => {
    setSelectedTeam(team);
    setShowCpfCheck(true);
    setCheckCpf('');
    setFoundAgent(null);
  };

  // Real-time CPF search
  const handleCpfInputChange = async (value: string) => {
    const formatted = formatCPF(value);
    setCheckCpf(formatted);
    
    const cleanCpf = formatted.replace(/\D/g, '');
    
    if (cleanCpf.length === 11) {
      setIsSearchingAgent(true);
      try {
        const { data } = await supabase
          .from('agents')
          .select('name, team')
          .eq('cpf', cleanCpf)
          .maybeSingle();
        
        setFoundAgent(data);
      } catch (error) {
        console.error('Error searching agent:', error);
        setFoundAgent(null);
      }
      setIsSearchingAgent(false);
    } else {
      setFoundAgent(null);
    }
  };

  const handleCheckCpf = async () => {
    if (!checkCpf || checkCpf.replace(/\D/g, '').length !== 11) {
      toast({
        title: 'CPF Inválido',
        description: 'Digite um CPF válido com 11 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingCpf(true);

    try {
      const cleanCpf = checkCpf.replace(/\D/g, '');
      const { data: existingAgent } = await supabase
        .from('agents')
        .select('id, cpf, team')
        .eq('cpf', cleanCpf)
        .maybeSingle();

      if (existingAgent) {
        // Check if agent belongs to a different team
        if (existingAgent.team && existingAgent.team !== selectedTeam) {
          toast({
            title: 'Equipe Incorreta',
            description: `Você pertence à equipe ${existingAgent.team}. Redirecionando...`,
            duration: 3000,
          });
          
          // Close current dialog and reopen with correct team
          setShowCpfCheck(false);
          setSelectedTeam(existingAgent.team);
          
          setTimeout(() => {
            setLoginCpf(checkCpf);
            setShowLogin(true);
          }, 500);
        } else {
          // User belongs to selected team or has no team - show login
          setShowCpfCheck(false);
          setLoginCpf(checkCpf);
          setFoundAgent({ name: foundAgent?.name || '', team: existingAgent.team });
          setShowLogin(true);
        }
      } else {
        // New user - show registration
        setShowCpfCheck(false);
        setFormData(prev => ({ ...prev, cpf: checkCpf }));
        setShowRegistration(true);
      }
    } catch (error) {
      console.error('Error checking CPF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível verificar o CPF.',
        variant: 'destructive',
      });
    }

    setIsCheckingCpf(false);
  };

  const validateRegistration = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Nome deve ter pelo menos 3 caracteres';
    } else if (/\d/.test(formData.name)) {
      errors.name = 'Nome não pode conter números';
    }
    
    if (!formData.cpf) {
      errors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(formData.cpf)) {
      errors.cpf = 'CPF inválido';
    }
    
    const matriculaNumbers = formData.matricula.replace(/\D/g, '');
    if (!matriculaNumbers) {
      errors.matricula = 'Matrícula é obrigatória';
    } else if (matriculaNumbers.length !== 9) {
      errors.matricula = 'Matrícula deve ter 9 dígitos';
    }
    
    if (!formData.unit_id) {
      errors.unit_id = 'Selecione uma unidade';
    }
    
    if (formData.birth_date && formData.birth_date.length > 0) {
      if (formData.birth_date.length !== 10) {
        errors.birth_date = 'Data incompleta (DD-MM-AAAA)';
      } else if (!parseBirthDate(formData.birth_date)) {
        errors.birth_date = 'Data de nascimento inválida';
      }
    }
    
    if (!formData.password) {
      errors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'As senhas não conferem';
    }
    
    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRegistration() || !selectedTeam) return;
    
    setIsSubmitting(true);
    
    try {
      const matriculaClean = getMatriculaNumbers(formData.matricula);
      const { data: existingAgent, error: checkError } = await supabase
        .from('agents')
        .select('id, cpf, matricula')
        .or(`cpf.eq.${formData.cpf.replace(/\D/g, '')},matricula.eq.${matriculaClean}`)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingAgent) {
        if (existingAgent.cpf === formData.cpf.replace(/\D/g, '')) {
          setRegErrors({ cpf: 'CPF já cadastrado' });
        } else {
          setRegErrors({ matricula: 'Matrícula já cadastrada' });
        }
        setIsSubmitting(false);
        return;
      }

      let birthDate: string | null = null;
      let age: number | null = null;
      if (formData.birth_date.length === 10) {
        const date = parseBirthDate(formData.birth_date);
        if (date) {
          birthDate = date.toISOString().split('T')[0];
          age = calculateAge(date);
        }
      }

      const authEmail = formData.email || `${formData.cpf.replace(/\D/g, '')}@agent.plantaopro.com`;
      
      const { error: signUpError } = await signUp(
        authEmail, 
        formData.password, 
        formData.name.toUpperCase()
      );
      
      if (signUpError) throw signUpError;

      // Wait for session to be established after signup (auto-confirm enabled)
      let retries = 0;
      let sessionReady = false;
      while (retries < 10 && !sessionReady) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          sessionReady = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 300));
          retries++;
        }
      }

      if (!sessionReady) {
        throw new Error('Não foi possível estabelecer a sessão. Tente novamente.');
      }

      const { error: agentError } = await supabase.from('agents').insert({
        name: formData.name.toUpperCase().trim(),
        cpf: formData.cpf.replace(/\D/g, ''),
        matricula: getMatriculaNumbers(formData.matricula),
        unit_id: formData.unit_id,
        team: selectedTeam,
        birth_date: birthDate,
        age: age,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
      });

      if (agentError) {
        console.error('Agent creation error:', agentError);
        throw agentError;
      }

      const registeredUnitId = formData.unit_id;
      const registeredName = formData.name.toUpperCase().trim();
      
      // Store registration timestamp and name for welcome dialog
      localStorage.setItem('plantaopro_first_access', JSON.stringify({
        timestamp: Date.now(),
        name: registeredName,
        shown: false
      }));
      
      toast({
        title: 'Cadastro Realizado!',
        description: `Bem-vindo à equipe ${selectedTeam}!`,
        duration: 3000,
      });

      setFormData({
        name: '',
        cpf: '',
        matricula: '',
        unit_id: '',
        birth_date: '',
        phone: '',
        address: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      setCalculatedAge(null);
      setSelectedTeam(null);
      setShowRegistration(false);
      
      // Redirect to the agent's unit dashboard
      navigate(`/unit/${registeredUnitId}`, { replace: true });
      
    } catch (error: any) {
      console.error('Registration error:', error);
      let message = 'Não foi possível criar a conta.';
      if (error.message?.includes('User already registered')) {
        message = 'Este CPF já está cadastrado.';
      }
      
      toast({
        title: 'Erro ao cadastrar',
        description: message,
        variant: 'destructive',
      });
    }
    
    setIsSubmitting(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: Record<string, string> = {};
    const cleanCpf = loginCpf.replace(/\D/g, '');
    
    if (!cleanCpf || cleanCpf.length !== 11) {
      errors.cpf = 'CPF inválido';
    }
    if (!loginPassword || loginPassword.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;
    
    setIsSubmitting(true);
    
    const authEmail = `${cleanCpf}@agent.plantaopro.com`;
    const { error } = await signIn(authEmail, loginPassword);
    
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
        // Get agent name for display
        const { data: agentData } = await supabase
          .from('agents')
          .select('name')
          .eq('cpf', cleanCpf)
          .single();
        saveCredential(cleanCpf, agentData?.name);
      }
      
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      navigate('/dashboard', { replace: true });
    }
    
    setIsSubmitting(false);
  };

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('verify_master_admin', {
        p_username: masterUsername,
        p_password: masterPassword,
      });

      if (error) throw error;

      if (data) {
        // Use a deterministic UUID based on username for consistency
        const masterUUID = '00000000-0000-0000-0000-000000000001';
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 8);

        // Try to insert session token, ignore error if RLS blocks it
        try {
          await supabase.from('master_session_tokens').insert({
            user_id: masterUUID,
            token,
            expires_at: expiresAt.toISOString(),
          });
        } catch (tokenError) {
          console.log('Token storage skipped (RLS policy)');
        }

        setMasterSession(masterUsername);
        localStorage.setItem('master_token', token);
        localStorage.setItem('master_user', masterUsername);
        
        toast({
          title: 'Acesso Master',
          description: 'Bem-vindo ao painel de controle.',
        });

        setShowMasterLogin(false);
        navigate('/master', { replace: true });
      } else {
        toast({
          title: 'Acesso Negado',
          description: 'Credenciais inválidas.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Master login error:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível autenticar.',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  const closeAllDialogs = () => {
    setShowCpfCheck(false);
    setShowLogin(false);
    setShowRegistration(false);
    setShowMasterLogin(false);
    setSelectedTeam(null);
    setCheckCpf('');
    setLoginCpf('');
    setLoginPassword('');
    setMasterUsername('');
    setMasterPassword('');
    // Reset registration form
    setFormData({
      name: '',
      cpf: '',
      matricula: '',
      unit_id: '',
      birth_date: '',
      phone: '',
      address: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setRegErrors({});
    setCalculatedAge(null);
  };

  // Safe close that checks for unsaved changes
  const safeCloseRegistration = () => {
    if (hasRegistrationData) {
      setPendingCloseAction(() => closeAllDialogs);
      setShowUnsavedDialog(true);
    } else {
      closeAllDialogs();
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);
    if (pendingCloseAction) {
      pendingCloseAction();
      setPendingCloseAction(null);
    }
  };

  const handleCancelClose = () => {
    setShowUnsavedDialog(false);
    setPendingCloseAction(null);
  };

  const selectedUnit = units.find(u => u.id === formData.unit_id);
  const currentTeamConfig = selectedTeam ? teamConfigs[selectedTeam] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Themed Animated Background */}
      <ThemedBackground />

      {/* Top Security Bar - Compact */}
      <div className="bg-slate-900/90 border-b border-slate-700/50 py-1.5 px-3 relative z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-mono text-slate-400 tracking-wider">
              ATIVO
            </span>
          </div>
          <div className="text-[9px] font-mono text-slate-500 hidden sm:block">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>

      {/* Hero Section - Compact */}
      <header className="py-4 md:py-6 px-3 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Security Badge - Smaller on mobile */}
          <div className="mb-3 flex flex-col items-center">
            <div className="relative">
              <div className="w-14 h-14 md:w-18 md:h-18 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-amber-500/30 flex items-center justify-center shadow-xl">
                <Shield className="h-7 w-7 md:h-9 md:w-9 text-amber-500" />
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500 rounded text-[6px] md:text-[7px] font-black text-slate-900 tracking-widest">
                SEGURANÇA
              </div>
            </div>
          </div>
          
          {/* Title - Responsive */}
          <h1 className="text-xl md:text-3xl font-black text-white tracking-tight mb-1">
            PLANTÃO <span className="text-amber-500">PRO</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-amber-500/50" />
            <span className="text-[8px] md:text-[9px] font-bold text-slate-400 tracking-[0.2em]">
              GESTÃO DE ESCALAS
            </span>
            <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-amber-500/50" />
          </div>
          
          <p className="text-slate-400 text-[10px] md:text-xs">
            Selecione sua equipe
          </p>
        </div>
      </header>

      {/* Teams Grid Section - Compact */}
      <section className="flex-1 py-2 px-3 relative z-10 flex items-center">
        <div className="w-full max-w-lg md:max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {teams.map((team, index) => (
              <div
                key={team}
                className="animate-fade-in-scale"
                style={{
                  animationDelay: `${index * 120}ms`,
                }}
              >
                <ThemedTeamCard
                  team={team}
                  onClick={() => handleTeamClick(team)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer - Compact */}
      <footer className="py-2 px-3 bg-slate-900/80 border-t border-slate-700/50 relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-amber-500/70" />
            <span className="text-[9px] font-semibold text-slate-400 hidden sm:inline">
              PLANTÃO PRO
            </span>
            <span className="text-[8px] text-slate-500 hidden md:inline">
              © {new Date().getFullYear()} • Franc Denis
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMasterLogin(true)}
            className="text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 transition-colors gap-1 h-6 px-2"
          >
            <Lock className="h-2.5 w-2.5" />
            <span className="text-[8px] font-semibold tracking-wider">ADMIN</span>
          </Button>
        </div>
      </footer>

      {/* CPF Check Dialog */}
      <Dialog open={showCpfCheck} onOpenChange={(open) => !open && closeAllDialogs()}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {currentTeamConfig && <currentTeamConfig.icon className={`h-5 w-5 ${currentTeamConfig.color}`} />}
              Equipe {selectedTeam}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Digite seu CPF para verificar seu cadastro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">CPF</Label>
              <div className="relative">
                <Input
                  value={checkCpf}
                  onChange={(e) => handleCpfInputChange(e.target.value)}
                  placeholder="000.000.000-00"
                  className="bg-secondary/50 border-border text-foreground text-lg text-center tracking-wider"
                  maxLength={14}
                />
                {isSearchingAgent && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Show found agent info */}
            {foundAgent && (
              <div className={`p-3 rounded-lg border animate-fade-in ${
                foundAgent.team && foundAgent.team !== selectedTeam 
                  ? 'bg-amber-500/20 border-amber-500/40' 
                  : 'bg-green-500/20 border-green-500/40'
              }`}>
                <div className="flex items-center gap-2">
                  {foundAgent.team && foundAgent.team !== selectedTeam ? (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  ) : (
                    <UserCheck className="h-4 w-4 text-green-400" />
                  )}
                  <span className={`font-medium text-sm ${
                    foundAgent.team && foundAgent.team !== selectedTeam 
                      ? 'text-amber-400' 
                      : 'text-green-400'
                  }`}>
                    {foundAgent.team && foundAgent.team !== selectedTeam 
                      ? 'Atenção: Equipe Diferente!' 
                      : 'Agente Encontrado!'
                    }
                  </span>
                </div>
                <p className="text-white font-semibold mt-1">{foundAgent.name}</p>
                {foundAgent.team && (
                  <p className={`text-xs mt-1 ${
                    foundAgent.team !== selectedTeam 
                      ? 'text-amber-300 font-medium' 
                      : 'text-slate-400'
                  }`}>
                    {foundAgent.team !== selectedTeam 
                      ? `Você pertence à Equipe ${foundAgent.team}` 
                      : `Equipe ${foundAgent.team}`
                    }
                  </p>
                )}
                {!foundAgent.team && (
                  <p className="text-slate-400 text-xs mt-1">Sem equipe definida</p>
                )}
              </div>
            )}
            
            {checkCpf.replace(/\D/g, '').length === 11 && !foundAgent && !isSearchingAgent && (
              <div className="p-3 bg-amber-500/20 rounded-lg border border-amber-500/40 animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-400 font-medium text-sm">CPF não cadastrado</span>
                </div>
                <p className="text-slate-400 text-xs mt-1">Você será direcionado para o cadastro</p>
              </div>
            )}
            
            <Button
              onClick={handleCheckCpf}
              disabled={isCheckingCpf || checkCpf.replace(/\D/g, '').length !== 11}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {isCheckingCpf ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
              ) : foundAgent ? (
                <><Lock className="mr-2 h-4 w-4" /> Fazer Login</>
              ) : (
                <><UserCheck className="mr-2 h-4 w-4" /> Continuar</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Dialog */}
      <Dialog open={showLogin} onOpenChange={(open) => !open && closeAllDialogs()}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              {currentTeamConfig && <currentTeamConfig.icon className={`h-5 w-5 ${currentTeamConfig.color}`} />}
              Login - Equipe {selectedTeam}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              CPF encontrado! Entre com sua senha.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-slate-300">CPF</Label>
              <Input
                value={loginCpf}
                onChange={(e) => setLoginCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                className="bg-slate-700/50 border-slate-600 text-white"
                maxLength={14}
                disabled
              />
              {loginErrors.cpf && <p className="text-sm text-red-400">{loginErrors.cpf}</p>}
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-700/50 border-slate-600 text-white pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {loginErrors.password && <p className="text-sm text-red-400">{loginErrors.password}</p>}
            </div>
            
            <SavedCredentials
              onSelectCredential={(cpf) => setLoginCpf(formatCPF(cpf))}
              onSaveChange={setSaveCredentialsEnabled}
              saveCredentials={saveCredentialsEnabled}
            />
            
            <div className="flex items-center justify-between">
              <ForgotPasswordDialog />
            </div>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        hasUnsavedChanges={hasRegistrationData}
        onDiscard={handleDiscardChanges}
        onCancel={handleCancelClose}
        open={showUnsavedDialog}
        showSaveOption={false}
      />

      {/* Registration Dialog */}
      <Dialog open={showRegistration} onOpenChange={(open) => !open && safeCloseRegistration()}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              {currentTeamConfig && <currentTeamConfig.icon className={`h-5 w-5 ${currentTeamConfig.color}`} />}
              Cadastro - Equipe {selectedTeam}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              CPF não encontrado. Preencha seus dados para se cadastrar.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30 mb-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-amber-400">Informação</p>
                <p className="text-slate-300">
                  Seu <strong>CPF</strong> será seu usuário. Crie uma senha segura.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSignUp} className="space-y-3">
            {/* Nome */}
            <div className="space-y-1">
              <Label htmlFor="name" className="text-slate-300 text-sm">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/\d/g, '').toUpperCase() })}
                placeholder="NOME COMPLETO"
                className="bg-slate-700/50 border-slate-600 text-white uppercase"
                required
              />
              {regErrors.name && <p className="text-xs text-red-400">{regErrors.name}</p>}
            </div>
            
            {/* CPF e Matrícula */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-300 text-sm">CPF *</Label>
                <div className="relative">
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    className={`bg-slate-700/50 border-slate-600 text-white pr-10 ${
                      formData.cpf.replace(/\D/g, '').length === 11
                        ? cpfValidation.isValid && !cpfValidation.exists
                          ? 'border-green-500 focus:border-green-500'
                          : cpfValidation.exists
                          ? 'border-amber-500 focus:border-amber-500'
                          : 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                    maxLength={14}
                    required
                  />
                  {formData.cpf.replace(/\D/g, '').length === 11 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {cpfValidation.isChecking ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      ) : cpfValidation.isValid && !cpfValidation.exists ? (
                        <UserCheck className="h-4 w-4 text-green-400" />
                      ) : cpfValidation.exists ? (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
                {regErrors.cpf && <p className="text-xs text-red-400">{regErrors.cpf}</p>}
                
                {/* Real-time CPF validation feedback */}
                {formData.cpf.replace(/\D/g, '').length === 11 && !cpfValidation.isChecking && (
                  <div className={`text-xs mt-1 ${
                    cpfValidation.isValid && !cpfValidation.exists
                      ? 'text-green-400'
                      : cpfValidation.exists
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>
                    {!cpfValidation.isValid && 'CPF inválido'}
                    {cpfValidation.isValid && !cpfValidation.exists && '✓ CPF válido e disponível'}
                    {cpfValidation.exists && cpfValidation.existingAgent && (
                      <span>
                        CPF já cadastrado: {cpfValidation.existingAgent.name}
                        {cpfValidation.existingAgent.team && ` (Equipe ${cpfValidation.existingAgent.team})`}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300 text-sm">Matrícula *</Label>
                <Input
                  value={formData.matricula}
                  onChange={(e) => setFormData({ ...formData, matricula: formatMatricula(e.target.value) })}
                  placeholder="000.000.000"
                  className="bg-slate-700/50 border-slate-600 text-white"
                  maxLength={11}
                  required
                />
                {regErrors.matricula && <p className="text-xs text-red-400">{regErrors.matricula}</p>}
              </div>
            </div>
            
            {/* Unidade e Município */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Unidade Socioeducativa *</Label>
              <Select
                value={formData.unit_id}
                onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
              >
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder={units.length === 0 ? "Carregando unidades..." : "Selecione sua unidade"} />
                </SelectTrigger>
                <SelectContent 
                  className="bg-slate-800 border-slate-700 max-h-60"
                  position="popper"
                  sideOffset={4}
                  style={{ zIndex: 9999 }}
                >
                  {units.length === 0 ? (
                    <div className="px-3 py-2 text-slate-400 text-sm">Carregando unidades...</div>
                  ) : (
                    units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id} className="text-white hover:bg-slate-700 focus:bg-slate-700 cursor-pointer">
                        <div className="flex flex-col">
                          <span className="font-medium">{unit.name}</span>
                          <span className="text-xs text-slate-400">{unit.municipality}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {regErrors.unit_id && <p className="text-xs text-red-400">{regErrors.unit_id}</p>}
            </div>
            
            {/* Selected Unit Display */}
            {selectedUnit && (
              <div className="p-3 bg-gradient-to-r from-amber-500/20 to-amber-600/10 rounded-lg border border-amber-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{selectedUnit.name}</p>
                    <p className="text-xs text-amber-400">Município: {selectedUnit.municipality}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Após o cadastro você será direcionado ao painel desta unidade
                </p>
              </div>
            )}

            {/* Data de Nascimento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-300 text-sm">Data de Nascimento</Label>
                <Input
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: formatBirthDate(e.target.value) })}
                  placeholder="DD-MM-AAAA"
                  className="bg-slate-700/50 border-slate-600 text-white"
                  maxLength={10}
                />
                {calculatedAge !== null && (
                  <p className="text-xs text-amber-400">Idade: {calculatedAge} anos</p>
                )}
                {regErrors.birth_date && <p className="text-xs text-red-400">{regErrors.birth_date}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300 text-sm">Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  className="bg-slate-700/50 border-slate-600 text-white"
                  maxLength={15}
                />
              </div>
            </div>

            {/* Senha */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-300 text-sm">Senha *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 6 caracteres"
                    className="bg-slate-700/50 border-slate-600 text-white pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-2 text-slate-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
                {regErrors.password && <p className="text-xs text-red-400">{regErrors.password}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300 text-sm">Confirmar Senha *</Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repita a senha"
                  className="bg-slate-700/50 border-slate-600 text-white"
                  required
                />
                {regErrors.confirmPassword && <p className="text-xs text-red-400">{regErrors.confirmPassword}</p>}
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full font-semibold ${
                currentTeamConfig 
                  ? `bg-gradient-to-r ${currentTeamConfig.bgGradient} hover:opacity-90 text-white border ${currentTeamConfig.borderColor}`
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-900'
              }`}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cadastrando...</>
              ) : (
                <>Cadastrar na Equipe {selectedTeam}</>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Master Admin Login Dialog */}
      <Dialog open={showMasterLogin} onOpenChange={(open) => !open && closeAllDialogs()}>
        <DialogContent className="bg-slate-900 border-amber-500/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Lock className="h-5 w-5" />
              Acesso Administrativo
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Área restrita para administradores do sistema
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMasterLogin} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Usuário</Label>
              <Input
                value={masterUsername}
                onChange={(e) => setMasterUsername(e.target.value)}
                placeholder="Digite o usuário"
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-800/50 border-slate-700 text-white pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={isSubmitting || !masterUsername || !masterPassword}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold"
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Autenticando...</>
              ) : (
                <><Lock className="mr-2 h-4 w-4" /> Acessar Painel Master</>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
