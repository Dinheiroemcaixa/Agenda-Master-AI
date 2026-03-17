
import React, { useState, useMemo } from 'react';
import { Task, User } from '../types';
import { Search, Calendar, Filter, ChevronRight, ChevronLeft, CheckCircle, Clock, FileText, User as UserIcon } from 'lucide-react';
import { toDateString, parseLocalDate } from '../utils/dateUtils';

interface HistoryViewProps {
  tasks: Task[];
  users: User[];
  currentUser: User | null;
  onViewTask: (task: Task) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ tasks, users, currentUser, onViewTask }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState(toDateString(new Date()));
  const [customEndDate, setCustomEndDate] = useState(toDateString(new Date()));
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'overdue'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
      // Critério base de histórico (concluída ou atrasada real)
      const isHistoryRelevant = t.completed || (!t.completed && t.dueDate && toDateString(new Date(t.dueDate)) < toDateString(new Date()));
      if (!isHistoryRelevant) return false;

      // Isolamento de dados: Apenas Raffaela vê tudo. Outros vêem apenas o próprio.
      const isRaffaela = currentUser?.id === 'cxi8c1dcm';
      if (!isRaffaela && t.userId !== currentUser?.id) return false;

      return true;
    });

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
    }

    // Status
    if (statusFilter === 'completed') result = result.filter(t => t.completed);
    if (statusFilter === 'overdue') result = result.filter(t => !t.completed);

    // User
    if (userFilter !== 'all') {
      result = result.filter(t => t.userId === userFilter);
    }

    // Date
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (dateFilter !== 'all') {
      result = result.filter(t => {
        const d = t.completedAt ? new Date(t.completedAt) : (t.dueDate ? parseLocalDate(t.dueDate as any) : null);
        if (!d) return false;
        d.setHours(0,0,0,0);

        if (dateFilter === 'today') return toDateString(d) === toDateString(new Date());
        if (dateFilter === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return d >= weekAgo;
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return d >= monthAgo;
        }
        if (dateFilter === 'custom') {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23,59,59,999);
          return d >= start && d <= end;
        }
        return true;
      });
    }

    return result.sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt) : (a.dueDate ? new Date(a.dueDate) : new Date(0));
      const dateB = b.completedAt ? new Date(b.completedAt) : (b.dueDate ? new Date(b.dueDate) : new Date(0));
      return dateB.getTime() - dateA.getTime();
    });
  }, [tasks, searchQuery, dateFilter, customStartDate, customEndDate, statusFilter, userFilter]);

  const stats = useMemo(() => {
    return {
      total: filteredTasks.length,
      completed: filteredTasks.filter(t => t.completed).length,
      overdue: filteredTasks.filter(t => !t.completed).length,
    };
  }, [filteredTasks]);

  return (
    <div className="flex flex-col h-full bg-slate-50/30 dark:bg-transparent p-4 sm:p-8 space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Centro de Histórico</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Auditoria e rastreabilidade de tarefas</p>
        </div>

        <div className="flex gap-3">
          <div className="bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Concluídas</p>
              <p className="text-xl font-black">{stats.completed}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Em Atraso</p>
              <p className="text-xl font-black">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar histórico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-medium outline-none focus:ring-4 ring-indigo-500/10 border border-slate-100 dark:border-slate-700 transition-all"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
             <Calendar size={16} className="ml-3 text-slate-400" />
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold uppercase tracking-tight outline-none flex-1 py-2 cursor-pointer dark:text-white"
              >
                <option value="all" className="dark:bg-slate-900">Todo Período</option>
                <option value="today" className="dark:bg-slate-900">Hoje</option>
                <option value="week" className="dark:bg-slate-900">Últimos 7 dias</option>
                <option value="month" className="dark:bg-slate-900">Último Mês</option>
                <option value="custom" className="dark:bg-slate-900">Personalizado</option>
              </select>
          </div>

          {/* User Filter - Only visible to Raffaela Lima */}
          {currentUser?.id === 'cxi8c1dcm' && (
            <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
               <UserIcon size={16} className="ml-3 text-slate-400" />
               <select 
                 value={userFilter}
                 onChange={(e) => setUserFilter(e.target.value)}
                 className="bg-transparent text-xs font-bold uppercase tracking-tight outline-none flex-1 py-2 cursor-pointer dark:text-white"
               >
                 <option value="all" className="dark:bg-slate-900">Todos Colaboradores</option>
                 {users.map(u => (
                   <option key={u.id} value={u.id} className="dark:bg-slate-900">{u.name}</option>
                 ))}
               </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
             <Filter size={16} className="ml-3 text-slate-400" />
             <select 
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value as any)}
               className="bg-transparent text-xs font-bold uppercase tracking-tight outline-none flex-1 py-2 cursor-pointer dark:text-white"
             >
               <option value="all">Status: Todos</option>
               <option value="completed">Concluídas</option>
               <option value="overdue">Em Atraso</option>
             </select>
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-4 pt-4 border-t border-slate-50 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
            <div className="flex-1 flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 ml-1">Início</span>
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-10 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-bold"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 ml-1">Fim</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-10 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-bold"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden flex-1 flex flex-col min-h-[400px]">
        <div className="grid grid-cols-[1fr_120px_120px_100px_48px] gap-4 px-8 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <div className="text-[10px] font-black uppercase text-slate-400">Tarefa / Descrição</div>
          <div className="text-[10px] font-black uppercase text-slate-400">Responsável</div>
          <div className="text-[10px] font-black uppercase text-slate-400">Data Evento</div>
          <div className="text-[10px] font-black uppercase text-slate-400">Status</div>
          <div className="text-[10px] font-black uppercase text-slate-400 text-center">Info</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <FileText size={48} className="opacity-20 mb-4" />
               <p className="font-bold text-sm">Nenhum registro encontrado</p>
               <p className="text-xs">Ajuste os filtros para ampliar sua busca</p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const assignee = users.find(u => u.id === task.userId);
              const eventDate = task.completedAt ? new Date(task.completedAt) : (task.dueDate ? new Date(task.dueDate) : null);
              
              return (
                <div 
                  key={task.id} 
                  className="grid grid-cols-[1fr_120px_120px_100px_48px] gap-4 px-8 py-5 border-b border-slate-50 dark:border-transparent hover:bg-slate-50/80 dark:hover:bg-indigo-900/10 transition-colors group items-center"
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${task.completed ? 'text-slate-400 line-through decoration-indigo-500/50' : 'text-slate-800 dark:text-white'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{task.description || 'Sem descrição'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                       {assignee?.avatar ? <img src={assignee.avatar} className="w-full h-full object-cover" /> : (assignee?.name?.[0] || '?')}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate">{assignee?.name}</span>
                  </div>

                  <div className="text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="opacity-40" />
                      {eventDate?.toLocaleDateString('pt-BR')}
                    </div>
                    {task.completedAt && (
                       <div className="flex items-center gap-1.5 mt-1">
                         <Clock size={12} className="opacity-40" />
                         {new Date(task.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                       </div>
                    )}
                  </div>

                  <div>
                     {task.completed ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase">
                           <CheckCircle size={10} /> Feito
                        </div>
                     ) : (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 text-[9px] font-black uppercase">
                           <Clock size={10} /> Atrasado
                        </div>
                     )}
                  </div>

                  <button 
                    onClick={() => onViewTask(task)}
                    className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
