import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, User, Phone, Mail, MapPin, Loader2, Droplet, Camera } from 'lucide-react';
import { formatPhone } from '@/lib/validators';
import { AvatarUpload } from '@/components/agent-panel/AvatarUpload';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function AgentProfileEdit() {
  const { user, isLoading: isAuthLoading, masterSession } = useAuth();
  const { agent, isLoading: isAgentLoading } = useAgentProfile();
  const navigate = useNavigate();
  
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    address: '',
    blood_type: ''
  });

  // Redirect only after loading is complete
  useEffect(() => {
    if (isAuthLoading) return;
    
    // Don't redirect if we have any valid session
    if (user || masterSession) return;
    
    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      navigate('/auth', { replace: true });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [user, isAuthLoading, masterSession, navigate]);

  useEffect(() => {
    if (agent) {
      setFormData({
        phone: agent.phone || '',
        email: agent.email || '',
        address: agent.address || '',
        blood_type: agent.blood_type || ''
      });
      setAvatarUrl(agent.avatar_url || null);
    }
  }, [agent]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agent?.id) {
      toast.error('Erro ao identificar o agente');
      return;
    }

    setIsSaving(true);
    
    try {
      const { error } = await (supabase as any)
        .from('agents')
        .update({
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          blood_type: formData.blood_type || null
        })
        .eq('id', agent.id);

      if (error) throw error;

      toast.success('Dados atualizados com sucesso!');
      navigate('/agent-panel');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar dados');
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isAgentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Perfil não encontrado</p>
          <Button 
            variant="ghost" 
            className="mt-4"
            onClick={() => navigate('/agent-panel')}
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/agent-panel')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
            <p className="text-slate-400">Edite seus dados pessoais</p>
          </div>
        </div>

        {/* Avatar Upload Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Camera className="h-5 w-5 text-amber-500" />
              Foto de Perfil
            </CardTitle>
            <CardDescription>
              Adicione ou altere sua foto de perfil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUpload
              agentId={agent.id}
              agentName={agent.name}
              currentAvatarUrl={avatarUrl}
              onAvatarUpdated={setAvatarUrl}
            />
          </CardContent>
        </Card>

        {/* Profile Card - Read Only Info */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5 text-amber-500" />
              Informações Básicas
            </CardTitle>
            <CardDescription>
              Dados cadastrais (não editáveis)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400 text-sm">Nome</Label>
                <p className="text-white font-medium">{agent.name}</p>
              </div>
              <div>
                <Label className="text-slate-400 text-sm">CPF</Label>
                <p className="text-white font-medium">
                  {agent.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                </p>
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Matrícula</Label>
                <p className="text-white font-medium">{agent.matricula || '-'}</p>
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Equipe</Label>
                <p className="text-white font-medium">{agent.team || '-'}</p>
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Unidade</Label>
                <p className="text-white font-medium">{agent.unit?.name || '-'}</p>
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Município</Label>
                <p className="text-white font-medium">{agent.unit?.municipality || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editable Info */}
        <form onSubmit={handleSubmit}>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Dados de Contato</CardTitle>
              <CardDescription>
                Atualize suas informações de contato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-amber-500" />
                  Telefone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  maxLength={15}
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-amber-500" />
                  E-mail Pessoal
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                />
                <p className="text-xs text-slate-500">
                  Este e-mail pode ser usado para recuperação de senha
                </p>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-slate-300 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-500" />
                  Endereço
                </Label>
                <Textarea
                  id="address"
                  placeholder="Rua, número, bairro, cidade..."
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px]"
                />
              </div>

              {/* Blood Type */}
              <div className="space-y-2">
                <Label htmlFor="blood_type" className="text-slate-300 flex items-center gap-2">
                  <Droplet className="h-4 w-4 text-red-500" />
                  Tipo Sanguíneo
                </Label>
                <Select
                  value={formData.blood_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, blood_type: value }))}
                >
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue placeholder="Selecione seu tipo sanguíneo" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {bloodTypes.map((type) => (
                      <SelectItem 
                        key={type} 
                        value={type}
                        className="text-white hover:bg-slate-700 focus:bg-slate-700"
                      >
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Importante para emergências
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/agent-panel')}
                  className="text-slate-400 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Credits */}
        <p className="text-center text-xs text-slate-500">
          Desenvolvido por Franc D'nis
        </p>
      </div>
    </div>
  );
}
