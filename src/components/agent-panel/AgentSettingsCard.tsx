import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Camera, Mail, Save, Loader2, User, Phone, MapPin, Droplets, CalendarDays } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, differenceInYears } from 'date-fns';

interface AgentSettingsCardProps {
  agentId: string;
  agentName: string;
  currentEmail: string | null;
  currentAvatarUrl: string | null;
  onUpdate: () => void;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function AgentSettingsCard({ 
  agentId, 
  agentName, 
  currentEmail, 
  currentAvatarUrl,
  onUpdate 
}: AgentSettingsCardProps) {
  const [email, setEmail] = useState(currentEmail || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isSavingBloodType, setIsSavingBloodType] = useState(false);
  const [isSavingBirthDate, setIsSavingBirthDate] = useState(false);
  const [originalPhone, setOriginalPhone] = useState('');
  const [originalAddress, setOriginalAddress] = useState('');
  const [originalBloodType, setOriginalBloodType] = useState('');
  const [originalBirthDate, setOriginalBirthDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current data on mount
  useEffect(() => {
    const fetchAgentData = async () => {
      const { data } = await supabase
        .from('agents')
        .select('phone, address, blood_type, birth_date')
        .eq('id', agentId)
        .single();
      
      if (data) {
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setBloodType(data.blood_type || '');
        setBirthDate(data.birth_date || '');
        setOriginalPhone(data.phone || '');
        setOriginalAddress(data.address || '');
        setOriginalBloodType(data.blood_type || '');
        setOriginalBirthDate(data.birth_date || '');
      }
    };
    
    fetchAgentData();
  }, [agentId]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    try {
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${agentId}-${Date.now()}.${fileExt}`;
      const filePath = `agents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('agents')
        .update({ avatar_url: publicUrl })
        .eq('id', agentId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Foto de perfil atualizada!');
      onUpdate();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!email.trim()) {
      toast.error('Digite um e-mail válido');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Digite um e-mail válido');
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('agents')
        .update({ email: email.trim() })
        .eq('id', agentId);

      if (error) throw error;

      toast.success('E-mail atualizado com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Error updating email:', error);
      toast.error('Erro ao atualizar e-mail');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePhone = async () => {
    try {
      setIsSavingPhone(true);

      const { error } = await supabase
        .from('agents')
        .update({ phone: phone.trim() || null })
        .eq('id', agentId);

      if (error) throw error;

      setOriginalPhone(phone.trim());
      toast.success('Telefone atualizado com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Error updating phone:', error);
      toast.error('Erro ao atualizar telefone');
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleSaveAddress = async () => {
    try {
      setIsSavingAddress(true);

      const { error } = await supabase
        .from('agents')
        .update({ address: address.trim() || null })
        .eq('id', agentId);

      if (error) throw error;

      setOriginalAddress(address.trim());
      toast.success('Endereço atualizado com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Erro ao atualizar endereço');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSaveBloodType = async (value: string) => {
    try {
      setIsSavingBloodType(true);
      setBloodType(value);

      const { error } = await supabase
        .from('agents')
        .update({ blood_type: value || null })
        .eq('id', agentId);

      if (error) throw error;

      setOriginalBloodType(value);
      toast.success('Tipo sanguíneo atualizado!');
      onUpdate();
    } catch (error) {
      console.error('Error updating blood type:', error);
      toast.error('Erro ao atualizar tipo sanguíneo');
    } finally {
      setIsSavingBloodType(false);
    }
  };

  const handleSaveBirthDate = async () => {
    try {
      setIsSavingBirthDate(true);

      // Calculate age from birth date
      const age = birthDate ? differenceInYears(new Date(), new Date(birthDate)) : null;

      const { error } = await supabase
        .from('agents')
        .update({ 
          birth_date: birthDate || null,
          age: age
        })
        .eq('id', agentId);

      if (error) throw error;

      setOriginalBirthDate(birthDate);
      toast.success('Data de nascimento atualizada!');
      onUpdate();
    } catch (error) {
      console.error('Error updating birth date:', error);
      toast.error('Erro ao atualizar data de nascimento');
    } finally {
      setIsSavingBirthDate(false);
    }
  };

  // Format phone number as user types
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})/, '($1) ')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .trim();
    }
    return value;
  };

  // Calculate age display
  const getAgeDisplay = () => {
    if (!birthDate) return null;
    const age = differenceInYears(new Date(), new Date(birthDate));
    return `${age} anos`;
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-amber-500" />
          Configurações do Perfil
        </CardTitle>
        <CardDescription>
          Atualize sua foto, dados pessoais e contato
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-slate-600">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={agentName} />}
              <AvatarFallback className="bg-slate-700 text-2xl font-bold text-amber-400">
                {agentName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 p-2 bg-amber-500 rounded-full hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 text-black animate-spin" />
              ) : (
                <Camera className="h-4 w-4 text-black" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-400">Clique no ícone para alterar a foto</p>
            <p className="text-xs text-slate-500">Formatos: JPG, PNG, GIF (máx. 2MB)</p>
          </div>
        </div>

        {/* Blood Type and Birth Date Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Blood Type */}
          <div className="space-y-2">
            <Label className="text-slate-300 flex items-center gap-2">
              <Droplets className="h-4 w-4 text-red-500" />
              Tipo Sanguíneo
            </Label>
            <Select 
              value={bloodType} 
              onValueChange={handleSaveBloodType}
              disabled={isSavingBloodType}
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {BLOOD_TYPES.map(type => (
                  <SelectItem key={type} value={type} className="text-white hover:bg-slate-700">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label htmlFor="birthDate" className="text-slate-300 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              Nascimento
            </Label>
            <div className="flex gap-2">
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-white flex-1"
              />
              <Button
                onClick={handleSaveBirthDate}
                disabled={isSavingBirthDate || birthDate === originalBirthDate}
                size="icon"
                className="bg-amber-500 hover:bg-amber-600 text-black shrink-0"
              >
                {isSavingBirthDate ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
            {birthDate && (
              <p className="text-xs text-amber-400">{getAgeDisplay()}</p>
            )}
          </div>
        </div>

        {/* Email Update */}
        <div className="space-y-3">
          <Label htmlFor="email" className="text-slate-300 flex items-center gap-2">
            <Mail className="h-4 w-4 text-amber-500" />
            E-mail de Contato
          </Label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
            />
            <Button
              onClick={handleSaveEmail}
              disabled={isSaving || email === currentEmail}
              className="bg-amber-500 hover:bg-amber-600 text-black shrink-0"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Este e-mail pode ser usado para recuperação de senha e notificações
          </p>
        </div>

        {/* Phone Update */}
        <div className="space-y-3">
          <Label htmlFor="phone" className="text-slate-300 flex items-center gap-2">
            <Phone className="h-4 w-4 text-amber-500" />
            Telefone
          </Label>
          <div className="flex gap-2">
            <Input
              id="phone"
              type="tel"
              placeholder="(68) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              maxLength={15}
              className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
            />
            <Button
              onClick={handleSavePhone}
              disabled={isSavingPhone || phone === originalPhone}
              className="bg-amber-500 hover:bg-amber-600 text-black shrink-0"
            >
              {isSavingPhone ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Address Update */}
        <div className="space-y-3">
          <Label htmlFor="address" className="text-slate-300 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-amber-500" />
            Endereço
          </Label>
          <div className="flex gap-2">
            <Textarea
              id="address"
              placeholder="Rua, número, bairro, cidade..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 resize-none"
            />
            <Button
              onClick={handleSaveAddress}
              disabled={isSavingAddress || address === originalAddress}
              className="bg-amber-500 hover:bg-amber-600 text-black shrink-0 self-start"
            >
              {isSavingAddress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
