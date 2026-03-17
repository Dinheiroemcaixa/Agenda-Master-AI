const URL = 'https://sydotyjmlpmtdqvrcyek.supabase.co/rest/v1/users?select=*';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ZG90eWptbHBtdGRxdnJjeWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDc4MDEsImV4cCI6MjA4NzY4MzgwMX0.r60ryJrBvCE-stS5WD3yaJ2YMUNrQLnNbIXCLGNXVvg';

fetch(URL, {
  headers: {
    'apikey': KEY,
    'Authorization': 'Bearer ' + KEY
  }
})
.then(res => res.json())
.then(data => {
  const raffaela = data.find(u => u.name.toLowerCase().includes('raffaela'));
  console.log('--- RAFFAELA DATA ---');
  console.log(JSON.stringify(raffaela, null, 2));
  console.log('--- ALL USERS (COMPACT) ---');
  console.log(data.map(u => ({ id: u.id, name: u.name, role: u.role })));
})
.catch(err => console.error(err));
