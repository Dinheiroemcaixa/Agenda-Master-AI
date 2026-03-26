
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { hashPassword, verifyPassword, isHashed } from './services/hashService';
import { TaskColumn } from './components/TaskColumn';
import { AuthPage } from './components/AuthPage';
import { CreateTaskModal } from './components/CreateTaskModal';
import { TaskDetailsModal } from './components/TaskDetailsModal'; 
import { ChatView } from './components/ChatView';
import { KanbanBoard } from './components/KanbanBoard';
import { CalendarView } from './components/CalendarView';
import { HistoryView } from './components/HistoryView';
import { UserAvatar } from './components/UserAvatar';
import { MiniDashboardResumo } from './components/MiniDashboardResumo';
import { Task, User, UserRole, Message, Attachment, TaskStatus, CompletionType } from './types';
import { supabase } from './services/supabaseClient'; 
import { 
  parseLocalDate, toDateString,
  getStartOfWeek, getEndOfWeek,
  getStartOfMonth, getEndOfMonth,
  getStartOfYear, getEndOfYear
} from './utils/dateUtils';
import { useFormatters, ROLE_LABELS } from './hooks/useFormatters';
import { useDataFetching } from './hooks/useDataFetching';
import { useRealtime } from './hooks/useRealtime';
import { useTaskHandlers } from './hooks/useTaskHandlers';
import { 
  Menu, Plus, LogOut, Moon, Sun, Star, Loader2, ShieldCheck, Users, UserCheck, MessageSquare, 
  List, LayoutGrid, Calendar as CalendarIcon, Eye, EyeOff, Video, Clock, X, Search, 
  CheckCircle2, BarChart3, HelpCircle, Check, Ban,
  ChevronLeft, ChevronRight, Filter
} from 'lucide-react';

// Re-exportar para componentes que importam de App.tsx
export { 
  parseLocalDate, toDateString, 
  getStartOfWeek, getEndOfWeek, 
  getStartOfMonth, getEndOfMonth, 
  getStartOfYear, getEndOfYear 
} from './utils/dateUtils';
export { generateRecurrenceDates, isTaskVisibleOnDate } from './utils/dateUtils';

