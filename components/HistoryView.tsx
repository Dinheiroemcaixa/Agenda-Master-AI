import React, { useState, useMemo } from 'react';
import { Task, User } from '../types';
import { Search, Calendar, CheckCircle2, Pencil, BarChart3, Users } from 'lucide-react';
import { toDateString } from '../App';

interface HistoryViewProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  onViewTask: (task: Task) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ tasks, users, currentUser, onViewTask }) => {
  const [selectedDate, setSelectedDate] = useState<string>(toDateString(new Date()));
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isManager = currentUser?.role === 'ADMIN';

  // Helper to calculate status
  const getStatus = (task: Task) => {
    if (task.completed) return "CONCLUÍDA";
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today > dueDate) return "ATRASADA";
    }
    return "EM ABERTO";
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = toDateString(new Date(task.dueDate));
      const completionDate = task.completedAt ? toDateString(new Date(task.completedAt)) : null;
      
      const isManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER';
      const matchesUser = isManager && selectedUser !== 'all' ? task.userId === selectedUser : task.userId === currentUser?.id;
      const matchesSearch = searchTerm ? task.title.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      
      if (!matchesUser || !matchesSearch) return false;

      // Se a tarefa foi concluída na data selecionada
      if (task.completed && completionDate === selectedDate) return true;

      // Se a tarefa estava em aberto na data selecionada
      // (vencimento <= data selecionada) E (não concluída OU concluída após a data selecionada)
      if (taskDate <= selectedDate && (!task.completed || (completionDate && completionDate > selectedDate))) {
        return true;
      }

      return false;
    });
  }, [tasks, selectedDate, selectedUser, searchTerm, currentUser]);

  return (
    <div className="h-full flex flex-col p-8 bg-slate-50/10 dark:bg-slate-900/10 overflow-hidden">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              <BarChart3 size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Histórico</h1>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Tarefas por data</p>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-white dark:bg-slate-900 pl-11 pr-4 py-3 rounded-2xl outline-none focus:ring-2 ring-indigo-500/20 text-xs font-bold border border-slate-100 dark:border-slate-800" />
            </div>
            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER') && (
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="bg-white dark:bg-slate-900 pl-11 pr-10 py-3 rounded-2xl outline-none focus:ring-2 ring-indigo-500/20 text-xs font-bold border border-slate-100 dark:border-slate-800 appearance-none">
                  <option value="all">Todos os Usuários</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-white dark:bg-slate-900 pl-11 pr-4 py-3 rounded-2xl outline-none focus:ring-2 ring-indigo-500/20 text-xs font-bold border border-slate-100 dark:border-slate-800" />
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto custom-scroll space-y-4 pr-4">
          {filteredTasks.map(task => {
            const status = getStatus(task);
            const isCompletedNormal = task.completed && task.completion_type === 'normal';
            const isCompletedNoMovement = task.completed && task.completion_type === 'sem_movimento';
            
            return (
              <div key={task.id} className="flex gap-4 group cursor-pointer" onClick={() => onViewTask(task)}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${task.completed ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                  {task.completed ? <CheckCircle2 size={18} /> : <Pencil size={18} />}
                </div>
                <div className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm group-hover:shadow-md transition-all flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{task.title}</p>
                    {task.completed && (
                      <p className="text-[9px] font-black uppercase text-slate-400 mt-1">
                        {isCompletedNoMovement ? 'Concluída Sem Movimento' : 'Concluída Normal'}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${task.completed ? 'bg-emerald-100 text-emerald-700' : status === 'ATRASADA' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                      {status}
                  </span>
                </div>
              </div>
            );
          })}
          {filteredTasks.length === 0 && (
            <p className="text-center text-slate-400 font-bold mt-10">Nenhuma tarefa encontrada para esta data.</p>
          )}
        </div>
      </div>
    </div>
  );
};
