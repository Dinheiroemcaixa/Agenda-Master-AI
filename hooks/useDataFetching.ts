import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, User, Message } from '../types';
import { supabase } from '../services/supabaseClient';
import { useFormatters } from './useFormatters';
import { parseLocalDate, toDateString } from '../utils/dateUtils';

interface UseDataFetchingParams {
  currentUser: User | null;
  isAuthenticated: boolean;
  dataRange: { start: string; end: string };
  setCurrentUser: (user: User | null) => void;
  setIsAuthenticated: (val: boolean) => void;
}

/**
 * Hook para busca de dados do Supabase (users, tasks, messages)
 */
export function useDataFetching({
  currentUser,
  isAuthenticated,
  dataRange,
  setCurrentUser,
  setIsAuthenticated,
}: UseDataFetchingParams) {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAppLoading, setIsAppLoading] = useState(true);

  const { formatUser, formatTask } = useFormatters();

  const fetchMessages = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data: mData } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: true })
        .limit(500);

      const fMessages = (mData || []).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
        type: m.type || (m.attachment ? 'file' : 'text'),
        attachment: typeof m.attachment === 'string' ? JSON.parse(m.attachment) : m.attachment,
        read: !!m.read,
      }));
      setMessages(fMessages);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }, [currentUser]);

  const fetchData = useCallback(async (isSilent = false, customRange?: { start: string; end: string }, fetchAll = false) => {
    try {
      let userIdForQuery = currentUser?.id;
      if (!userIdForQuery) {
        const savedId = sessionStorage.getItem('agenda_session_user_id');
        if (savedId) userIdForQuery = savedId;
      }

      const range = customRange || dataRange;
      const tasksQuery = supabase.from('tasks').select('*');

      const [{ data: uData }, { data: tData }] = await Promise.all([
        supabase.from('users').select('*'),
        tasksQuery.order('order', { ascending: true }).order('dueDate', { ascending: true }),
      ]);

      console.log(`[FetchData] Brutos: ${tData?.length || 0} tarefas.`);
      const allTasks = (tData || []).map(formatTask);

      let fTasks = allTasks;
      if (!fetchAll) {
        fTasks = allTasks.filter((t: Task) =>
          !t.completed ||
          (t.dueDate && t.dueDate >= parseLocalDate(range.start) && t.dueDate <= parseLocalDate(range.end)) ||
          (t.completedAt && t.completedAt >= parseLocalDate(range.start))
        );
      }
      
      console.log(`[FetchData] Após filtro: ${fTasks.length} tarefas. Concluídas: ${fTasks.filter(t => t.completed).length}`);
      if (fTasks.some(t => t.completed)) {
          console.table(fTasks.filter(t => t.completed).map(t => ({ id: t.id, title: t.title, status: t.status, date: t.dueDate })));
      }

      setTasks(prev => {
        const tempTasks = prev.filter(t => t.id.startsWith('temp_'));
        return [...fTasks, ...tempTasks];
      });
      setUsers((uData || []).map((u: any) => formatUser(u, false)));

      if (!isSilent && !currentUser) {
        const savedId = sessionStorage.getItem('agenda_session_user_id');
        if (savedId) {
          const found = (uData || []).find((u: any) => u.id === savedId);
          if (found) {
            setCurrentUser(formatUser(found, true));
            setIsAuthenticated(true);
          }
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsAppLoading(false);
    }
  }, [currentUser, dataRange, formatUser, formatTask, setCurrentUser, setIsAuthenticated]);

  // Fetch when dataRange or auth changes
  useEffect(() => {
    if (isAuthenticated) fetchData(true);
  }, [dataRange, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    users,
    setUsers,
    tasks,
    setTasks,
    messages,
    setMessages,
    isAppLoading,
    fetchData,
    fetchMessages,
    formatUser,
    formatTask,
  };
}
