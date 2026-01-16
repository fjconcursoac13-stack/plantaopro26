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
      <Card className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-pink-900/30 border-3 border-pink-500/40 shadow-2xl shadow-pink-900/20 overflow-hidden transition-all duration-300 hover:shadow-pink-500/20 hover:border-pink-400/50 hover:scale-[1.01] group">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="pb-3 relative">
          <CollapsibleTrigger className="w-full">
            <CardTitle className="flex items-center justify-between text-xl md:text-2xl cursor-pointer hover:opacity-90 transition-all duration-200 group/title">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500/30 to-rose-500/20 border border-pink-500/40 group-hover/title:scale-110 transition-transform duration-200">
                  <Cake className="h-6 w-6 md:h-7 md:w-7 text-pink-400" />
                </div>
                <span className="font-bold bg-gradient-to-r from-pink-200 to-rose-300 bg-clip-text text-transparent">
                  Aniversários da Equipe
                </span>
                {todayBirthdays.length > 0 && (
                  <Badge className="bg-gradient-to-r from-pink-500/30 to-rose-500/30 text-pink-300 animate-pulse border border-pink-500/40 px-3 py-1">
                    <PartyPopper className="h-3.5 w-3.5 mr-1.5" />
                    Hoje!
                  </Badge>
                )}
              </div>
              <div className="p-2 rounded-xl bg-slate-800/80 border border-pink-500/30 group-hover:bg-pink-500/20 group-hover:border-pink-400/50 transition-all duration-200">
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-pink-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-pink-400" />
                )}
              </div>
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
                      className="flex items-center gap-3.5 p-3.5 bg-slate-800/60 rounded-xl border-2 border-slate-600/50 hover:border-pink-500/40 hover:bg-slate-700/60 hover:shadow-lg hover:shadow-pink-500/10 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                    >
                      <Avatar className="h-12 w-12 border-2 border-pink-500/30 shadow-md">
                        {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                        <AvatarFallback className="bg-gradient-to-br from-pink-500/20 to-rose-500/10 text-pink-300 font-bold">
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-foreground text-base truncate block">
                          {member.name}
                        </span>
                        {birthday && (
                          <p className="text-sm text-pink-300/70">
                            {format(birthday, "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <Badge 
                        className={`text-sm px-3 py-1 font-semibold ${
                          daysUntil === 1 
                            ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border-amber-500/50' 
                            : 'bg-slate-700/80 text-slate-300 border-slate-500/50'
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
