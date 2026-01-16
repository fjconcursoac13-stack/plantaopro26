import { useEffect, useState, useCallback } from 'react';
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
import { Loader2, AlertTriangle, Eye, EyeOff, UserCheck, Lock, Palette, Fingerprint, Shield, Users, KeyRound, Info, Mail, Calendar, Clock, BarChart3, RefreshCw, Target, Building2, Award, CheckCircle2, Zap, Radio } from 'lucide-react';
import { HomeAudioPlayer } from '@/components/HomeAudioPlayer';
import { DeveloperFooter } from '@/components/DeveloperFooter';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { ThemedHomeBackground } from '@/components/ThemedHomeBackground';
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
  const [showAboutDialog, setShowAboutDialog] = useState(false);
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

  // Real-time CPF search with auto-login for registered agents
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
        
        // Auto-login: If agent exists and belongs to selected team, auto-proceed to login
        if (data && data.team === selectedTeam) {
          // Small delay to show found status, then auto-proceed
          setTimeout(() => {
            setShowCpfCheck(false);
            setLoginCpf(formatted);
            setShowLogin(true);
            toast({
              title: `Bem-vindo, ${data.name}!`,
              description: 'Digite sua senha para entrar.',
              duration: 3000,
            });
          }, 800);
        } else if (data && data.team && data.team !== selectedTeam) {
          // Wrong team - show professional warning
          playSound('error');
          toast({
            title: '⚠️ Equipe Incorreta',
            description: `Você pertence à equipe ${data.team}. Selecione o card correto para continuar.`,
            variant: 'destructive',
            duration: 5000,
          });
        }
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
        // CPF não cadastrado - redirecionar para registro
        setShowCpfCheck(false);
        setFormData(prev => ({ 
          ...prev, 
          cpf: checkCpf,
          unit_id: '',
        }));
        setShowRegistration(true);
        toast({
          title: 'CPF Não Cadastrado',
          description: 'Preencha seus dados para se cadastrar no sistema.',
          duration: 5000,
        });
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
    <>
      <div className="h-[100dvh] flex flex-col bg-background relative overflow-hidden touch-none overscroll-none">
        {/* Themed Animated Background with Rotating Team Images */}
        <ThemedHomeBackground />

      {/* Security Status Bar - Professional & Larger */}
      <div className="bg-gradient-to-r from-slate-900/98 via-slate-800/95 to-slate-900/98 backdrop-blur-md border-b-2 border-primary/30 py-2.5 sm:py-3 px-4 sm:px-6 relative z-20 shrink-0 shadow-lg shadow-black/20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Left: Status Indicator */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/40">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping opacity-75" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-green-400 tracking-wider">
                SISTEMA ATIVO
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-slate-400">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Conexão Segura</span>
            </div>
          </div>
          
          {/* Right: Theme Button & Clock */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => {
                playSound('click');
                setShowThemeSelector(true);
              }}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary/40 hover:border-primary/60 hover:from-primary/30 hover:to-primary/20 transition-all duration-300 group shadow-lg shadow-primary/10"
              title="Alterar tema visual"
            >
              <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-primary group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline text-sm font-semibold text-primary">Tema</span>
            </button>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm sm:text-base font-mono font-bold text-primary tracking-wide">
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section - Enhanced title with effects */}
      <header className="py-4 sm:py-6 md:py-8 px-4 relative z-10 shrink-0">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-4 sm:gap-5">
          {/* Badge with glow */}
          <div className={cn(
            "relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-3 border-primary/60 flex items-center justify-center shadow-xl",
            themeConfig.colors.isLight 
              ? "bg-gradient-to-br from-white via-gray-50 to-gray-100"
              : "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900"
          )}>
            {(() => {
              const MainIcon = themeAssets.mainIcon;
              return <MainIcon className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary drop-shadow-lg" />;
            })()}
            {/* Animated ring */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute -inset-3 rounded-full bg-primary/15 blur-xl animate-pulse" />
          </div>
          
          {/* Title with effects */}
          <div className="relative">
            {/* Glow behind title */}
            <div className="absolute inset-0 blur-3xl bg-primary/25 rounded-full" />
            
            <h1 className="relative text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight">
              <span 
                className="bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent"
                style={{ textShadow: '0 0 40px hsl(var(--primary) / 0.3)' }}
              >
                PLANTÃO{' '}
              </span>
              <span 
                className="bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent animate-pulse"
                style={{ 
                  textShadow: '0 0 30px hsl(var(--primary) / 0.5), 0 0 60px hsl(var(--primary) / 0.3)',
                  animationDuration: '3s',
                }}
              >
                PRO
              </span>
            </h1>
            
            {/* Subtitle with tactical feel */}
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-base font-bold text-muted-foreground tracking-[0.25em] uppercase flex items-center justify-center gap-3">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span>{themeAssets.subtitle}</span>
              <Radio className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 animate-pulse" />
            </p>
          </div>
        </div>
      </header>

      {/* Teams Grid Section - Optimized for mobile portrait */}
      <section className="flex-1 py-2 sm:py-4 px-3 sm:px-6 relative z-10 flex items-center justify-center min-h-0 overflow-hidden">
        <div className="w-full h-full max-w-sm sm:max-w-2xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto flex items-center justify-center">
          <div className="w-full grid grid-cols-2 landscape:grid-cols-4 md:grid-cols-4 gap-2 sm:gap-4 md:gap-5 lg:gap-6 auto-rows-fr">
            {teams.map((team, index) => (
              <div
                key={team}
                className="animate-fade-in-scale"
                style={{
                  animationDelay: `${400 + index * 80}ms`,
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


      {/* Footer - Compact single row */}
      <footer className="py-1.5 sm:py-2 px-3 sm:px-4 bg-slate-900/90 backdrop-blur-sm border-t border-primary/20 relative z-20 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Branding + Audio */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="text-[10px] sm:text-xs font-semibold">© {new Date().getFullYear()}</span>
            </div>
            <span className="text-[10px] sm:text-xs font-bold bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">
              FRANC D'NIS
            </span>
            <HomeAudioPlayer />
          </div>
          
          {/* Right: Actions - Compact */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={() => setShowAboutDialog(true)}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-primary rounded-lg transition-colors"
              title="Sobre"
            >
              <Info className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            
            {getSavedCredentials().length > 0 && (
              <button
                onClick={() => setShowCredentialsManager(true)}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-amber-400 rounded-lg transition-colors"
                title="Credenciais"
              >
                <KeyRound className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
            
            <button
              onClick={() => navigate('/auth')}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-cyan-400 rounded-lg transition-colors"
              title="Login Admin"
            >
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            
            <button
              onClick={() => setShowMasterLogin(true)}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
              title="Master"
            >
              <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </footer>

      {/* CPF Check Dialog - Professional */}
      <Dialog open={showCpfCheck} onOpenChange={(open) => !open && closeAllDialogs()}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-primary/40 max-w-md shadow-2xl shadow-primary/10">
          <DialogHeader className="pb-4 border-b border-slate-700/50">
            <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-white">
              {currentTeamConfig && (
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40">
                  <currentTeamConfig.icon className={`h-6 w-6 sm:h-7 sm:w-7 ${currentTeamConfig.color}`} />
                </div>
              )}
              <span>Equipe {selectedTeam}</span>
            </DialogTitle>
            <DialogDescription className="text-base text-slate-400 mt-2">
              Digite seu CPF para verificar seu cadastro no sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold text-slate-300">CPF</Label>
              <div className="relative">
                <Input
                  value={checkCpf}
                  onChange={(e) => handleCpfInputChange(e.target.value)}
                  placeholder="000.000.000-00"
                  className="bg-slate-800/80 border-2 border-slate-600 text-white text-xl sm:text-2xl text-center tracking-[0.2em] py-6 font-mono focus:border-primary/60 transition-colors"
                  maxLength={14}
                />
                {isSearchingAgent && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Show found agent info */}
            {foundAgent && (
              <div className={`p-5 rounded-2xl border-2 animate-fade-in shadow-xl ${
                foundAgent.team && foundAgent.team !== selectedTeam 
                  ? 'bg-gradient-to-br from-red-500/20 via-amber-500/20 to-red-500/10 border-red-500/60' 
                  : 'bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-green-500/10 border-green-500/60'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  {foundAgent.team && foundAgent.team !== selectedTeam ? (
                    <>
                      <div className="p-3 rounded-xl bg-red-500/30 animate-pulse">
                        <AlertTriangle className="h-6 w-6 text-red-400" />
                      </div>
                      <div>
                        <span className="font-black text-red-400 text-lg block">
                          ⚠️ EQUIPE INCORRETA!
                        </span>
                        <span className="text-red-300/80 text-sm">
                          Este CPF não pertence à equipe {selectedTeam}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-xl bg-green-500/30">
                        <UserCheck className="h-6 w-6 text-green-400" />
                      </div>
                      <span className="font-black text-green-400 text-lg">
                        ✓ Agente Encontrado!
                      </span>
                    </>
                  )}
                </div>
                <div className="pl-3 border-l-3 border-current/30 ml-3">
                  <p className="text-white font-bold text-xl">{foundAgent.name}</p>
                  {foundAgent.team && (
                    <div className={`flex items-center gap-2 mt-3 p-3 rounded-xl ${
                      foundAgent.team !== selectedTeam 
                        ? 'bg-red-500/20 border-2 border-red-500/40' 
                        : 'bg-green-500/10 border border-green-500/30'
                    }`}>
                      <Users className="h-5 w-5" />
                      <span className={`text-base font-semibold ${
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
                    <p className="text-slate-400 text-sm mt-2">Sem equipe definida</p>
                  )}
                </div>
              </div>
            )}
            
            {checkCpf.replace(/\D/g, '').length === 11 && !foundAgent && !isSearchingAgent && (
              <div className="p-4 bg-amber-500/15 rounded-xl border-2 border-amber-500/40 animate-fade-in">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-400" />
                  <span className="text-amber-400 font-bold text-base">CPF não cadastrado</span>
                </div>
                <p className="text-slate-400 text-sm mt-2 ml-9">Você será direcionado para o cadastro</p>
              </div>
            )}
            
            <Button
              onClick={handleCheckCpf}
              disabled={isCheckingCpf || checkCpf.replace(/\D/g, '').length !== 11}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-bold text-lg py-6 shadow-lg shadow-amber-500/30 transition-all duration-300"
            >
              {isCheckingCpf ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando...</>
              ) : foundAgent ? (
                <><Lock className="mr-2 h-5 w-5" /> Fazer Login</>
              ) : (
                <><UserCheck className="mr-2 h-5 w-5" /> Continuar</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Dialog - Professional */}
      <Dialog open={showLogin} onOpenChange={(open) => !open && closeAllDialogs()}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-emerald-500/40 max-w-md shadow-2xl shadow-emerald-500/10">
          <DialogHeader className="pb-4 border-b border-slate-700/50">
            <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-white">
              {currentTeamConfig && (
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/40">
                  <currentTeamConfig.icon className={`h-6 w-6 sm:h-7 sm:w-7 ${currentTeamConfig.color}`} />
                </div>
              )}
              <div>
                <span className="block">Login - Equipe {selectedTeam}</span>
                <span className="text-sm font-normal text-emerald-400">Acesso Autenticado</span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-base text-slate-400 mt-2">
              CPF encontrado! Entre com sua senha para acessar o sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogin} className="space-y-5 pt-4" data-login-form="true">
            <div className="space-y-2">
              <Label className="text-base font-semibold text-slate-300">CPF</Label>
              <Input
                value={loginCpf}
                onChange={(e) => setLoginCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                className="bg-slate-800/80 border-2 border-slate-600 text-white text-lg py-5 font-mono tracking-wider"
                maxLength={14}
                disabled
              />
              {loginErrors.cpf && <p className="text-sm text-red-400 font-medium">{loginErrors.cpf}</p>}
            </div>
            
            <div className="space-y-2">
              <Label className="text-base font-semibold text-slate-300">Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-800/80 border-2 border-slate-600 text-white text-lg py-5 pr-14 focus:border-emerald-500/60 transition-colors"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
              {loginErrors.password && <p className="text-sm text-red-400 font-medium">{loginErrors.password}</p>}
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
            
            <div className="flex items-center justify-between pt-2">
              <ForgotPasswordDialog />
            </div>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-lg py-6 shadow-lg shadow-emerald-500/30 transition-all duration-300"
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Entrando...</>
              ) : (
                <><Lock className="mr-2 h-5 w-5" /> Entrar no Sistema</>
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

      {/* Registration Dialog - Professional */}
      <Dialog open={showRegistration} onOpenChange={(open) => !open && safeCloseRegistration()}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-cyan-500/40 max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-cyan-500/10">
          <DialogHeader className="pb-4 border-b border-slate-700/50">
            <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-white">
              {currentTeamConfig && (
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 border border-cyan-500/40">
                  <currentTeamConfig.icon className={`h-6 w-6 sm:h-7 sm:w-7 ${currentTeamConfig.color}`} />
                </div>
              )}
              <div>
                <span className="block">Cadastro - Equipe {selectedTeam}</span>
                <span className="text-sm font-normal text-cyan-400">Novo Agente</span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-base text-slate-400 mt-2">
              CPF não encontrado. Preencha seus dados para se cadastrar no sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-amber-500/15 rounded-xl border-2 border-amber-500/40 mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-amber-400 text-base">Informação Importante</p>
                <p className="text-slate-300 text-sm mt-1">
                  Seu <strong className="text-amber-300">CPF</strong> será seu usuário de acesso. Crie uma senha segura.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-semibold text-slate-300">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/\d/g, '').toUpperCase() })}
                placeholder="NOME COMPLETO"
                className="bg-slate-800/80 border-2 border-slate-600 text-white text-lg py-5 uppercase focus:border-cyan-500/60 transition-colors"
                required
              />
              {regErrors.name && <p className="text-sm text-red-400 font-medium">{regErrors.name}</p>}
            </div>
            
            {/* CPF e Matrícula */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-slate-300">CPF *</Label>
                <div className="relative">
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    className={`bg-slate-800/80 border-2 text-white text-base py-5 pr-12 transition-colors ${
                      formData.cpf.replace(/\D/g, '').length === 11
                        ? cpfValidation.isValid && !cpfValidation.exists
                          ? 'border-green-500 focus:border-green-500'
                          : cpfValidation.exists
                          ? 'border-amber-500 focus:border-amber-500'
                          : 'border-red-500 focus:border-red-500'
                        : 'border-slate-600 focus:border-cyan-500/60'
                    }`}
                    maxLength={14}
                    required
                  />
                  {formData.cpf.replace(/\D/g, '').length === 11 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {cpfValidation.isChecking ? (
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      ) : cpfValidation.isValid && !cpfValidation.exists ? (
                        <UserCheck className="h-5 w-5 text-green-400" />
                      ) : cpfValidation.exists ? (
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
                {regErrors.cpf && <p className="text-sm text-red-400 font-medium">{regErrors.cpf}</p>}
                
                {/* Real-time CPF validation feedback */}
                {formData.cpf.replace(/\D/g, '').length === 11 && !cpfValidation.isChecking && (
                  <div className={`text-sm font-medium ${
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
              <div className="space-y-2">
                <Label className="text-base font-semibold text-slate-300">Matrícula</Label>
                <Input
                  value={formData.matricula}
                  onChange={(e) => setFormData({ ...formData, matricula: formatMatricula(e.target.value) })}
                  placeholder="000.000.000 (Opcional)"
                  className="bg-slate-800/80 border-2 border-slate-600 text-white text-base py-5 focus:border-cyan-500/60 transition-colors"
                  maxLength={11}
                />
                {regErrors.matricula && <p className="text-sm text-red-400 font-medium">{regErrors.matricula}</p>}
              </div>
            </div>
            
            {/* Unidade e Município */}
            <div className="space-y-2">
              <Label className="text-base font-semibold text-slate-300">Unidade Socioeducativa *</Label>
              <Select
                value={formData.unit_id}
                onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
              >
                <SelectTrigger className="bg-slate-800/80 border-2 border-slate-600 text-white text-base py-5 focus:border-cyan-500/60">
                  <SelectValue placeholder={units.length === 0 ? "Carregando unidades..." : "Selecione sua unidade"} />
                </SelectTrigger>
                <SelectContent 
                  className="bg-slate-900 border-2 border-slate-700 max-h-60"
                  position="popper"
                  sideOffset={4}
                  style={{ zIndex: 9999 }}
                >
                  {units.length === 0 ? (
                    <div className="px-4 py-3 text-slate-400 text-base">Carregando unidades...</div>
                  ) : (
                    units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id} className="text-white hover:bg-slate-700 focus:bg-slate-700 cursor-pointer py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-base">{unit.name}</span>
                          <span className="text-sm text-slate-400">{unit.municipality}</span>
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

            {/* Data de Nascimento e Telefone - Profissional */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-slate-300 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cyan-400" />
                  Data de Nascimento
                </Label>
                <Input
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: formatBirthDate(e.target.value) })}
                  placeholder="DD-MM-AAAA"
                  className="bg-slate-800/80 border-2 border-slate-600 text-white text-base py-5 focus:border-cyan-500/60"
                  maxLength={10}
                />
                {calculatedAge !== null && (
                  <p className="text-sm font-semibold text-amber-400 flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    {calculatedAge} anos
                  </p>
                )}
                {regErrors.birth_date && <p className="text-sm text-red-400">{regErrors.birth_date}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold text-slate-300 flex items-center gap-2">
                  📱 Telefone
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  className="bg-slate-800/80 border-2 border-slate-600 text-white text-base py-5 focus:border-cyan-500/60"
                  maxLength={15}
                />
              </div>
            </div>

            {/* Senha - Profissional */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-slate-300 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-cyan-400" />
                  Senha *
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 6 caracteres"
                    className="bg-slate-800/80 border-2 border-slate-600 text-white text-base py-5 pr-12 focus:border-cyan-500/60"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {regErrors.password && <p className="text-sm text-red-400">{regErrors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                  Confirmar Senha *
                </Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repita a senha"
                  className="bg-slate-800/80 border-2 border-slate-600 text-white text-base py-5 focus:border-cyan-500/60"
                  required
                />
                {regErrors.confirmPassword && <p className="text-sm text-red-400">{regErrors.confirmPassword}</p>}
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

      {/* About Dialog */}
      <Dialog open={showAboutDialog} onOpenChange={setShowAboutDialog}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] p-0 overflow-hidden">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-6">
              <DialogHeader className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <DialogTitle className="text-center text-2xl font-bold text-foreground">
                  PlantãoPro
                </DialogTitle>
                <DialogDescription className="text-center text-muted-foreground max-w-md mx-auto">
                  Solução para profissionais da Segurança Pública organizarem sua vida funcional de forma prática e eficiente.
                </DialogDescription>
              </DialogHeader>

              <Separator className="my-4" />

              {/* Features Grid */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 text-center">
                  Funcionalidades
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { icon: Calendar, title: 'Plantões', desc: 'Organize visualmente' },
                    { icon: BarChart3, title: 'Escalas', desc: 'Acompanhe equipe' },
                    { icon: Clock, title: 'Banco de Horas', desc: 'Controle completo' },
                    { icon: RefreshCw, title: 'Permutas', desc: 'Trocas simples' },
                    { icon: Users, title: 'Equipes', desc: 'Chat integrado' },
                    { icon: Target, title: 'Planejamento', desc: 'Rotina organizada' },
                  ].map((feature) => (
                    <div 
                      key={feature.title}
                      className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center"
                    >
                      <feature.icon className="h-5 w-5 text-primary mx-auto mb-1.5" />
                      <p className="text-xs font-medium text-foreground">{feature.title}</p>
                      <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Origin */}
              <Card className="border-border/50 bg-muted/20 mb-6">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Desenvolvedor</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground text-sm">Franc D'nis</strong>
                        <br />
                        <span className="text-primary">Agente Socioeducativo</span> • <strong className="text-foreground">Feijó, Acre</strong>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Desenvolvido para resolver problemas reais do dia a dia da categoria.
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <Award className="h-3 w-3" /> Feito por quem entende
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Problemas reais
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact */}
              <div className="text-center">
                <h4 className="text-sm font-semibold text-foreground mb-2">Contato</h4>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <a 
                    href="mailto:francdenisbr@gmail.com"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    francdenisbr@gmail.com
                  </a>
                  <a 
                    href="mailto:plantaopro@proton.me"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    plantaopro@proton.me
                  </a>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-border/30 text-center">
                <p className="text-[10px] text-muted-foreground/60">
                  © {new Date().getFullYear()} PlantãoPro • Desenvolvido para a Segurança Pública brasileira
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
