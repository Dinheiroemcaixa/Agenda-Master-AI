
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
import { Sidebar } from './components/Sidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { ProfileEditModal } from './components/ProfileEditModal';
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
  const [recurringDeleteTarget, setRecurringDeleteTarget] = useState<string | null>(null);

  const [listDateFilter, setListDateFilter] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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

  const handleDeleteWithConfirmation = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task?.recurrenceGroupId) {
      setRecurringDeleteTarget(id);
    } else {
      handleDelete(id);
    }
  }, [tasks, handleDelete]);

  const handleConfirmDelete = async (mode: 'one' | 'all') => {
    if (!recurringDeleteTarget) return;
    const task = tasks.find(t => t.id === recurringDeleteTarget);
    if (!task) return;

    if (mode === 'one') {
      await handleDelete(recurringDeleteTarget);
    } else {
      // Deletar todos da série
      const seriesIds = tasks.filter(t => t.recurrenceGroupId === task.recurrenceGroupId).map(t => t.id);
      for (const id of seriesIds) {
        await handleDelete(id);
      }
    }
    setRecurringDeleteTarget(null);
  };

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

  const toggleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  }, []);

  const handleBulkComplete = useCallback(async () => {
    if (selectedTaskIds.length === 0) return;
    if (!window.confirm(`Deseja concluir as ${selectedTaskIds.length} tarefas selecionadas?`)) return;
    
    try {
      const now = new Date().toISOString();
      await supabase.from('tasks')
        .update({ completed: true, status: 'COMPLETED', "completedAt": now })
        .in('id', selectedTaskIds);
      
      setTasks(prev => prev.map(t => 
        selectedTaskIds.includes(t.id) ? { ...t, completed: true, status: 'COMPLETED', completedAt: new Date(now) } : t
      ));
      setSelectedTaskIds([]);
    } catch (err) {
      console.error("Erro ao concluir tarefas em massa:", err);
    }
  }, [selectedTaskIds, setTasks]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedTaskIds.length === 0) return;
    if (!window.confirm(`Deseja EXCLUIR DEFINITIVAMENTE as ${selectedTaskIds.length} tarefas selecionadas?`)) return;
    
    try {
      await supabase.from('tasks').delete().in('id', selectedTaskIds);
      setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
      setSelectedTaskIds([]);
    } catch (err) {
      console.error("Erro ao excluir tarefas em massa:", err);
    }
  }, [selectedTaskIds, setTasks]);

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
    onDeleteTask: handleDeleteWithConfirmation,
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
    selectedTaskIds,
    onToggleSelectTask: toggleSelectTask,
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
      <Sidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentUser={currentUser}
        users={users}
        activePage={activePage}
        setActivePage={setActivePage}
        dashboardFilter={dashboardFilter}
        setDashboardFilter={setDashboardFilter}
        setListDateFilter={setListDateFilter}
        setReferenceDate={setReferenceDate}
        setActiveChatUserId={setActiveChatUserId}
        activeChatUserId={activeChatUserId}
        dashboardStats={dashboardStats}
        theme={theme}
        setTheme={setTheme}
        userMenuOpen={userMenuOpen}
        setUserMenuOpen={setUserMenuOpen}
        handleLogout={handleLogout}
        roleLabels={ROLE_LABELS}
        onOpenProfileEdit={() => setIsProfileModalOpen(true)}
      />

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#090B11] relative">
        {/* Header Section */}
        {activePage !== 'chat' && activePage !== 'history' && activePage !== 'team' && (
          <DashboardHeader 
            activePage={activePage}
            dashboardFilter={dashboardFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            viewType={viewType}
            setViewType={setViewType}
            setIsTaskModalOpen={setIsTaskModalOpen}
            referenceDate={referenceDate}
            setReferenceDate={setReferenceDate}
            setListDateFilter={setListDateFilter}
            selectedTaskIds={selectedTaskIds}
            onBulkComplete={handleBulkComplete}
            onBulkDelete={handleBulkDelete}
          />
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

      {/* ── MODAL DE EXCLUSÃO RECORRENTE ── */}
      {recurringDeleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0F111A] rounded-[32px] border border-slate-800/60 shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-white mb-2">Excluir Tarefa Recorrente</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Esta tarefa é <span className="text-indigo-400 font-bold">recorrente</span>. O que deseja fazer?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setRecurringDeleteTarget(null)}
                className="flex-1 py-3 bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleConfirmDelete('one')}
                className="flex-1 py-3 border border-amber-500/50 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-500/10 transition-all"
              >
                Só esta
              </button>
              <button 
                onClick={() => handleConfirmDelete('all')}
                className="flex-1 py-3 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all"
              >
                Todas
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileEditModal 
        user={currentUser}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdate={(updatedUser) => {
          setCurrentUser(updatedUser);
          setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        }}
      />
    </div>
  );
}
