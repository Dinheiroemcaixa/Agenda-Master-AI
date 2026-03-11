import { useCallback } from 'react';
import { Task, User, UserRole } from '../types';
import { parseLocalDate } from '../utils/dateUtils';
import { supabase } from '../services/supabaseClient';

/**
 * Funções de formatação de dados do Supabase
 */
export function useFormatters() {
  const formatUser = useCallback((u: any, isOnline: boolean): User => {
    const role: UserRole = u.role || 'OPERATOR';
    const avatarUrl = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`;
    return {
      ...u,
      role,
      isMaster: role === 'DEVELOPER' || role === 'ADMIN',
      is_online: isOnline,
      avatar: avatarUrl,
      last_seen: u.last_seen ? new Date(u.last_seen) : new Date(),
    };
  }, []);

  const formatTask = useCallback((t: any): Task => {
    return {
      ...t,
      completed: !!t.completed,
      isStarred: !!t.isStarred,
      dueDate: t.dueDate ? parseLocalDate(t.dueDate) : undefined,
      completedAt: t.completedAt ? parseLocalDate(t.completedAt) : undefined,
      recurrenceEndDate: t.recurrenceEndDate ? parseLocalDate(t.recurrenceEndDate) : undefined,
      subtasks: typeof t.subtasks === 'string' ? JSON.parse(t.subtasks) : (Array.isArray(t.subtasks) ? t.subtasks : []),
    };
  }, []);

  return { formatUser, formatTask };
}

/**
 * Constantes de labels
 */
export const ROLE_LABELS: Record<string, string> = {
  'DEVELOPER': 'DESENVOLVEDOR',
  'ADMIN': 'GESTORA',
  'OPERATOR': 'OPERADOR',
};
