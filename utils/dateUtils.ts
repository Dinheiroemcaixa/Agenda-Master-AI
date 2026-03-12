/**
 * Utilitários de Data Robustos para America/Sao_Paulo
 */
import { Task, CustomRecurrenceRule } from '../types';

export const parseLocalDate = (dateInput: string | Date | undefined): Date => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  
  // Tenta extrair a parte YYYY-MM-DD (funciona para ISO, datas puras e formatos de timestamp de banco)
  const dateMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [_, y, m, d] = dateMatch.map(Number);
    // Cria no fuso local às 00:00:00
    return new Date(y, m - 1, d);
  }

  // Fallback para o construtor nativo se o formato for exótico
  const fallbackDate = new Date(dateInput);
  // Se for um objeto Date válido mas resultou em shift, tentamos normalizar
  // Mas o regex acima deve capturar 99% dos casos do Supabase
  return fallbackDate;
};

export const toDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Função para gerar datas de ocorrência física
 */
export const generateRecurrenceDates = (startDate: Date, endDate: Date, recurrence: string, ruleJson?: string, visibleRangeStart?: Date): Date[] => {
  const dates: Date[] = [];
  let current = new Date(startDate);
  const endLimit = new Date(endDate);
  endLimit.setHours(23, 59, 59, 999);
  
  const maxEnd = new Date(startDate);
  maxEnd.setFullYear(maxEnd.getFullYear() + 2);
  const finalLimit = endLimit < maxEnd ? endLimit : maxEnd;

  const vStart = visibleRangeStart ? new Date(visibleRangeStart) : null;
  if (vStart) vStart.setHours(0,0,0,0);

  if (vStart && current < vStart) {
    if (recurrence === 'DAILY') {
      current = new Date(vStart);
    } else if (recurrence === 'WEEKDAYS') {
      current = new Date(vStart);
    } else if (recurrence === 'WEEKLY') {
      const diffMs = vStart.getTime() - current.getTime();
      const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
      if (diffWeeks > 0) current.setDate(current.getDate() + diffWeeks * 7);
    } else if (recurrence === 'MONTHLY') {
      const monthDiff = (vStart.getFullYear() - current.getFullYear()) * 12 + (vStart.getMonth() - current.getMonth());
      if (monthDiff > 0) current.setMonth(current.getMonth() + monthDiff);
    } else if (recurrence === 'ANNUALLY') {
      const yearDiff = vStart.getFullYear() - current.getFullYear();
      if (yearDiff > 0) current.setFullYear(current.getFullYear() + yearDiff);
    }
    if (current < startDate) current = new Date(startDate);
  }

  let count = 0;
  while (current <= finalLimit && count < 1000) {
    let matches = false;
    const startDay = startDate.getDay();

    if (recurrence === 'DAILY') matches = true;
    else if (recurrence === 'WEEKDAYS') {
      const day = current.getDay();
      matches = day >= 1 && day <= 5;
    }
    else if (recurrence === 'WEEKLY') matches = current.getDay() === startDay;
    else if (recurrence === 'MONTHLY') matches = current.getDate() === startDate.getDate();
    else if (recurrence === 'ANNUALLY') matches = current.getMonth() === startDate.getMonth() && current.getDate() === startDate.getDate();
    else if (recurrence === 'CUSTOM' && ruleJson) {
       try {
         const rule: CustomRecurrenceRule = JSON.parse(ruleJson);
         const diffMs = current.getTime() - startDate.getTime();
         const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
         
         if (rule.frequency === 'DAILY') matches = diffDays % rule.interval === 0;
         else if (rule.frequency === 'WEEKLY') {
            const diffWeeks = Math.floor(diffDays / 7);
            const isCorrectWeek = diffWeeks % rule.interval === 0;
            matches = isCorrectWeek && (rule.weekDays?.includes(current.getDay()) ?? current.getDay() === startDay);
         }
         else if (rule.frequency === 'MONTHLY') {
            const monthDiff = (current.getFullYear() - startDate.getFullYear()) * 12 + (current.getMonth() - startDate.getMonth());
            matches = monthDiff % rule.interval === 0 && current.getDate() === startDate.getDate();
         }
       } catch(e) { matches = false; }
    } else {
       matches = toDateString(current) === toDateString(startDate);
       if (dates.length > 0) break;
    }

    if (matches) {
      if (!vStart || current >= vStart) {
        dates.push(new Date(current));
      }
    }
    
    current.setDate(current.getDate() + 1);
    count++;
    if (recurrence === 'NONE') break;
  }
  return dates;
};

export const isTaskVisibleOnDate = (task: Task, date: Date): boolean => {
  if (!task.dueDate) return false;
  const targetDateStr = toDateString(date);
  const taskDateStr = toDateString(new Date(task.dueDate));
  return targetDateStr === taskDateStr;
};

export const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // domingo é o início
  return new Date(d.setDate(diff));
};

export const getEndOfWeek = (date: Date): Date => {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  return d;
};

export const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const getEndOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

export const getStartOfYear = (date: Date): Date => {
  return new Date(date.getFullYear(), 0, 1);
};

export const getEndOfYear = (date: Date): Date => {
  return new Date(date.getFullYear(), 11, 31);
};
