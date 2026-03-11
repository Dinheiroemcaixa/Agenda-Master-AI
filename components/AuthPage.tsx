
import React, { useState, useMemo } from 'react';
import { Plus, ArrowLeft, Loader2, User as UserIcon, ShieldCheck, AlertCircle, Copy, Check, Trash2, X, Settings, Eye, EyeOff, Globe, Lock, Cpu } from 'lucide-react';
import { User } from '../types';
import { UserAvatar } from './UserAvatar';

interface AuthPageProps {
  users: User[];
  onLogin: (login: string, pass: string) => Promise<void>;
  onRegister: (login: string, pass: string, name: string, email: string, roleCode?: string) => Promise<boolean>;
  onDeleteUser: (userId: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
  onClearError?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ users, onLogin, onRegister, onDeleteUser, isLoading, error, onClearError }) => {
  const [view, setView] = useState<'profiles' | 'register' | 'password'>('profiles');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCode, setRegCode] = useState(''); 
  
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  const [loginPassword, setLoginPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const sortedUsers = useMemo(() => {
    const rolePriority: Record<string, number> = { 'DEVELOPER': 1, 'ADMIN': 2, 'OPERATOR': 3 };
    return [...(users || [])].sort((a, b) => {
      const pA = rolePriority[a.role] || 4;
      const pB = rolePriority[b.role] || 4;
      return pA !== pB ? pA - pB : a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [users]);

  const roleStyles: Record<string, { label: string; class: string; icon?: React.ReactNode }> = {
    'DEVELOPER': { 
      label: 'DEV', 
      class: 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]',
      icon: <Cpu size={10} className="mr-1" />
    },
    'ADMIN': { 
      label: 'GESTORA', 
      class: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
    },
    'OPERATOR': { 
      label: 'OPERADOR', 
      class: 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
    }
  };

  const copyToClipboard = () => {
    const sql = `ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'OPERATOR';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
NOTIFY pgrst, 'reload schema';`;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Background Decorativo - Atmosférico */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-900/20 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40%] left-[5%] w-[20%] h-[20%] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Indicadores de Sistema (Topo Direito) */}
      <div className="fixed top-4 md:top-8 right-4 md:right-10 z-50 flex flex-col md:flex-row items-end md:items-center gap-3 md:gap-6">
        <div className="hidden sm:flex items-center gap-4 md:gap-6 px-4 md:px-6 py-2 md:py-3 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 select-none shadow-2xl shadow-black/40">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]"></div>
            <span className="text-[9px] md:text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em]">Online</span>
          </div>
          <div className="w-px h-3 md:h-4 bg-white/10"></div>
          <div className="flex items-center gap-2 md:gap-3">
            <Lock size={12} className="text-slate-400 md:w-[14px] md:h-[14px]" />
            <span className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Seguro</span>
          </div>
        </div>
        
        <button 
          onClick={() => setIsEditMode(!isEditMode)} 
          className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[11px] uppercase tracking-[0.2em] transition-all border shadow-2xl ${isEditMode ? 'bg-rose-600 border-rose-500 text-white shadow-rose-600/20' : 'bg-white/5 backdrop-blur-xl text-slate-300 border-white/10 hover:border-indigo-500/50 hover:text-white hover:bg-white/10 shadow-black/60'}`}
        >
          {isEditMode ? <X size={14}/> : <Settings size={14}/>}
          {isEditMode ? 'CONCLUIR' : 'CONFIGURAR'}
        </button>
      </div>

      {view === 'profiles' && (
        <div className="w-full max-w-7xl text-center z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
          <div className="mb-16">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl flex items-center justify-center text-white mb-8 mx-auto shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] border border-white/10">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-white">
              <span className="bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">Master AI</span>
            </h1>
            <p className="text-slate-500 font-black text-[11px] uppercase tracking-[0.4em] opacity-60">
              {isEditMode ? 'Gestão de Perfis de Acesso' : 'Selecione seu perfil corporativo'}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 md:gap-12 w-full max-w-6xl">
            {sortedUsers.map(user => {
              const style = roleStyles[user.role] || roleStyles['OPERATOR'];
              return (
                <div key={user.id} className="relative group perspective">
                  {isEditMode && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); if(confirm(`Excluir ${user.name}?`)) onDeleteUser(user.id); }} 
                      className="absolute -top-3 -right-3 md:-top-4 md:-right-4 z-[60] w-8 h-8 md:w-10 md:h-10 bg-rose-600 hover:bg-rose-500 text-white rounded-xl md:rounded-2xl shadow-2xl flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all border border-rose-400/50"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  
                  <div 
                    onClick={() => { if(!isEditMode) { setSelectedUser(user); if(onClearError) onClearError(); setView('password'); } }} 
                    className={`relative w-40 md:w-48 p-6 md:p-8 flex flex-col items-center rounded-[32px] md:rounded-[40px] transition-all duration-500 border h-full
                      ${isEditMode 
                        ? 'opacity-20 grayscale scale-[0.98] cursor-default bg-white/5 border-transparent' 
                        : 'cursor-pointer bg-white/[0.03] backdrop-blur-3xl border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] hover:shadow-[0_48px_80px_-16px_rgba(0,0,0,0.8),0_0_40px_rgba(79,70,229,0.1)] hover:-translate-y-4 hover:scale-[1.05] hover:border-indigo-500/40 active:scale-95'}
                    `}
                  >
                    <div className="relative mb-6 md:mb-8">
                      <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/30 transition-all duration-500"></div>
                      <UserAvatar user={user} className="w-20 h-20 md:w-24 md:h-24 rounded-full ring-2 ring-white/10 group-hover:ring-indigo-500/40 transition-all shadow-2xl" textSize="text-2xl md:text-3xl" showStatus={!isEditMode} />
                    </div>
                    
                    <div className="flex flex-col items-center text-center gap-3 md:gap-4 w-full">
                      <span className="text-sm md:text-base font-black text-white truncate w-full px-1 tracking-tight">
                        {user.name}
                      </span>
                      <div className={`flex items-center px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black tracking-widest uppercase border ${style.class}`}>
                        {style.icon}
                        {style.label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {!isEditMode && (
              <button 
                onClick={() => setView('register')} 
                className="group w-40 md:w-48 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 hover:border-indigo-500/40 hover:bg-white/[0.03] transition-all duration-500 hover:-translate-y-4 hover:scale-[1.05] min-h-[240px] md:min-h-[280px] shadow-2xl shadow-black/40"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-[#2563eb] group-hover:text-white group-hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all">
                  <Plus size={24} className="text-slate-500 group-hover:text-white transition-colors md:w-[32px] md:h-[32px]" />
                </div>
                <span className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-blue-400 transition-colors">Novo Perfil</span>
              </button>
            )}
          </div>

          {/* Rodapé Corporativo */}
          <footer className="mt-20 flex flex-col items-center gap-2 opacity-30 select-none">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Dinheiro em Caixa</span>
              <div className="w-1 h-1 bg-white/30 rounded-full"></div>
              <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Sistema Interno</span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Versão 1.0.0 • Master AI Team</p>
          </footer>
        </div>
      )}

      {view === 'password' && selectedUser && (
        <div className="w-full max-w-md p-12 bg-white/[0.03] backdrop-blur-3xl rounded-[48px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] border border-white/10 z-20 relative animate-in slide-in-from-bottom-12 duration-700">
          <button onClick={() => setView('profiles')} className="absolute top-10 left-10 p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all"><ArrowLeft size={24}/></button>
          
          <div className="flex flex-col items-center mb-12">
             <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full"></div>
                <UserAvatar user={selectedUser} className="w-28 h-28 rounded-full ring-4 ring-white/5 shadow-2xl" textSize="text-4xl" />
             </div>
             <h2 className="text-3xl font-black text-white tracking-tight">{selectedUser.name}</h2>
             <div className={`px-5 py-2 rounded-full text-[10px] font-black tracking-[0.2em] uppercase mt-5 border ${roleStyles[selectedUser.role]?.class || roleStyles['OPERATOR'].class}`}>
               {roleStyles[selectedUser.role]?.label || 'OPERADOR'}
             </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); onLogin(selectedUser.login || '', loginPassword); }} className="space-y-6">
             <div className="relative">
               <input 
                 autoFocus type={showLoginPassword ? "text" : "password"} required value={loginPassword} 
                 onChange={e => setLoginPassword(e.target.value)} placeholder="Digite sua senha de acesso" 
                 className="w-full h-16 px-8 bg-white/[0.03] rounded-2xl border border-white/10 text-white outline-none focus:ring-2 ring-indigo-500/40 font-medium text-lg transition-all placeholder:text-slate-600" 
               />
               <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-2 transition-colors">
                 {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
               </button>
             </div>
             
             {error && <p className="text-rose-400 text-[12px] text-center font-bold bg-rose-500/10 py-4 px-6 rounded-2xl border border-rose-500/20 animate-in shake duration-500">{error}</p>}
             
             <button type="submit" disabled={isLoading} className="w-full h-16 bg-[#2563eb] hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4">
               {isLoading ? <Loader2 size={24} className="animate-spin" /> : 'Sincronizar Acesso'}
             </button>
          </form>
        </div>
      )}

      {view === 'register' && (
        <div className="w-full max-w-lg p-12 bg-white/[0.03] backdrop-blur-3xl rounded-[48px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] border border-white/10 z-20 relative animate-in slide-in-from-bottom-12 duration-700">
          <div className="flex flex-col items-center mb-12 text-center">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/20 shadow-inner">
              <UserIcon size={32} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter mb-2">Novo Perfil Corporativo</h2>
            <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em]">Preencha os dados de identificação</p>
          </div>

          <form onSubmit={async (e) => { 
              e.preventDefault(); 
              if(!regName.trim() || !regPassword.trim() || !regEmail.trim()) return; 
              const baseLogin = regName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
              const success = await onRegister(baseLogin, regPassword, regName, regEmail, regCode.toUpperCase()); 
              if (success) { setRegName(''); setRegEmail(''); setRegPassword(''); setRegCode(''); setView('profiles'); }
            }} className="space-y-6">
            
            <input type="text" required value={regName} onChange={e => setRegName(e.target.value)} placeholder="Nome Completo" className="w-full h-14 px-6 bg-white/[0.03] rounded-2xl border border-white/10 text-white outline-none focus:ring-2 ring-indigo-500/40 text-sm font-medium transition-all placeholder:text-slate-600" />
            <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="E-mail profissional" className="w-full h-14 px-6 bg-white/[0.03] rounded-2xl border border-white/10 text-white outline-none focus:ring-2 ring-indigo-500/40 text-sm font-medium transition-all placeholder:text-slate-600" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <input type="password" value={regCode} onChange={e => setRegCode(e.target.value)} placeholder="Cód. Empresa" className="w-full h-14 px-6 bg-white/[0.03] rounded-2xl border border-white/10 text-white outline-none focus:ring-2 ring-indigo-500/40 font-black text-xs uppercase tracking-widest transition-all placeholder:text-slate-600" />
              <div className="relative">
                <input type={showRegPassword ? "text" : "password"} required value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Senha" className="w-full h-14 px-6 pr-12 bg-white/[0.03] rounded-2xl border border-white/10 text-white outline-none focus:ring-2 ring-indigo-500/40 font-bold text-sm transition-all placeholder:text-slate-600" />
                <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1 transition-colors">
                  {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                 <AlertCircle size={20} className="text-rose-500 flex-shrink-0" />
                 <p className="text-rose-300 text-[11px] font-bold leading-tight">
                    {error.includes('PGRST204') ? 'Estrutura do banco precisa de atualização.' : error}
                 </p>
                 {(error.includes('PGRST204') || error.includes('42703')) && (
                   <button type="button" onClick={copyToClipboard} className="ml-auto p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-all" title="Copiar SQL de Correção">
                     {copied ? <Check size={16}/> : <Copy size={16}/>}
                   </button>
                 )}
              </div>
            )}

            <div className="flex items-center gap-6 pt-6">
              <button type="button" onClick={() => setView('profiles')} className="flex-1 h-14 text-slate-500 hover:text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all">Cancelar</button>
              <button type="submit" disabled={isLoading} className="flex-1 bg-[#2563eb] hover:bg-blue-500 text-white h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3">
                {isLoading ? <Loader2 size={20} className="animate-spin"/> : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
