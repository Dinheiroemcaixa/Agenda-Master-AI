
import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Repeat, AlignLeft, CheckSquare, Plus, Trash2, Sparkles, Loader2, Video, Calendar as CalendarIcon, ChevronDown, User as UserIcon } from 'lucide-react';
import { User, Task, Subtask, TaskCategory, CustomRecurrenceRule } from '../types';
import { suggestTaskDetails } from '../services/geminiService';
import { toDateString, parseLocalDate } from '../App';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: any) => Promise<void> | void;
  users: User[];
  currentUser: User;
  preSelectedUserId: string;
  taskToEdit?: Task | null;
  initialDate?: Date;
  forceCategory?: TaskCategory;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  users,
  currentUser,
  preSelectedUserId,
  taskToEdit,
  initialDate,
  forceCategory
}) => {
  const [title, setTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('task');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [recurrence, setRecurrence] = useState('NONE');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(toDateString(new Date(new Date().setDate(new Date().getDate() + 7))));
  const [assignedUserId, setAssignedUserId] = useState(preSelectedUserId);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [priority, setPriority] = useState<'Baixa' | 'Média' | 'Alta'>('Média');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const canManageOthers = currentUser.role === 'ADMIN';
  const canReassign = canManageOthers || (taskToEdit && taskToEdit.userId === currentUser.id);

  const [customRule, setCustomRule] = useState<CustomRecurrenceRule>({
    frequency: 'DAILY',
    interval: 1,
    weekDays: [],
    endType: 'NEVER'
  });

  const recurrenceOptions = useMemo(() => {
    const date = parseLocalDate(selectedDate);
    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const dayOfMonth = date.getDate();
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
    
    return [
      { id: 'NONE', label: 'Não se repete' },
      { id: 'DAILY', label: 'Todos os dias' },
      { id: 'WEEKLY', label: `Semanal: cada ${dayName}` },
      { id: 'MONTHLY', label: `Mensal no dia ${dayOfMonth}` },
      { id: 'ANNUALLY', label: `Anual em ${dayOfMonth} de ${monthName}` },
      { id: 'WEEKDAYS', label: 'Dias úteis (seg-sex)' },
      { id: 'CUSTOM', label: 'Personalizado...' }
    ];
  }, [selectedDate]);

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
          setTitle(taskToEdit.title);
          setDescription(taskToEdit.description || '');
          setSelectedDate(taskToEdit.dueDate ? toDateString(taskToEdit.dueDate) : toDateString(new Date()));
          setIsAllDay(!!taskToEdit.isAllDay);
          setStartTime(taskToEdit.startTime || '14:00');
          setEndTime(taskToEdit.endTime || '15:00');
          setAssignedUserId(taskToEdit.userId);
          setSubtasks(taskToEdit.subtasks || []);
          setTaskCategory(taskToEdit.type || 'task');
          setRecurrence(taskToEdit.recurrence || 'NONE');
          setRecurrenceEndDate(taskToEdit.recurrenceEndDate ? toDateString(taskToEdit.recurrenceEndDate) : toDateString(new Date(new Date().setDate(new Date().getDate() + 7))));
          setPriority(taskToEdit.priority || 'Média');
          setTags(taskToEdit.tags || []);
          
          if (taskToEdit.recurrence === 'CUSTOM' && taskToEdit.recurrenceRule) {
            try {
              setCustomRule(JSON.parse(taskToEdit.recurrenceRule));
            } catch(e) { console.error("Falha ao ler rule", e); }
          }
      } else {
          setAssignedUserId(preSelectedUserId);
          setTitle('');
          setDescription('');
          setSubtasks([]);
          setSelectedDate(toDateString(initialDate || new Date()));
          setTaskCategory(forceCategory || 'task');
          setRecurrence('NONE');
          setRecurrenceEndDate(toDateString(new Date(new Date(initialDate || new Date()).setDate(new Date(initialDate || new Date()).getDate() + 7))));
          setIsAllDay(false);
          setStartTime('14:00');
          setEndTime('15:00');
          setPriority('Média');
          setTags([]);
          setCustomRule({
            frequency: 'DAILY',
            interval: 1,
            weekDays: [],
            endType: 'NEVER'
          });
      }
    }
  }, [isOpen, preSelectedUserId, taskToEdit, initialDate, forceCategory]);

  const handleAiEnrich = async () => {
    if (!title.trim()) return;
    setIsAiLoading(true);
    try {
      const suggestion = await suggestTaskDetails(title);
      setDescription(suggestion.description);
      const newSubtasks: Subtask[] = suggestion.subtasks.map(text => ({
        id: Math.random().toString(36).substr(2, 9),
        title: text,
        completed: false
      }));
      setSubtasks(prev => [...prev, ...newSubtasks]);
    } catch (error) {
      console.error("Erro Gemini:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const isContinuous = recurrence === 'WEEKDAYS';

      const taskData = {
        title,
        description,
        dueDate: parseLocalDate(selectedDate),
        isAllDay,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        userId: canReassign ? assignedUserId : currentUser.id,
        type: taskCategory,
        subtasks: subtasks,
        recurrence: recurrence,
        recurrenceEndDate: (recurrence !== 'NONE' && !isContinuous) ? parseLocalDate(recurrenceEndDate) : undefined,
        recurrenceRule: recurrence === 'CUSTOM' ? JSON.stringify(customRule) : undefined,
        priority,
        tags
      };

      await onSave(taskData);
      onClose();
    } catch (err) {
      console.error("Erro ao salvar tarefa:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const weekDaysLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const toggleWeekDay = (day: number) => {
    setCustomRule(prev => {
      const current = prev.weekDays || [];
      const next = current.includes(day) 
        ? current.filter(d => d !== day) 
        : [...current, day];
      return { ...prev, weekDays: next };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-[#0F111A] rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-800/60" onClick={(e) => e.stopPropagation()}>
        
        <div className="px-8 py-6 flex justify-between items-center border-b border-slate-800/60">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                 {taskCategory === 'meeting' ? <Video size={20} /> : <CalendarIcon size={20} />}
              </div>
              <div>
                <h2 className="font-black text-white uppercase tracking-tighter text-lg">
                  {taskToEdit ? 'Editar Detalhes' : (taskCategory === 'meeting' ? 'Nova Reunião' : 'Nova Tarefa')}
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Pulse Agenda Cloud v2.0</p>
              </div>
           </div>
           <button type="button" onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-7 custom-scroll max-h-[85vh] overflow-y-auto">
          <div className="flex gap-4 items-center mb-2">
            <input 
              autoFocus
              type="text" 
              placeholder={taskCategory === 'meeting' ? "Título da reunião..." : "O que precisa ser feito?"}
              className="flex-1 text-2xl font-black text-white placeholder-slate-600 bg-transparent outline-none py-1 border-b border-transparent focus:border-indigo-600 transition-all"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={isSaving}
            />
            <button 
              type="button" 
              onClick={handleAiEnrich}
              disabled={!title.trim() || isAiLoading || isSaving}
              className={`p-3.5 rounded-2xl flex items-center justify-center transition-all ${isAiLoading ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 disabled:opacity-30'}`}
              title="IA: Sugerir detalhes"
            >
              {isAiLoading ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
            </button>
          </div>

          <div className="space-y-6">
            
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Para quem é?</label>
                  <div className="relative group">
                    <UserIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <select 
                        value={assignedUserId} 
                        onChange={e => setAssignedUserId(e.target.value)}
                        disabled={!canReassign || isSaving}
                        className="w-full bg-slate-900/50 border border-slate-800/60 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-black text-white outline-none focus:border-indigo-600 transition-all appearance-none cursor-pointer"
                    >
                        {users.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Prioridade</label>
                  <div className="flex items-center gap-2 p-1.5 bg-slate-900/50 rounded-2xl border border-slate-800/60">
                    {(['Baixa', 'Média', 'Alta'] as const).map(p => (
                      <button 
                        key={p} 
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${priority === p ? (p === 'Alta' ? 'bg-rose-600 text-white' : p === 'Média' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white') : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Agendamento & Recorrência</label>
               <div className="bg-slate-900/50 rounded-3xl border border-slate-800/60 p-4 space-y-4">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1">
                      <CalendarIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={e => setSelectedDate(e.target.value)} 
                        disabled={isSaving}
                        className="w-full pl-11 pr-4 py-3 bg-slate-800/50 rounded-xl text-xs font-black text-white outline-none border border-slate-700/50"
                      />
                    </div>
                    {!isAllDay && (
                      <div className="flex items-center gap-2">
                         <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={isSaving} className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-xs font-black text-white outline-none" />
                         <span className="text-[9px] font-black text-slate-500">ATE</span>
                         <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={isSaving} className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-xs font-black text-white outline-none" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} disabled={isSaving} className="h-5 w-5 appearance-none rounded-lg border-2 border-slate-700 checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer" />
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Compromisso do dia todo</span>
                    </label>

                    <div className="flex-1 relative">
                       <Repeat size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                       <select value={recurrence} onChange={e => setRecurrence(e.target.value)} disabled={isSaving} className="w-full pl-11 pr-10 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-[10px] font-black uppercase text-slate-400 outline-none appearance-none cursor-pointer">
                          {recurrenceOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                       </select>
                       <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  {recurrence !== 'NONE' && recurrence !== 'CUSTOM' && recurrence !== 'WEEKDAYS' && (
                    <div className="mt-2 p-3 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 flex items-center justify-between animate-in slide-in-from-top-2">
                       <span className="text-[10px] font-black uppercase text-indigo-400">Repetir esse compromisso até:</span>
                       <input 
                          type="date" 
                          value={recurrenceEndDate} 
                          onChange={e => setRecurrenceEndDate(e.target.value)}
                          disabled={isSaving}
                          className="bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold text-white outline-none border border-slate-700"
                       />
                    </div>
                  )}
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Detalhes e Notas</label>
               <div className="relative group">
                 <AlignLeft size={16} className="absolute left-4 top-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                 <textarea 
                    rows={3} 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    disabled={isSaving} 
                    className="w-full bg-slate-900/50 border border-slate-800/60 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold text-slate-200 outline-none focus:border-indigo-600 transition-all resize-none placeholder-slate-600" 
                    placeholder="Adicione detalhes, observações ou tópicos importantes..." 
                 />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Tags / Etiquetas</label>
                  <div className="relative group">
                    <Plus size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text" 
                      value={newTag} 
                      onChange={e => setNewTag(e.target.value)} 
                      onKeyDown={handleAddTag}
                      placeholder="ENTER p/ adicionar"
                      className="w-full bg-slate-900/50 border border-slate-800/60 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-black text-white outline-none focus:border-indigo-600 transition-all placeholder-slate-600"
                    />
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-slate-800 rounded-lg text-[9px] font-black text-slate-300 border border-slate-700 flex items-center gap-2 uppercase tracking-tight">
                          {tag}
                          <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-rose-500"><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Checklist</label>
                   <div className="relative group">
                      <CheckSquare size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text" 
                        value={newSubtaskTitle} 
                        onChange={e => setNewSubtaskTitle(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), (newSubtaskTitle.trim() && setSubtasks([...subtasks, {id: Math.random().toString(36).substr(2,9), title: newSubtaskTitle, completed: false}]), setNewSubtaskTitle('')))} 
                        placeholder="Novo item..." 
                        className="w-full bg-slate-900/50 border border-slate-800/60 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-black text-white outline-none focus:border-indigo-600 transition-all placeholder-slate-600" 
                      />
                   </div>
                   {subtasks.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        {subtasks.map(st => (
                          <div key={st.id} className="flex items-center gap-3 bg-slate-800/30 p-2.5 rounded-xl group border border-slate-800/60">
                            <div className={`w-3.5 h-3.5 rounded border ${st.completed ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`} />
                            <span className="flex-1 text-[11px] font-bold text-slate-300 truncate">{st.title}</span>
                            <button type="button" onClick={() => setSubtasks(subtasks.filter(s => s.id !== st.id))} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                          </div>
                        ))}
                      </div>
                   )}
                </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 border-t border-slate-800/60">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Descartar</button>
            <div className="flex gap-4">
              <button 
                type="button" 
                onClick={handleSubmit}
                disabled={!title.trim() || isSaving}
                className="px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-3"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    PROCESSANDO...
                  </>
                ) : (
                  <>
                    <CalendarIcon size={18} />
                    CONFIRMAR AGENDAMENTO
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
