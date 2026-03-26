import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ColumnProps, Task, User } from '../types';
import { TaskItem } from './TaskItem';
import { Plus, ChevronDown, MoreHorizontal, Shield, User as UserIcon, Briefcase, CheckCircle } from 'lucide-react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragEndEvent,
  DragStartEvent,
  MeasuringStrategy
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ExtendedColumnProps extends ColumnProps {
  pageContext?: string;
  currentUser?: User; // Adicionado
  showAddTaskButton?: boolean;
}

const SortableTaskItem = ({ task, index, ...props }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { task, index } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : 'auto',
    position: 'relative' as 'relative'
  };

  return (
    <TaskItem
      task={task}
      index={index}
      {...props}
      dragRef={setNodeRef}
      dragStyle={style}
      dragAttributes={attributes}
      dragListeners={listeners}
    />
  );
};

export const TaskColumn: React.FC<ExtendedColumnProps> = ({ 
  user, 
  tasks, 
  allUsers, 
  currentUser,
  isViewerMaster,
  isViewerAdmin,
  showCompleted,
  hideHeaderIdentity = false,
  pageContext = 'dashboard',
  showAddTaskButton = true,
  onOpenAddTask,
  onToggleTask, 
  onUpdateStatus,
  onDeleteTask,
  onEditTask,
  onViewTask,
  onDeleteUser,
  onRenameUser,
  onChangeRole,
  onToggleStar,
  onChangeOrder,
  onReassignTask
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5, // Prevent accidental drags
        },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // 1. Status de conclusão (pendentes primeiro)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      // 2. Ordem manual (PRIORIDADE MÁXIMA para pendentes)
      if (!a.completed) {
          const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
      }

      // 3. Data de vencimento (apenas para pendentes, como critério de desempate)
      if (!a.completed) {
        const getDueTime = (d?: Date) => {
          if (!d) return 2147483647000;
          const date = new Date(d);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        };

        const timeA = getDueTime(a.dueDate);
        const timeB = getDueTime(b.dueDate);

        if (timeA !== timeB) {
          return timeA - timeB;
        }
      }

      // 4. Ordem de inclusão (Tie-breaker final)
      const idA = a.customId ?? 0;
      const idB = b.customId ?? 0;
      return idA - idB;
    });
  }, [tasks]);

  const activeTasks = useMemo(() => sortedTasks.filter(t => !t.completed), [sortedTasks]);
  const completedTasks = useMemo(() => sortedTasks.filter(t => t.completed), [sortedTasks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
        console.log("Drag cancelled: dropped on same item or outside.");
        return;
    }

    const oldIndex = activeTasks.findIndex((t) => t.id === active.id);
    const newIndex = activeTasks.findIndex((t) => t.id === over.id);

    console.log('DragEnd:', { activeId: active.id, overId: over.id, oldIndex, newIndex });

    if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(activeTasks, oldIndex, newIndex);
        const prevItem = newItems[newIndex - 1];
        
        console.log("New items order (ids):", newItems.map(t => t.id));
        console.log("Prev item:", prevItem);

        // Check if we are dropping into a "null zone" (where prevItem has no order)
        // OR if the item itself has no order and we are moving it
        // OR if there is a collision (prevItem and nextItem have same order)
        const nextItem = newItems[newIndex + 1];
        const isNullZone = (prevItem && (prevItem.order === null || prevItem.order === undefined)) || 
                           (newItems[newIndex].order === null || newItems[newIndex].order === undefined);
        const isCollision = prevItem && nextItem && prevItem.order === nextItem.order;

        if (isNullZone || isCollision) {
             
             console.log("Detected null zone, null order item, or collision. Performing batch update.");
             const updates: { id: string, order: number }[] = [];
             let currentOrder = 0;
             
             // Iterate through the list up to the new position + 1 (to ensure next item is also correct if needed)
             // Actually, we should just re-index everything up to newIndex to be safe, 
             // or even better, re-index the whole list if it's messy? 
             // Let's stick to "up to newIndex" for performance, but make sure we handle the dragged item.
             
             for (let i = 0; i < newItems.length; i++) {
                 const t = newItems[i];
                 let order = t.order;
                 
                 // If item has no order, or if its order violates the sequence (is less than or equal to previous),
                 // assign a new order.
                 // We use <= because orders must be strictly increasing.
                 if (order === null || order === undefined || order <= currentOrder) {
                     order = currentOrder + 1000;
                     updates.push({ id: t.id, order });
                 }
                 currentOrder = order;
                 
                 // Optimization: If we passed newIndex and the order is valid and greater than current, we can stop?
                 // No, because subsequent items might also be null.
                 // But we can stop if we find a valid order that is > currentOrder.
                 if (i > newIndex && order !== null && order !== undefined && order > currentOrder) {
                     // break; // Safer to just continue for now to ensure consistency
                 }
             }
             
             console.log("Batch updates:", updates);
             if (updates.length > 0) {
                 onChangeOrder(updates);
             }
        } else {
            // Standard logic for ordered list
            const nextItem = newItems[newIndex + 1];
            let newOrder = 0;
            const prevOrder = prevItem?.order ?? 0;
            const nextOrder = nextItem?.order ?? (prevOrder + 2000);

            if (!prevItem) {
                newOrder = (nextItem?.order ?? 1000) / 2;
            } else if (!nextItem) {
                newOrder = prevOrder + 1000;
            } else {
                newOrder = (prevOrder + nextOrder) / 2;
            }
            
            console.log("Standard update:", { id: active.id, newOrder });
            onChangeOrder(active.id as string, newOrder);
        }
    }
  };

  const badge = (() => {
    switch(user.role) {
      case 'DEVELOPER': return { label: 'Desenvolvedor', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30', icon: <Shield size={14}/> };
      case 'ADMIN': return { label: 'Gestora', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30', icon: <Briefcase size={14}/> };
      default: return { label: 'Operador', color: 'text-slate-500 bg-slate-50 dark:bg-slate-800/50', icon: <UserIcon size={14}/> };
    }
  })();

  const isMeetingContext = pageContext === 'meetings';
  const labelPrefix = isMeetingContext ? 'Reunião' : 'Tarefa';

  const activeTask = activeId ? activeTasks.find(t => t.id === activeId) : null;

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <div className="h-full min-h-0 w-full flex flex-col group/section">
      <div className="flex items-center gap-3 px-6 py-5 bg-[#0F111A]/80 backdrop-blur-md border-b border-slate-800/60">
        <button onClick={() => setIsCollapsed(!isCollapsed)} className={`p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 transition-all ${isCollapsed ? '-rotate-90' : ''}`}><ChevronDown size={18} /></button>
        
        {!hideHeaderIdentity && (
            <div className="flex items-center gap-4">
                 <div className={`p-2.5 rounded-2xl shadow-lg ${badge.color} border border-white/5`}>{badge.icon}</div>
                 <div className="flex flex-col">
                    <h2 className="font-black text-sm text-white uppercase tracking-tight leading-tight">{user.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[8px] uppercase font-black tracking-widest ${badge.color} px-1.5 py-0.5 rounded-md border border-white/5`}>{badge.label}</span>
                      <span className="text-[10px] font-bold text-slate-500 tabular-nums bg-slate-800/40 px-1.5 rounded-md border border-slate-700/20">{tasks.length} {tasks.length === 1 ? 'item' : 'itens'}</span>
                    </div>
                 </div>
            </div>
        )}

        {(isViewerMaster || isViewerAdmin) && (
          <div className="relative ml-auto" ref={menuRef}>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="opacity-0 group-hover/section:opacity-100 p-2 text-slate-500 hover:text-slate-300 transition-all"><MoreHorizontal size={18} /></button>
              {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-[#0F111A] rounded-2xl shadow-2xl border border-slate-800/60 z-50 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <button onClick={() => { onRenameUser(user.id, window.prompt("Novo nome:", user.name) || user.name); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-300 hover:bg-slate-800 transition-colors">Renomear Colaborador</button>
                      {isViewerMaster && (
                        <button onClick={() => { 
                          const roles: Record<string, string> = { 'OPERATOR': 'OPERADOR', 'ADMIN': 'GESTORA', 'DEVELOPER': 'DESENVOLVEDOR' };
                          const currentRole = user.role;
                          const nextRole = currentRole === 'OPERATOR' ? 'ADMIN' : (currentRole === 'ADMIN' ? 'DEVELOPER' : 'OPERATOR');
                          if (window.confirm(`Alterar cargo de ${user.name} para ${roles[nextRole]}?`)) {
                            onChangeRole(user.id, nextRole as any);
                          }
                          setIsMenuOpen(false);
                        }} className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-300 hover:bg-slate-800 transition-colors tracking-tight">Alterar Cargo Hierárquico</button>
                      )}
                      <div className="h-px bg-slate-800/60 my-1 mx-2"></div>
                      <button onClick={() => onDeleteUser(user.id)} className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-rose-500 hover:bg-rose-900/20 transition-colors">Remover Colaborador</button>
                  </div>
              )}
          </div>
        )}
      </div>

      {!isCollapsed && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-[50px_1fr_120px_110px_90px_110px_60px] gap-4 px-6 py-2.5 border-b border-slate-800/60 bg-[#1A1D2B]/30">
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">#</div>
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{isMeetingContext ? 'REUNIÃO' : 'TAREFA'}</div>
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">RESPONSÁVEL</div>
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">DATA/HORA</div>
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">PRIORIDADE</div>
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">STATUS</div>
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">AÇÕES</div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll pb-10">
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragStart={handleDragStart} 
                onDragEnd={handleDragEnd}
                measuring={{
                  droppable: {
                    strategy: MeasuringStrategy.Always,
                  },
                }}
              >
                <SortableContext 
                    items={activeTasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {activeTasks.map((task, index) => (
                        <SortableTaskItem key={task.id} task={task} assignee={user} allUsers={allUsers} currentUser={currentUser} onToggle={onToggleTask} onUpdateStatus={onUpdateStatus} onDelete={onDeleteTask} onEdit={onEditTask} onViewTask={onViewTask} onToggleStar={onToggleStar} onReassignTask={onReassignTask} onChangeOrder={onChangeOrder} index={index} onEnrich={()=>{}} />
                    ))}
                </SortableContext>
                {createPortal(
                  <DragOverlay dropAnimation={dropAnimation}>
                      {activeTask ? (
                          <TaskItem 
                            task={activeTask} 
                            assignee={user} 
                            allUsers={allUsers} 
                            currentUser={currentUser} 
                            onToggle={onToggleTask} 
                            onUpdateStatus={onUpdateStatus} 
                            onDelete={onDeleteTask} 
                            onEdit={onEditTask} 
                            onViewTask={onViewTask} 
                            onToggleStar={onToggleStar} 
                            onReassignTask={onReassignTask} 
                            onChangeOrder={onChangeOrder} 
                            index={activeTasks.findIndex(t => t.id === activeId)} 
                            onEnrich={()=>{}} 
                            isOverlay={true}
                          />
                      ) : null}
                  </DragOverlay>,
                  document.body
                )}
              </DndContext>

              {showAddTaskButton && (
                <button onClick={() => onOpenAddTask(user.id)} className="flex items-center gap-4 group px-8 py-6 text-slate-500 hover:text-indigo-400 transition-all text-[13px] w-full text-left hover:bg-indigo-900/10 border-b border-dashed border-slate-800/40">
                    <div className="w-5 h-5 rounded-lg border-2 border-slate-700 border-dashed flex items-center justify-center group-hover:border-indigo-500 transition-colors"><Plus size={12} /></div>
                    <span className="font-black uppercase text-[10px] tracking-widest">Adicionar nova {labelPrefix.toLowerCase()} para {user.name.split(' ')[0]}</span>
                </button>
              )}

              {showCompleted && completedTasks.length > 0 && (
                <div className="mt-8 border-t border-slate-800/60 animate-in fade-in slide-in-from-bottom-2">
                  <div className="px-8 py-5 bg-[#0F111A]/40 flex items-center gap-3">
                     <CheckCircle size={14} className="text-emerald-500" />
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{labelPrefix}s Concluídas ({completedTasks.length})</h3>
                  </div>
                  {completedTasks.map((task, index) => (
                      <TaskItem key={task.id} task={task} assignee={user} allUsers={allUsers} currentUser={currentUser} onToggle={onToggleTask} onUpdateStatus={onUpdateStatus} onDelete={onDeleteTask} onEdit={onEditTask} onViewTask={onViewTask} onToggleStar={onToggleStar} onReassignTask={onReassignTask} onChangeOrder={onChangeOrder} index={activeTasks.length + index} onEnrich={()=>{}} />
                  ))}
                </div>
              )}
            </div>
          </div>
      )}
    </div>
  );
};
