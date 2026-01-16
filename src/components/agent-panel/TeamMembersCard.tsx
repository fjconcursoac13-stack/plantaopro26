import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Crown, Shield, User, Loader2, Droplet, Phone, Cake, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { isSameDay, addDays, parseISO } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { TeamMemberDialog } from './TeamMemberDialog';
import { TeamUnlinkDialog } from '@/components/agents/TeamUnlinkDialog';
import { TransferRequestDialog } from '@/components/agents/TransferRequestDialog';

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

interface Agent {
  id: string;
  name: string;
  unit_id: string | null;
  team: string | null;
  unit: { id: string; name: string; municipality: string } | null;
}

interface TeamMembersCardProps {
  unitId: string | null;
  team: string | null;
  currentAgentId: string;
  currentAgentName?: string;
  unitName?: string;
}

export function TeamMembersCard({ unitId, team, currentAgentId, currentAgentName, unitName }: TeamMembersCardProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [birthdayAlerts, setBirthdayAlerts] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);

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
          alerts.push(`🎂 ${member.name.split(' ')[0]} faz aniversário hoje!`);
        } else if (isSameDay(thisYearBirthday, tomorrow)) {
          alerts.push(`🎈 ${member.name.split(' ')[0]} faz aniversário amanhã!`);
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
        return <Crown className="h-3 w-3 text-amber-500" />;
      case 'support':
        return <Shield className="h-3 w-3 text-blue-500" />;
      default:
        return <User className="h-3 w-3 text-slate-400" />;
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

  const currentAgent: Agent = {
    id: currentAgentId,
    name: currentAgentName || '',
    unit_id: unitId,
    team: team,
    unit: unitId ? { id: unitId, name: unitName || '', municipality: '' } : null
  };

  if (!team) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sem equipe vinculada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="card-night-amber bg-gradient-to-br from-[hsl(222,60%,3%)] via-[hsl(222,55%,5%)] to-[hsl(38,40%,8%)] border-2 border-amber-500/40 overflow-hidden transition-all duration-300 hover:border-amber-400/60 group relative">
        {/* Subtle Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/3 via-transparent to-amber-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader className="pb-2 pt-3 px-3 relative">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-left group/btn flex-1 min-w-0">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/25 to-orange-500/15 border border-amber-500/30 shrink-0">
                    <Users className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-bold text-base bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent truncate">
                      Equipe {team}
                    </span>
                    <Badge className="text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/30 px-1.5 py-0 shrink-0">
                      {members.length}
                    </Badge>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-800/60 border border-amber-500/20 group-hover/btn:bg-amber-500/15 transition-all duration-200 shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>
              
              {/* Team Management Button */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTeamManagement(true)}
                      className="ml-2 h-7 w-7 p-0 text-slate-400 hover:text-amber-400 hover:bg-amber-500/15 shrink-0"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 border-slate-600 text-white text-xs">
                    Gerenciar vinculação à equipe
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-1 px-3 pb-3">
              {/* Birthday Alerts - Compact */}
              {birthdayAlerts.length > 0 && (
                <div className="mb-2 p-2 bg-gradient-to-r from-pink-500/15 to-purple-500/15 rounded-lg border border-pink-500/25">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Cake className="h-3 w-3 text-pink-400 shrink-0" />
                    {birthdayAlerts.map((alert, index) => (
                      <span key={index} className="text-[10px] text-pink-300">{alert}</span>
                    ))}
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-4">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Nenhum membro encontrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5">
                  {sortedMembers.map((member) => {
                    const isCurrentAgent = member.id === currentAgentId;
                    const hasBirthday = isBirthdayToday(member.birth_date);
                    
                    return (
                      <button
                        key={member.id}
                        onClick={() => handleMemberClick(member)}
                        className={`relative w-full text-left rounded-lg border p-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                          isCurrentAgent
                            ? 'bg-gradient-to-r from-amber-500/15 to-transparent border-amber-500/40'
                            : 'bg-slate-800/40 border-slate-600/40 hover:border-amber-400/40 hover:bg-slate-700/40'
                        } ${hasBirthday ? 'ring-1 ring-pink-500/40' : ''}`}
                      >
                        {/* Birthday indicator */}
                        {hasBirthday && (
                          <div className="absolute -top-1 -right-1 bg-pink-500 text-white text-[8px] px-1 py-0.5 rounded-full">
                            <Cake className="h-2 w-2" />
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {/* Compact Avatar */}
                          <Avatar className={`h-8 w-8 border shrink-0 ${
                            member.role === 'team_leader' ? 'border-amber-500' :
                            member.role === 'support' ? 'border-blue-500' : 'border-slate-600'
                          }`}>
                            {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.name} />}
                            <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                              {member.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className={`font-medium text-sm truncate ${
                                isCurrentAgent ? 'text-amber-300' : 'text-slate-200'
                              }`}>
                                {member.name.split(' ').slice(0, 2).join(' ')}
                              </span>
                              {isCurrentAgent && (
                                <Badge className="bg-amber-500/20 text-amber-300 border-0 text-[8px] px-1 py-0">Você</Badge>
                              )}
                            </div>
                            
                            {/* Compact info row */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {getRoleIcon(member.role)}
                              <span className="text-[9px] text-slate-400">{getRoleLabel(member.role)}</span>
                              {member.blood_type && (
                                <span className="flex items-center gap-0.5 text-[9px] text-red-400">
                                  <Droplet className="h-2 w-2" />
                                  {member.blood_type}
                                </span>
                              )}
                              {member.phone && (
                                <Phone className="h-2 w-2 text-green-500" />
                              )}
                            </div>
                          </div>
                          
                          <ChevronDown className="h-3 w-3 text-slate-500 rotate-[-90deg] shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Compact info footer */}
              <p className="mt-2 text-[9px] text-slate-500 text-center">
                Toque para ver detalhes do colega
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

      {/* Team Management Dialog */}
      <TeamUnlinkDialog
        open={showTeamManagement}
        onOpenChange={setShowTeamManagement}
        agentId={currentAgentId}
        agentName={currentAgentName || ''}
        currentTeam={team}
        currentUnitName={unitName || null}
        onSuccess={() => {}}
        onRequestTransfer={() => {
          setShowTeamManagement(false);
          setShowTransferDialog(true);
        }}
      />

      {/* Transfer Request Dialog */}
      <TransferRequestDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        agent={currentAgent}
        onSuccess={() => {
          setShowTransferDialog(false);
        }}
      />
    </>
  );
}
