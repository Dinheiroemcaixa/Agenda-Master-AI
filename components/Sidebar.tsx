
import React from 'react';
import { 
  Menu, Plus, LogOut, Moon, Sun, Star, ShieldCheck, Users, User as UserIcon, UserCheck, MessageSquare, 
  List, LayoutGrid, Calendar as CalendarIcon, Eye, EyeOff, Video, Clock, X, Search, 
  CheckCircle2, BarChart3, HelpCircle, Check, Ban,
  ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { User, UserRole } from '../types';
import { UserAvatar } from './UserAvatar';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentUser: User;
  users: User[];
  activePage: string;
  setActivePage: (page: string) => void;
  dashboardFilter: 'all' | 'delayed' | 'completed';
  setDashboardFilter: (filter: 'all' | 'delayed' | 'completed') => void;
  setListDateFilter: (filter: 'day' | 'week' | 'month' | 'year' | 'all') => void;
  setReferenceDate: (date: Date) => void;
  setActiveChatUserId: (id: string | null) => void;
  activeChatUserId: string | null;
  dashboardStats: { total: number; delayed: number; completed: number };
  theme: string;
  setTheme: (theme: string) => void;
  userMenuOpen: boolean;
  setUserMenuOpen: (open: boolean) => void;
  handleLogout: () => void;
  roleLabels: Record<UserRole, string>;
  onOpenProfileEdit: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen, setSidebarOpen, currentUser, users, activePage, setActivePage,
  dashboardFilter, setDashboardFilter, setListDateFilter, setReferenceDate,
  setActiveChatUserId, activeChatUserId, dashboardStats, theme, setTheme,
  userMenuOpen, setUserMenuOpen, handleLogout, roleLabels, onOpenProfileEdit
}) => {
  return (
    <aside className={`
      ${sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:w-0'} 
      fixed lg:relative bg-[#0F111A] border-r border-slate-800/60 
      transition-all duration-300 flex flex-col z-50 h-full overflow-hidden
    `}>
      {/* Sidebar Header */}
      <div className="p-6 flex flex-col items-center border-b border-slate-800/50">
        <div className="flex items-center gap-3 mb-6 w-full">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <span className="font-black text-xl">P</span>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg text-white tracking-tight leading-none">Pulse Agenda</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gestão de Tarefas</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 w-full">
          <div 
            onClick={() => { setActivePage('dashboard'); setDashboardFilter('all'); setListDateFilter('day'); setReferenceDate(new Date()); }}
            className={`rounded-xl p-2 flex flex-col items-center justify-center border cursor-pointer transition-all ${activePage === 'dashboard' && dashboardFilter === 'all' ? 'bg-indigo-600 text-white shadow-lg border-indigo-500' : 'bg-indigo-900/20 border-indigo-500/20 hover:bg-indigo-900/40 text-indigo-400'}`}
          >
            <span className={`text-xl font-black leading-none ${activePage === 'dashboard' && dashboardFilter === 'all' ? 'text-white' : 'text-indigo-400'}`}>{dashboardStats.total}</span>
            <span className={`text-[8px] font-black uppercase mt-1 ${activePage === 'dashboard' && dashboardFilter === 'all' ? 'text-indigo-100' : 'text-indigo-300'}`}>HOJE</span>
          </div>
          <div 
            onClick={() => { setActivePage('dashboard'); setDashboardFilter('delayed'); }}
            className={`rounded-xl p-2 flex flex-col items-center justify-center border cursor-pointer transition-all ${activePage === 'dashboard' && dashboardFilter === 'delayed' ? 'bg-rose-600 text-white shadow-lg border-rose-500' : 'bg-rose-900/20 border-rose-500/20 hover:bg-rose-900/40 text-rose-400'}`}
          >
            <span className={`text-xl font-black leading-none ${activePage === 'dashboard' && dashboardFilter === 'delayed' ? 'text-white' : 'text-rose-400'}`}>{dashboardStats.delayed}</span>
            <span className={`text-[8px] font-black uppercase mt-1 ${activePage === 'dashboard' && dashboardFilter === 'delayed' ? 'text-rose-100' : 'text-rose-300'}`}>ATRASO</span>
          </div>
          <div 
            onClick={() => setActivePage('history')}
            className={`rounded-xl p-2 flex flex-col items-center justify-center border cursor-pointer transition-all ${activePage === 'history' ? 'bg-emerald-600 text-white shadow-lg border-emerald-500' : 'bg-emerald-900/20 border-emerald-500/20 hover:bg-emerald-900/40 text-emerald-400'}`}
          >
            <span className={`text-xl font-black leading-none ${activePage === 'history' ? 'text-white' : 'text-emerald-400'}`}>{dashboardStats.completed}</span>
            <span className={`text-[8px] font-black uppercase mt-1 ${activePage === 'history' ? 'text-emerald-100' : 'text-emerald-300'}`}>FEITAS</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 flex-1 custom-scroll overflow-y-auto space-y-6">
        {/* PRINCIPAL Section */}
        <div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 ml-2">Principal</p>
          <div className="space-y-1">
            {[
              { id: 'dashboard', label: 'Minhas Tarefas', icon: <CheckCircle2 size={18} />, onClick: () => { setActivePage('dashboard'); setDashboardFilter('all'); setActiveChatUserId(null); }, match: activePage === 'dashboard' && dashboardFilter === 'all' },
              { id: 'delayed', label: 'Atrasadas', icon: <Clock size={18} />, onClick: () => { setActivePage('dashboard'); setDashboardFilter('delayed'); setActiveChatUserId(null); }, match: activePage === 'dashboard' && dashboardFilter === 'delayed' },
              { id: 'history', label: 'Histórico', icon: <BarChart3 size={18} />, onClick: () => { setActivePage('history'); setActiveChatUserId(null); }, match: activePage === 'history' },
            ].map(item => (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  item.match
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-500 hover:bg-slate-800/50'
                }`}
              >
                <div className={item.match ? 'text-white' : 'text-indigo-500'}>{item.icon}</div>
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* EQUIPE Section */}
        <div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 ml-2">Equipe</p>
          <div className="space-y-1">
            {[
              { id: 'team', label: 'Equipe', icon: <Users size={18} />, count: users.length, onClick: () => { setActivePage('team'); setActiveChatUserId(null); }, match: activePage === 'team' },
              { id: 'meetings', label: 'Reuniões', icon: <Video size={18} />, onClick: () => { setActivePage('meetings'); setActiveChatUserId(null); }, match: activePage === 'meetings' },
              { id: 'messages', label: 'Mensagens', icon: <MessageSquare size={18} />, onClick: () => {}, match: false },
            ].map(item => (
              <button
                key={item.id}
                onClick={item.onClick}
                style={item.id === 'messages' ? { cursor: 'default' } : {}}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  item.match
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-500 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={item.match ? 'text-white' : 'text-indigo-500'}>{item.icon}</div>
                  <span className="text-sm font-bold">{item.label}</span>
                </div>
                {item.count && item.count > 0 && (
                  <span className="bg-indigo-500 text-[10px] font-black px-2 py-0.5 rounded-full text-white">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* MEMBROS Section */}
        <div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 ml-2">Membros</p>
          <div className="space-y-1">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => { setActiveChatUserId(u.id); setActivePage('chat'); }}
                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                  activeChatUserId === u.id && activePage === 'chat'
                    ? 'bg-indigo-900/20 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-500 hover:bg-slate-800/30'
                }`}
              >
                <UserAvatar user={u} className="w-8 h-8" showStatus={true} />
                <span className="text-xs font-bold truncate uppercase">{u.name}</span>
                {u.id === currentUser.id && <span className="text-[8px] font-black text-slate-500 lowercase ml-auto self-center">eu</span>}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 space-y-3">
        <div 
          className="bg-slate-800/40 rounded-3xl p-3 border border-slate-700/50 flex items-center gap-3 relative group transition-all hover:bg-slate-800/60 cursor-pointer" 
          onClick={() => setUserMenuOpen(!userMenuOpen)}
        >
          <UserAvatar user={currentUser} className="w-10 h-10 rounded-2xl border border-slate-700/50" textSize="text-xs" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black truncate uppercase text-white leading-tight">{currentUser.name}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{roleLabels[currentUser.role]}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          
          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0F111A] rounded-2xl border border-slate-800 shadow-2xl p-2 z-[60] animate-in slide-in-from-bottom-2">
              <button
                onClick={(e) => { e.stopPropagation(); onOpenProfileEdit(); setUserMenuOpen(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-xs font-bold transition-colors text-slate-300 hover:text-white"
              >
                <UserIcon size={16} className="text-indigo-400" />
                Editar Perfil
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-xs font-bold transition-colors text-slate-300 hover:text-white"
              >
                {theme === 'dark' ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-indigo-500" />}
                Modo {theme === 'dark' ? 'Claro' : 'Escuro'}
              </button>
            </div>
          )}
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all group"
        >
          <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
          Sair
        </button>
      </div>
    </aside>
  );
};
