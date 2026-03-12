import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Message, Task } from '../types';
import { supabase } from '../services/supabaseClient';

interface UseRealtimeParams {
  isAuthenticated: boolean;
  currentUser: User | null;
  formatTask: (t: any) => Task;
  fetchData: (isSilent?: boolean) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  activeChatUserIdRef: React.MutableRefObject<string | null>;
  activePageRef: React.MutableRefObject<string>;
  markMessagesAsRead: (contactId: string) => Promise<void>;
  setChatNotification: (msg: Message | null) => void;
}

/**
 * Hook para gerenciar conexão Supabase Realtime (presence + postgres_changes)
 */
export function useRealtime({
  isAuthenticated,
  currentUser,
  formatTask,
  fetchData,
  setMessages,
  setTasks,
  activeChatUserIdRef,
  activePageRef,
  markMessagesAsRead,
  setChatNotification,
}: UseRealtimeParams) {
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [visualConnectionStatus, setVisualConnectionStatus] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [retryTrigger, setRetryTrigger] = useState(0);
  const retryCountRef = useRef(0);
  const channelRef = useRef<any>(null);

  // Refs estáveis para callbacks no Realtime
  const fetchDataRef = useRef(fetchData);
  const markMessagesAsReadRef = useRef(markMessagesAsRead);
  const formatTaskRef = useRef(formatTask);

  useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);
  useEffect(() => { markMessagesAsReadRef.current = markMessagesAsRead; }, [markMessagesAsRead]);
  useEffect(() => { formatTaskRef.current = formatTask; }, [formatTask]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    
    const channel = supabase.channel('presence-sync', { 
      config: { presence: { key: currentUser.id } } 
    });
    
    channelRef.current = channel;
    const syncOnlineState = () => { 
      const state = channel.presenceState(); 
      setOnlineUsers(new Set(Object.keys(state))); 
    };

    channel.on('presence', { event: 'sync' }, syncOnlineState)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const rawAttachment = payload.new.attachment;
        const newMsg: Message = { 
          ...payload.new, 
          timestamp: new Date(payload.new.timestamp), 
          type: payload.new.type || (payload.new.attachment ? 'file' : 'text'), 
          attachment: typeof rawAttachment === 'string' ? JSON.parse(rawAttachment) : rawAttachment, 
          read: !!payload.new.read 
        } as Message;
        
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          
          if (newMsg.toUserId === currentUser.id && (activePageRef.current !== 'chat' || activeChatUserIdRef.current !== newMsg.fromUserId)) {
            setChatNotification(newMsg);
            setTimeout(() => setChatNotification(null), 6000);
          }
          
          if (activePageRef.current === 'chat' && activeChatUserIdRef.current === newMsg.fromUserId && newMsg.toUserId === currentUser.id) {
            markMessagesAsReadRef.current(newMsg.fromUserId);
          }
          
          return [...prev, newMsg];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const rawAttachment = payload.new.attachment;
        const updatedMsg = { 
          ...payload.new, 
          timestamp: new Date(payload.new.timestamp), 
          type: payload.new.type || (payload.new.attachment ? 'file' : 'text'), 
          attachment: typeof rawAttachment === 'string' ? JSON.parse(rawAttachment) : rawAttachment, 
          read: !!payload.new.read 
        };
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...updatedMsg } : m));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
        const nt = formatTaskRef.current(payload.new);
        setTasks(prev => {
          if (prev.some(t => t.id === nt.id)) return prev;
          return [...prev, nt];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
        const ut = formatTaskRef.current(payload.new);
        setTasks(prev => prev.map(t => t.id === ut.id ? ut : t));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
        setTasks(prev => prev.filter(t => t.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchDataRef.current(true))
      .subscribe(async (status) => { 
        setIsRealtimeConnected(status === 'SUBSCRIBED'); 
        
        if (status === 'SUBSCRIBED') { 
          retryCountRef.current = 0;
          await channel.track({ online_at: new Date().toISOString() }); 
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (!navigator.onLine) {
            const handleOnline = () => {
              setRetryTrigger(prev => prev + 1);
              window.removeEventListener('online', handleOnline);
            };
            window.addEventListener('online', handleOnline);
            return;
          }
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          setTimeout(() => {
            retryCountRef.current += 1;
            setRetryTrigger(prev => prev + 1);
          }, delay);
        }
      });

    return () => { 
      channel.unsubscribe(); 
      supabase.removeChannel(channel); 
    };
  }, [isAuthenticated, currentUser?.id, retryTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Visual status com debounce de 30s
  useEffect(() => {
    let timer: any;
    if (isRealtimeConnected) {
      setVisualConnectionStatus(true);
    } else if (isAuthenticated) {
      timer = setTimeout(() => setVisualConnectionStatus(false), 30000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [isRealtimeConnected, isAuthenticated]);

  return {
    isRealtimeConnected,
    visualConnectionStatus,
    setVisualConnectionStatus,
    onlineUsers,
    retryTrigger,
    setRetryTrigger,
  };
}
