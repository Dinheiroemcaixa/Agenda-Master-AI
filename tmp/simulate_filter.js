const URL = 'https://sydotyjmlpmtdqvrcyek.supabase.co/rest/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ZG90eWptbHBtdGRxdnJjeWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDc4MDEsImV4cCI6MjA4NzY4MzgwMX0.r60ryJrBvCE-stS5WD3yaJ2YMUNrQLnNbIXCLGNXVvg';

const todayStr = '2026-03-17'; // Simulating today for the user

async function simulate() {
  const tasksRes = await fetch(`${URL}/tasks?select=*&completed=eq.false`, {
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  });
  const tasks = await tasksRes.json();
  
  const currentUser = { id: 'cxi8c1dcm' }; // Raffaela
  const isGlobalViewer = true;
  
  const filtered = tasks.filter(t => {
      // Regra de isolamento
      if (!isGlobalViewer && t.userId !== currentUser.id) return false;
      
      // Dashboard filter simulation (default)
      const tDateStr = t.dueDate ? t.dueDate.split('T')[0] : null;
      return tDateStr === todayStr;
  });
  
  console.log(`Total open tasks for Raffaela: ${tasks.length}`);
  console.log(`Filtered tasks for dashboard (Today): ${filtered.length}`);
  
  if (filtered.length === 0 && tasks.length > 0) {
      console.log('All tasks filtered out! Sample tasks due dates:', tasks.slice(0, 5).map(t => t.dueDate));
  }
}

simulate();
