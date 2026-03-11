
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

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      // Se for dias úteis e o campo estiver oculto, tratamos como contínua (sem data final)
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
        recurrenceRule: recurrence === 'CUSTOM' ? JSON.stringify(customRule) : undefined
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
    <div className="fixed inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300 border border-white/20 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
        
        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                 {taskCategory === 'meeting' ? <Video size={18} /> : <CalendarIcon size={18} />}
              </div>
              <h2 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                {taskToEdit ? 'Editar Detalhes' : (taskCategory === 'meeting' ? 'Agendar Reunião' : 'Nova Tarefa')}
              </h2>
           </div>
           <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex gap-4 items-center">
            <input 
              autoFocus
              type="text" 
              placeholder={taskCategory === 'meeting' ? "Título da reunião..." : "O que precisa ser feito?"}
              className="flex-1 text-2xl font-black text-slate-800 dark:text-white placeholder-slate-400 bg-transparent outline-none py-1"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={isSaving}
            />
            <button 
              type="button" 
              onClick={handleAiEnrich}
              disabled={!title.trim() || isAiLoading || isSaving}
              className={`p-3 rounded-2xl flex items-center justify-center transition-all ${isAiLoading ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-90 disabled:opacity-30'}`}
              title="IA: Sugerir descrição"
            >
              {isAiLoading ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto max-h-[60vh] pr-2 custom-scroll">
            
            {canReassign && (
                <div className="flex items-start gap-4 animate-in slide-in-from-left-2">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400"><UserIcon size={20} /></div>
                    <div className="flex-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1">Atribuir para:</label>
                        <select 
                            value={assignedUserId} 
                            onChange={e => setAssignedUserId(e.target.value)}
                            disabled={isSaving}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500/20"
                        >
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                        </select>
                    </div>
                </div>
            )}

            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400"><Clock size={20} /></div>
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={e => setSelectedDate(e.target.value)} 
                    disabled={isSaving}
                    className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500/20"
                  />
                  {!isAllDay && (
                    <div className="flex items-center gap-2">
                       <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={isSaving} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500/20" />
                       <span className="text-[10px] font-black text-slate-400 uppercase">até</span>
                       <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={isSaving} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500/20" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} disabled={isSaving} className="h-5 w-5 appearance-none rounded-lg border-2 border-slate-200 dark:border-slate-700 checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer" />
                      <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Dia todo</span>
                    </label>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <Repeat size={14} className="text-slate-400" />
                      <select value={recurrence} onChange={e => setRecurrence(e.target.value)} disabled={isSaving} className="bg-transparent border-none text-[10px] font-black uppercase text-slate-500 outline-none cursor-pointer">
                        {recurrenceOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Não exigir data final para recorrência contínua (ex: Dias Úteis) */}
                  {recurrence !== 'NONE' && recurrence !== 'CUSTOM' && recurrence !== 'WEEKDAYS' && (
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-dashed border-indigo-200 animate-in slide-in-from-top-2">
                       <span className="text-[10px] font-black uppercase text-indigo-500">Repetir até:</span>
                       <input 
                          type="date" 
                          value={recurrenceEndDate} 
                          onChange={e => setRecurrenceEndDate(e.target.value)}
                          disabled={isSaving}
                          className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-100 dark:border-slate-700 outline-none"
                       />
                    </div>
                  )}

                  {recurrence === 'CUSTOM' && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 space-y-5 border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black uppercase text-slate-400">Repetir a cada</span>
                           <input 
                              type="number" 
                              min="1" 
                              value={customRule.interval} 
                              onChange={e => setCustomRule({...customRule, interval: parseInt(e.target.value) || 1})}
                              disabled={isSaving}
                              className="w-14 bg-white dark:bg-slate-800 px-2 py-1.5 rounded-lg text-xs font-bold text-center border border-slate-100 dark:border-slate-700"
                           />
                           <select 
                              value={customRule.frequency}
                              onChange={e => setCustomRule({...customRule, frequency: e.target.value as any})}
                              disabled={isSaving}
                              className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-100 dark:border-slate-700 outline-none"
                           >
                              <option value="DAILY">Dia(s)</option>
                              <option value="WEEKLY">Semana(s)</option>
                              <option value="MONTHLY">Mês(es)</option>
                           </select>
                        </div>

                        {customRule.frequency === 'WEEKLY' && (
                          <div className="space-y-2">
                             <p className="text-[9px] font-black uppercase text-slate-400 ml-1">Nos dias:</p>
                             <div className="flex gap-1.5">
                                {weekDaysLabels.map((label, idx) => {
                                   const isSelected = customRule.weekDays?.includes(idx);
                                   return (
                                      <button 
                                        key={label}
                                        type="button"
                                        onClick={() => toggleWeekDay(idx)}
                                        disabled={isSaving}
                                        className={`flex-1 h-9 rounded-xl text-[10px] font-black transition-all border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-indigo-300'}`}
                                      >
                                         {label}
                                      </button>
                                   );
                                })}
                             </div>
                          </div>
                        )}

                        <div className="space-y-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                           <p className="text-[9px] font-black uppercase text-slate-400 ml-1">Termina em:</p>
                           <div className="space-y-2.5">
                              <label className="flex items-center gap-3 cursor-pointer">
                                 <input type="radio" name="endType" checked={customRule.endType === 'NEVER'} onChange={() => setCustomRule({...customRule, endType: 'NEVER'})} disabled={isSaving} className="w-4 h-4" />
                                 <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Nunca</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer">
                                 <input type="radio" name="endType" checked={customRule.endType === 'ON_DATE'} onChange={() => setCustomRule({...customRule, endType: 'ON_DATE'})} disabled={isSaving} className="w-4 h-4" />
                                 <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Em</span>
                                 {customRule.endType === 'ON_DATE' && (
                                    <input 
                                      type="date" 
                                      value={customRule.endDate || toDateString(new Date())} 
                                      onChange={e => setCustomRule({...customRule, endDate: e.target.value})}
                                      disabled={isSaving}
                                      className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-100 dark:border-slate-700" 
                                    />
                                 )}
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer">
                                 <input type="radio" name="endType" checked={customRule.endType === 'AFTER_COUNT'} onChange={() => setCustomRule({...customRule, endType: 'AFTER_COUNT'})} disabled={isSaving} className="w-4 h-4" />
                                 <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Após</span>
                                 {customRule.endType === 'AFTER_COUNT' && (
                                    <div className="flex items-center gap-2">
                                       <input 
                                          type="number" 
                                          min="1" 
                                          value={customRule.endCount || 1} 
                                          onChange={e => setCustomRule({...customRule, endCount: parseInt(e.target.value) || 1})}
                                          disabled={isSaving}
                                          className="w-14 bg-white dark:bg-slate-800 px-2 py-1.5 rounded-lg text-xs font-bold text-center border border-slate-100 dark:border-slate-700"
                                       />
                                       <span className="text-[10px] font-black uppercase text-slate-400">ocorrências</span>
                                    </div>
                                 )}
                              </label>
                           </div>
                        </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400"><AlignLeft size={20} /></div>
              <div className="flex-1">
                 <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} disabled={isSaving} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500/20 resize-none placeholder-slate-400" placeholder="Anotações sobre a tarefa ou pauta da reunião..." />
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400"><CheckSquare size={20} /></div>
              <div className="flex-1 space-y-4">
                <div className="flex gap-2">
                  <input type="text" value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), (newSubtaskTitle.trim() && setSubtasks([...subtasks, {id: Math.random().toString(36).substr(2,9), title: newSubtaskTitle, completed: false}]), setNewSubtaskTitle('')))} disabled={isSaving} placeholder="Adicionar passo ou item de pauta" className="flex-1 bg-transparent border-b-2 border-slate-100 dark:border-slate-800 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-600" />
                  <button type="button" onClick={() => { if(newSubtaskTitle.trim()){ setSubtasks([...subtasks, {id: Math.random().toString(36).substr(2,9), title: newSubtaskTitle, completed: false}]); setNewSubtaskTitle(''); } }} disabled={isSaving} className="bg-indigo-600 text-white p-2 rounded-xl"><Plus size={20}/></button>
                </div>
                
                {subtasks.length > 0 && (
                  <div className="space-y-2">
                    {subtasks.map(st => (
                      <div key={st.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl group animate-in slide-in-from-left-2">
                        <div className={`w-4 h-4 rounded border-2 ${st.completed ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`} />
                        <span className={`flex-1 text-sm font-bold ${st.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{st.title}</span>
                        <button type="button" onClick={() => setSubtasks(subtasks.filter(s => s.id !== st.id))} disabled={isSaving} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-8 py-3.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Cancelar</button>
            <button 
              type="button" 
              onClick={handleSubmit}
              disabled={!title.trim() || isSaving}
              className="px-12 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Agendamento'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
