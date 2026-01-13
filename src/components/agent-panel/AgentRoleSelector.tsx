import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { User, Crown, Shield, ChevronDown, Loader2 } from 'lucide-react';

interface AgentRoleSelectorProps {
  agentId: string;
  currentRole: string;
}

const roles = [
  { value: 'agent', label: 'Agente', icon: User },
  { value: 'support', label: 'Apoio', icon: Shield },
  { value: 'team_leader', label: 'Chefe de Equipe', icon: Crown },
];

export function AgentRoleSelector({ agentId, currentRole }: AgentRoleSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [role, setRole] = useState(currentRole);

  const updateRole = async (newRole: string) => {
    if (newRole === role) return;

    try {
      setIsUpdating(true);
      
      const { error } = await (supabase as any)
        .from('agents')
        .update({ role: newRole })
        .eq('id', agentId);

      if (error) throw error;

      setRole(newRole);
      toast.success('Função atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar função');
    } finally {
      setIsUpdating(false);
    }
  };

  const currentRoleData = roles.find(r => r.value === role) || roles[0];
  const CurrentIcon = currentRoleData.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-slate-600 bg-slate-700/50 hover:bg-slate-700"
          disabled={isUpdating}
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CurrentIcon className="h-4 w-4 mr-2" />
          )}
          {currentRoleData.label}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-slate-800 border-slate-700" align="end">
        {roles.map((r) => {
          const Icon = r.icon;
          return (
            <DropdownMenuItem
              key={r.value}
              onClick={() => updateRole(r.value)}
              className={`flex items-center gap-2 cursor-pointer ${
                r.value === role ? 'bg-amber-500/20 text-amber-400' : ''
              }`}
            >
              <Icon className="h-4 w-4" />
              {r.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
