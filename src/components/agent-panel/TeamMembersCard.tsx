import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Crown, Shield, User, Loader2, Droplet } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  team: string | null;
  blood_type: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

interface TeamMembersCardProps {
  unitId: string | null;
  team: string | null;
  currentAgentId: string;
}

export function TeamMembersCard({ unitId, team, currentAgentId }: TeamMembersCardProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (unitId && team) {
      fetchTeamMembers();
    }
  }, [unitId, team]);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      // Only fetch limited data: name, role, team, blood_type, avatar_url
      const { data, error } = await (supabase as any)
        .from('agents')
        .select('id, name, role, team, blood_type, avatar_url, is_active')
        .eq('unit_id', unitId)
        .eq('team', team)
        .eq('is_active', true)
        .order('role', { ascending: false })
        .order('name');

      if (error) throw error;
      setMembers((data || []) as TeamMember[]);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case 'team_leader':
        return <Crown className="h-4 w-4 text-amber-500" />;
      case 'support':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-slate-400" />;
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
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'support':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-700/50 text-slate-400 border-slate-600';
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
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-slate-400 text-center py-4">
            Nenhum membro encontrado nesta equipe.
          </p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  member.id === currentAgentId
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-700/30 border-slate-600/50 hover:border-slate-500'
                }`}
              >
                <Avatar className="h-10 w-10 border-2 border-slate-600">
                  {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.name} />}
                  <AvatarFallback className="bg-slate-700 text-white font-semibold">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium truncate ${
                      member.id === currentAgentId ? 'text-amber-400' : 'text-white'
                    }`}>
                      {member.name}
                    </span>
                    {member.id === currentAgentId && (
                      <Badge className="bg-amber-500 text-black text-xs">Você</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {member.blood_type && (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <Droplet className="h-3 w-3" />
                        {member.blood_type}
                      </span>
                    )}
                    {member.team && (
                      <span className="text-xs text-slate-400">
                        Equipe {member.team}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getRoleIcon(member.role)}
                  <Badge variant="outline" className={`text-xs ${getRoleBadgeClass(member.role)}`}>
                    {getRoleLabel(member.role)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
