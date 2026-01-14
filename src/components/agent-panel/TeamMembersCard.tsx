import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, Crown, Shield, User, Loader2, Droplet, Phone, Cake, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isToday, isSameDay, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { TeamMemberDialog } from './TeamMemberDialog';

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
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showMemberDialog, setShowMemberDialog] = useState(false);

  useEffect(() => {
    if (unitId && team) {
      fetchTeamMembers();
    }
  }, [unitId, team]);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
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
        // Invalid date
      }
    });
    
    setBirthdayAlerts(alerts);
    
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
        return <Crown className="h-4 w-4 text-amber-500" />;
      case 'support':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'team_leader':
        return 'Chefe';
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
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getRoleOrder = (role: string | null): number => {
    switch (role) {
      case 'team_leader': return 0;
      case 'support': return 1;
      default: return 2;
    }
  };

  const sortedMembers = [...members].sort((a, b) => {
    const roleOrderDiff = getRoleOrder(a.role) - getRoleOrder(b.role);
    if (roleOrderDiff !== 0) return roleOrderDiff;
    return a.name.localeCompare(b.name);
  });

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

  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
    setShowMemberDialog(true);
  };

  if (!team) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Você não está vinculado a nenhuma equipe.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left group">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Equipe {team}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {members.length}
                  </Badge>
                </CardTitle>
                <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-muted transition-colors">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-2">
              {/* Birthday Alerts */}
              {birthdayAlerts.length > 0 && (
                <div className="mb-3 p-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg border border-pink-500/30">
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-pink-400" />
                    {birthdayAlerts.map((alert, index) => (
                      <span key={index} className="text-xs text-pink-300">{alert}</span>
                    ))}
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum membro encontrado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedMembers.map((member) => {
                    const isCurrentAgent = member.id === currentAgentId;
                    const hasBirthday = isBirthdayToday(member.birth_date);
                    
                    return (
                      <button
                        key={member.id}
                        onClick={() => handleMemberClick(member)}
                        className={`relative w-full text-left rounded-lg border p-2.5 transition-all hover:scale-[1.01] active:scale-[0.99] ${
                          isCurrentAgent
                            ? 'bg-gradient-to-r from-primary/20 to-primary/5 border-primary/50 shadow-sm shadow-primary/10'
                            : 'bg-muted/30 border-border hover:border-muted-foreground hover:bg-muted/50'
                        } ${hasBirthday ? 'ring-2 ring-pink-500/50' : ''}`}
                      >
                        {/* Birthday indicator */}
                        {hasBirthday && (
                          <div className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Cake className="h-2.5 w-2.5" />
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2.5">
                          {/* Compact Avatar */}
                          <Avatar className={`h-10 w-10 border-2 shrink-0 ${
                            member.role === 'team_leader' ? 'border-amber-500' :
                            member.role === 'support' ? 'border-blue-500' : 'border-border'
                          }`}>
                            {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.name} />}
                            <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                              {member.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-semibold text-sm truncate ${
                                isCurrentAgent ? 'text-primary' : 'text-foreground'
                              }`}>
                                {member.name.split(' ').slice(0, 2).join(' ')}
                              </span>
                              {isCurrentAgent && (
                                <Badge className="bg-primary text-primary-foreground text-[9px] px-1 py-0">Você</Badge>
                              )}
                            </div>
                            
                            {/* Compact info row */}
                            <div className="flex items-center gap-2 mt-0.5">
                              {getRoleIcon(member.role)}
                              <span className="text-[10px] text-muted-foreground">{getRoleLabel(member.role)}</span>
                              {member.blood_type && (
                                <span className="flex items-center gap-0.5 text-[10px] text-red-400">
                                  <Droplet className="h-2.5 w-2.5" />
                                  {member.blood_type}
                                </span>
                              )}
                              {member.phone && (
                                <Phone className="h-2.5 w-2.5 text-green-500" />
                              )}
                            </div>
                          </div>
                          
                          <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Compact info footer */}
              <p className="mt-3 text-[10px] text-muted-foreground text-center">
                Toque em um membro para ver detalhes
              </p>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Member Detail Dialog */}
      <TeamMemberDialog
        member={selectedMember}
        open={showMemberDialog}
        onOpenChange={setShowMemberDialog}
        isCurrentUser={selectedMember?.id === currentAgentId}
      />
    </>
  );
}
