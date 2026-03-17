const URL = 'https://sydotyjmlpmtdqvrcyek.supabase.co/rest/v1/tasks?select=status';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ZG90eWptbHBtdGRxdnJjeWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDc4MDEsImV4cCI6MjA4NzY4MzgwMX0.r60ryJrBvCE-stS5WD3yaJ2YMUNrQLnNbIXCLGNXVvg';

async function check() {
  const res = await fetch(URL, {
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  });
  const data = await res.json();
  
  const stats = {};
  data.forEach(t => {
      stats[t.status] = (stats[t.status] || 0) + 1;
  });
  
  console.log('Task Status Stats:', stats);
}

check();
