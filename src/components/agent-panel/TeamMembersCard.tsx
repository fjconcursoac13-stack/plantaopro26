import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Crown, Shield, User, Loader2, Droplet, Phone, MapPin, Cake, MessageCircle } from 'lucide-react';
import { format, isToday, isSameDay, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

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

interface TeamMembersCardProps {
  unitId: string | null;
  team: string | null;
  currentAgentId: string;
}

export function TeamMembersCard({ unitId, team, currentAgentId }: TeamMembersCardProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [birthdayAlerts, setBirthdayAlerts] = useState<string[]>([]);

  useEffect(() => {
    if (unitId && team) {
      fetchTeamMembers();
    }
  }, [unitId, team]);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      // Fetch more data for team interaction (excluding CPF)
      const { data, error } = await (supabase as any)
        .from('agents')
        .select('id, name, role, team, blood_type, avatar_url, is_active, phone, address, birth_date, email')
        .eq('unit_id', unitId)
        .eq('team', team)
        .eq('is_active', true)
        .order('role', { ascending: false })
        .order('name');

      if (error) throw error;
      
      const membersList = (data || []) as TeamMember[];
      setMembers(membersList);
      
      // Check for birthdays
      checkBirthdays(membersList);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkBirthdays = (membersList: TeamMember[]) => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const alerts: string[] = [];
    
    membersList.forEach((member) => {
      if (!member.birth_date || member.id === currentAgentId) return;
      
      try {
        const birthDate = parseISO(member.birth_date);
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        
        if (isSameDay(thisYearBirthday, today)) {
          alerts.push(`🎂 Hoje é aniversário de ${member.name}!`);
        } else if (isSameDay(thisYearBirthday, tomorrow)) {
          alerts.push(`🎈 Amanhã é aniversário de ${member.name}!`);
        }
      } catch (e) {
        // Invalid date, skip
      }
    });
    
    setBirthdayAlerts(alerts);
    
    // Show toast notifications for birthdays
    if (alerts.length > 0) {
      setTimeout(() => {
        alerts.forEach((alert, index) => {
          setTimeout(() => {
            toast({
              title: 'Aniversário na Equipe!',
              description: alert,
              duration: 8000,
            });
          }, index * 1500);
        });
      }, 1000);
    }
  };

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case 'team_leader':
        return <Crown className="h-5 w-5 text-amber-500" />;
      case 'support':
        return <Shield className="h-5 w-5 text-blue-500" />;
      default:
        return <User className="h-5 w-5 text-slate-400" />;
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

  const getRoleOrder = (role: string | null): number => {
    switch (role) {
      case 'team_leader': return 0;
      case 'support': return 1;
      default: return 2;
    }
  };

  // Sort members by role hierarchy
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrderDiff = getRoleOrder(a.role) - getRoleOrder(b.role);
    if (roleOrderDiff !== 0) return roleOrderDiff;
    return a.name.localeCompare(b.name);
  });

  const formatPhoneForWhatsApp = (phone: string | null) => {
    if (!phone) return null;
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length < 10) return null;
    return `55${numbers}`;
  };

  const isBirthdayToday = (birthDate: string | null) => {
    if (!birthDate) return false;
    try {
      const date = parseISO(birthDate);
      const today = new Date();
      return date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
    } catch {
      return false;
    }
  };

  if (!team) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Você não está vinculado a nenhuma equipe.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-amber-500" />
          <span>Equipe {team}</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {members.length} {members.length === 1 ? 'membro' : 'membros'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Birthday Alerts */}
        {birthdayAlerts.length > 0 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg border border-pink-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Cake className="h-5 w-5 text-pink-400" />
              <span className="font-semibold text-pink-400">Aniversários</span>
            </div>
            {birthdayAlerts.map((alert, index) => (
              <p key={index} className="text-sm text-pink-300">{alert}</p>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nenhum membro encontrado nesta equipe.</p>
            <p className="text-sm text-slate-500 mt-1">Quando outros agentes se cadastrarem na equipe {team}, eles aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedMembers.map((member) => {
              const isCurrentAgent = member.id === currentAgentId;
              const whatsappLink = formatPhoneForWhatsApp(member.phone);
              const hasBirthday = isBirthdayToday(member.birth_date);
              
              return (
                <div
                  key={member.id}
                  className={`relative rounded-xl border transition-all ${
                    isCurrentAgent
                      ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-700/30 border-slate-600/50 hover:border-slate-500 hover:bg-slate-700/50'
                  } ${hasBirthday ? 'ring-2 ring-pink-500/50' : ''}`}
                >
                  {/* Birthday indicator */}
                  {hasBirthday && (
                    <div className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Cake className="h-3 w-3" />
                      Aniversário!
                    </div>
                  )}
                  
                  <div className="p-4">
                    {/* Header with avatar, name and role */}
                    <div className="flex items-start gap-3">
                      <Avatar className={`h-12 w-12 border-2 ${
                        member.role === 'team_leader' ? 'border-amber-500' :
                        member.role === 'support' ? 'border-blue-500' : 'border-slate-600'
                      }`}>
                        {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.name} />}
                        <AvatarFallback className="bg-slate-700 text-white font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-lg truncate ${
                            isCurrentAgent ? 'text-amber-400' : 'text-white'
                          }`}>
                            {member.name}
                          </span>
                          {isCurrentAgent && (
                            <Badge className="bg-amber-500 text-black text-xs shrink-0">Você</Badge>
                          )}
                        </div>
                        
                        {/* Role badge with icon */}
                        <div className="flex items-center gap-2 mt-1">
                          {getRoleIcon(member.role)}
                          <Badge className={`text-xs font-semibold ${getRoleBadgeClass(member.role)}`}>
                            {getRoleLabel(member.role)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {/* Info section (visible to all team members) */}
                    <div className="mt-3 pt-3 border-t border-slate-600/50 grid grid-cols-2 gap-2 text-sm">
                      {/* Blood type */}
                      {member.blood_type && (
                        <div className="flex items-center gap-2 text-red-400">
                          <Droplet className="h-4 w-4" />
                          <span className="font-medium">{member.blood_type}</span>
                        </div>
                      )}
                      
                      {/* Phone */}
                      {member.phone && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Phone className="h-4 w-4 text-green-500" />
                          <span className="truncate">{member.phone}</span>
                        </div>
                      )}
                      
                      {/* WhatsApp link */}
                      {whatsappLink && (
                        <a
                          href={`https://wa.me/${whatsappLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      
                      {/* Address */}
                      {member.address && (
                        <div className="flex items-start gap-2 text-slate-400 col-span-2">
                          <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                          <span className="text-xs line-clamp-2">{member.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Info about team visibility */}
        <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
          <p className="text-xs text-slate-400 text-center">
            ℹ️ Informações como telefone, endereço e tipo sanguíneo são visíveis apenas para membros da equipe.
            CPF e data de nascimento são privados.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
