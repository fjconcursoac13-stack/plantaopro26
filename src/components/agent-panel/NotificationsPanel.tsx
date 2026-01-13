import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, MessageCircle, Calendar, ArrowRightLeft, Clock, AlertCircle, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationsPanelProps {
  agentId: string;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationsPanel({ agentId }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    const cleanup = subscribeToNotifications();
    return cleanup;
  }, [agentId]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const items = (data || []) as NotificationItem[];
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel(`notifications-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          const newNotification = payload.new as NotificationItem;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('agent_id', agentId)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="h-4 w-4 text-blue-400" />;
      case 'shift':
        return <Calendar className="h-4 w-4 text-green-400" />;
      case 'swap':
        return <ArrowRightLeft className="h-4 w-4 text-purple-400" />;
      case 'bh':
        return <Clock className="h-4 w-4 text-amber-400" />;
      case 'alert':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative text-slate-400 hover:text-white">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 bg-slate-800 border-slate-700" 
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-3 border-b border-slate-700">
          <h4 className="font-semibold text-white">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  className={`p-3 hover:bg-slate-700/50 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-slate-700/30' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${
                          notification.is_read ? 'text-slate-300' : 'text-white'
                        }`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      {notification.content && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                          {notification.content}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(notification.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
