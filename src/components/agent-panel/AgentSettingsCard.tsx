import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Camera, Mail, Save, Loader2, User, Phone, MapPin, Droplets, CalendarDays, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, differenceInYears } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AgentSettingsCardProps {
  agentId: string;
  agentName: string;
  currentEmail: string | null;
  currentAvatarUrl: string | null;
  onUpdate: () => void;
  onClose?: () => void;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function AgentSettingsCard({ 
  agentId, 
  agentName, 
  currentEmail, 
  currentAvatarUrl,
  onUpdate,
  onClose
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
    <Card className="bg-gradient-to-br from-slate-800/90 via-slate-800/70 to-slate-900/90 border-2 border-slate-600/50 shadow-xl shadow-black/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-500/40">
              <User className="h-5 w-5 text-amber-400" />
            </div>
            <span className="bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent font-bold">
              Configurações do Perfil
            </span>
          </CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription className="text-slate-400 text-sm">
          Atualize sua foto, dados pessoais e contato
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-5">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <div className="relative shrink-0">
                <Avatar className="h-16 w-16 border-3 border-amber-500/50">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={agentName} />}
                  <AvatarFallback className="bg-slate-700 text-xl font-bold text-amber-400">
                    {agentName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-amber-500 rounded-full hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-lg"
                >
                  {isUploading ? (
                    <Loader2 className="h-3 w-3 text-black animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3 text-black" />
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{agentName}</p>
                <p className="text-xs text-slate-400">Clique no ícone para alterar a foto</p>
                <p className="text-[10px] text-slate-500">JPG, PNG, GIF (máx. 2MB)</p>
              </div>
            </div>

            {/* Blood Type and Birth Date Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Blood Type */}
              <div className="space-y-1.5">
                <Label className="text-slate-300 flex items-center gap-1.5 text-xs font-medium">
                  <Droplets className="h-3.5 w-3.5 text-red-500" />
                  Tipo Sanguíneo
                </Label>
                <Select 
                  value={bloodType} 
                  onValueChange={handleSaveBloodType}
                  disabled={isSavingBloodType}
                >
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm">
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
              <div className="space-y-1.5">
                <Label htmlFor="birthDate" className="text-slate-300 flex items-center gap-1.5 text-xs font-medium">
                  <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
                  Nascimento
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm flex-1"
                  />
                  <Button
                    onClick={handleSaveBirthDate}
                    disabled={isSavingBirthDate || birthDate === originalBirthDate}
                    size="icon"
                    className="bg-amber-500 hover:bg-amber-600 text-black h-9 w-9 shrink-0"
                  >
                    {isSavingBirthDate ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                {birthDate && (
                  <p className="text-[10px] text-amber-400 pl-1">{getAgeDisplay()}</p>
                )}
              </div>
            </div>

            {/* Email Update */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 flex items-center gap-1.5 text-xs font-medium">
                <Mail className="h-3.5 w-3.5 text-amber-500" />
                E-mail de Contato
              </Label>
              <div className="flex gap-1.5">
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 h-9 text-sm"
                />
                <Button
                  onClick={handleSaveEmail}
                  disabled={isSaving || email === currentEmail}
                  size="icon"
                  className="bg-amber-500 hover:bg-amber-600 text-black h-9 w-9 shrink-0"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-slate-500 pl-1">
                Para recuperação de senha e notificações
              </p>
            </div>

            {/* Phone Update */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-slate-300 flex items-center gap-1.5 text-xs font-medium">
                <Phone className="h-3.5 w-3.5 text-amber-500" />
                Telefone
              </Label>
              <div className="flex gap-1.5">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(68) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  maxLength={15}
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 h-9 text-sm"
                />
                <Button
                  onClick={handleSavePhone}
                  disabled={isSavingPhone || phone === originalPhone}
                  size="icon"
                  className="bg-amber-500 hover:bg-amber-600 text-black h-9 w-9 shrink-0"
                >
                  {isSavingPhone ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Address Update */}
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-slate-300 flex items-center gap-1.5 text-xs font-medium">
                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                Endereço
              </Label>
              <div className="flex gap-1.5">
                <Textarea
                  id="address"
                  placeholder="Rua, número, bairro, cidade..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 resize-none text-sm min-h-[60px]"
                />
                <Button
                  onClick={handleSaveAddress}
                  disabled={isSavingAddress || address === originalAddress}
                  size="icon"
                  className="bg-amber-500 hover:bg-amber-600 text-black h-9 w-9 shrink-0 self-start"
                >
                  {isSavingAddress ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
