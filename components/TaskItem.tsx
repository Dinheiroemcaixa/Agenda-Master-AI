
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, User, TaskStatus } from '../types';
import { UserAvatar } from './UserAvatar';
import { Calendar, MoreHorizontal, Trash2, Pencil, Flag, Clock, Ban, CheckCircle2, GripVertical, Video, Send, ChevronDown } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  assignee: User;
  allUsers: User[];
  currentUser?: User; // Adicionado para checagem de permissão
  onToggle: (id: string) => void;
  onUpdateStatus: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onEnrich: (id: string) => void;
  onEdit: (task: Task) => void;
  onViewTask: (task: Task) => void;
  onToggleStar: (id: string) => void;
  onChangeOrder: (id: string, newOrder: number) => void;
  isSelected?: boolean;
  onSelect?: () => void;
  onReassignTask: (taskId: string, newUserId: string) => void;
  index?: number;
  dragRef?: (element: HTMLElement | null) => void;
  dragStyle?: React.CSSProperties;
  dragAttributes?: any;
  dragListeners?: any;
  isOverlay?: boolean;
}

export const TaskItem = React.memo<TaskItemProps>(({ 
  task, 
  assignee, 
  allUsers,
  currentUser,
  onToggle, 
  onUpdateStatus,
  onDelete, 
  onEdit, 
  onViewTask, 
  onToggleStar, 
  onChangeOrder,
  onReassignTask,
  index,
  dragRef,
  dragStyle,
  dragAttributes,
  dragListeners,
  isOverlay
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTransferMenuOpen, setIsTransferMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canEdit = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    return task.userId === currentUser.id;
  }, [currentUser, task.userId]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
            setIsTransferMenuOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLate = useMemo(() => {
    if (!task.dueDate || task.completed) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return new Date(task.dueDate).getTime() < today.getTime();
  }, [task.dueDate, task.completed]);

  const isMeeting = task.type === 'meeting';

  const statusCfg = useMemo(() => {
    // Nova lógica solicitada:
    if (task.completed) {
      if (task.completion_type === 'sem_movimento') {
        return { label: 'Concluído (Sem Movimento)', color: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20', icon: <Ban size={12}/> };
      }
      return { label: 'Concluído', color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20', icon: <CheckCircle2 size={12}/> };
    }
    
    // Status para tarefas em aberto
    return { 
      label: isMeeting ? 'Agendado' : 'Em Aberto', 
      color: isMeeting ? 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20' : 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20', 
      icon: <Clock size={12}/> 
    };
  }, [task.completed, task.completion_type, isMeeting]);

  const dateLabel = useMemo(() => {
    if (!task.dueDate) return '';
    return new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }, [task.dueDate]);

  return (
    <div 
        ref={dragRef}
        style={dragStyle}
        className={`group grid grid-cols-[50px_1fr_100px_100px_80px_120px_80px] lg:grid-cols-[60px_1fr_110px_110px_90px_140px_90px] gap-2 px-4 py-3 border-b border-slate-50 dark:border-slate-800/40 items-center text-sm transition-all duration-200 relative
            ${isOverlay ? 'bg-white dark:bg-slate-900 shadow-2xl scale-[1.02] z-50 rounded-xl border-indigo-500/30 cursor-grabbing' : 'hover:bg-white dark:hover:bg-slate-800/60 cursor-pointer'}
            ${task.completed ? 'opacity-60' : ''}
            ${isMeeting && !task.completed ? 'border-l-4 border-l-sky-400' : ''}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => !isOverlay && onViewTask(task)}
    >
      <div className="flex items-center gap-2 justify-center">
         <div 
            className="text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing mr-1 touch-none"
            {...dragAttributes}
            {...dragListeners}
         >
            <GripVertical size={14} />
         </div>
         <button 
            disabled={!canEdit}
            onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
            className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${!canEdit ? 'cursor-not-allowed opacity-50' : ''} ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'}`}
         >
            {task.completed && <CheckCircle2 size={12} className="text-white" />}
         </button>
         <span className="text-[10px] font-bold text-slate-300">{index !== undefined ? index + 1 : ''}</span>
      </div>

      <div className="min-w-0 pr-4">
         <div className="flex items-center gap-2 mb-0.5">
            {isMeeting && <Video size={14} className="text-sky-500 shrink-0" />}
            <span className={`font-bold truncate text-sm ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</span>
         </div>
         {task.description && <p className="text-[11px] text-slate-400 truncate max-w-sm">{task.description}</p>}
      </div>

      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
         <UserAvatar user={assignee} className="w-5 h-5" textSize="text-[8px]" />
         <span className="text-[11px] font-bold text-slate-500 truncate">{assignee.name.split(' ')[0]}</span>
      </div>

      <div className="flex items-center">
         {task.dueDate && (
             <div className="flex flex-col">
                <span className={`text-[10px] font-black flex items-center gap-1.5 uppercase ${isLate ? 'text-rose-500' : 'text-slate-400'}`}>
                    <Calendar size={12} />
                    {dateLabel}
                </span>
                {task.startTime && <span className="text-[9px] font-bold text-slate-400 ml-4.5">{task.startTime}</span>}
             </div>
         )}
      </div>

      <div className="flex items-center">
         <button 
            disabled={!canEdit}
            onClick={(e) => { e.stopPropagation(); onToggleStar(task.id); }}
            className={`relative z-10 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black transition-all ${!canEdit ? 'cursor-not-allowed opacity-50' : ''} ${task.isStarred ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'text-slate-300'}`}
         >
            <Flag size={10} fill={task.isStarred ? "currentColor" : "none"} />
            {task.isStarred ? 'Alta' : ''}
         </button>
      </div>

      <div className="flex items-center">
          <div 
            className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase transition-all shadow-sm ${statusCfg.color}`}
          >
              <div className="flex items-center gap-1.5 truncate">
                  {statusCfg.icon}
                  <span className="truncate">{statusCfg.label}</span>
              </div>
          </div>
      </div>

      <div className="flex items-center justify-end relative pr-4" ref={menuRef} onClick={e => e.stopPropagation()}>
         <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); setIsTransferMenuOpen(false); }} className={`p-2 rounded-lg transition-all ${isMenuOpen || isHovered ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-300'}`}><MoreHorizontal size={18} /></button>
         {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 z-[100] py-1">
                {canEdit && <button onClick={() => { onEdit(task); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"><Pencil size={12}/> Editar</button>}
                {canEdit && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsTransferMenuOpen(!isTransferMenuOpen); }} 
                    className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 ${isTransferMenuOpen ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    <div className="flex items-center gap-2"><Send size={12}/> Encaminhar</div>
                    <ChevronDown size={10} className={isTransferMenuOpen ? 'rotate-180' : ''} />
                  </button>
                )}
                {isTransferMenuOpen && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 py-1 border-y border-slate-100 dark:border-slate-800 max-h-40 overflow-y-auto custom-scroll">
                    {allUsers.filter(u => u.id !== task.userId).map(u => (
                      <button 
                        key={u.id} 
                        onClick={() => { onReassignTask(task.id, u.id); setIsMenuOpen(false); setIsTransferMenuOpen(false); }}
                        className="w-full text-left px-6 py-1.5 text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 truncate"
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
                {canEdit && <button onClick={() => { onDelete(task.id); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"><Trash2 size={12}/> Excluir</button>}
                <button onClick={() => { onViewTask(task); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"><Clock size={12}/> Ver Detalhes</button>
            </div>
         )}
      </div>
    </div>
  );
});
