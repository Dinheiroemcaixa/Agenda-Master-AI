import { useCallback, useMemo } from 'react';
import { Task, User, TaskStatus, CompletionType } from '../types';
import { supabase } from '../services/supabaseClient';
import { toDateString, parseLocalDate, generateRecurrenceDates } from '../utils/dateUtils';

interface UseTaskHandlersParams {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  dataRange: { start: string; end: string };
  formatTask: (t: any) => Task;
  fetchData: (isSilent?: boolean) => Promise<void>;
  currentUser: User | null;
  viewingTask: Task | null;
  setViewingTask: (t: Task | null) => void;
  setIsDetailsModalOpen: (open: boolean) => void;
}

/**
 * Hook principal para handlers de tarefas e memoização dos dados expandidos
 */
export function useTaskHandlers({
  tasks,
  setTasks,
  dataRange,
  formatTask,
  fetchData,
  currentUser,
  viewingTask,
  setViewingTask,
  setIsDetailsModalOpen,
}: UseTaskHandlersParams) {

  // ── Expandir tarefas recorrentes em virtuais ──
  const expandedTasks = useMemo(() => {
    const rangeStart = parseLocalDate(dataRange.start);
    const rangeEnd = parseLocalDate(dataRange.end);
    
    const result: Task[] = tasks.filter(t => t.status !== 'DELETED');
    
    const realTasksLookup = new Set<string>();
    tasks.forEach(t => {
      if (t.recurrenceGroupId && t.dueDate && t.status !== 'DELETED') {
        realTasksLookup.add(`${t.recurrenceGroupId}_${toDateString(t.dueDate)}`);
      }
    });

    const recurrenceMasters = tasks.filter(t => t.recurrence && t.recurrence !== 'NONE' && t.recurrenceGroupId && t.status !== 'DELETED');
    
    const groups: Record<string, Task> = {};
    recurrenceMasters.forEach(t => {
      if (!groups[t.recurrenceGroupId!]) {
        groups[t.recurrenceGroupId!] = t;
      } else {
        if (new Date(t.dueDate!) < new Date(groups[t.recurrenceGroupId!].dueDate!)) {
          groups[t.recurrenceGroupId!] = t;
        }
      }
    });

    Object.values(groups).forEach(master => {
      const startDate = master.dueDate ? new Date(master.dueDate) : rangeStart;
      const endDate = master.recurrenceEndDate ? new Date(master.recurrenceEndDate) : rangeEnd;
      
      const occurrences = generateRecurrenceDates(startDate, endDate, master.recurrence!, master.recurrenceRule, rangeStart);
      
      occurrences.forEach(date => {
        const dateStr = toDateString(date);
        const alreadyExists = realTasksLookup.has(`${master.recurrenceGroupId}_${dateStr}`);
        
        if (!alreadyExists && date <= rangeEnd && date >= rangeStart) {
          result.push({
            ...master,
            id: `virtual_${master.recurrenceGroupId}_${dateStr}`,
            dueDate: date,
            completed: false,
            status: 'OPEN',
            isVirtual: true,
            order: undefined,
          });
        }
      });
    });

    return result;
  }, [tasks, dataRange]);

  // ── Dashboard stats ──
  const dashboardStats = useMemo(() => {
    const todayStr = toDateString(new Date());
    const userTasks = expandedTasks.filter(t => t.userId === currentUser?.id);
    
    return { 
      delayed: userTasks.filter(t => !t.completed && t.dueDate && toDateString(t.dueDate) < todayStr).length, 
      completed: userTasks.filter(t => t.completed && t.completedAt && toDateString(new Date(t.completedAt)) === todayStr).length,
      total: userTasks.filter(t => t.dueDate && toDateString(new Date(t.dueDate)) === todayStr).length,
    };
  }, [expandedTasks, currentUser]);

  // ── Toggle Star ──
  const handleToggleStar = useCallback(async (id: string) => {
    const t = expandedTasks.find(x => x.id === id);
    if (!t) return;

    if (t.isVirtual) {
      const { isVirtual, id: oldId, ...payload } = t;
      const { data, error } = await supabase.from('tasks').insert([{
        ...payload,
        dueDate: t.dueDate?.toISOString(),
        isStarred: !t.isStarred,
        subtasks: JSON.stringify(t.subtasks || []),
      }]).select();
      if (error) console.error("Erro ao favoritar virtual:", error);
      else if (data) setTasks(prev => [...prev, formatTask(data[0])]);
    } else {
      const { error } = await supabase.from('tasks').update({ isStarred: !t.isStarred }).eq('id', id);
      if (error) console.error("Erro ao favoritar:", error);
      else setTasks(prev => prev.map(task => task.id === id ? { ...task, isStarred: !task.isStarred } : task));
    }
  }, [expandedTasks, formatTask, setTasks]);

  // ── Toggle Task (marcar/desmarcar) ──
  const handleToggleTask = useCallback(async (id: string) => {
    const t = expandedTasks.find(x => x.id === id);
    if (!t) return;
    
    if (t.completed) {
      setTasks(prev => prev.map(task => task.id === id ? { ...task, completed: false, status: 'OPEN', completion_type: 'normal', completedAt: undefined } : task));
      try {
        await supabase.from('tasks').update({ completed: false, status: 'OPEN', completion_type: 'normal', completedAt: null }).eq('id', id);
      } catch (err) {
        console.error("Erro ao desmarcar tarefa:", err);
        fetchData(true);
      }
      return null; // No completion modal needed
    } else {
      return id; // Return ID to trigger completion modal
    }
  }, [expandedTasks, setTasks, fetchData]);

  // ── Confirm Completion ──
  const confirmCompletion = useCallback(async (taskId: string, type: CompletionType) => {
    const t = expandedTasks.find(x => x.id === taskId);
    if (!t) return;

    if (t.isVirtual) {
      const { isVirtual, id: oldId, ...payload } = t;
      const now = new Date();
      const { data, error } = await supabase.from('tasks').insert([{
        ...payload,
        dueDate: t.dueDate?.toISOString(),
        completed: true,
        status: 'COMPLETED',
        completion_type: type,
        completedAt: now.toISOString(),
        subtasks: JSON.stringify(t.subtasks || []),
      }]).select();
      if (error) {
        console.error("Erro ao converter tarefa virtual:", error);
        alert("Erro ao salvar tarefa recorrente.");
      } else if (data) {
        setTasks(prev => [...prev, formatTask(data[0])]);
      }
      return;
    }

    const now = new Date();
    setTasks(prev => prev.map(task => task.id === taskId ? { ...task, completed: true, status: 'COMPLETED', completion_type: type, completedAt: now } : task));
    try {
      const { error } = await supabase.from('tasks').update({ completed: true, status: 'COMPLETED', completion_type: type, completedAt: now.toISOString() }).eq('id', taskId);
      if (error) console.error("Erro ao atualizar tarefa concluída:", error);
    } catch (err) {
      console.error("Erro ao concluir tarefa:", err);
      fetchData(true);
    }
  }, [expandedTasks, formatTask, fetchData, setTasks]);

  // ── Update Status ──
  const handleUpdateStatus = useCallback(async (id: string, s: TaskStatus) => {
    const newCompleted = s === 'COMPLETED';
    setTasks(prev => prev.map(task => task.id === id ? { ...task, status: s, completed: newCompleted } : task));
    try {
      await supabase.from('tasks').update({ status: s, completed: newCompleted }).eq('id', id);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      fetchData(true);
    }
  }, [fetchData, setTasks]);

  // ── Delete Task ──
  const handleDelete = useCallback(async (taskId: string) => {
    const taskToDelete = expandedTasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    let deleteMode: 'SINGLE' | 'SERIES' = 'SINGLE';
    
    if (taskToDelete.recurrenceGroupId) {
      const choice = window.confirm(
        "Esta é uma tarefa recorrente.\n\n" +
        "Clique em OK para excluir TODA A SÉRIE.\n" +
        "Clique em CANCELAR para excluir APENAS ESTA TAREFA."
      );
      if (choice) deleteMode = 'SERIES';
    } else {
      if (!window.confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    }

    try {
      if (taskToDelete.isVirtual && deleteMode === 'SINGLE') {
        const { isVirtual, id: oldId, ...payload } = taskToDelete;
        const { data, error } = await supabase.from('tasks').insert([{
          ...payload,
          dueDate: taskToDelete.dueDate?.toISOString(),
          status: 'DELETED',
          subtasks: JSON.stringify(taskToDelete.subtasks || []),
        }]).select();
        if (error) throw error;
        if (data) setTasks(prev => [...prev, formatTask(data[0])]);
        setIsDetailsModalOpen(false);
        setViewingTask(null);
        return;
      }

      let query = supabase.from('tasks').delete();
      if (deleteMode === 'SERIES' && taskToDelete.recurrenceGroupId) {
        query = query.eq('recurrenceGroupId', taskToDelete.recurrenceGroupId);
      } else {
        query = query.eq('id', taskId);
      }

      const { error } = await query;
      if (error) {
        alert("Erro ao excluir no banco de dados: " + error.message);
      } else {
        if (deleteMode === 'SERIES') {
          setTasks(prev => prev.filter(t => t.recurrenceGroupId !== taskToDelete.recurrenceGroupId));
        } else {
          setTasks(prev => prev.filter(t => t.id !== taskId));
        }
        setIsDetailsModalOpen(false);
        setViewingTask(null);
      }
    } catch (err: any) {
      console.error("Erro na exclusão:", err);
      alert("Ocorreu um erro inesperado ao tentar excluir: " + (err.message || ''));
    }
  }, [expandedTasks, formatTask, setTasks, setIsDetailsModalOpen, setViewingTask]);

  // ── Change Order (drag/drop) ──
  const handleChangeOrder = useCallback(async (taskIdOrUpdates: string | { id: string, order: number }[], newOrder?: number) => {
    let itemsToUpdate: { id: string, order: number }[] = [];
    if (Array.isArray(taskIdOrUpdates)) {
      itemsToUpdate = taskIdOrUpdates;
    } else {
      itemsToUpdate = [{ id: taskIdOrUpdates, order: newOrder! }];
    }

    setTasks(prev => {
      const updatesMap = new Map(itemsToUpdate.map(i => [i.id, i.order]));
      let newTasks = prev.map(t => updatesMap.has(t.id) ? { ...t, order: updatesMap.get(t.id)! } : t);
      
      itemsToUpdate.forEach(update => {
        if (!newTasks.some(t => t.id === update.id)) {
          const virtualTask = expandedTasks.find(t => t.id === update.id);
          if (virtualTask?.isVirtual) {
            const { isVirtual, ...rest } = virtualTask;
            newTasks.push({ ...rest, order: update.order, isVirtual: false });
          }
        }
      });
      return newTasks;
    });

    try {
      const realUpdates: { id: string, order: number }[] = [];
      const virtualUpdates: Task[] = [];

      itemsToUpdate.forEach(update => {
        const task = expandedTasks.find(t => t.id === update.id);
        if (task?.isVirtual) {
          virtualUpdates.push({ ...task, order: update.order });
        } else {
          realUpdates.push(update);
        }
      });

      if (realUpdates.length > 0) {
        for (const update of realUpdates) {
          await supabase.from('tasks').update({ order: update.order }).eq('id', update.id);
        }
      }

      if (virtualUpdates.length > 0) {
        for (const task of virtualUpdates) {
          const { isVirtual, id: oldId, ...payload } = task;
          const { data, error } = await supabase.from('tasks').insert([{
            ...payload,
            dueDate: task.dueDate?.toISOString(),
            subtasks: JSON.stringify(task.subtasks || []),
          }]).select();
          if (error) console.error("Error inserting virtual task:", error);
          if (data) {
            const realTask = formatTask(data[0]);
            setTasks(prev => {
              const exists = prev.some(t => t.id === realTask.id);
              if (exists) return prev.filter(t => t.id !== task.id);
              return prev.map(t => t.id === task.id ? realTask : t);
            });
          }
        }
      }
    } catch (err) {
      console.error("Erro ao atualizar ordem:", err);
      fetchData(true);
    }
  }, [expandedTasks, formatTask, fetchData, setTasks]);

  // ── Toggle Subtask ──
  const handleToggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = expandedTasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const newSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks } : t));
    if (viewingTask && viewingTask.id === taskId) {
      setViewingTask({ ...viewingTask, subtasks: newSubtasks });
    }

    try {
      if (task.isVirtual) {
        const { isVirtual, id: oldId, ...payload } = task;
        const { data, error } = await supabase.from('tasks').insert([{
          ...payload,
          dueDate: task.dueDate?.toISOString(),
          subtasks: JSON.stringify(newSubtasks),
        }]).select();
        if (error) throw error;
        if (data) setTasks(prev => [...prev, formatTask(data[0])]);
      } else {
        const { error } = await supabase.from('tasks').update({ subtasks: JSON.stringify(newSubtasks) }).eq('id', taskId);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Erro ao atualizar subtarefa:", err);
      fetchData(true);
    }
  }, [expandedTasks, formatTask, fetchData, viewingTask, setViewingTask, setTasks]);

  // ── Reassign Task ──
  const handleReassignTask = useCallback(async (taskId: string, newUserId: string) => {
    const task = expandedTasks.find(t => t.id === taskId);
    if (!task) return;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, userId: newUserId, isVirtual: false } : t));

    try {
      if (task.isVirtual) {
        const { isVirtual, id: oldId, ...payload } = task;
        const { data, error } = await supabase.from('tasks').insert([{
          ...payload,
          userId: newUserId,
          dueDate: task.dueDate?.toISOString(),
          subtasks: JSON.stringify(task.subtasks || []),
        }]).select();
        if (error) throw error;
        if (data) {
          const realTask = formatTask(data[0]);
          setTasks(prev => prev.map(t => t.id === taskId ? realTask : t));
        }
      } else {
        const { error } = await supabase.from('tasks').update({ userId: newUserId }).eq('id', taskId);
        if (error) throw error;
      }
      fetchData(true);
    } catch (err) {
      console.error("Erro ao reatribuir tarefa:", err);
      fetchData(true);
    }
  }, [expandedTasks, formatTask, fetchData, setTasks]);

  // ── User Management ──
  const handleDeleteUser = useCallback(async (userId: string) => {
    if (!window.confirm("Tem certeza que deseja remover este colaborador?")) return;
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) alert("Erro ao remover usuário");
    else fetchData(true);
  }, [fetchData]);

  const handleRenameUser = useCallback(async (userId: string, newName: string) => {
    const { error } = await supabase.from('users').update({ name: newName }).eq('id', userId);
    if (error) alert("Erro ao renomear usuário");
    else fetchData(true);
  }, [fetchData]);

  const handleUpdateRole = useCallback(async (userId: string, newRole: string) => {
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
    if (error) alert("Erro ao alterar cargo");
    else fetchData(true);
  }, [fetchData]);

  return {
    expandedTasks,
    dashboardStats,
    handleToggleStar,
    handleToggleTask,
    confirmCompletion,
    handleUpdateStatus,
    handleDelete,
    handleChangeOrder,
    handleToggleSubtask,
    handleReassignTask,
    handleDeleteUser,
    handleRenameUser,
    handleUpdateRole,
  };
}
