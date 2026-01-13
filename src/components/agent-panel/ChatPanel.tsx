import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, Users, Building2, Globe, Loader2, Trash2, MoreVertical, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OnlineUser {
  id: string;
  name: string;
  team: string | null;
  online_at: string;
}

interface ChatPanelProps {
  agentId: string;
  unitId: string | null;
  team: string | null;
  agentName: string;
}

interface ChatRoom {
  id: string;
  name: string;
  type: string;
  unit_id: string | null;
  team: string | null;
}

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    name: string;
    team: string | null;
    role: string | null;
  };
}

const getRoleLabel = (role: string | null | undefined) => {
  switch (role) {
    case 'team_leader':
      return 'Chefe de Equipe';
    case 'support':
      return 'Apoio';
    default:
      return 'Agente';
  }
};

export function ChatPanel({ agentId, unitId, team, agentName }: ChatPanelProps) {
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatType, setChatType] = useState<'team' | 'unit' | 'all'>('team');
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    initializeChatRooms();
    fetchDeletedMessages();
  }, [agentId, unitId, team]);

  // Subscribe to presence when activeRoom changes
  useEffect(() => {
    if (activeRoom) {
      fetchMessages();
      subscribeToMessages();
      subscribeToPresence();
    }

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [activeRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const subscribeToPresence = () => {
    if (!activeRoom) return;

    // Remove existing presence channel if any
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }

    const channelName = `presence-${activeRoom.id}`;
    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.id !== agentId) {
              users.push({
                id: presence.id,
                name: presence.name,
                team: presence.team,
                online_at: presence.online_at,
              });
            }
          });
        });
        
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.id !== agentId) {
            toast.info(`${presence.name} entrou no chat`, { duration: 3000 });
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          if (presence.id !== agentId) {
            toast.info(`${presence.name} saiu do chat`, { duration: 3000 });
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: agentId,
            name: agentName,
            team: team,
            online_at: new Date().toISOString(),
          });
        }
      });

    presenceChannelRef.current = channel;
  };

  const fetchDeletedMessages = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('deleted_messages')
        .select('message_id')
        .eq('agent_id', agentId);

      if (error) throw error;
      
      const deletedIds = new Set<string>(data?.map((d: { message_id: string }) => d.message_id) || []);
      setDeletedMessageIds(deletedIds);
    } catch (error) {
      console.error('Error fetching deleted messages:', error);
    }
  };

  const deleteMessageForMe = async (messageId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('deleted_messages')
        .insert({
          message_id: messageId,
          agent_id: agentId
        });

      if (error) throw error;

      setDeletedMessageIds(prev => new Set([...prev, messageId]));
      toast.success('Mensagem removida para você');
    } catch (error) {
      console.error('Error deleting message for me:', error);
      toast.error('Erro ao remover mensagem');
    }
  };

  const deleteMessageForAll = async (messageId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Mensagem apagada para todos');
    } catch (error) {
      console.error('Error deleting message for all:', error);
      toast.error('Erro ao apagar mensagem');
    }
  };

  const initializeChatRooms = async () => {
    try {
      setIsLoading(true);
      
      // Fetch existing rooms or create them - using any to bypass type issues with new tables
      const { data: existingRooms, error } = await (supabase as any)
        .from('chat_rooms')
        .select('*')
        .or(`type.eq.all,and(type.eq.unit,unit_id.eq.${unitId}),and(type.eq.team,unit_id.eq.${unitId},team.eq.${team})`);

      if (error) throw error;

      let allRooms: ChatRoom[] = existingRooms || [];

      // Create team room if doesn't exist and team is assigned
      if (team && unitId) {
        const teamRoom = allRooms.find(r => r.type === 'team' && r.team === team && r.unit_id === unitId);
        if (!teamRoom) {
          const { data: newTeamRoom, error: createError } = await (supabase as any)
            .from('chat_rooms')
            .insert({
              name: `Equipe ${team}`,
              type: 'team',
              unit_id: unitId,
              team: team
            })
            .select()
            .single();

          if (!createError && newTeamRoom) {
            allRooms = [...allRooms, newTeamRoom];
          }
        }
      }

      // Create unit room if doesn't exist
      if (unitId) {
        const unitRoom = allRooms.find(r => r.type === 'unit' && r.unit_id === unitId);
        if (!unitRoom) {
          // Fetch unit name
          const { data: unitData } = await supabase
            .from('units')
            .select('name')
            .eq('id', unitId)
            .single();

          const { data: newUnitRoom, error: createError } = await (supabase as any)
            .from('chat_rooms')
            .insert({
              name: unitData?.name || 'Unidade',
              type: 'unit',
              unit_id: unitId,
              team: null
            })
            .select()
            .single();

          if (!createError && newUnitRoom) {
            allRooms = [...allRooms, newUnitRoom];
          }
        }
      }

      // Create global room if doesn't exist
      const globalRoom = allRooms.find(r => r.type === 'all');
      if (!globalRoom) {
        const { data: newGlobalRoom, error: createError } = await (supabase as any)
          .from('chat_rooms')
          .insert({
            name: 'Todas as Unidades',
            type: 'all',
            unit_id: null,
            team: null
          })
          .select()
          .single();

        if (!createError && newGlobalRoom) {
          allRooms = [...allRooms, newGlobalRoom];
        }
      }

      setRooms(allRooms);

      // Set default active room
      const defaultRoom = allRooms.find(r => r.type === 'team') || allRooms[0];
      if (defaultRoom) {
        setActiveRoom(defaultRoom);
        setChatType(defaultRoom.type as 'team' | 'unit' | 'all');
      }

      // Join the rooms
      for (const room of allRooms) {
        await (supabase as any)
          .from('chat_room_members')
          .upsert({
            room_id: room.id,
            agent_id: agentId
          }, {
            onConflict: 'room_id,agent_id'
          });
      }
    } catch (error) {
      console.error('Error initializing chat rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!activeRoom) return;

    try {
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .select(`
          *,
          sender:agents!sender_id(name, team, role)
        `)
        .eq('room_id', activeRoom.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!activeRoom) return;

    const channel = supabase
      .channel(`room-${activeRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${activeRoom.id}`
        },
        async (payload) => {
          // Fetch the sender info with team and role
          const { data: senderData } = await supabase
            .from('agents')
            .select('name, team, role')
            .eq('id', payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new as ChatMessage,
            sender: senderData
          };

          setMessages(prev => [...prev, newMsg]);

          // Create notification for other users with more details
          if (payload.new.sender_id !== agentId) {
            const roleName = getRoleLabel(senderData?.role);
            const teamInfo = senderData?.team ? ` • Equipe ${senderData.team}` : '';
            toast.info(`Nova mensagem de ${senderData?.name || 'Agente'}`, {
              description: `${roleName}${teamInfo}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeRoom || isSending) return;

    try {
      setIsSending(true);
      
      const { error } = await (supabase as any)
        .from('chat_messages')
        .insert({
          room_id: activeRoom.id,
          sender_id: agentId,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const switchRoom = (type: 'team' | 'unit' | 'all') => {
    setChatType(type);
    const room = rooms.find(r => r.type === type);
    if (room) {
      setActiveRoom(room);
    }
  };

  const getRoomIcon = (type: string) => {
    switch (type) {
      case 'team':
        return <Users className="h-4 w-4" />;
      case 'unit':
        return <Building2 className="h-4 w-4" />;
      case 'all':
        return <Globe className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700 h-[600px] flex flex-col">
      <CardHeader className="pb-2 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5 text-amber-500" />
            <span>Chat</span>
          </CardTitle>
          
          {/* Online Users Indicator */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-full cursor-default">
                  <Circle className="h-2 w-2 fill-green-500 text-green-500 animate-pulse" />
                  <span className="text-xs text-slate-300">
                    {onlineUsers.length + 1} online
                  </span>
                  {onlineUsers.length > 0 && (
                    <div className="flex -space-x-2">
                      {onlineUsers.slice(0, 3).map((user) => (
                        <Avatar key={user.id} className="h-5 w-5 border border-slate-600">
                          <AvatarFallback className="text-[8px] bg-slate-600">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {onlineUsers.length > 3 && (
                        <div className="h-5 w-5 rounded-full bg-slate-600 flex items-center justify-center text-[8px] text-slate-300 border border-slate-500">
                          +{onlineUsers.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-800 border-slate-700">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-amber-400">Usuários online:</p>
                  <p className="text-xs text-green-400">• Você ({agentName})</p>
                  {onlineUsers.map((user) => (
                    <p key={user.id} className="text-xs text-slate-300">
                      • {user.name} {user.team && `(${user.team})`}
                    </p>
                  ))}
                  {onlineUsers.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Nenhum outro usuário online</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Room Tabs */}
        <Tabs value={chatType} onValueChange={(v) => switchRoom(v as 'team' | 'unit' | 'all')} className="mt-2">
          <TabsList className="bg-slate-700/50 h-9">
            {team && (
              <TabsTrigger 
                value="team" 
                className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black"
              >
                <Users className="h-3 w-3 mr-1" />
                Equipe
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="unit"
              className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black"
            >
              <Building2 className="h-3 w-3 mr-1" />
              Unidade
            </TabsTrigger>
            <TabsTrigger 
              value="all"
              className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black"
            >
              <Globe className="h-3 w-3 mr-1" />
              Geral
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma mensagem ainda.</p>
                <p className="text-sm">Seja o primeiro a enviar uma mensagem!</p>
              </div>
            ) : (
              messages
                .filter(msg => !deletedMessageIds.has(msg.id))
                .map((msg) => {
                const isOwn = msg.sender_id === agentId;
                const roleLabel = getRoleLabel(msg.sender?.role);
                const teamLabel = msg.sender?.team ? `Equipe ${msg.sender.team}` : null;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={`text-xs ${isOwn ? 'bg-amber-500 text-black' : 'bg-slate-600'}`}>
                        {(msg.sender?.name || 'A').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!isOwn && (
                        <div className="mb-1 px-1">
                          <p className="text-xs font-medium text-slate-300">
                            {msg.sender?.name || 'Agente'}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {roleLabel}
                            {teamLabel && ` • ${teamLabel}`}
                          </p>
                        </div>
                      )}
                      <div className="flex items-start gap-1">
                        <div
                          className={`px-3 py-2 rounded-xl ${
                            isOwn
                              ? 'bg-amber-500 text-black rounded-br-sm'
                              : 'bg-slate-700 text-white rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                        
                        {/* Delete menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="bg-slate-800 border-slate-700">
                            <DropdownMenuItem 
                              onClick={() => deleteMessageForMe(msg.id)}
                              className="text-slate-200 hover:bg-slate-700 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Apagar para mim
                            </DropdownMenuItem>
                            {isOwn && (
                              <>
                                <DropdownMenuSeparator className="bg-slate-700" />
                                <DropdownMenuItem 
                                  onClick={() => deleteMessageForAll(msg.id)}
                                  className="text-red-400 hover:bg-slate-700 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Apagar para todos
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className={`text-xs text-slate-500 mt-1 px-1 ${isOwn ? 'text-right' : ''}`}>
                        {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-3 border-t border-slate-700 bg-slate-800/50">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-slate-700 border-slate-600 focus:border-amber-500"
              disabled={isSending}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
