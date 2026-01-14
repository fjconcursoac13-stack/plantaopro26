import { useEffect, useState } from 'react';
import { useBirthdayNotifications } from '@/hooks/useBirthdayNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Cake, Gift, PartyPopper, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO, differenceInDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
interface TeamMember {
  id: string;
  name: string;
  birth_date: string | null;
  team: string | null;
  avatar_url: string | null;
  daysUntil?: number;
}

interface BirthdayCardProps {
  agentId: string;
  team: string | null;
  unitId: string | null;
}

export function BirthdayCard({ agentId, team, unitId }: BirthdayCardProps) {
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  const { getUpcomingBirthdays, checkBirthdays } = useBirthdayNotifications({
    agentId,
    team,
    unitId,
    enabled: true,
  });

  useEffect(() => {
    loadBirthdays();
    checkBirthdays();
  }, [team, unitId]);

  const loadBirthdays = async () => {
    setIsLoading(true);
    const birthdays = await getUpcomingBirthdays();
    setUpcomingBirthdays(birthdays);
    setIsLoading(false);
  };

  const getBirthdayThisYear = (birthDate: string): Date => {
    const date = parseISO(birthDate);
    const today = new Date();
    return new Date(today.getFullYear(), date.getMonth(), date.getDate());
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (upcomingBirthdays.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cake className="h-5 w-5 text-pink-500" />
            <span>Aniversários</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum aniversário nos próximos 30 dias</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const todayBirthdays = upcomingBirthdays.filter(m => m.daysUntil === 0);
  const upcomingList = upcomingBirthdays.filter(m => (m.daysUntil ?? 0) > 0);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="bg-gradient-to-br from-slate-800 via-slate-800/95 to-pink-900/20 border-pink-500/30">
        <CardHeader className="pb-2">
          <CollapsibleTrigger className="w-full">
            <CardTitle className="flex items-center justify-between text-lg cursor-pointer hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-pink-500" />
                <span>Aniversários da Equipe</span>
                {todayBirthdays.length > 0 && (
                  <Badge className="bg-pink-500/20 text-pink-400 animate-pulse">
                    <PartyPopper className="h-3 w-3 mr-1" />
                    Hoje!
                  </Badge>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {/* Today's Birthdays */}
            {todayBirthdays.length > 0 && (
              <div className="space-y-2">
                {todayBirthdays.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-500/20 to-purple-500/10 rounded-xl border border-pink-500/30 animate-pulse"
                  >
                    <Avatar className="h-12 w-12 border-2 border-pink-500/50">
                      {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                      <AvatarFallback className="bg-pink-500/30 text-pink-400 font-bold">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{member.name}</span>
                        <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
                      </div>
                      <p className="text-sm text-pink-400 font-medium">
                        🎂 Fazendo aniversário hoje!
                      </p>
                    </div>
                    <div className="text-3xl">🎉</div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming Birthdays */}
            {upcomingList.length > 0 && (
              <div className="space-y-2">
                {todayBirthdays.length > 0 && (
                  <p className="text-xs text-muted-foreground uppercase tracking-wider pt-2">
                    Próximos
                  </p>
                )}
                {upcomingList.slice(0, 4).map((member) => {
                  const birthday = member.birth_date ? getBirthdayThisYear(member.birth_date) : null;
                  const daysUntil = member.daysUntil ?? 0;
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2.5 bg-slate-700/30 rounded-lg border border-slate-600/30"
                    >
                      <Avatar className="h-10 w-10 border border-slate-600">
                        {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                        <AvatarFallback className="bg-slate-700 text-sm">
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground text-sm truncate block">
                          {member.name}
                        </span>
                        {birthday && (
                          <p className="text-xs text-muted-foreground">
                            {format(birthday, "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          daysUntil === 1 
                            ? 'border-amber-500/50 text-amber-400' 
                            : 'border-slate-600 text-muted-foreground'
                        }`}
                      >
                        {daysUntil === 1 ? 'Amanhã' : `${daysUntil} dias`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
