const URL = 'https://sydotyjmlpmtdqvrcyek.supabase.co/rest/v1/tasks?select=id,title';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ZG90eWptbHBtdGRxdnJjeWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDc4MDEsImV4cCI6MjA4NzY4MzgwMX0.r60ryJrBvCE-stS5WD3yaJ2YMUNrQLnNbIXCLGNXVvg';

async function check() {
  const res = await fetch(URL, {
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  });
  const data = await res.json();
  
  const badTasks = data.filter(t => !t.id || !t.title);
  console.log(`Checked ${data.length} tasks. Found ${badTasks.length} tasks with missing id or title.`);
  if (badTasks.length > 0) {
      console.log('Bad tasks:', badTasks);
  }
}

check();
