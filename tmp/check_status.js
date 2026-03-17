const URL = 'https://sydotyjmlpmtdqvrcyek.supabase.co/rest/v1/tasks?select=*&limit=5000';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ZG90eWptbHBtdGRxdnJjeWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDc4MDEsImV4cCI6MjA4NzY4MzgwMX0.r60ryJrBvCE-stS5WD3yaJ2YMUNrQLnNbIXCLGNXVvg';

fetch(URL, {
  headers: {
    'apikey': KEY,
    'Authorization': 'Bearer ' + KEY
  }
})
.then(res => res.json())
.then(data => {
  console.log('Total tasks:', data.length);
  
  const statusCounts = {};
  const completedCounts = { true: 0, false: 0 };
  const userCounts = {};
  
  data.forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    completedCounts[t.completed] = (completedCounts[t.completed] || 0) + 1;
    userCounts[t.userId] = (userCounts[t.userId] || 0) + 1;
  });
  
  console.log('Status counts:', statusCounts);
  console.log('Completed counts:', completedCounts);
  console.log('User counts:', userCounts);
  
  if (data.length > 0) {
      console.log('Sample task:', JSON.stringify(data[0], null, 2));
  }
})
.catch(err => console.error(err));