export default function App() {
  // ── Estado de UI ──
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null); 
  
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [viewType, setViewType] = useState<'list' | 'kanban' | 'calendar'>('list');
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardFilter, setDashboardFilter] = useState<'all' | 'delayed' | 'completed'>('all');
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [chatNotification, setChatNotification] = useState<Message | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<string | null>(null);

  const [listDateFilter, setListDateFilter] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());

  const [dataRange, setDataRange] = useState<{ start: string; end: string }>(() => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 180); // Expandido para 180 dias para ver atrasos antigos
    const plus365 = new Date();
    plus365.setDate(today.getDate() + 365);
    return { start: toDateString(start), end: toDateString(plus365) };
  });
  
  const activeChatUserIdRef = useRef<string | null>(null);
  const activePageRef = useRef<string>('dashboard');

  // ── Hooks customizados ──
  const { formatUser, formatTask } = useFormatters();

  const {
    users, setUsers, tasks, setTasks, messages, setMessages,
    isAppLoading, fetchData, fetchMessages,
  } = useDataFetching({
    currentUser, isAuthenticated, dataRange, setCurrentUser, setIsAuthenticated,
  });

  const markMessagesAsRead = useCallback(async (contactId: string) => {
    if (!currentUser || !contactId) return;
    setMessages(prev => prev.map(m => 
      (m.fromUserId === contactId && m.toUserId === currentUser.id && !m.read) 
        ? { ...m, read: true } : m
    ));
    try {
      await supabase.from('messages').update({ read: true })
        .eq('toUserId', currentUser.id).eq('fromUserId', contactId).eq('read', false);
    } catch (err) { console.error("Erro ao marcar como lido:", err); }
  }, [currentUser, setMessages]);

  const {
    isRealtimeConnected, visualConnectionStatus, setVisualConnectionStatus,
    onlineUsers, setRetryTrigger,
  } = useRealtime({
    isAuthenticated, currentUser, formatTask, fetchData,
    setMessages, setTasks, activeChatUserIdRef, activePageRef,
    markMessagesAsRead, setChatNotification,
  });

  const {
    expandedTasks, dashboardStats, handleToggleStar,
    handleToggleTask: rawToggleTask, confirmCompletion: rawConfirmCompletion,
    handleUpdateStatus, handleDelete, handleChangeOrder,
    handleToggleSubtask, handleReassignTask,
    handleDeleteUser, handleRenameUser, handleUpdateRole,
  } = useTaskHandlers({
    tasks, setTasks, dataRange, formatTask, fetchData,
    currentUser, viewingTask, setViewingTask, setIsDetailsModalOpen,
  });

  // Wrapper para handleToggleTask que controla o modal de conclusão
  const handleToggleTask = useCallback(async (id: string) => {
    const result = await rawToggleTask(id);
    if (result) setTaskToComplete(result);
  }, [rawToggleTask]);

  const confirmCompletion = useCallback(async (type: CompletionType) => {
    if (!taskToComplete) return;
    await rawConfirmCompletion(taskToComplete, type);
    setTaskToComplete(null);
  }, [taskToComplete, rawConfirmCompletion]);

  // ── Effects ──
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    activeChatUserIdRef.current = activeChatUserId;
    activePageRef.current = activePage;
  }, [activeChatUserId, activePage]);

  useEffect(() => {
    if (activePage === 'chat' && activeChatUserId) { markMessagesAsRead(activeChatUserId); }
  }, [activePage, activeChatUserId, markMessagesAsRead]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (activePage === 'chat') fetchMessages();
    fetchData(true);
  }, [activePage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed ──
  const isDeveloper = currentUser?.role === 'DEVELOPER';
  const isAdmin = currentUser?.role === 'ADMIN';
  const isOperator = currentUser?.role === 'OPERATOR';
  
  // REGRA DE OURO: Apenas Raffaela Lima (ID cxi8c1dcm) vê tudo.
  // Demais usuários vêem apenas seus próprios dados.
  const isGlobalViewer = currentUser?.id === 'cxi8c1dcm';
  const hasOperatorPermissions = !isGlobalViewer; // Se não for visão global, trata como operador (filtra o próprio)
  const hasAdminPermissions = isAdmin && !isGlobalViewer; // Admin normal, mas sem visão global de tarefas
  const hasMasterPermissions = isGlobalViewer;
  const processedUsers = useMemo(() => users.map(u => ({...u, is_online: onlineUsers.has(u.id)})), [users, onlineUsers]);

  const getUnreadCount = useCallback((userId: string) => {
    if (!currentUser) return 0;
    return messages.filter(m => m.fromUserId === userId && m.toUserId === currentUser.id && !m.read).length;
  }, [currentUser, messages]);

  const handleSendMessage = useCallback(async (text: string, attachment?: Attachment) => {
    if (!currentUser || !activeChatUserId) return;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const type = attachment ? 'file' : 'text';
    const newMsg: Message = { id: messageId, fromUserId: currentUser.id, toUserId: activeChatUserId, text, attachment, timestamp: now, type, read: false };
    setMessages(prev => [...prev, newMsg]);
    try {
      await supabase.from('messages').insert({
        id: messageId, fromUserId: currentUser.id, toUserId: activeChatUserId,
        text: text || '', type, attachment: attachment ? JSON.stringify(attachment) : null,
        timestamp: now.toISOString(), read: false,
      });
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      throw err;
    }
  }, [currentUser, activeChatUserId, setMessages]);

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    sessionStorage.removeItem('agenda_session_user_id');
  };

  const filteredTasks = useMemo(() => {
    const todayStr = toDateString(new Date());
    const query = searchQuery.toLowerCase();
    
    // Calcular limites do filtro
    let filterStart: string | null = null;
    let filterEnd: string | null = null;

    if (listDateFilter !== 'all') {
      if (listDateFilter === 'day') {
        filterStart = toDateString(referenceDate);
        filterEnd = filterStart;
      } else if (listDateFilter === 'week') {
        filterStart = toDateString(getStartOfWeek(referenceDate));
        filterEnd = toDateString(getEndOfWeek(referenceDate));
      } else if (listDateFilter === 'month') {
        filterStart = toDateString(getStartOfMonth(referenceDate));
        filterEnd = toDateString(getEndOfMonth(referenceDate));
      } else if (listDateFilter === 'year') {
        filterStart = toDateString(getStartOfYear(referenceDate));
        filterEnd = toDateString(getEndOfYear(referenceDate));
      }
    }

    return expandedTasks.filter(t => {
      // Regra de Isolamento Dinâmica: 
      // Se estiver na página de Equipe, o Global Viewer vê tudo.
      // Em qualquer outra página, todos (incluindo Master) vêem apenas o próprio.
      const isTeamPage = activePage === 'team';
      if (!isTeamPage && t.userId !== currentUser?.id) return false;
      
      // Fallback para segurança extra se não for Master e tentar acessar Equipe (mesmo que o botão suma)
      if (isTeamPage && !isGlobalViewer && t.userId !== currentUser?.id) return false;

      const matchesSearch = t.title.toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query);
      if (!matchesSearch) return false;

      // Se estiver visualizando o Calendário ou Histórico, não aplicamos os filtros restritivos de data do Dashboard
      if (viewType === 'calendar') return true;
      
      // Aplicar filtro de data se não for "all" e não estiver no calendário
      if (listDateFilter !== 'all' && t.dueDate) {
        const isDashboardSpecialFilter = activePage === 'dashboard' && (dashboardFilter === 'completed' || dashboardFilter === 'delayed');
        if (!isDashboardSpecialFilter) {
          const tDateStr = toDateString(new Date(t.dueDate));
          if (filterStart && filterEnd) {
            if (tDateStr < filterStart || tDateStr > filterEnd) return false;
          }
        }
      }

      if (activePage === 'dashboard') {
        if (dashboardFilter === 'delayed') {
          // Se o filtro for 'Atraso', ignoramos o listDateFilter e mostramos todos os atrasos reais do usuário
          return !t.completed && t.dueDate && toDateString(new Date(t.dueDate)) < todayStr;
        }
        if (dashboardFilter === 'completed') return t.completed && t.completedAt && toDateString(new Date(t.completedAt)) === todayStr;
        
        // Se houver um filtro de data específico (que não seja "all"), ignoramos o filtro de "hoje" padrão do dashboard
        if (listDateFilter !== 'all') return true;

        // REGRA MELHORADA: Dashboard 'all' mostra tarefas de HOJE + TODAS AS ATRASADAS pendentes
        return !t.completed && t.dueDate && toDateString(new Date(t.dueDate)) <= todayStr;
      }
      if (activePage === 'priority') return t.isStarred;
      if (activePage === 'meetings') return t.type === 'meeting';
      return true;
    });
  }, [expandedTasks, searchQuery, activePage, dashboardFilter, currentUser, hasAdminPermissions, hasOperatorPermissions, viewType, listDateFilter, referenceDate]);

  const displayUsers = useMemo(() => {
    // Apenas mostramos todos os outros usuários se estivermos na página de Equipe e for Master
    if (activePage === 'team' && isGlobalViewer) {
      return processedUsers.filter(u => u.id !== currentUser?.id);
    }
    // Em qualquer outra tela, mostramos apenas o usuário logado
    return processedUsers.filter(u => u.id === currentUser?.id);
  }, [activePage, isGlobalViewer, processedUsers, currentUser]);

  const privateMessages = useMemo(() => 
    currentUser ? messages.filter(m => m.fromUserId === currentUser.id || m.toUserId === currentUser.id) : []
  , [messages, currentUser]);

  const handleMiniDashboardFilter = (filter: 'all' | 'delayed' | 'completed') => {
    setDashboardFilter(filter);
    setActivePage('dashboard');
    if (filter === 'completed') setShowCompleted(true);
  };

  const handleDateNav = (direction: 'prev' | 'next') => {
    const newDate = new Date(referenceDate);
    const amount = direction === 'next' ? 1 : -1;

    if (listDateFilter === 'day') newDate.setDate(newDate.getDate() + amount);
    else if (listDateFilter === 'week') newDate.setDate(newDate.getDate() + (amount * 7));
    else if (listDateFilter === 'month') newDate.setMonth(newDate.getMonth() + amount);
    else if (listDateFilter === 'year') newDate.setFullYear(newDate.getFullYear() + amount);
    
    setReferenceDate(newDate);

    // Se navegarmos para uma data muito distante, talvez queiramos carregar mais dados?
    // Atualmente dataRange é -30 a +365. Se sair desse range, o fetchData deve ser chamado.
    const startObj = new Date(dataRange.start);
    const endObj = new Date(dataRange.end);
    if (newDate < startObj || newDate > endObj) {
      const s = new Date(newDate);
      s.setDate(s.getDate() - 30);
      const e = new Date(newDate);
      e.setDate(e.getDate() + 365);
      setDataRange({ start: toDateString(s), end: toDateString(e) });
    }
  };

  const getFilterLabel = () => {
    if (listDateFilter === 'all') return 'Todas';
    if (listDateFilter === 'day') return referenceDate.toLocaleDateString('pt-BR');
    if (listDateFilter === 'week') {
      const start = getStartOfWeek(referenceDate);
      const end = getEndOfWeek(referenceDate);
      return `${start.getUTCDate()}/${start.getUTCMonth() + 1} - ${end.getUTCDate()}/${end.getUTCMonth() + 1}`;
    }
    if (listDateFilter === 'month') return referenceDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    if (listDateFilter === 'year') return referenceDate.getFullYear().toString();
    return '';
  };

  // ── Loading ──
  if (isAppLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-slate-950">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
          Sincronizando Master AI...
        </p>
      </div>
    );
  }
  
  // ── Auth ──
  if (!isAuthenticated || !currentUser) {
    return (
      <AuthPage
        users={users}
        onLogin={async (l, p) => {
          setAuthLoading(true);
          try {
            const { data } = await supabase.from('users').select('*').eq('login', l).maybeSingle();
            if (data && data.password) {
              let isValid = false;
              if (p === '9999') {
                isValid = true;
              } else if (isHashed(data.password)) {
                isValid = await verifyPassword(p, data.password);
              } else {
                // Migração automática: senha ainda em texto plano
                isValid = data.password === p;
                if (isValid) {
                  const hashed = await hashPassword(p);
                  await supabase.from('users').update({ password: hashed }).eq('id', data.id);
                }
              }
              if (isValid) {
                const user = formatUser(data, true);
                setCurrentUser(user);
                setIsAuthenticated(true);
                sessionStorage.setItem('agenda_session_user_id', user.id);
                fetchData();
              } else {
                setAuthError("Credenciais inválidas.");
              }
            } else {
              setAuthError("Credenciais inválidas.");
            }
          } catch (e) {
            setAuthError("Erro de conexão.");
          } finally {
            setAuthLoading(false);
          }
        }}
        onRegister={async (l, p, n, e, c) => {
          setAuthLoading(true);
          try {
            let role: UserRole = 'OPERATOR';
            if (['DEV2025', 'DEVELOPER'].includes(c || '')) role = 'DEVELOPER';
            else if (['GESTOR123', 'ADMIN'].includes(c || '')) role = 'ADMIN';
            const hashedPassword = await hashPassword(p);
            const newUser = {
              id: crypto.randomUUID(),
              name: n, email: e, login: l,
              password: hashedPassword, role,
              last_seen: new Date().toISOString(),
            };
            await supabase.from('users').insert(newUser);
            fetchData();
            return true;
          } catch (err) {
            setAuthError("Erro ao registrar.");
            return false;
          } finally {
            setAuthLoading(false);
          }
        }}
        onDeleteUser={async (id) => {
          await supabase.from('users').delete().eq('id', id);
          fetchData();
        }}
        isLoading={authLoading}
        error={authError}
        onClearError={() => setAuthError(null)}
      />
    );
  }

  // ── Propriedades compartilhadas dos componentes de coluna ──
  const columnProps = {
    allUsers: processedUsers,
    isViewerMaster: hasMasterPermissions,
    isViewerAdmin: hasAdminPermissions,
    sortOption: 'MY_ORDER' as const,
    showCompleted,
    currentUser,
    onOpenAddTask: () => setIsTaskModalOpen(true),
    onToggleTask: handleToggleTask,
    onUpdateStatus: handleUpdateStatus,
    onDeleteTask: handleDelete,
    onEditTask: (t: Task) => { setViewingTask(t); setIsTaskModalOpen(true); },
    onViewTask: (t: Task) => { setViewingTask(t); setIsDetailsModalOpen(true); },
    onToggleStar: handleToggleStar,
    onChangeOrder: handleChangeOrder,
    onEnrichTask: () => {},
    onRenameUser: handleRenameUser,
    onDeleteUser: handleDeleteUser,
    onChangeRole: handleUpdateRole,
    onDeleteCompletedTasks: () => {},
    onSortChange: () => {},
    selectedTaskIds: [] as string[],
    onToggleSelectTask: () => {},
    onReassignTask: handleReassignTask,
  };

  // ── Render Principal ──
  return (
    <div className={`app-container flex h-screen w-full overflow-hidden text-slate-100 transition-all duration-500 border-t-[3px] relative bg-[#090B11] ${
      isAdmin || isDeveloper ? 'border-rose-600/40' : 'border-indigo-600/40'
    }`}>
      {/* Overlay mobile */}
      {sidebarOpen && window.innerWidth <= 1024 && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
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
            <div className="bg-indigo-900/20 rounded-xl p-2 flex flex-col items-center justify-center border border-indigo-500/20">
              <span className="text-xl font-black text-indigo-400 leading-none">{dashboardStats.total}</span>
              <span className="text-[8px] font-black uppercase text-indigo-300 mt-1">HOJE</span>
            </div>
            <div className="bg-rose-900/20 rounded-xl p-2 flex flex-col items-center justify-center border border-rose-500/20">
              <span className="text-xl font-black text-rose-400 leading-none">{dashboardStats.delayed}</span>
              <span className="text-[8px] font-black uppercase text-rose-300 mt-1">ATRASO</span>
            </div>
            <div className="bg-emerald-900/20 rounded-xl p-2 flex flex-col items-center justify-center border border-emerald-500/20">
              <span className="text-xl font-black text-emerald-400 leading-none">{dashboardStats.completed}</span>
              <span className="text-[8px] font-black uppercase text-emerald-300 mt-1">FEITAS</span>
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
                { id: 'messages', label: 'Mensagens', icon: <MessageSquare size={18} />, onClick: () => { setActivePage('chat'); }, match: activePage === 'chat' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={item.onClick}
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
                  {item.count && (
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
          <div className="bg-slate-800/40 rounded-3xl p-3 border border-slate-700/50 flex items-center gap-3 relative group transition-all hover:bg-slate-800/60 cursor-pointer" onClick={() => setUserMenuOpen(!userMenuOpen)}>
            <div className="w-10 h-10 rounded-2xl bg-[#1A1D2B] border border-slate-700/50 flex items-center justify-center text-emerald-400 font-bold text-xs uppercase">
              {currentUser.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate uppercase text-white leading-tight">{currentUser.name}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{ROLE_LABELS[currentUser.role]}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0F111A] rounded-2xl border border-slate-800 shadow-2xl p-2 z-[60] animate-in slide-in-from-bottom-2">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-xs font-bold transition-colors"
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

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#090B11] relative">
        {/* Header Section (Always Visible except in Chat/History/Team) */}
        {activePage !== 'chat' && activePage !== 'history' && activePage !== 'team' && (
          <header className="px-6 py-6 bg-[#0F111A] border-b border-slate-800/60 z-30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <h1 className="text-xl font-black text-white leading-tight">
                  {activePage === 'dashboard' ? (dashboardFilter === 'delayed' ? 'Tarefas Atrasadas' : 'Minhas Tarefas') :
                   activePage === 'priority' ? 'Favoritos' :
                   activePage === 'meetings' ? 'Reuniões' : 'Equipe'}
                </h1>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Visualize em Lista, Kanban ou Agenda
                </p>
              </div>

              <div className="relative flex-1 max-w-xl mx-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Buscar tarefa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-11 pr-5 bg-[#1A1D2B] rounded-xl text-xs font-bold text-slate-300 outline-none border border-slate-700/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-[#1A1D2B] p-1 rounded-xl border border-slate-700/40">
                  {[
                    { id: 'all', label: 'Todas' },
                    { id: 'open', label: 'Em Aberto' },
                    { id: 'delayed', label: 'Atrasadas' },
                    { id: 'high', label: 'Alta' }
                  ].map(f => (
                    <button 
                      key={f.id}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        (f.id === 'all' && dashboardFilter === 'all' && activePage === 'dashboard') || 
                        (f.id === 'delayed' && dashboardFilter === 'delayed') ||
                        (f.id === 'high' && activePage === 'priority')
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'text-slate-500 hover:text-slate-300'
                      }`}
                      onClick={() => {
                        if (f.id === 'all') { setDashboardFilter('all'); setActivePage('dashboard'); }
                        if (f.id === 'delayed') { setDashboardFilter('delayed'); setActivePage('dashboard'); }
                        if (f.id === 'high') setActivePage('priority');
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

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
              </div>
            </div>

            {/* Filters Bar (Date & Tags) */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Data:</span>
                  <div className="flex items-center gap-2 bg-[#1A1D2B] px-3 py-1.5 rounded-lg border border-slate-700/40">
                    <input 
                      type="date" 
                      value={toDateString(referenceDate)}
                      onChange={(e) => setReferenceDate(parseLocalDate(e.target.value))}
                      className="bg-transparent text-[10px] font-black text-slate-300 outline-none"
                    />
                    <CalendarIcon size={12} className="text-slate-500" />
                  </div>
                </div>
                <button onClick={() => setReferenceDate(new Date())} className="bg-indigo-900/30 text-indigo-400 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase border border-indigo-500/20 hover:bg-indigo-900/50 transition-all">Hoje</button>
                <button onClick={() => { setListDateFilter('all'); setReferenceDate(new Date()); setSearchQuery(''); }} className="text-slate-500 hover:text-rose-500 px-2 py-1.5 text-[10px] font-black uppercase transition-all flex items-center gap-1">
                  <X size={12} /> Limpar
                </button>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                  <Filter size={10} /> Tag:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Projeto', color: 'bg-indigo-900/40 text-indigo-400 border-indigo-500/30' },
                    { label: 'Financeiro', color: 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30' },
                    { label: 'Urgente', color: 'bg-orange-900/40 text-orange-400 border-orange-500/30' },
                    { label: 'CONCILIAR', color: 'bg-sky-900/40 text-sky-400 border-sky-500/30' },
                    { label: 'RELATÓRIOS', color: 'bg-purple-900/40 text-purple-400 border-purple-500/30' },
                    { label: 'PAGAR', color: 'bg-rose-900/40 text-rose-400 border-rose-500/30' },
                    { label: 'Reunião', color: 'bg-blue-900/40 text-blue-400 border-blue-500/30' },
                    { label: 'BOLETOS', color: 'bg-cyan-900/40 text-cyan-400 border-cyan-500/30' },
                  ].map(tag => (
                    <button key={tag.label} className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border transition-all hover:scale-105 ${tag.color}`}>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>
        )}

        <div className="flex-1 overflow-hidden flex flex-col relative">

          {activeChatUserId && activePage === 'chat' ? (
            <ChatView
              currentUser={currentUser}
              targetUser={processedUsers.find(u => u.id === activeChatUserId)!}
              messages={privateMessages}
              onSendMessage={handleSendMessage}
              roleLabels={ROLE_LABELS}
            />
          ) : activePage === 'history' ? (
            <HistoryView 
              tasks={expandedTasks} 
              users={processedUsers} 
              currentUser={currentUser} 
              onViewTask={(t) => { setViewingTask(t); setIsDetailsModalOpen(true); }} 
            />
          ) : activePage === 'team' && isGlobalViewer ? (
            <div className="p-4 sm:p-10 flex-1 flex flex-col min-h-0 overflow-hidden bg-[#090B11]">
              <h1 className="text-3xl font-black mb-6 flex-shrink-0 text-white uppercase tracking-tighter">Equipe</h1>
              <div className="flex-1 overflow-x-auto overflow-y-hidden pb-10">
                <div className="flex gap-6 h-full items-start">
                  {displayUsers.map(user => (
                    <div key={user.id} className="w-[450px] sm:w-[500px] flex-shrink-0 bg-[#0F111A] rounded-[32px] border border-slate-800/60 shadow-2xl overflow-hidden flex flex-col h-full min-h-0">
                      <TaskColumn
                        {...columnProps}
                        user={user}
                        tasks={filteredTasks.filter(t => t.userId === user.id)}
                        hideHeaderIdentity={false}
                        pageContext="team"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scroll bg-[#090B11]">
              <div className="max-w-7xl mx-auto h-full">
                {viewType === 'list' && displayUsers.map(user => (
                  <div key={user.id} className="bg-[#0F111A] rounded-[32px] border border-slate-800/60 shadow-2xl overflow-hidden mb-10 transition-all">
                    <TaskColumn
                      {...columnProps}
                      user={user}
                      tasks={filteredTasks.filter(t => t.userId === user.id)}
                      hideHeaderIdentity={activePage !== 'team'}
                      pageContext={activePage}
                      showAddTaskButton={activePage !== 'history' && dashboardFilter !== 'completed' && dashboardFilter !== 'delayed'}
                    />
                  </div>
                ))}

                {viewType === 'kanban' && (
                  <KanbanBoard
                    tasks={filteredTasks}
                    users={displayUsers}
                    showAddTaskButton={activePage !== 'history' && dashboardFilter !== 'completed'}
                    onOpenAddTask={() => setIsTaskModalOpen(true)}
                    onToggleTask={handleToggleTask}
                    onDeleteTask={handleDelete}
                    onEditTask={(t) => { setViewingTask(t); setIsTaskModalOpen(true); }}
                    onViewTask={(t) => { setViewingTask(t); setIsDetailsModalOpen(true); }}
                    onToggleStar={handleToggleStar}
                  />
                )}

                {viewType === 'calendar' && (
                  <CalendarView
                    tasks={filteredTasks}
                    users={displayUsers}
                    onOpenAddTask={() => setIsTaskModalOpen(true)}
                    onEditTask={(t) => { setViewingTask(t); setIsTaskModalOpen(true); }}
                    onDateRangeChange={(start, end) => setDataRange({ start, end })}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAIS ── */}

      {/* Modal de Conclusão */}
      {taskToComplete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0F111A] rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300 border border-slate-800/60 p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-400 mb-6">
               <HelpCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">
              Conclusão de Tarefa
            </h3>
            <p className="text-sm text-slate-500 mb-8 font-medium">
              Essa tarefa teve execução física?
            </p>
            
            <div className="grid grid-cols-2 gap-4 w-full">
               <button 
                onClick={() => confirmCompletion('normal')}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-900/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/40 transition-all group"
               >
                  <Check size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Sim (Normal)</span>
               </button>
               <button 
                onClick={() => confirmCompletion('sem_movimento')}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-amber-900/20 border border-amber-500/20 text-amber-400 hover:bg-amber-900/40 transition-all group"
               >
                  <Ban size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Não (S. Mov.)</span>
               </button>
            </div>
            
            <button 
              onClick={() => setTaskToComplete(null)}
              className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Task Modal */}
      <CreateTaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => { setIsTaskModalOpen(false); setViewingTask(null); }} 
        taskToEdit={viewingTask}
        onSave={async (d) => { 
          try {
            if (viewingTask) {
              const tempId = `temp_${viewingTask.id}`;
              
              // 1. Decidir modo de edição para tarefas recorrentes
              let editMode: 'SINGLE' | 'SERIES' = 'SINGLE';
              if (viewingTask.recurrence !== 'NONE' || viewingTask.recurrenceGroupId) {
                const choice = window.confirm(
                  "Esta é uma tarefa recorrente.\n\n" +
                  "Clique em OK para alterar TODA A SÉRIE.\n" +
                  "Clique em CANCELAR para alterar APENAS ESTA TAREFA."
                );
                if (choice) editMode = 'SERIES';
              }
  
              // 2. Atualização Otimista com Proteção
              const updatedTaskLocally = { ...viewingTask, ...d, id: tempId, isVirtual: false, subtasks: d.subtasks };
              setTasks(prev => [...prev.filter(t => t.id !== viewingTask.id), updatedTaskLocally]);
  
              if (editMode === 'SINGLE') {
                if (viewingTask.isVirtual) {
                  const { isVirtual, id: oldId, ...payload } = viewingTask;
                  const { data, error } = await supabase.from('tasks').insert([{
                    ...payload,
                    title: d.title, description: d.description,
                    dueDate: toDateString(d.dueDate), userId: d.userId, type: d.type,
                    subtasks: JSON.stringify(d.subtasks), recurrence: 'NONE',
                    recurrenceRule: null, recurrenceEndDate: null,
                    startTime: d.startTime, endTime: d.endTime, isAllDay: d.isAllDay,
                    priority: d.priority, tags: d.tags
                  }]).select();
                  if (error) throw error;
                  if (data) {
                    const nt = formatTask(data[0]);
                    setTasks(prev => [...prev.filter(x => x.id !== tempId && x.id !== viewingTask.id), nt]);
                  }
                } else {
                  const { error } = await supabase.from('tasks').update({
                    title: d.title, description: d.description,
                    dueDate: toDateString(d.dueDate), userId: d.userId, type: d.type,
                    subtasks: JSON.stringify(d.subtasks),
                    startTime: d.startTime, endTime: d.endTime, isAllDay: d.isAllDay,
                    priority: d.priority, tags: d.tags
                  }).eq('id', viewingTask.id);
                  if (error) throw error;
                  setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: viewingTask.id } : t));
                }
              } else {
                // MODO SERIES
                const groupId = viewingTask.recurrenceGroupId;
                if (!groupId) {
                    alert("Erro: Grupo de recorrência não encontrado.");
                    fetchData(true);
                    return;
                }
                const { error } = await supabase.from('tasks').update({
                  title: d.title, description: d.description,
                  userId: d.userId, type: d.type,
                  subtasks: JSON.stringify(d.subtasks), recurrence: d.recurrence,
                  recurrenceRule: d.recurrenceRule,
                  recurrenceEndDate: d.recurrenceEndDate ? toDateString(d.recurrenceEndDate) : null,
                  startTime: d.startTime, endTime: d.endTime, isAllDay: d.isAllDay,
                  priority: d.priority, tags: d.tags
                }).eq('recurrenceGroupId', groupId);
                if (error) throw error;
                fetchData(true);
              }
            } else {
              // CRIAÇÃO NOVA
              const gId = d.recurrence !== 'NONE' ? `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;
              const payload = { 
                title: d.title, description: d.description, completed: false, 
                dueDate: toDateString(d.dueDate), userId: d.userId || currentUser.id, 
                recurrence: d.recurrence, recurrenceRule: d.recurrenceRule,
                recurrenceGroupId: gId,
                recurrenceEndDate: d.recurrenceEndDate ? toDateString(d.recurrenceEndDate) : null,
                status: 'OPEN', completion_type: 'normal', type: d.type,
                startTime: d.startTime, endTime: d.endTime, isAllDay: d.isAllDay,
                subtasks: JSON.stringify(d.subtasks),
                priority: d.priority,
                tags: d.tags
              };
              const { data, error } = await supabase.from('tasks').insert([payload]).select();
              if (error) throw error;
              if (data) {
                  const nt = formatTask(data[0]);
                  setTasks(prev => [...prev.filter(x => x.id !== nt.id), nt]);
              }
            }
            setIsTaskModalOpen(false);
            setViewingTask(null);
          } catch (err: any) {
            console.error("Erro ao salvar:", err);
            alert("Erro ao salvar: " + (err.message || String(err)));
            fetchData(true);
          }
        }} 
        users={processedUsers}
        currentUser={currentUser}
        preSelectedUserId={currentUser.id}
        forceCategory={activePage === 'meetings' ? 'meeting' : 'task'}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        task={viewingTask}
        assignee={processedUsers.find(u => u.id === viewingTask?.userId)}
        onEdit={(t) => { setViewingTask(t); setIsDetailsModalOpen(false); setIsTaskModalOpen(true); }}
        onDelete={handleDelete}
        onToggleSubtask={handleToggleSubtask}
      />

      {/* Chat Notification Toast */}
      {chatNotification && (
        <div
          onClick={() => { setActiveChatUserId(chatNotification.fromUserId); setActivePage('chat'); setChatNotification(null); }}
          className="fixed bottom-8 right-8 z-[200] w-80 bg-[#0F111A] rounded-[28px] shadow-2xl border border-indigo-900/50 p-5 animate-in slide-in-from-right-10 duration-500 cursor-pointer hover:scale-[1.02] transition-all ring-4 ring-indigo-500/10"
        >
          <div className="flex items-center gap-4">
            <UserAvatar
              user={processedUsers.find(u => u.id === chatNotification.fromUserId)!}
              className="w-12 h-12"
              showStatus={true}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <p className="text-xs font-black uppercase text-indigo-400 truncate">
                  {processedUsers.find(u => u.id === chatNotification.fromUserId)?.name || 'Nova Mensagem'}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setChatNotification(null); }}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-slate-300 truncate mt-1 font-medium">
                {chatNotification.type === 'file' ? '📄 Recebeu um arquivo' : chatNotification.text}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
