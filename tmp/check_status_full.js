const URL = 'https://sydotyjmlpmtdqvrcyek.supabase.co/rest/v1/tasks?select=*&limit=5000';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ZG90eWptbHBtdGRxdnJjeWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDc4MDEsImV4cCI6MjA4NzY4MzgwMX0.r60ryJrBvCE-stS5WD3yaJ2YMUNrQLnNbIXCLGNXVvg';

async function check() {
  const res = await fetch(URL, {
    headers: {
      'apikey': KEY,
      'Authorization': 'Bearer ' + KEY
    }
  });
  const data = await res.json();
  const fs = require('fs');
  
  const results = {
    total: data.length,
    statusCounts: {},
    completedCounts: {},
    userCounts: {},
    sample: data.length > 0 ? data[0] : null
  };
  
  data.forEach(t => {
    results.statusCounts[t.status] = (results.statusCounts[t.status] || 0) + 1;
    results.completedCounts[t.completed] = (results.completedCounts[t.completed] || 0) + 1;
    results.userCounts[t.userId] = (results.userCounts[t.userId] || 0) + 1;
  });
  
  fs.writeFileSync('debug_results.json', JSON.stringify(results, null, 2));
  console.log('Results saved to debug_results.json');
}

check();
