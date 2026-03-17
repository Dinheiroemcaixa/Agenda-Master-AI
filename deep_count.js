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
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const pending = data.filter(t => !t.completed && t.status !== 'DELETED');
  const delayed = pending.filter(t => t.dueDate && t.dueDate.split('T')[0] < todayStr);
  
  console.log('--- DEEP TASK STATS (Limit 5000) ---');
  console.log('Total tasks:', data.length);
  console.log('Pending:', pending.length);
  console.log('Delayed:', delayed.length);
  
  const delayedByUsers = {};
  delayed.forEach(t => {
    delayedByUsers[t.userId] = (delayedByUsers[t.userId] || 0) + 1;
  });
  console.log('Delayed by User ID:', delayedByUsers);

  // Check for very old tasks (more than 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
  
  const veryOldDelayed = delayed.filter(t => t.dueDate.split('T')[0] < thirtyDaysAgoStr);
  console.log('Delayed older than 30 days:', veryOldDelayed.length);

})
.catch(err => console.error(err));
