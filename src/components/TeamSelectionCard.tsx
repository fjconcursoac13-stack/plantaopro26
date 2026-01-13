import { Card, CardContent } from '@/components/ui/card';
import { Shield, Swords, Target, Users } from 'lucide-react';

interface TeamSelectionCardProps {
  team: string;
  selected: boolean;
  onClick: () => void;
}

const teamConfig: Record<string, { icon: any; color: string; bgColor: string; borderColor: string; description: string }> = {
  ALFA: {
    icon: Shield,
    color: 'text-blue-400',
    bgColor: 'from-blue-600/20 to-blue-700/10',
    borderColor: 'border-blue-500/50 hover:border-blue-400',
    description: 'Primeira linha de defesa',
  },
  BRAVO: {
    icon: Swords,
    color: 'text-red-400',
    bgColor: 'from-red-600/20 to-red-700/10',
    borderColor: 'border-red-500/50 hover:border-red-400',
    description: 'Força de resposta tática',
  },
  CHARLIE: {
    icon: Target,
    color: 'text-green-400',
    bgColor: 'from-green-600/20 to-green-700/10',
    borderColor: 'border-green-500/50 hover:border-green-400',
    description: 'Operações especializadas',
  },
  DELTA: {
    icon: Users,
    color: 'text-purple-400',
    bgColor: 'from-purple-600/20 to-purple-700/10',
    borderColor: 'border-purple-500/50 hover:border-purple-400',
    description: 'Suporte e coordenação',
  },
};

export function TeamSelectionCard({ team, selected, onClick }: TeamSelectionCardProps) {
  const config = teamConfig[team] || teamConfig.ALFA;
  const Icon = config.icon;

  return (
    <Card
      className={`
        cursor-pointer transition-all duration-300 transform hover:scale-105 
        bg-slate-800/50 backdrop-blur-sm
        ${selected 
          ? 'ring-2 ring-amber-500 shadow-lg shadow-amber-500/20 bg-gradient-to-br ' + config.bgColor
          : config.borderColor + ' border'
        }
      `}
      onClick={onClick}
    >
      <CardContent className="p-6 text-center">
        <div className={`
          w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center
          bg-gradient-to-br ${config.bgColor} border ${config.borderColor}
        `}>
          <Icon className={`h-8 w-8 ${config.color}`} />
        </div>
        <h3 className={`text-xl font-bold ${selected ? 'text-amber-400' : 'text-white'}`}>
          {team}
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          {config.description}
        </p>
        {selected && (
          <div className="mt-3 px-3 py-1 bg-amber-500/20 rounded-full text-xs text-amber-400 font-medium">
            Selecionado
          </div>
        )}
      </CardContent>
    </Card>
  );
}
