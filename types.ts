
export type UserRole = 'DEVELOPER' | 'ADMIN' | 'OPERATOR';
export type TaskStatus = 'OPEN' | 'COMPLETED' | 'STALLED' | 'DELETED';
export type CompletionType = 'normal' | 'sem_movimento';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  login?: string;
  password?: string;
  last_seen?: string | Date | null;
  isMaster?: boolean;
  is_online?: boolean;
  profile_color?: string;
}

export interface Attachment {
  name: string;
  type: string;
  size: number;
  data: string; // Este campo armazenará o PATH do arquivo no storage do Supabase
}

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  timestamp: Date;
  type: 'text' | 'file'; // 'text' para apenas texto, 'file' para texto + anexo ou apenas anexo
  attachment?: Attachment;
  upload_status?: 'uploading' | 'sent' | 'error';
  read: boolean;
}

export type SortOption = 'MY_ORDER' | 'DATE' | 'DUE_DATE' | 'TITLE' | 'NUMBER';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export type TaskCategory = 'task' | 'reminder' | 'meeting' | 'event' | 'out_of_office' | 'slot';

export interface CustomRecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  weekDays?: number[]; // 0-6 (Domingo a Sábado)
  endType: 'NEVER' | 'ON_DATE' | 'AFTER_COUNT';
  endCount?: number;
  endDate?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  status: TaskStatus;
  completion_type?: CompletionType;
  dueDate?: Date;
  isAllDay?: boolean;
  startTime?: string;
  endTime?: string;
  recurrence?: string;
  recurrenceRule?: string; // Armazenará o JSON da CustomRecurrenceRule
  recurrenceEndDate?: Date;
  recurrenceGroupId?: string; // Novo campo para agrupamento de séries
  type?: TaskCategory;
  userId: string;
  assignedByMaster?: boolean; // Tornado opcional para evitar crash se a coluna não existir
  isStarred?: boolean;
  customId?: number;
  subtasks?: Subtask[];
  order?: number;
  isVirtual?: boolean;
  completedAt?: Date;
  priority?: 'Baixa' | 'Média' | 'Alta';
  tags?: string[];
}

export interface ColumnProps {
  user: User;
  tasks: Task[];
  allUsers: User[];
  isViewerMaster: boolean; 
  isViewerAdmin: boolean;
  sortOption: SortOption; 
  showCompleted: boolean; 
  hideHeaderIdentity?: boolean;
  pageContext?: string;
  onOpenAddTask: (userId: string) => void;
  onToggleTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onEnrichTask: (taskId: string) => void;
  onEditTask: (task: Task) => void; 
  onViewTask: (task: Task) => void;
  onDeleteUser: (userId: string) => void;
  onRenameUser: (userId: string, newName: string) => void; 
  onChangeRole: (userId: string, newRole: UserRole) => void;
  onDeleteCompletedTasks: (userId: string) => void; 
  onSortChange: (userId: string, option: SortOption) => void; 
  onToggleStar: (taskId: string) => void;
  onChangeOrder: (taskIdOrUpdates: string | { id: string, order: number }[], newOrder?: number) => void; 
  selectedTaskIds: string[];
  onToggleSelectTask: (taskId: string) => void;
  onReassignTask: (taskId: string, newUserId: string) => void;
}
