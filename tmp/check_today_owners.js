const URL = 'https://sydotyjmlpmtdqvrcyek.supabase.co/rest/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ZG90eWptbHBtdGRxdnJjeWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDc4MDEsImV4cCI6MjA4NzY4MzgwMX0.r60ryJrBvCE-stS5WD3yaJ2YMUNrQLnNbIXCLGNXVvg';

async function check() {
  const tasksRes = await fetch(`${URL}/tasks?select=userId,dueDate,completed&completed=eq.false`, {
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  });
  const tasks = await tasksRes.json();
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const ownersToday = {};
  tasks.forEach(t => {
      const d = t.dueDate ? t.dueDate.split('T')[0] : null;
      if (d === todayStr) {
          ownersToday[t.userId] = (ownersToday[t.userId] || 0) + 1;
      }
  });
  
  console.log('Open tasks for TODAY by UserID:', ownersToday);
}

check();
