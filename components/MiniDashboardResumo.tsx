
import React from 'react';
import { AlertCircle, CheckCircle2, ListChecks } from 'lucide-react';

interface MiniDashboardResumoProps {
  completedCount: number;
  totalCount: number;
  activeFilter: 'all' | 'completed';
  onFilterChange: (filter: 'all' | 'completed') => void;
}

export const MiniDashboardResumo: React.FC<MiniDashboardResumoProps> = ({
  completedCount,
  totalCount,
  activeFilter,
  onFilterChange
}) => {
  return (
    <div className="px-1 mb-6 animate-in fade-in slide-in-from-left-4 duration-500">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 flex items-center justify-between">
        Resumo de Tarefas
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
      </p>
      
      <div className="grid grid-cols-2 gap-1.5">
        {/* Card Total Criadas */}
        <button
          onClick={() => onFilterChange('all')}
          className={`group flex flex-col p-2.5 rounded-xl border transition-all duration-300 text-left relative overflow-hidden ${
            activeFilter === 'all'
              ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-900/30'
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <ListChecks 
              size={12} 
              className={activeFilter === 'all' ? 'text-white' : 'text-indigo-500'} 
            />
          </div>
          <span className={`text-lg font-black leading-none ${activeFilter === 'all' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
            {totalCount}
          </span>
          <span className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${activeFilter === 'all' ? 'text-indigo-100' : 'text-slate-400'}`}>
            Total
          </span>
        </button>

        {/* Card Concluídas */}
        <button
          onClick={() => onFilterChange(activeFilter === 'completed' ? 'all' : 'completed')}
          className={`group flex flex-col p-2.5 rounded-xl border transition-all duration-300 text-left relative overflow-hidden ${
            activeFilter === 'completed'
              ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-900/30'
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <CheckCircle2 
              size={12} 
              className={activeFilter === 'completed' ? 'text-white' : 'text-emerald-500'} 
            />
          </div>
          <span className={`text-lg font-black leading-none ${activeFilter === 'completed' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
            {completedCount}
          </span>
          <span className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${activeFilter === 'completed' ? 'text-emerald-100' : 'text-slate-400'}`}>
            Feito
          </span>
        </button>
      </div>
    </div>
  );
};
