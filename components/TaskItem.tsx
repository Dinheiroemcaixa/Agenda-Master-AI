
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, User, TaskStatus } from '../types';
import { UserAvatar } from './UserAvatar';
import { Calendar, MoreHorizontal, Trash2, Pencil, Flag, Clock, Ban, CheckCircle2, GripVertical, Video, Send, ChevronDown, List, AlignLeft, Pin, Repeat, FileText, X } from 'lucide-react';

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
  isOverlay,
  isSelected,
  onSelect
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

  const priorityCfg = useMemo(() => {
    switch (task.priority) {
      case 'Alta': return { label: 'Alta', color: 'bg-rose-900/30 text-rose-400 border-rose-500/30' };
      case 'Média': return { label: 'Média', color: 'bg-amber-900/30 text-amber-400 border-amber-500/30' };
      case 'Baixa': return { label: 'Baixa', color: 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' };
      default: return { label: 'Média', color: 'bg-slate-800/40 text-slate-400 border-slate-700/40' };
    }
  }, [task.priority]);

  const statusCfg = useMemo(() => {
    if (task.completed) {
      if (task.completion_type === 'sem_movimento') {
        return { label: 'S. Movimento', color: 'bg-amber-900/20 text-amber-400 border-amber-500/20', icon: <Ban size={10}/> };
      }
      return { label: 'Concluído', color: 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 size={10}/> };
    }
    return { 
      label: isMeeting ? 'Agendado' : 'Aberto', 
      color: isMeeting ? 'bg-sky-900/20 text-sky-400 border-sky-500/20' : 'bg-indigo-900/20 text-indigo-400 border-indigo-500/20', 
      icon: <Clock size={10}/> 
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
        className={`group grid grid-cols-[50px_1fr_120px_110px_90px_110px_100px] gap-4 px-6 py-4 border-b border-slate-800/40 items-center text-[13px] transition-all duration-200 relative
            ${isOverlay ? 'bg-[#1A1D2B] shadow-2xl scale-[1.02] z-50 rounded-2xl border border-indigo-500/30 cursor-grabbing' : 'hover:bg-[#151824] cursor-pointer'}
            ${task.completed ? 'opacity-50' : ''}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => !isOverlay && onViewTask(task)}
    >
      {/* Selection Checkbox */}
      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => onSelect?.()}
          className="w-4 h-4 rounded border-slate-700 bg-slate-900/50 checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer"
        />
      </div>

      {/* # ID & Grip */}
      <div className="flex items-center gap-2">
         <div 
            className="text-slate-600 group-hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none"
            {...dragAttributes}
            {...dragListeners}
         >
            <GripVertical size={14} />
         </div>
         <span className="text-[10px] font-black text-slate-500 tabular-nums">#{index !== undefined ? String(index + 1).padStart(2, '0') : '--'}</span>
      </div>

      {/* TAREFA */}
      <div className="min-w-0 pr-4">
         <div className="flex items-center gap-3">
            <button 
                disabled={!canEdit}
                onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
                className={`relative z-10 w-4.5 h-4.5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${!canEdit ? 'cursor-not-allowed opacity-50' : ''} ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700 bg-slate-900/50 hover:border-indigo-500'}`}
            >
                {task.completed && <CheckCircle2 size={12} />}
            </button>
            <span className={`font-bold truncate tracking-tight transition-all ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
              {task.title}
            </span>
            {task.isStarred && <Flag size={12} className="text-rose-500 fill-rose-500 shrink-0" />}
            {task.type === 'meeting' && <Video size={12} className="text-sky-400 shrink-0" />}
         </div>
         <div className="flex flex-wrap items-center gap-2 mt-1 pl-7">
            {task.tags && task.tags.length > 0 && (
              <div className="flex gap-1 overflow-hidden">
                {task.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 text-[9px] font-black uppercase border border-sky-500/30 whitespace-nowrap">{t}</span>
                ))}
              </div>
            )}
            
            {(task.recurrenceRule || task.recurrenceGroupId) && (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-black uppercase border border-slate-700 whitespace-nowrap flex items-center gap-1 leading-none shadow-sm">
                <Repeat size={10} /> Recorrente
              </span>
            )}
            
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="flex items-center gap-1 text-rose-500 text-[9px] font-black leading-none" title="Subtarefas">
                 <Pin size={10} className="fill-rose-500 rotate-45"/>
                 <span className="flex items-center gap-1">
                   {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                   <ChevronDown size={10} />
                 </span>
              </div>
            )}
         </div>
      </div>

      {/* RESPONSÁVEL */}
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
         <UserAvatar user={assignee} className="w-6 h-6 border border-slate-800" textSize="text-[9px]" />
         <span className="text-[11px] font-bold text-slate-400 truncate">{assignee.name.split(' ')[0]}</span>
      </div>

      {/* DATA/HORA */}
      <div className="flex items-center">
         {task.dueDate && (
             <div className="flex flex-col">
                <span className={`text-[10px] font-black flex items-center gap-1.5 uppercase ${isLate ? 'text-rose-500' : 'text-slate-300'}`}>
                    <Calendar size={12} className={isLate ? 'text-rose-500' : 'text-slate-500'} />
                    {dateLabel}
                </span>
                {task.startTime && (
                  <span className="text-[9px] font-bold text-slate-500 mt-0.5 ml-4.5 flex items-center gap-1">
                    <Clock size={10} /> {task.startTime}
                  </span>
                )}
             </div>
         )}
      </div>

      {/* PRIORIDADE */}
      <div className="flex items-center">
         <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${priorityCfg.color}`}>
            {priorityCfg.label}
         </span>
      </div>

      {/* STATUS */}
      <div className="flex items-center">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${statusCfg.color}`}>
              {statusCfg.icon}
              <span className="truncate">{statusCfg.label}</span>
          </div>
      </div>

      {/* AÇÕES */}
      <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
         {task.description && (
           <button onClick={() => onViewTask(task)} className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors" title="Ver anotações">
              <FileText size={14} />
           </button>
         )}
         {canEdit && (
           <button onClick={() => onEdit(task)} className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-400 hover:bg-slate-800 transition-colors bg-slate-900/40" title="Editar Tarefa">
              <Pencil size={14} />
           </button>
         )}
         {canEdit && (
           <button onClick={() => onDelete(task.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-rose-500 hover:bg-slate-800 transition-colors bg-slate-900/40" title="Excluir">
              <X size={14} />
           </button>
         )}
         <div className="relative" ref={menuRef}>
           <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); setIsTransferMenuOpen(false); }} className={`p-1.5 rounded-lg transition-all ml-1 ${isMenuOpen || isHovered ? 'text-white bg-indigo-600 shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}><MoreHorizontal size={14} /></button>
           {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-[#0F111A] rounded-2xl shadow-2xl border border-slate-800/60 z-[100] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  {canEdit && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsTransferMenuOpen(!isTransferMenuOpen); }} 
                      className={`w-full text-left px-4 py-2.5 text-[11px] font-bold flex items-center justify-between gap-3 transition-colors hover:bg-slate-800/50 ${isTransferMenuOpen ? 'text-indigo-400 bg-indigo-900/20' : 'text-slate-300'}`}
                    >
                      <div className="flex items-center gap-3"><Send size={14} className="text-slate-500"/> Encaminhar</div>
                      <ChevronDown size={12} className={`transition-transform duration-200 ${isTransferMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                  {isTransferMenuOpen && (
                    <div className="bg-slate-900/50 py-1 border-y border-slate-800/60 max-h-40 overflow-y-auto custom-scroll">
                      {allUsers.filter(u => u.id !== task.userId).map(u => (
                        <button 
                          key={u.id} 
                          onClick={() => { onReassignTask(task.id, u.id); setIsMenuOpen(false); setIsTransferMenuOpen(false); }}
                          className="w-full text-left px-7 py-2 text-[10px] font-black uppercase text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-colors truncate"
                        >
                          {u.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="h-px bg-slate-800/60 my-1 mx-2"></div>
                  <button onClick={() => { onViewTask(task); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-400 hover:bg-slate-800/50 flex items-center gap-3 transition-colors"><Clock size={14}/> Histórico Completo</button>
              </div>
           )}
         </div>
      </div>
    </div>
  );
});
