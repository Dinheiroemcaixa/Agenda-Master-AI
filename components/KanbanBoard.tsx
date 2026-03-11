
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, User } from '../types';
import { Calendar, MoreHorizontal, Plus, CheckCircle, Circle, Flag, Pencil, Trash2 } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  users: User[];
  showAddTaskButton?: boolean;
  onOpenAddTask: (userId: string) => void;
  onToggleTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleStar: (taskId: string) => void;
}

const KanbanCard: React.FC<{ 
  task: Task; 
  user?: User; 
  onToggle: () => void; 
  onView: () => void; 
  onEdit: () => void;
  onDelete: () => void;
  onToggleStar: () => void 
}> = ({ task, user, onToggle, onView, onEdit, onDelete, onToggleStar }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLate = task.dueDate && !task.completed && (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  })();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div 
      onClick={onView}
      className={`bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer group relative ${task.completed ? 'opacity-75' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-mono text-slate-400">#{task.customId}</span>
        
        <div className="relative" ref={menuRef}>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                className={`text-slate-400 hover:text-slate-600 transition-opacity ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
                <MoreHorizontal size={14} />
            </button>
            {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-28 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-gray-100 dark:border-slate-800 z-50 py-1 overflow-hidden" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={() => { onEdit(); setIsMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                        <Pencil size={10} /> Editar
                    </button>
                    <button 
                        onClick={() => { onDelete(); setIsMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                        <Trash2 size={10} /> Excluir
                    </button>
                </div>
            )}
        </div>
      </div>
      
      <div className="flex items-start gap-2 mb-3">
        <button 
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-500 hover:border-indigo-500'}`}
        >
            {task.completed && <CheckCircle size={10} className="text-white" />}
        </button>
        <h4 className={`text-sm font-medium leading-tight ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
            {task.title}
        </h4>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
            {user && (
                user.avatar ? (
                    <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-5 h-5 rounded-full object-cover shadow-sm"
                    />
                ) : (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm
                        ${user.isMaster ? 'bg-indigo-600' : 'bg-gradient-to-br from-orange-400 to-pink-500'}
                    `} title={user.name}>
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                )
            )}
            {task.dueDate && (
                <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${isLate ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-500 bg-slate-100 dark:bg-slate-700'}`}>
                    <Calendar size={10} />
                    {task.dueDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                </div>
            )}
        </div>
        
        <button 
            onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors
                ${task.isStarred 
                    ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' 
                    : 'text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'}
            `}
        >
            <Flag size={10} fill={task.isStarred ? "currentColor" : "none"} />
            <span>{task.isStarred ? 'Alta' : 'Normal'}</span>
        </button>
      </div>
    </div>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, users, showAddTaskButton = true, onOpenAddTask, onToggleTask, onEditTask, onViewTask, onDeleteTask, onToggleStar }) => {
  // Ordenação Urgente Compartilhada
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      
      const getDueTime = (d?: Date) => {
        if (!d) return 2147483647000;
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      };

      const tA = getDueTime(a.dueDate);
      const tB = getDueTime(b.dueDate);
      
      if (tA !== tB) return tA - tB;
      
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;

      return (a.customId ?? 0) - (b.customId ?? 0);
    });
  }, [tasks]);

  const pendingTasks = sortedTasks.filter(t => !t.completed);
  const completedTasks = sortedTasks.filter(t => t.completed);

  const columns = [
    { id: 'pending', title: 'PENDENTE', color: 'bg-slate-500', tasks: pendingTasks, icon: Circle },
    { id: 'done', title: 'CONCLUÍDO', color: 'bg-emerald-500', tasks: completedTasks, icon: CheckCircle }
  ];

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 h-full items-start">
      {columns.map(col => (
        <div key={col.id} className="min-w-[300px] w-[350px] flex-shrink-0 flex flex-col max-h-full">
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${col.id === 'done' ? 'bg-emerald-500' : 'bg-slate-500'}`}>
                        {col.title}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{col.tasks.length}</span>
                </div>
            </div>

            <div className="space-y-3 overflow-y-auto custom-scroll pr-2 pb-10">
                {col.id === 'pending' && showAddTaskButton && (
                     <button 
                        onClick={() => onOpenAddTask('')}
                        className="w-full py-2 flex items-center gap-2 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-500 transition-all text-sm"
                     >
                        <Plus size={16} />
                        Adicionar Tarefa
                     </button>
                )}
                
                {col.tasks.map(task => (
                    <KanbanCard 
                        key={task.id} 
                        task={task} 
                        user={users.find(u => u.id === task.userId)}
                        onToggle={() => onToggleTask(task.id)}
                        onView={() => onViewTask(task)}
                        onEdit={() => onEditTask(task)}
                        onDelete={() => onDeleteTask(task.id)}
                        onToggleStar={() => onToggleStar(task.id)}
                    />
                ))}
            </div>
        </div>
      ))}
    </div>
  );
};
