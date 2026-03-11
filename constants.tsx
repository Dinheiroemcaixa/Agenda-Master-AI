
import { User, Task } from './types';

export const INITIAL_USERS: User[] = [
  { 
    id: 'master', 
    name: 'Gerente (Master)', 
    isMaster: true,
    role: 'ADMIN',
    login: 'admin',
    password: '123'
  },
  { 
    id: 'user1', 
    name: 'Operador Comum', 
    isMaster: false,
    role: 'OPERATOR',
    login: 'operador',
    password: '123'
  },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Revisar metas mensais',
    completed: false,
    // Fix: Adding required 'status' property
    status: 'OPEN',
    userId: 'master',
    assignedByMaster: false,
    dueDate: new Date()
  },
  {
    id: 't2',
    title: 'Entregar relatório diário',
    completed: false,
    // Fix: Adding required 'status' property
    status: 'OPEN',
    userId: 'user1',
    assignedByMaster: true,
    dueDate: new Date()
  }
];