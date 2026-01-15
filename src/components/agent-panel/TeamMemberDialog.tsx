import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Shield, User, Droplet, Phone, MapPin, MessageCircle, Mail, Cake, X } from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  team: string | null;
  blood_type: string | null;
  avatar_url: string | null;
  is_active: boolean;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  email: string | null;
}

interface TeamMemberDialogProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCurrentUser?: boolean;
}

export function TeamMemberDialog({ member, open, onOpenChange, isCurrentUser }: TeamMemberDialogProps) {
  if (!member) return null;

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case 'team_leader':
        return <Crown className="h-6 w-6 text-amber-500" />;
      case 'support':
        return <Shield className="h-6 w-6 text-blue-500" />;
      default:
        return <User className="h-6 w-6 text-slate-400" />;
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'team_leader':
        return 'Chefe de Equipe';
      case 'support':
        return 'Apoio';
      default:
        return 'Agente';
    }
  };

  const getRoleBadgeClass = (role: string | null) => {
    switch (role) {
      case 'team_leader':
        return 'bg-gradient-to-r from-amber-500 to-amber-600 text-black border-amber-400';
      case 'support':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400';
      default:
        return 'bg-slate-700/80 text-slate-300 border-slate-600';
    }
  };

  const formatPhoneForWhatsApp = (phone: string | null) => {
    if (!phone) return null;
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length < 10) return null;
    return `55${numbers}`;
  };

  const getAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    try {
      return differenceInYears(new Date(), parseISO(birthDate));
    } catch {
      return null;
    }
  };

  const whatsappLink = formatPhoneForWhatsApp(member.phone);
  const age = getAge(member.birth_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Perfil de {member.name}</DialogTitle>
          <DialogDescription>Informações de contato e perfil do membro da equipe.</DialogDescription>
        </DialogHeader>
        
        {/* Profile Card */}
        <div className="flex flex-col items-center pt-4 pb-2">
          {/* Avatar grande */}
          <div className="relative mb-4">
            <Avatar className={`h-28 w-28 border-4 shadow-xl ${
              member.role === 'team_leader' ? 'border-amber-500 shadow-amber-500/30' :
              member.role === 'support' ? 'border-blue-500 shadow-blue-500/30' : 
              'border-primary/50 shadow-primary/20'
            }`}>
              {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.name} className="object-cover" />}
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-4xl font-bold text-primary-foreground">
                {member.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* Role icon overlay */}
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-card border-2 border-border">
              {getRoleIcon(member.role)}
            </div>
          </div>

          {/* Name */}
          <h2 className="text-xl font-bold text-foreground text-center">
            {member.name}
          </h2>
          
          {/* Badges */}
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`${getRoleBadgeClass(member.role)}`}>
              {getRoleLabel(member.role)}
            </Badge>
            {member.team && (
              <Badge variant="outline">
                Equipe {member.team}
              </Badge>
            )}
            {isCurrentUser && (
              <Badge className="bg-primary text-primary-foreground">Você</Badge>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="space-y-3 py-4 border-t border-border">
          {/* Blood Type */}
          {member.blood_type && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <Droplet className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Tipo Sanguíneo</p>
                <p className="font-bold text-red-400 text-lg">{member.blood_type}</p>
              </div>
            </div>
          )}

          {/* Age (only show age, not exact date) */}
          {age && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Cake className="h-5 w-5 text-pink-500" />
              <div>
                <p className="text-xs text-muted-foreground">Idade</p>
                <p className="font-semibold text-foreground">{age} anos</p>
              </div>
            </div>
          )}

          {/* Phone */}
          {member.phone && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Phone className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="font-semibold text-foreground">{member.phone}</p>
              </div>
              {whatsappLink && (
                <a
                  href={`https://wa.me/${whatsappLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button size="sm" variant="outline" className="gap-1.5 border-green-500/50 text-green-500 hover:bg-green-500/10">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </a>
              )}
            </div>
          )}

          {/* Email */}
          {member.email && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="font-semibold text-foreground truncate">{member.email}</p>
              </div>
            </div>
          )}

          {/* Address */}
          {member.address && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <MapPin className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Endereço</p>
                <p className="font-semibold text-foreground text-sm">{member.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Info footer */}
        <p className="text-[10px] text-center text-muted-foreground border-t border-border pt-3">
          ℹ️ Estas informações são visíveis apenas para membros da sua equipe
        </p>
      </DialogContent>
    </Dialog>
  );
}