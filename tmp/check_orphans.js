const URL = 'https://sydotyjmlpmtdqvrcyek.supabase.co/rest/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ZG90eWptbHBtdGRxdnJjeWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDc4MDEsImV4cCI6MjA4NzY4MzgwMX0.r60ryJrBvCE-stS5WD3yaJ2YMUNrQLnNbIXCLGNXVvg';

async function check() {
  const usersRes = await fetch(`${URL}/users?select=id,name`, {
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  });
  const users = await usersRes.json();
  const userIds = new Set(users.map(u => u.id));
  
  const tasksRes = await fetch(`${URL}/tasks?select=id,userId,completed,title&completed=eq.false`, {
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  });
  const tasks = await tasksRes.json();
  
  console.log(`Total users: ${users.length}`);
  console.log(`Open tasks: ${tasks.length}`);
  
  const orphans = tasks.filter(t => !userIds.has(t.userId));
  console.log(`Orphan tasks (user not found): ${orphans.length}`);
  if (orphans.length > 0) {
      console.log('Sample orphans:', orphans.slice(0, 5));
  }
  
  const tasksByUserId = {};
  tasks.forEach(t => {
      tasksByUserId[t.userId] = (tasksByUserId[t.userId] || 0) + 1;
  });
  console.log('Tasks by userId:', tasksByUserId);
  
  const userIdsWithTasks = Object.keys(tasksByUserId);
  userIdsWithTasks.forEach(id => {
      const user = users.find(u => u.id === id);
      console.log(`- ${user ? user.name : 'Unknown'} (${id}): ${tasksByUserId[id]} tasks`);
  });
}

check();
