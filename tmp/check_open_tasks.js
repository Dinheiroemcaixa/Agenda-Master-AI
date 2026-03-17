const URL = 'https://sydotyjmlpmtdqvrcyek.supabase.co/rest/v1/tasks?select=*&completed=eq.false&limit=100';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ZG90eWptbHBtdGRxdnJjeWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDc4MDEsImV4cCI6MjA4NzY4MzgwMX0.r60ryJrBvCE-stS5WD3yaJ2YMUNrQLnNbIXCLGNXVvg';

async function check() {
  const res = await fetch(URL, {
    headers: {
      'apikey': KEY,
      'Authorization': 'Bearer ' + KEY
    }
  });
  const data = await res.json();
  console.log('Open tasks count:', data.length);
  if (data.length > 0) {
      console.log('Sample Open Task:', JSON.stringify(data[0], null, 2));
      const usersWithOpenTasks = [...new Set(data.map(t => t.userId))];
      console.log('Users with open tasks:', usersWithOpenTasks);
      
      const tasksWithoutDueDate = data.filter(t => !t.dueDate);
      console.log('Open tasks without dueDate:', tasksWithoutDueDate.length);
  }
}

check();
