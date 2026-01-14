import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
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
import { Loader2, AlertTriangle, Eye, EyeOff, UserCheck, Lock, Palette, Fingerprint, Shield, Users, KeyRound } from 'lucide-react';
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
import { SavedCredentials, saveCredential, getAutoLoginCredential, getSavedCredentials } from '@/components/auth/SavedCredentials';
import { ManageCredentialsDialog } from '@/components/auth/ManageCredentialsDialog';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedBackground } from '@/components/ThemedBackground';
import { ThemedTeamCard } from '@/components/ThemedTeamCard';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { getThemeAssets } from '@/lib/themeAssets';

interface Unit {
  id: string;
  name: string;
  municipality: string;
}

const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'] as const;

export default function Index() {
  const { user, isLoading, signIn, signUp, setMasterSession } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playSound } = useSoundEffects();
  const { themeConfig, theme, resolvedTheme } = useTheme();
  const themeAssets = getThemeAssets(theme, resolvedTheme);
  const { isAvailable: isBiometricAvailable, isEnrolled: isBiometricEnrolled, enrolledCpf, enrollBiometric, authenticateBiometric } = useBiometricAuth();

  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showCpfCheck, setShowCpfCheck] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showMasterLogin, setShowMasterLogin] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showCredentialsManager, setShowCredentialsManager] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingCpf, setIsCheckingCpf] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  
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
  const [saveCpfEnabled, setSaveCpfEnabled] = useState(false);
  const [savePasswordEnabled, setSavePasswordEnabled] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);

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
      // Agents go to agent-panel, admins go to dashboard
      // Use replace to prevent back navigation to login page
      navigate('/agent-panel', { replace: true });
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

  // Auto-login effect when login dialog opens
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  
  useEffect(() => {
    if (showLogin && !autoLoginAttempted && !isSubmitting) {
      const autoLoginCred = getAutoLoginCredential();
      if (autoLoginCred) {
        // Check if the saved CPF matches the current login CPF (or if no CPF is set)
        const currentCpf = loginCpf.replace(/\D/g, '');
        if (!currentCpf || currentCpf === autoLoginCred.cpf) {
          setAutoLoginAttempted(true);
          setLoginCpf(formatCPF(autoLoginCred.cpf));
          setLoginPassword(autoLoginCred.password);
          
          // Auto-submit after a brief delay to show the user what's happening
          setTimeout(() => {
            const form = document.querySelector('form[data-login-form="true"]') as HTMLFormElement;
            if (form) {
              form.requestSubmit();
            }
          }, 500);
        }
      }
    }
    
    // Reset auto-login attempted when dialog closes
    if (!showLogin) {
      setAutoLoginAttempted(false);
    }
  }, [showLogin, autoLoginAttempted, isSubmitting, loginCpf]);

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
        // Auto-cadastro desabilitado - mostrar mensagem de erro
        toast({
          title: 'CPF Não Cadastrado',
          description: 'O cadastro está temporariamente desabilitado. Entre em contato com o administrador.',
          variant: 'destructive',
          duration: 5000,
        });
        setShowCpfCheck(false);
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
    
    // Matrícula is optional at registration - validated only if provided
    const matriculaNumbers = formData.matricula.replace(/\D/g, '');
    if (matriculaNumbers && matriculaNumbers.length !== 9) {
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
      const matriculaClean = formData.matricula ? getMatriculaNumbers(formData.matricula) : null;
      
      // Build query based on whether matricula is provided
      let query = supabase
        .from('agents')
        .select('id, cpf, matricula')
        .eq('cpf', formData.cpf.replace(/\D/g, ''));
      
      const { data: existingByCpf } = await query.maybeSingle();

      if (existingByCpf) {
        setRegErrors({ cpf: 'CPF já cadastrado' });
        setIsSubmitting(false);
        return;
      }
      
      // Check matricula only if provided
      if (matriculaClean) {
        const { data: existingByMatricula } = await supabase
          .from('agents')
          .select('id, matricula')
          .eq('matricula', matriculaClean)
          .maybeSingle();
          
        if (existingByMatricula) {
          setRegErrors({ matricula: 'Matrícula já cadastrada' });
          setIsSubmitting(false);
          return;
        }
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

      const cleanCpf = formData.cpf.replace(/\D/g, '');
      const authEmail = formData.email || `${cleanCpf}@agent.plantaopro.com`;
      
      const { error: signUpError } = await signUp(
        authEmail, 
        formData.password, 
        formData.name.toUpperCase()
      );
      
      if (signUpError) throw signUpError;

      // Wait for session to be established after signup (auto-confirm enabled)
      let retries = 0;
      let sessionUserId: string | null = null;
      while (retries < 10 && !sessionUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          sessionUserId = session.user.id;
        } else {
          await new Promise(resolve => setTimeout(resolve, 300));
          retries++;
        }
      }

      if (!sessionUserId) {
        throw new Error('Não foi possível estabelecer a sessão. Tente novamente.');
      }

      const { error: agentError } = await supabase.from('agents').insert({
        id: sessionUserId,
        name: formData.name.toUpperCase().trim(),
        cpf: cleanCpf,
        matricula: matriculaClean || null,
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
      
      // Small delay to ensure session is fully established before redirect
      // This prevents issues where the auth state hasn't propagated yet
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect to the agent panel
      navigate('/agent-panel', { replace: true });
      
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
      if (saveCpfEnabled) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('name')
          .eq('cpf', cleanCpf)
          .single();
        saveCredential(cleanCpf, agentData?.name, savePasswordEnabled ? loginPassword : undefined);
      }
      
      // Enroll biometric if enabled and available
      if (enableBiometric && isBiometricAvailable) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('name')
          .eq('cpf', cleanCpf)
          .single();
        await enrollBiometric(cleanCpf, agentData?.name);
        toast({
          title: 'Biometria Configurada',
          description: 'No próximo acesso, use sua biometria para entrar.',
        });
      }
      
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      navigate('/agent-panel', { replace: true });
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

  const handleBiometricLogin = async () => {
    setIsBiometricLoading(true);
    try {
      const cpf = await authenticateBiometric();
      if (cpf) {
        // Get agent info
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('email')
          .eq('cpf', cpf)
          .maybeSingle();
        
        if (agentError || !agentData) {
          toast({
            title: 'Erro',
            description: 'CPF não encontrado no sistema.',
            variant: 'destructive',
          });
          setIsBiometricLoading(false);
          return;
        }
        
        // We need the password for login - prompt user
        const authEmail = agentData.email || `${cpf}@agent.plantaopro.com`;
        setLoginCpf(formatCPF(cpf));
        setShowLogin(true);
        toast({
          title: 'Biometria Confirmada',
          description: 'Digite sua senha para continuar.',
        });
      } else {
        toast({
          title: 'Biometria Cancelada',
          description: 'Autenticação biométrica foi cancelada.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      toast({
        title: 'Erro na Biometria',
        description: 'Não foi possível autenticar com biometria.',
        variant: 'destructive',
      });
    }
    setIsBiometricLoading(false);
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
  const currentTeamConfig = selectedTeam ? {
    icon: themeAssets.teamIcons[selectedTeam as keyof typeof themeAssets.teamIcons],
    ...themeAssets.teamColors[selectedTeam as keyof typeof themeAssets.teamColors],
    ...themeAssets.teamDescriptions[selectedTeam as keyof typeof themeAssets.teamDescriptions],
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      {/* Themed Animated Background */}
      <ThemedBackground />

      {/* Security Status Bar - Fixed at top */}
      <div className="bg-slate-900/95 backdrop-blur-sm border-b border-primary/20 py-2 px-4 relative z-20 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
              </div>
              <span className="text-[10px] font-mono text-green-400 tracking-wider font-semibold">
                SISTEMA OPERACIONAL
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono text-slate-500">
              <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/50">
                v2.0
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playSound('click');
                setShowThemeSelector(true);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all"
              title="Alterar tema"
            >
              <Palette className="h-3.5 w-3.5 text-primary" />
              <span className="text-[9px] font-bold text-primary tracking-wide hidden sm:inline">
                {themeConfig.emoji} {themeConfig.name}
              </span>
            </button>
            <div className="text-[10px] font-mono text-muted-foreground hidden sm:flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-primary/60" />
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div className="text-xs font-mono text-primary font-bold tracking-widest">
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section - Fixed height, no scroll */}
      <header className="py-1.5 sm:py-3 px-3 sm:px-4 relative z-10 shrink-0">
        <div className="max-w-4xl mx-auto text-center">
          {/* Animated Security Badge - Smaller on mobile */}
          <div className="mb-1 sm:mb-3 flex flex-col items-center">
            <div className="relative group">
              {/* Outer rotating ring - Hidden on small mobile */}
              <div className="absolute -inset-3 rounded-full border border-primary/20 animate-[spin_20s_linear_infinite] hidden sm:block">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
              </div>
              {/* Second rotating ring - Hidden on mobile */}
              <div className="absolute -inset-6 rounded-full border border-primary/10 animate-[spin_30s_linear_infinite_reverse] hidden md:block">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 bg-accent rounded-full" />
              </div>
              {/* Main badge - Smaller on mobile */}
              <div className={cn(
                "relative w-10 h-10 sm:w-16 sm:h-16 md:w-24 md:h-24 rounded-full border-2 border-primary/40 flex items-center justify-center shadow-2xl shadow-primary/20 group-hover:border-primary/60 transition-all duration-500",
                themeConfig.colors.isLight 
                  ? "bg-gradient-to-br from-white via-gray-50 to-gray-100"
                  : "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900"
              )}>
                {(() => {
                  const MainIcon = themeAssets.mainIcon;
                  return <MainIcon className="h-5 w-5 sm:h-8 sm:w-8 md:h-12 md:w-12 text-primary drop-shadow-lg" />;
                })()}
                {/* Pulse effect */}
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-30" style={{ animationDuration: '3s' }} />
              </div>
              {/* Badge label */}
              <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 -translate-x-1/2 px-1.5 sm:px-3 py-0.5 bg-gradient-to-r from-primary to-accent rounded text-[5px] sm:text-[7px] md:text-[8px] font-black text-primary-foreground tracking-[0.08em] sm:tracking-[0.15em] shadow-lg whitespace-nowrap">
                SEGURANÇA PÚBLICA
              </div>
            </div>
          </div>
          
          {/* Title with animation - Smaller on mobile */}
          <div className="space-y-0.5 sm:space-y-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <h1 className="text-lg sm:text-3xl md:text-5xl font-black text-foreground tracking-tight">
              PLANTÃO <span className="text-primary">PRO</span>
            </h1>
            <div className="flex items-center justify-center gap-1.5 sm:gap-3">
              <div className="w-4 sm:w-12 h-[1px] sm:h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-primary" />
              <span className="text-[7px] sm:text-[10px] md:text-xs font-bold text-muted-foreground tracking-[0.1em] sm:tracking-[0.25em] uppercase">
                {themeAssets.subtitle}
              </span>
              <div className="w-4 sm:w-12 h-[1px] sm:h-[2px] bg-gradient-to-l from-transparent via-primary/50 to-primary" />
            </div>
          </div>
          
          {/* Subtitle - Hidden on mobile */}
          <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm mt-1 sm:mt-3 animate-fade-in max-w-md mx-auto hidden sm:block" style={{ animationDelay: '0.5s' }}>
            Controle profissional de plantões para equipes de segurança pública
          </p>
          
          {/* Team selection prompt - More compact */}
          <div className="mt-2 sm:mt-4 animate-fade-in" style={{ animationDelay: '0.7s' }}>
            <div className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-full bg-primary/10 border border-primary/30">
              {(() => {
                const TeamIcon = themeAssets.teamIcons.ALFA;
                return <TeamIcon className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-primary" />;
              })()}
              <span className="text-[10px] sm:text-sm font-medium text-foreground">Selecione sua equipe</span>
            </div>
          </div>
          
          {/* Quick Biometric Login Button - More compact */}
          {isBiometricAvailable && isBiometricEnrolled && enrolledCpf && (
            <div className="mt-1.5 sm:mt-3 animate-fade-in" style={{ animationDelay: '0.9s' }}>
              <Button
                onClick={handleBiometricLogin}
                disabled={isBiometricLoading}
                size="sm"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold px-3 sm:px-6 py-1.5 sm:py-3 h-auto shadow-lg shadow-emerald-500/20 text-[10px] sm:text-sm"
              >
                {isBiometricLoading ? (
                  <Loader2 className="h-3.5 w-3.5 sm:h-5 sm:w-5 mr-1 sm:mr-2 animate-spin" />
                ) : (
                  <Fingerprint className="h-3.5 w-3.5 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                )}
                Login com Biometria
              </Button>
              <p className="text-[8px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-2">
                CPF: {enrolledCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Teams Grid Section - Fills remaining space, landscape optimized */}
      <section className="flex-1 py-1 landscape:py-0.5 sm:py-4 px-2 landscape:px-4 sm:px-4 relative z-10 flex items-center justify-center min-h-0">
        <div className="w-full max-w-xs landscape:max-w-2xl sm:max-w-md md:max-w-3xl lg:max-w-4xl mx-auto">
          <div className="grid grid-cols-2 landscape:grid-cols-4 md:grid-cols-4 gap-2 landscape:gap-2 sm:gap-4 md:gap-5">
            {teams.map((team, index) => (
              <div
                key={team}
                className="animate-fade-in-scale"
                style={{
                  animationDelay: `${800 + index * 150}ms`,
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

      {/* Footer - Fixed at bottom */}
      <footer className="py-2 px-2 sm:px-4 bg-slate-900/95 backdrop-blur-sm border-t border-primary/20 relative z-20 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {(() => {
                const FooterIcon = themeAssets.mainIcon;
                return <FooterIcon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />;
              })()}
              <span className="text-[10px] sm:text-xs font-bold text-foreground">
                PLANTÃO PRO
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">|</span>
              <span className="text-[10px] text-muted-foreground">
                © {new Date().getFullYear()} Franc Denis
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 mr-1 sm:mr-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] sm:text-[10px] font-mono text-green-400">ONLINE</span>
            </div>
            {getSavedCredentials().length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  playSound('click');
                  setShowCredentialsManager(true);
                }}
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3"
              >
                <KeyRound className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span className="text-[9px] sm:text-[10px] font-bold tracking-wider hidden sm:inline">CPFs</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMasterLogin(true)}
              className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3"
            >
              <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider">ADMIN</span>
            </Button>
          </div>
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
              <div className={`p-4 rounded-xl border-2 animate-fade-in shadow-lg ${
                foundAgent.team && foundAgent.team !== selectedTeam 
                  ? 'bg-gradient-to-br from-red-500/20 via-amber-500/20 to-red-500/10 border-red-500/60' 
                  : 'bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-green-500/10 border-green-500/60'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {foundAgent.team && foundAgent.team !== selectedTeam ? (
                    <>
                      <div className="p-2 rounded-full bg-red-500/30 animate-pulse">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      </div>
                      <div>
                        <span className="font-bold text-red-400 text-base block">
                          ⚠️ EQUIPE INCORRETA!
                        </span>
                        <span className="text-red-300/80 text-xs">
                          Este CPF não pertence à equipe {selectedTeam}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-2 rounded-full bg-green-500/30">
                        <UserCheck className="h-5 w-5 text-green-400" />
                      </div>
                      <span className="font-bold text-green-400 text-base">
                        ✓ Agente Encontrado!
                      </span>
                    </>
                  )}
                </div>
                <div className="pl-2 border-l-2 border-current/30 ml-2">
                  <p className="text-white font-semibold text-lg">{foundAgent.name}</p>
                  {foundAgent.team && (
                    <div className={`flex items-center gap-2 mt-2 p-2 rounded-lg ${
                      foundAgent.team !== selectedTeam 
                        ? 'bg-red-500/20 border border-red-500/40' 
                        : 'bg-green-500/10'
                    }`}>
                      <Users className="h-4 w-4" />
                      <span className={`text-sm font-semibold ${
                        foundAgent.team !== selectedTeam 
                          ? 'text-red-300' 
                          : 'text-green-300'
                      }`}>
                        {foundAgent.team !== selectedTeam 
                          ? `Sua equipe é ${foundAgent.team} (clique para continuar lá)` 
                          : `Equipe ${foundAgent.team}`
                        }
                      </span>
                    </div>
                  )}
                  {!foundAgent.team && (
                    <p className="text-slate-400 text-xs mt-2">Sem equipe definida</p>
                  )}
                </div>
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

          <form onSubmit={handleLogin} className="space-y-4 pt-2" data-login-form="true">
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
              onSelectCredential={(cpf, savedPassword) => {
                setLoginCpf(formatCPF(cpf));
                if (savedPassword) {
                  setLoginPassword(savedPassword);
                }
              }}
              onSaveChange={(cpf, pwd) => {
                setSaveCpfEnabled(cpf);
                setSavePasswordEnabled(pwd);
              }}
              saveCpf={saveCpfEnabled}
              savePassword={savePasswordEnabled}
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
                <Label className="text-slate-300 text-sm">Matrícula</Label>
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
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    {(() => {
                      const UnitIcon = themeAssets.mainIcon;
                      return <UnitIcon className="h-4 w-4 text-primary" />;
                    })()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{selectedUnit.name}</p>
                    <p className="text-xs text-primary">Município: {selectedUnit.municipality}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
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

      {/* Theme Selector Dialog */}
      <Dialog open={showThemeSelector} onOpenChange={setShowThemeSelector}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Palette className="h-5 w-5 text-primary" />
              Personalizar Tema
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Escolha o tema visual do sistema
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <ThemeSelector onSelect={() => setShowThemeSelector(false)} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Credentials Dialog */}
      <ManageCredentialsDialog 
        open={showCredentialsManager} 
        onOpenChange={setShowCredentialsManager} 
      />
    </div>
  );
}
