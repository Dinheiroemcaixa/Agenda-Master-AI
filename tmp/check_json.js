const URL = 'https://sydotyjmlpmtdqvrcyek.supabase.co/rest/v1/tasks?select=id,subtasks';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ZG90eWptbHBtdGRxdnJjeWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDc4MDEsImV4cCI6MjA4NzY4MzgwMX0.r60ryJrBvCE-stS5WD3yaJ2YMUNrQLnNbIXCLGNXVvg';

async function check() {
  const res = await fetch(URL, {
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  });
  const data = await res.json();
  
  let errors = 0;
  data.forEach(t => {
      if (typeof t.subtasks === 'string') {
          try {
              JSON.parse(t.subtasks);
          } catch (e) {
              console.log(`Task ${t.id} has invalid subtasks JSON: ${t.subtasks}`);
              errors++;
          }
      }
  });
  
  console.log(`Checked ${data.length} tasks. Found ${errors} JSON errors in subtasks.`);
}

check();
