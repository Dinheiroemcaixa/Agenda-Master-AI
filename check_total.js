const URL = 'https://sydotyjmlpmtdqvrcyek.supabase.co/rest/v1/tasks?select=id';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ZG90eWptbHBtdGRxdnJjeWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDc4MDEsImV4cCI6MjA4NzY4MzgwMX0.r60ryJrBvCE-stS5WD3yaJ2YMUNrQLnNbIXCLGNXVvg';

fetch(URL, {
  headers: {
    'apikey': KEY,
    'Authorization': 'Bearer ' + KEY,
    'Prefer': 'count=exact'
  }
})
.then(res => {
  console.log('Content-Range:', res.headers.get('content-range'));
  return res.json();
})
.then(data => {
  console.log('Total IDs fetched:', data.length);
})
.catch(err => console.error(err));
