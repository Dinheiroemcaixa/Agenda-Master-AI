
import React from 'react';
import { X, Calendar, Clock, User as UserIcon, AlignLeft, Flag, CheckCircle, Circle, Repeat, Hash, Pencil, Trash2, CheckSquare, Ban } from 'lucide-react';
import { Task, User } from '../types';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  assignee?: User;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  onClose,
  task,
  assignee,
  onEdit,
  onDelete,
  onToggleSubtask
}) => {
  if (!isOpen || !task) return null;

  const handleEdit = () => {
    onEdit(task);
    onClose(); // Close details when opening edit
  };

  const handleDelete = () => {
      onDelete(task.id);
      onClose();
  };

  const statusLabel = (() => {
    if (!task.completed) return 'Pendente';
    if (task.completion_type === 'sem_movimento') return 'Concluída (Sem Movimento)';
    return 'Concluída';
  })();

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/40 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header Actions */}
        <div className="px-6 py-4 flex justify-between items-start border-b border-gray-100 dark:border-slate-800">
           <div className="flex items-center gap-3">
              <div className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5
                ${task.completed 
                    ? task.completion_type === 'sem_movimento' 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}
              `}>
                 {task.completed ? (task.completion_type === 'sem_movimento' ? <Ban size={12} /> : <CheckCircle size={12} />) : <Circle size={12} />}
                 {statusLabel}
              </div>
              {task.customId && (
                  <span className="text-slate-400 font-mono text-sm bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded">
                      #{task.customId}
                  </span>
              )}
           </div>

           <div className="flex items-center gap-1">
               <button 
                  onClick={handleEdit}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" 
                  title="Editar"
                >
                   <Pencil size={18} />
               </button>
               <button 
                  onClick={handleDelete}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" 
                  title="Excluir"
                >
                   <Trash2 size={18} />
               </button>
               <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1"></div>
               <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                   <X size={20} />
               </button>
           </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-8 overflow-y-auto custom-scroll space-y-8">
            
            {/* Title */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white leading-snug">
                    {task.title}
                </h1>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                
                {/* Date/Time */}
                <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 block">Data & Hora</label>
                    <div className="flex items-start gap-3">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Calendar size={18} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {task.dueDate 
                                    ? task.dueDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) 
                                    : 'Sem data definida'}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                {task.isAllDay ? (
                                    <span>Dia inteiro</span>
                                ) : (
                                    task.startTime && (
                                        <>
                                            <Clock size={10} />
                                            <span>{task.startTime} - {task.endTime}</span>
                                        </>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Priority */}
                <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 block">Prioridade</label>
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${task.isStarred ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'bg-slate-50 text-slate-400 dark:bg-slate-800'}`}>
                            <Flag size={18} fill={task.isStarred ? "currentColor" : "none"} />
                        </div>
                        <span className={`text-sm font-medium ${task.isStarred ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            {task.isStarred ? 'Alta Prioridade' : 'Normal'}
                        </span>
                    </div>
                </div>

                {/* Assignee */}
                {assignee && (
                    <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 block">Responsável</label>
                        <div className="flex items-center gap-2">
                            {assignee.avatar ? (
                                <img 
                                    src={assignee.avatar} 
                                    alt={assignee.name} 
                                    className="w-8 h-8 rounded-full object-cover shadow-sm"
                                />
                            ) : (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm border border-white dark:border-slate-800
                                    ${assignee.isMaster ? 'bg-indigo-600' : 'bg-gradient-to-br from-orange-400 to-pink-500'}
                                `}>
                                    {assignee.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{assignee.name}</div>
                                <div className="text-[10px] text-slate-400">{assignee.isMaster ? 'Gerente' : 'Membro'}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recurrence */}
                {task.recurrence && (
                    <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 block">Repetição</label>
                         <div className="flex items-center gap-2">
                            <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-slate-500">
                                <Repeat size={18} />
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                {task.recurrence === 'NONE' ? 'Não se repete' : task.recurrence}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Subtasks List */}
            {task.subtasks && task.subtasks.length > 0 && (
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                    <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                        <CheckSquare size={12} />
                        Subtarefas ({task.subtasks.filter(t => t.completed).length}/{task.subtasks.length})
                    </label>
                    <div className="space-y-2">
                        {task.subtasks.map(st => (
                            <div 
                                key={st.id} 
                                onClick={() => onToggleSubtask && onToggleSubtask(task.id, st.id)}
                                className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors group"
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all
                                    ${st.completed 
                                        ? 'bg-indigo-500 border-indigo-500 text-white' 
                                        : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'}
                                `}>
                                    {st.completed && <CheckSquare size={10} />}
                                </div>
                                <span className={`text-sm transition-all ${st.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {st.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Description */}
            {task.description && (
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                     <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                        <AlignLeft size={12} />
                        Descrição / Detalhes
                     </label>
                     <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {task.description}
                     </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};
