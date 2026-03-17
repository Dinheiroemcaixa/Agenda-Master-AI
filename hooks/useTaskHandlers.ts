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
      // Forçar parseLocalDate para garantir consistência no lookup
      const d = t.dueDate instanceof Date ? t.dueDate : (t.dueDate ? parseLocalDate(t.dueDate as any) : null);
      if (t.recurrenceGroupId && d && t.status !== 'DELETED') {
        const key = `${t.recurrenceGroupId}_${toDateString(d)}`;
        realTasksLookup.add(key);
      }
    });

    if (tasks.length > 0) {
        const completedWithGroup = tasks.filter(t => t.completed && t.recurrenceGroupId);
        if (completedWithGroup.length > 0) {
            console.log(`[ExpandedTasks] Encontradas ${completedWithGroup.length} tarefas reais concluídas com grupo.`);
        }
    }

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

    // Camada final de desduplicação: Preferir REAL sobre VIRTUAL para a mesma data/grupo
    const finalResult: Task[] = [];
    const seenKeys = new Map<string, Task>();

    result.forEach(t => {
      const d = t.dueDate instanceof Date ? t.dueDate : (t.dueDate ? parseLocalDate(t.dueDate as any) : null);
      // Normalizar ID removendo prefixo temporário para o agrupamento
      const baseId = t.id.replace('temp_', '');
      const key = (t.recurrenceGroupId && d) ? `${t.recurrenceGroupId}_${toDateString(d)}` : baseId;
      
      if (!seenKeys.has(key)) {
        seenKeys.set(key, t);
        finalResult.push(t);
      } else {
        const existing = seenKeys.get(key)!;
        // Preferência: Real > Virtual, Temp > DB
        const isNewPreferable = (!t.isVirtual && existing.isVirtual) || (t.id.startsWith('temp_') && !existing.id.startsWith('temp_'));
        
        if (isNewPreferable) {
          seenKeys.set(key, t);
          const idx = finalResult.findIndex(x => x.id === existing.id);
          if (idx !== -1) finalResult[idx] = t;
        }
      }
    });

    return finalResult;
  }, [tasks, dataRange]);

  // ── Dashboard stats ──
  const dashboardStats = useMemo(() => {
    const todayStr = toDateString(new Date());
    const userTasks = expandedTasks.filter(t => t.userId === currentUser?.id);
    
    return { 
      delayed: userTasks.filter(t => !t.completed && t.dueDate && toDateString(t.dueDate) < todayStr).length, 
      completed: userTasks.filter(t => t.completed && t.completedAt && toDateString(new Date(t.completedAt)) === todayStr).length,
      total: userTasks.filter(t => !t.completed && t.dueDate && toDateString(new Date(t.dueDate)) === todayStr).length,
    };
  }, [expandedTasks, currentUser]);

  // ── Toggle Star ──
  const handleToggleStar = useCallback(async (id: string) => {
    const t = expandedTasks.find(x => x.id === id);
    if (!t) return;

    const tempId = `temp_${id}`;

    setTasks(prev => {
      if (t.isVirtual) {
        const optimisticTask: Task = {
            ...t,
            id: tempId, 
            isVirtual: false,
            isStarred: !t.isStarred
        };
        return [...prev, optimisticTask];
      }
      return prev.map(task => task.id === id ? { ...task, id: tempId, isStarred: !task.isStarred } : task);
    });

    try {
      if (t.isVirtual) {
        const { isVirtual, id: oldId, ...payload } = t;
        const { data, error } = await supabase.from('tasks').insert([{
            ...payload,
            isStarred: !t.isStarred,
            subtasks: JSON.stringify(t.subtasks || []),
            dueDate: t.dueDate ? toDateString(t.dueDate) : null
        }]).select();
        if (error) {
            console.error("Error toggling star (virtual):", error);
            alert("Erro ao favoritar virtual: " + error.message);
            setTasks(prev => prev.filter(x => x.id !== tempId));
        } else if (data) {
            const nt = formatTask(data[0]);
            setTasks(prev => prev.map(task => task.id === tempId ? nt : task));
        }
      } else {
        const { error } = await supabase.from('tasks').update({ isStarred: !t.isStarred }).eq('id', id);
        if (error) {
            console.error("Error toggling star (real):", error);
            alert("Erro ao favoritar: " + error.message);
            fetchData(true);
        } else {
            setTasks(prev => prev.map(task => task.id === tempId ? { ...task, id: id } : task));
        }
      }
    } catch (err: any) {
      console.error("Error toggling star:", err);
      alert("Erro inesperado ao favoritar: " + (err.message || String(err)));
      fetchData(true);
    }
  }, [expandedTasks, formatTask, fetchData, setTasks]);

  // ── Toggle Task (marcar/desmarcar) ──
  const handleToggleTask = useCallback(async (id: string) => {
    const t = expandedTasks.find(x => x.id === id);
    if (!t) return;
    
    if (t.completed) {
      const tempId = `temp_${id}`;
      const optimisticTask: Task = { ...t, id: tempId, completed: false, status: 'OPEN', completion_type: 'normal', completedAt: undefined };
      
      setTasks(prev => prev.map(task => task.id === id ? optimisticTask : task));
      
      try {
        const { error } = await supabase.from('tasks').update({ completed: false, status: 'OPEN', completion_type: 'normal', completedAt: null }).eq('id', id);
        if (error) {
            console.error("Erro ao desmarcar tarefa:", error);
            alert("Erro ao desmarcar tarefa no banco: " + error.message);
            fetchData(true);
        } else {
            // Sucesso: voltamos o ID ao normal (será atualizado pelo próximo fetchData mas já marcamos localmente)
            setTasks(prev => prev.map(task => task.id === tempId ? { ...task, id: id } : task));
        }
      } catch (err: any) {
        console.error("Erro ao desmarcar tarefa:", err);
        alert("Erro inesperado ao desmarcar: " + (err.message || String(err)));
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

    const now = new Date();
    const tempId = `temp_${taskId}`;
    
    // 1. Atualização Otimista
    setTasks(prev => {
        const targetStatus: TaskStatus = 'COMPLETED';
        const optimisticTask: Task = { 
            ...t, 
            id: tempId, 
            isVirtual: false, 
            completed: true, 
            status: targetStatus, 
            completion_type: type, 
            completedAt: now 
        };

        if (t.isVirtual) {
            return [...prev, optimisticTask];
        }
        // Para tarefas reais, SUBSTITUÍMOS a versão antiga pela temp_ para lock de sync
        return prev.map(task => task.id === taskId ? optimisticTask : task);
    });

    try {
        if (t.isVirtual) {
            const { isVirtual, id: oldId, ...payload } = t;
            // Salvar dueDate como string pura para evitar shift de timezone
            const dbDueDate = t.dueDate ? toDateString(t.dueDate) : null;
            
            console.log("Inserindo tarefa virtual concluída:", { taskId, dbDueDate });
            
            const { data, error } = await supabase.from('tasks').insert([{
                ...payload,
                dueDate: dbDueDate,
                completed: true,
                status: 'COMPLETED',
                completion_type: type,
                completedAt: now.toISOString(),
                subtasks: JSON.stringify(t.subtasks || []),
            }]).select();
            
            if (error) {
                console.error("Erro Supabase (Insert):", error);
                alert("Erro ao salvar: " + error.message);
                setTasks(prev => prev.filter(x => x.id !== tempId));
            } else if (data) {
                console.log("Sucesso ao inserir:", data[0].id);
                const newTask = formatTask(data[0]);
                setTasks(prev => {
                    const filtered = prev.filter(x => x.id !== tempId);
                    if (filtered.some(x => x.id === newTask.id)) return filtered;
                    return [...filtered, newTask];
                });
            }
        } else {
            console.log("Atualizando tarefa real:", taskId);
            const { error } = await supabase.from('tasks').update({ 
                completed: true, 
                status: 'COMPLETED', 
                completion_type: type, 
                completedAt: now.toISOString() 
            }).eq('id', taskId);
            
            if (error) {
                console.error("Erro Supabase (Update):", error);
                alert("Erro ao atualizar: " + error.message);
                fetchData(true);
            } else {
                // Sucesso: Volta o ID ao normal
                setTasks(prev => prev.map(task => task.id === tempId ? { ...task, id: taskId } : task));
            }
        }
    } catch (err: any) {
        console.error("Exceção em confirmCompletion:", err);
        alert("Erro inesperado: " + (err.message || String(err)));
        fetchData(true);
    }
  }, [expandedTasks, formatTask, fetchData, setTasks]);

  // ── Update Status ──
  const handleUpdateStatus = useCallback(async (id: string, s: TaskStatus) => {
    const t = expandedTasks.find(x => x.id === id);
    if (!t) return;

    const newCompleted = s === 'COMPLETED';
    const now = new Date();
    const completedAt = newCompleted ? now : null;
    const tempId = `temp_${id}`;

    // Atualização Otimista Total
    setTasks(prev => {
        const optimisticTask: Task = {
            ...t,
            id: tempId,
            isVirtual: false,
            status: s,
            completed: newCompleted,
            completedAt: completedAt || undefined
        };

        if (t.isVirtual) {
            return [...prev, optimisticTask];
        }
        // Lock de sync para tarefas reais
        return prev.map(task => task.id === id ? optimisticTask : task);
    });

    try {
        if (t.isVirtual) {
            const { isVirtual, id: oldId, ...payload } = t;
            const dbDueDate = t.dueDate ? toDateString(t.dueDate) : null;
            
            console.log("Movendo tarefa virtual no Kanban:", { id, s, dbDueDate });

            const { data, error } = await supabase.from('tasks').insert([{
                ...payload,
                dueDate: dbDueDate,
                status: s,
                completed: newCompleted,
                completedAt: completedAt?.toISOString(),
                subtasks: JSON.stringify(t.subtasks || []),
            }]).select();

            if (error) {
                console.error("Erro Supabase (Move Virtual):", error);
                alert("Erro ao salvar: " + error.message);
                setTasks(prev => prev.filter(x => x.id !== tempId));
            } else if (data) {
                const newTask = formatTask(data[0]);
                setTasks(prev => {
                    const filtered = prev.filter(x => x.id !== tempId);
                    if (filtered.some(x => x.id === newTask.id)) return filtered;
                    return [...filtered, newTask];
                });
            }
        } else {
            console.log("Movendo tarefa real no Kanban:", id, s);
            const { error } = await supabase.from('tasks').update({ 
                status: s, 
                completed: newCompleted,
                completedAt: completedAt?.toISOString() || null
            }).eq('id', id);
            
            if (error) {
            console.error("Erro Supabase (UpdateStatus):", error);
            alert("Erro ao atualizar status: " + error.message);
            fetchData(true);
        } else {
            // Sucesso: Volta o ID ao normal se não for virtual transformado
            setTasks(prev => prev.map(task => task.id === tempId ? { ...task, id: id } : task));
        }
    }
    } catch (err: any) {
        console.error("Exceção em handleUpdateStatus:", err);
        alert("Erro ao atualizar status: " + (err.message || String(err)));
        fetchData(true);
    }
  }, [expandedTasks, fetchData, setTasks, formatTask]);

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
          dueDate: taskToDelete.dueDate ? toDateString(taskToDelete.dueDate) : null,
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
          const tempId = `temp_${task.id}`;
          const { isVirtual, id: oldId, ...payload } = task;
          const { data, error } = await supabase.from('tasks').insert([{
            ...payload,
            dueDate: task.dueDate ? toDateString(task.dueDate) : null,
            subtasks: JSON.stringify(task.subtasks || []),
          }]).select();
          if (error) {
              console.error("Error inserting virtual task:", error);
              setTasks(prev => prev.filter(t => t.id !== tempId));
          }
          if (data) {
            const realTask = formatTask(data[0]);
            setTasks(prev => {
              const filtered = prev.filter(t => t.id !== tempId);
              if (filtered.some(t => t.id === realTask.id)) return filtered;
              return [...filtered, realTask];
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

    const tempId = `temp_${taskId}`;
    const optimisticTask: Task = { ...task, id: tempId, subtasks: newSubtasks, isVirtual: false };

    setTasks(prev => prev.map(t => t.id === taskId ? optimisticTask : t));
    
    if (viewingTask && viewingTask.id === taskId) {
      setViewingTask(optimisticTask);
    }

    try {
      if (task.isVirtual) {
        const { isVirtual, id: oldId, ...payload } = task;
        const { data, error } = await supabase.from('tasks').insert([{
          ...payload,
          dueDate: task.dueDate ? toDateString(task.dueDate) : null,
          subtasks: JSON.stringify(newSubtasks),
        }]).select();
        if (error) throw error;
        if (data) {
            const nt = formatTask(data[0]);
            setTasks(prev => prev.map(t => t.id === tempId ? nt : t));
        }
      } else {
        const { error } = await supabase.from('tasks').update({ subtasks: JSON.stringify(newSubtasks) }).eq('id', taskId);
        if (error) throw error;
        setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: taskId } : t));
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

    const tempId = `temp_${taskId}`;
    const optimisticTask: Task = { ...task, id: tempId, userId: newUserId, isVirtual: false };
    setTasks(prev => prev.map(t => t.id === taskId ? optimisticTask : t));

    try {
      if (task.isVirtual) {
        const { isVirtual, id: oldId, ...payload } = task;
        const { data, error } = await supabase.from('tasks').insert([{
          ...payload,
          userId: newUserId,
          dueDate: task.dueDate ? toDateString(task.dueDate) : null,
          subtasks: JSON.stringify(task.subtasks || []),
        }]).select();
        if (error) throw error;
        if (data) {
          const realTask = formatTask(data[0]);
          setTasks(prev => prev.map(t => t.id === tempId ? realTask : t));
        }
      } else {
        const { error } = await supabase.from('tasks').update({ userId: newUserId }).eq('id', taskId);
        if (error) throw error;
        setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: taskId } : t));
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
