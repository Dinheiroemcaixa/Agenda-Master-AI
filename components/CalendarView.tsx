
import React, { useState, useEffect } from 'react';
import { Task, User } from '../types';
import { ChevronLeft, ChevronRight, Plus, Video, Calendar as CalendarIcon } from 'lucide-react';
import { isTaskVisibleOnDate, toDateString } from '../App';

interface CalendarViewProps {
  tasks: Task[];
  users: User[];
  onOpenAddTask: (userId: string, initialDate?: Date) => void;
  onEditTask: (task: Task) => void;
  onDateRangeChange?: (start: string, end: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, users, onOpenAddTask, onEditTask, onDateRangeChange }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Notificar o App sobre a mudança de mês para carregar os dados específicos
  useEffect(() => {
    if (onDateRangeChange) {
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      // Estendemos um pouco para segurança visual
      firstDay.setDate(firstDay.getDate() - 7);
      lastDay.setDate(lastDay.getDate() + 7);
      onDateRangeChange(toDateString(firstDay), toDateString(lastDay));
    }
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = new Date();
  const isToday = (day: number) => {
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  const getTasksForDay = (day: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return tasks.filter(task => isTaskVisibleOnDate(task, checkDate));
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    onOpenAddTask('', clickedDate);
  };

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        cells.push(<div key={`empty-${i}`} className="bg-slate-50/10 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-800/40 min-h-[140px]"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayTasks = getTasksForDay(day);
        const dayIsToday = isToday(day);

        cells.push(
            <div 
              key={day} 
              onClick={() => handleDayClick(day)}
              className={`bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 min-h-[140px] p-3 relative group transition-all hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 cursor-pointer overflow-hidden`}
            >
                <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-black w-8 h-8 flex items-center justify-center rounded-xl shadow-sm transition-all ${dayIsToday ? 'bg-indigo-600 text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                        {day}
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 p-1.5 bg-indigo-600 text-white rounded-lg transition-all shadow-lg active:scale-90">
                        <Plus size={14} />
                    </button>
                </div>
                
                <div className="space-y-1.5 overflow-y-auto custom-scroll pr-1">
                    {dayTasks.map(task => {
                        const isMeeting = task.type === 'meeting';
                        return (
                            <div 
                                key={task.id} 
                                onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                className={`text-[10px] p-2 rounded-xl border font-bold flex items-center gap-2 transition-all hover:scale-[1.02]
                                    ${task.completed 
                                        ? 'bg-slate-50 text-slate-400 border-transparent line-through dark:bg-slate-900' 
                                        : isMeeting 
                                            ? 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-900/50'
                                            : 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-900/40'}
                                `}
                            >
                                {isMeeting ? <Video size={10} /> : <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                                <span className="truncate">{task.startTime && `${task.startTime} `}{task.title}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return cells;
  };

  const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  return (
    <div className="h-full flex flex-col bg-white/60 dark:bg-slate-950/60 backdrop-blur-md rounded-[32px] border border-white/40 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <CalendarIcon size={24} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white capitalize tracking-tighter">
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h2>
            </div>
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-all active:scale-95"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600">Hoje</button>
                <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-all active:scale-95"><ChevronRight size={20} /></button>
            </div>
        </div>

        <div className="flex-1 overflow-x-auto custom-scroll">
            <div className="min-w-[700px] h-full flex flex-col">
                <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    {weekDays.map(day => (
                        <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 tracking-[0.2em]">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-100 dark:bg-slate-800 gap-px">
                    {renderCells()}
                </div>
            </div>
        </div>
    </div>
  );
};
