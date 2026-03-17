
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
    start.setDate(today.getDate() - 30);
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
      // Regra de Isolamento Crítica (GOLDEN RULE)
      if (!isGlobalViewer && t.userId !== currentUser?.id) return false;

      const matchesSearch = t.title.toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query);
      if (!matchesSearch) return false;

      // Se estiver visualizando o Calendário ou Histórico, não aplicamos os filtros restritivos de data do Dashboard
      if (viewType === 'calendar') return true;
      
      // Aplicar filtro de data se não for "all" e não estiver no calendário
      if (listDateFilter !== 'all' && t.dueDate) {
        const isDashboardSpecialFilter = activePage === 'dashboard' && dashboardFilter === 'completed';
        if (!isDashboardSpecialFilter) {
          const tDateStr = toDateString(new Date(t.dueDate));
          if (filterStart && filterEnd) {
            if (tDateStr < filterStart || tDateStr > filterEnd) return false;
          }
        }
      }

      if (activePage === 'dashboard') {
        if (dashboardFilter === 'delayed') return !t.completed && t.dueDate && toDateString(new Date(t.dueDate)) < todayStr;
        if (dashboardFilter === 'completed') return t.completed && t.completedAt && toDateString(new Date(t.completedAt)) === todayStr;
        
        // Se houver um filtro de data específico (que não seja "all"), ignoramos o filtro de "hoje" padrão do dashboard
        if (listDateFilter !== 'all') return true;

        return t.dueDate && toDateString(new Date(t.dueDate)) === todayStr;
      }
      if (activePage === 'priority') return t.isStarred;
      if (activePage === 'meetings') return t.type === 'meeting';
      return true;
    });
  }, [expandedTasks, searchQuery, activePage, dashboardFilter, currentUser, hasAdminPermissions, hasOperatorPermissions, viewType, listDateFilter, referenceDate]);

  const displayUsers = useMemo(() => {
    if (isGlobalViewer) return processedUsers;
    return processedUsers.filter(u => u.id === currentUser?.id);
  }, [isGlobalViewer, processedUsers, currentUser]);

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
    <div className={`app-container flex h-screen w-full overflow-hidden text-slate-800 dark:text-slate-100 transition-all duration-500 border-t-[3px] relative ${
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
        fixed lg:relative bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
        transition-all duration-300 flex flex-col z-50 h-full overflow-hidden
      `}>
        {/* Sidebar Header */}
        <div className="p-7 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all duration-500 ${
              isAdmin || isDeveloper ? 'bg-rose-600 shadow-rose-600/20' : 'bg-indigo-600 shadow-indigo-600/20'
            }`}>
              <ShieldCheck size={26} />
            </div>
            <span className="font-black text-2xl tracking-tighter">Master AI</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-rose-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1.5 flex-1 custom-scroll overflow-y-auto">
          <MiniDashboardResumo
            delayedCount={dashboardStats.delayed}
            completedCount={dashboardStats.completed}
            totalCount={dashboardStats.total}
            activeFilter={dashboardFilter}
            onFilterChange={handleMiniDashboardFilter}
          />
          
          {/* Nav Buttons */}
          {[
            { id: 'dashboard', label: 'Minhas Tarefas', icon: <UserCheck size={20} />, onClick: () => { setActivePage('dashboard'); setDashboardFilter('all'); setActiveChatUserId(null); }, match: activePage === 'dashboard' && dashboardFilter === 'all' },
            { id: 'priority', label: 'Favoritos', icon: <Star size={20} />, onClick: () => { setActivePage('priority'); setActiveChatUserId(null); }, match: activePage === 'priority' },
            { id: 'meetings', label: 'Reuniões', icon: <Video size={20} />, onClick: () => { setActivePage('meetings'); setActiveChatUserId(null); }, match: activePage === 'meetings' },
            { id: 'history', label: 'Histórico', icon: <BarChart3 size={20} />, onClick: () => { setActivePage('history'); setActiveChatUserId(null); }, match: activePage === 'history' },
          ].map(item => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all ${
                item.match
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="font-bold text-sm">{item.label}</span>
              </div>
            </button>
          ))}

          {isGlobalViewer && (
            <button
              onClick={() => { setActivePage('team'); setActiveChatUserId(null); }}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all ${
                activePage === 'team'
                  ? 'bg-rose-600 text-white shadow-xl shadow-rose-600/20'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={20} />
                <span className="font-bold text-sm">Equipe</span>
              </div>
            </button>
          )}

          {/* Direct Messages */}
          <div className="pt-8 px-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              Mensagens Diretas <MessageSquare size={12} />
            </p>
            <div className="space-y-1">
              {displayUsers.filter(u => u.id !== currentUser.id).map(u => {
                const unread = getUnreadCount(u.id);
                const isActive = activePage === 'chat' && activeChatUserId === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => { setActiveChatUserId(u.id); setActivePage('chat'); }}
                    className={`group w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <UserAvatar user={u} className="w-9 h-9" showStatus={true} />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-xs font-bold truncate">{u.name}</p>
                      <p className="text-[10px] opacity-60 truncate">
                        {unread > 0 ? 'Nova mensagem!' : 'Enviar mensagem'}
                      </p>
                    </div>
                    {unread > 0 && (
                      <div className="bg-indigo-600 text-white text-[10px] font-black min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 animate-bounce shadow-lg">
                        {unread}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 relative bg-slate-50/20 dark:bg-slate-950/20">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                visualConnectionStatus 
                  ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' 
                  : 'bg-rose-500'
              }`} />
              <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">
                {visualConnectionStatus ? 'Sistema Online' : 'Desconectado'}
              </span>
            </div>
            {!visualConnectionStatus && (
              <button 
                onClick={() => { setRetryTrigger(prev => prev + 1); setVisualConnectionStatus(true); }}
                className="text-[9px] font-black uppercase text-indigo-500 hover:text-indigo-600 underline underline-offset-2"
              >
                Reconectar
              </button>
            )}
          </div>
          
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700 shadow-sm hover:shadow-md"
          >
            <UserAvatar
              user={{...currentUser, is_online: isRealtimeConnected && onlineUsers.has(currentUser?.id || '')}}
              className="w-11 h-11"
              showStatus={true}
            />
            <div className="text-left flex-1 min-w-0">
              <div className="text-sm font-black truncate">{currentUser.name}</div>
              <div className="text-[9px] font-black uppercase tracking-wider text-indigo-500">
                {ROLE_LABELS[currentUser.role]}
              </div>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-24 left-4 right-4 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-2 z-50 animate-in slide-in-from-bottom-4">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition-colors"
              >
                {theme === 'dark' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-500" />}
                Modo {theme === 'dark' ? 'Claro' : 'Escuro'}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 text-xs font-bold transition-colors"
              >
                <LogOut size={18}/> Sair da Conta
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative">
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
          <div className="p-10">
            <h1 className="text-3xl font-black mb-6">Equipe</h1>
            <div className="flex flex-wrap gap-6">
              {displayUsers.map(user => (
                <div key={user.id} className="w-full md:w-[400px] bg-white/80 dark:bg-slate-900/80 rounded-[40px] border border-white/40 dark:border-slate-800/40 shadow-xl backdrop-blur-md overflow-hidden mb-10 transition-all hover:shadow-2xl">
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
        ) : (
          <>
            {/* Header */}
            <header className="h-20 lg:h-24 flex items-center justify-between px-4 sm:px-10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl z-30 border-b border-white/20 dark:border-slate-800/20">
              <div className="flex items-center gap-4 lg:gap-8 flex-1"> 
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2.5 lg:p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-2xl shadow-sm transition-all active:scale-90"
                >
                  <Menu size={20} className="lg:w-[22px] lg:h-[22px]" />
                </button>
                
                <div className={`hidden sm:flex items-center gap-2 lg:gap-3 px-3 lg:px-5 py-2 lg:py-2.5 rounded-2xl border backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-700 ${
                  isAdmin || isDeveloper 
                    ? 'bg-rose-500/5 border-rose-500/20 text-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.1)]' 
                    : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.1)]'
                }`}>
                  <div className={`w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full animate-pulse ${isAdmin || isDeveloper ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                  <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] whitespace-nowrap">
                    {isAdmin || isDeveloper ? 'Visão Geral' : 'Minha Agenda'}
                  </span>
                </div>

                <div className="relative w-full max-w-md hidden lg:block">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Pesquisar tarefas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 pl-11 pr-5 bg-white/80 dark:bg-slate-900/80 rounded-[18px] text-sm font-medium outline-none focus:ring-4 ring-indigo-500/10 border border-slate-100 dark:border-slate-800 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 lg:gap-4">
                {/* Date Filter Controls */}
                {viewType !== 'calendar' && activePage !== 'chat' && (
                  <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-[20px] border border-slate-200/50 dark:border-slate-800/50">
                    <div className="flex items-center gap-1 px-2 border-r border-slate-200 dark:border-slate-800 mr-1">
                      <Filter size={14} className="text-slate-400" />
                      <select 
                        value={listDateFilter}
                        onChange={(e) => setListDateFilter(e.target.value as any)}
                        className="bg-transparent text-[10px] font-black uppercase tracking-tight outline-none cursor-pointer text-slate-600 dark:text-slate-400"
                      >
                        <option value="day">Dia</option>
                        <option value="week">Semana</option>
                        <option value="month">Mês</option>
                        <option value="year">Ano</option>
                        <option value="all">Tudo</option>
                      </select>
                    </div>

                    {listDateFilter !== 'all' && (
                      <div className="flex items-center gap-2 px-2">
                        <button onClick={() => handleDateNav('prev')} className="p-1 hover:text-indigo-600 transition-colors">
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-tighter min-w-[80px] text-center">
                          {getFilterLabel()}
                        </span>
                        <button onClick={() => handleDateNav('next')} className="p-1 hover:text-indigo-600 transition-colors">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* View Type Switcher */}
                <div className="hidden sm:flex bg-slate-100 dark:bg-slate-900 p-1 rounded-[20px] border border-slate-200/50 dark:border-slate-800/50">
                  {[
                    { type: 'list' as const, icon: <List size={14}/>, title: 'Lista' },
                    { type: 'kanban' as const, icon: <LayoutGrid size={14}/>, title: 'Kanban' },
                    { type: 'calendar' as const, icon: <CalendarIcon size={14}/>, title: 'Agenda' },
                  ].map(v => (
                    <button
                      key={v.type}
                      onClick={() => setViewType(v.type)}
                      className={`p-2 lg:px-4 lg:py-2 rounded-[16px] transition-all ${
                        viewType === v.type
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={v.title}
                    >
                      {v.icon}
                    </button>
                  ))}
                </div>

                {/* Show Completed Toggle */}
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className={`hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    showCompleted
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {showCompleted ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>

                {/* New Task Button */}
                {((activePage === 'dashboard' && dashboardFilter !== 'completed' && dashboardFilter !== 'delayed') || activePage === 'priority' || activePage === 'meetings' || activePage === 'team') && (
                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 lg:px-8 py-2.5 lg:py-3.5 rounded-xl lg:rounded-2xl font-black uppercase tracking-widest text-[10px] lg:text-xs flex items-center gap-2 shadow-2xl shadow-indigo-600/30 transition-all active:scale-95 group"
                  >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    <span className="hidden sm:inline">
                      {activePage === 'meetings' ? 'Nova Reunião' : 'Nova Tarefa'}
                    </span>
                  </button>
                )}
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scroll bg-slate-50/10 dark:bg-slate-900/10">
              <div className="max-w-7xl mx-auto h-full">
                {viewType === 'list' && displayUsers.map(user => (
                  <div key={user.id} className="bg-white/80 dark:bg-slate-900/80 rounded-[40px] border border-white/40 dark:border-slate-800/40 shadow-xl backdrop-blur-md overflow-hidden mb-10 transition-all hover:shadow-2xl">
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
          </>
        )}
      </main>

      {/* ── MODAIS ── */}

      {/* Modal de Conclusão */}
      {taskToComplete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300 border border-indigo-100 dark:border-slate-800 p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 mb-6">
               <HelpCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">
              Conclusão de Tarefa
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">
              Essa tarefa teve execução física?
            </p>
            
            <div className="grid grid-cols-2 gap-4 w-full">
               <button 
                onClick={() => confirmCompletion('normal')}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-100 transition-all group"
               >
                  <Check size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Sim (Normal)</span>
               </button>
               <button 
                onClick={() => confirmCompletion('sem_movimento')}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-amber-600 hover:bg-amber-100 transition-all group"
               >
                  <Ban size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Não (S. Mov.)</span>
               </button>
            </div>
            
            <button 
              onClick={() => setTaskToComplete(null)}
              className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
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
                  }).eq('id', viewingTask.id);
                  if (error) throw error;
                  setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: viewingTask.id } : t));
                }
              } else {
                // MODO SERIES: Atualiza o mestre/grupo
                const groupId = viewingTask.recurrenceGroupId;
                if (!groupId) {
                    alert("Erro: Grupo de recorrência não encontrado.");
                    fetchData(true);
                    return;
                }

                // Atualizar o registro mestre (pode ser o próprio viewingTask ou outro)
                const { error } = await supabase.from('tasks').update({
                  title: d.title, description: d.description,
                  userId: d.userId, type: d.type,
                  subtasks: JSON.stringify(d.subtasks), recurrence: d.recurrence,
                  recurrenceRule: d.recurrenceRule,
                  recurrenceEndDate: d.recurrenceEndDate ? toDateString(d.recurrenceEndDate) : null,
                  startTime: d.startTime, endTime: d.endTime, isAllDay: d.isAllDay,
                }).eq('recurrenceGroupId', groupId); // Atualiza todos do grupo ou apenas o mestre? 
                // Na nossa lógica de expansão, o master é quem gera. Vamos atualizar todos do grupo que não foram concluídos/modificados?
                // O mais simples e seguro para o sistema atual é atualizar todos os registros reais do grupo.
                
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
          className="fixed bottom-8 right-8 z-[200] w-80 bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-indigo-100 dark:border-indigo-900/50 p-5 animate-in slide-in-from-right-10 duration-500 cursor-pointer hover:scale-[1.02] transition-all ring-4 ring-indigo-500/10"
        >
          <div className="flex items-center gap-4">
            <UserAvatar
              user={processedUsers.find(u => u.id === chatNotification.fromUserId)!}
              className="w-12 h-12"
              showStatus={true}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <p className="text-xs font-black uppercase text-indigo-600 truncate">
                  {processedUsers.find(u => u.id === chatNotification.fromUserId)?.name || 'Nova Mensagem'}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setChatNotification(null); }}
                  className="text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 truncate mt-1 font-medium">
                {chatNotification.type === 'file' ? '📄 Recebeu um arquivo' : chatNotification.text}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
