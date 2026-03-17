const URL = 'https://sydotyjmlpmtdqvrcyek.supabase.co/rest/v1/tasks?select=id,dueDate,completed&completed=eq.false';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ZG90eWptbHBtdGRxdnJjeWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDc4MDEsImV4cCI6MjA4NzY4MzgwMX0.r60ryJrBvCE-stS5WD3yaJ2YMUNrQLnNbIXCLGNXVvg';

async function check() {
  const res = await fetch(URL, {
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  });
  const data = await res.json();
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  let delayed = 0;
  let future = 0;
  let todayTasks = 0;
  
  data.forEach(t => {
      const d = t.dueDate ? t.dueDate.split('T')[0] : null;
      if (!d) return;
      if (d < todayStr) delayed++;
      else if (d === todayStr) todayTasks++;
      else future++;
  });
  
  console.log(`Total Open Tasks: ${data.length}`);
  console.log(`Delayed: ${delayed}`);
  console.log(`Today: ${todayTasks}`);
  console.log(`Future: ${future}`);
}

check();
