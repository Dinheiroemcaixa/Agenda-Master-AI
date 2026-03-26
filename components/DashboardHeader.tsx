
import React from 'react';
import { 
  Plus, List, LayoutGrid, Calendar as CalendarIcon, X, Search, Filter 
} from 'lucide-react';
import { toDateString, parseLocalDate } from '../utils/dateUtils';

interface DashboardHeaderProps {
  activePage: string;
  dashboardFilter: 'all' | 'delayed' | 'completed';
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewType: 'list' | 'kanban' | 'calendar';
  setViewType: (type: 'list' | 'kanban' | 'calendar') => void;
  setIsTaskModalOpen: (open: boolean) => void;
  referenceDate: Date;
  setReferenceDate: (date: Date) => void;
  setListDateFilter: (filter: 'day' | 'week' | 'month' | 'year' | 'all') => void;
  selectedTaskIds: string[];
  onBulkComplete: () => void;
  onBulkDelete: () => void;
  onSelectAll?: () => void;
  totalFiltered?: number;
}

export const DashboardHeader = React.memo<DashboardHeaderProps>(({
  activePage, dashboardFilter, searchQuery, setSearchQuery,
  viewType, setViewType, setIsTaskModalOpen,
  referenceDate, setReferenceDate, setListDateFilter,
  selectedTaskIds, onBulkComplete, onBulkDelete,
  onSelectAll, totalFiltered = 0
}) => {
  const hasSelection = selectedTaskIds.length > 0;
  const isDelayedView = activePage === 'dashboard' && dashboardFilter === 'delayed';

  return (
    <header className="px-6 py-6 bg-[#0F111A] border-b border-slate-800/60 z-30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <h1 className="text-xl font-black text-white leading-tight uppercase tracking-tighter">
            {activePage === 'dashboard' ? (dashboardFilter === 'delayed' ? 'Tarefas Atrasadas' : 'Minhas Tarefas') :
             activePage === 'priority' ? 'Favoritos' :
             activePage === 'meetings' ? 'Reuniões' : 'Equipe'}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
              {hasSelection ? `${selectedTaskIds.length} selecionadas` : 'Visualize em Lista, Kanban ou Agenda'}
            </p>
            {isDelayedView && totalFiltered > 0 && selectedTaskIds.length < totalFiltered && onSelectAll && (
              <button 
                onClick={onSelectAll}
                className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest bg-indigo-900/20 px-2 py-0.5 rounded-md border border-indigo-500/20 transition-all hover:bg-indigo-900/40"
              >
                Selecionar Todas ({totalFiltered})
              </button>
            )}
          </div>
        </div>

        <div className="relative flex-1 max-w-xl mx-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Buscar tarefa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-11 pr-5 bg-[#1A1D2B] rounded-xl text-xs font-bold text-slate-300 outline-none border border-slate-700/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-600 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-2">
          {hasSelection ? (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
              <button
                onClick={onBulkComplete}
                className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
              >
                Concluir Selecionadas
              </button>
              <button
                onClick={onBulkDelete}
                className="h-10 bg-rose-600 hover:bg-rose-700 text-white px-5 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl shadow-rose-600/20 transition-all active:scale-95"
              >
                Excluir Selecionadas
              </button>
            </div>
          ) : (
            <>
              <div className="flex bg-[#1A1D2B] p-1 rounded-xl border border-slate-700/40 ml-2">
                {[
                  { type: 'list' as const, icon: <List size={16}/> },
                  { type: 'kanban' as const, icon: <LayoutGrid size={16}/> },
                  { type: 'calendar' as const, icon: <CalendarIcon size={16}/> },
                ].map(v => (
                  <button
                    key={v.type}
                    onClick={() => setViewType(v.type)}
                    className={`p-1.5 rounded-lg transition-all ${
                      viewType === v.type
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {v.icon}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="ml-4 h-10 bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
              >
                <Plus size={16} />
                + Nova Tarefa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters Bar (Date & Tags) */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5">
              <CalendarIcon size={12} /> Data:
            </span>
            <div className="flex items-center gap-2 bg-[#1A1D2B] px-3 py-1.5 rounded-lg border border-slate-700/40 hover:border-slate-500 transition-colors">
              <input 
                type="date" 
                value={toDateString(referenceDate)}
                onChange={(e) => setReferenceDate(parseLocalDate(e.target.value))}
                className="bg-transparent text-[10px] font-bold text-slate-300 outline-none cursor-pointer"
              />
            </div>
          </div>
          <button onClick={() => setReferenceDate(new Date())} className="bg-indigo-900/20 text-indigo-400 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase border border-indigo-500/20 hover:bg-indigo-900/40 transition-all">Hoje</button>
          <button onClick={() => { setListDateFilter('all'); setReferenceDate(new Date()); setSearchQuery(''); }} className="text-slate-500 hover:text-rose-500 px-2 py-1.5 text-[10px] font-black uppercase transition-all flex items-center gap-1 group">
            <X size={12} className="group-hover:rotate-90 transition-transform" /> Limpar
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
            <Filter size={10} /> Tag:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Projeto', color: 'bg-indigo-900/30 text-indigo-400 border-indigo-500/20' },
              { label: 'Financeiro', color: 'bg-emerald-900/30 text-emerald-400 border-emerald-500/20' },
              { label: 'Urgente', color: 'bg-rose-900/30 text-rose-400 border-rose-500/20' },
              { label: 'REUNIÃO', color: 'bg-sky-900/30 text-sky-400 border-sky-500/20' },
              { label: 'REQUISITOS', color: 'bg-purple-900/30 text-purple-400 border-purple-500/20' },
            ].map(tag => (
              <button key={tag.label} className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border transition-all hover:scale-105 active:scale-95 ${tag.color}`}>
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
});
