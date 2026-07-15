(function () {
  const API_URL = '/api/tasks';
  const LAST_CLEANUP_KEY = 'ledger-last-cleanup'; // stays in localStorage — it's just a local flag, not task data

  const form = document.getElementById('entry-form');
  const input = document.getElementById('task-input');
  const list = document.getElementById('task-list');
  const statsText = document.getElementById('stats-text');
  const clearDoneBtn = document.getElementById('clear-done');

  let tasks = [];
  let editingId = null; // id of the task currently being edited, or null

  // ---- API helpers ----

  // Mongo documents come back with "_id". The rest of this file (checkbox,
  // delete, edit) was written expecting "id", so every task from the API
  // gets normalized here in one place instead of patched everywhere.
  function normalize(task) {
    return { ...task, id: task._id };
  }

  async function fetchTasks() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    const data = await res.json();
    tasks = data.map(normalize);
  }

  async function createTaskOnServer(text) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('Failed to create task');
    return normalize(await res.json());
  }

  async function updateTaskOnServer(id, updates) {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update task');
    return normalize(await res.json());
  }

  async function deleteTaskOnServer(id) {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete task');
  }

  // Returns today's date as "YYYY-MM-DD" in the user's local timezone.
  function getTodayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // How many local midnights have passed since a "YYYY-MM-DD" date string.
  function daysSince(dateKey) {
    const [y, m, day] = dateKey.split('-').map(Number);
    const start = new Date(y, m - 1, day);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((today - start) / 86400000);
  }

  function render() {
    list.innerHTML = '';

    if (tasks.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.innerHTML = '<span class="mark">—</span>Nothing on the ledger. Add your first task above.';
      list.appendChild(empty);
    } else {
      tasks.forEach((task, i) => {
        const li = document.createElement('li');
        li.className = 'task' + (task.completed ? ' completed' : '');

        const index = document.createElement('span');
        index.className = 'task-index';
        index.textContent = String(i + 1).padStart(2, '0');

        const checkbox = document.createElement('button');
        checkbox.type = 'button';
        checkbox.className = 'checkbox' + (task.completed ? ' checked' : '');
        checkbox.setAttribute('aria-label', task.completed ? 'Mark as not completed' : 'Mark as completed');
        checkbox.setAttribute('aria-pressed', String(task.completed));
        checkbox.addEventListener('click', () => toggleTask(task.id, task.completed));

        li.appendChild(index);
        li.appendChild(checkbox);

        // ---- EDIT MODE: swap text for an input box ----
        if (editingId === task.id) {
          const editInput = document.createElement('input');
          editInput.type = 'text';
          editInput.className = 'edit-input';
          editInput.value = task.text;
          editInput.maxLength = 200;

          editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveEdit(task.id, editInput.value);
            if (e.key === 'Escape') cancelEdit();
          });

          const saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'save-btn';
          saveBtn.textContent = 'Save';
          saveBtn.addEventListener('click', () => saveEdit(task.id, editInput.value));

          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'delete-btn';
          cancelBtn.textContent = 'Cancel';
          cancelBtn.addEventListener('click', () => cancelEdit());

          li.appendChild(editInput);
          li.appendChild(saveBtn);
          li.appendChild(cancelBtn);
          list.appendChild(li);

          setTimeout(() => { editInput.focus(); editInput.selectionStart = editInput.value.length; }, 0);
          return; // skip the normal (non-edit) row below
        }

        // ---- NORMAL MODE ----
        const text = document.createElement('span');
        text.className = 'task-text';
        text.textContent = task.text;
        li.appendChild(text);

        const age = daysSince(task.createdDate || getTodayKey());
        if (!task.completed && age > 0) {
          const badge = document.createElement('span');
          badge.className = 'carry-badge';
          badge.textContent = age === 1 ? '+1 day' : `+${age} days`;
          li.appendChild(badge);
        }

        if (!task.completed) {
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'edit-btn';
          editBtn.setAttribute('aria-label', 'Edit task: ' + task.text);
          editBtn.textContent = 'Edit';
          editBtn.addEventListener('click', () => startEdit(task.id));
          li.appendChild(editBtn);
        }

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'delete-btn';
        del.setAttribute('aria-label', 'Delete task: ' + task.text);
        del.textContent = '✕';
        del.addEventListener('click', () => deleteTask(task.id));
        li.appendChild(del);

        list.appendChild(li);
      });
    }

    const openCount = tasks.filter(t => !t.completed).length;
    statsText.textContent = openCount + ' open · ' + tasks.length + ' total';
    const hasDone = tasks.some(t => t.completed);
    clearDoneBtn.disabled = !hasDone;
  }

  // ---- CRUD actions — each one hits the API first, then updates local state + re-renders ----

  async function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const newTask = await createTaskOnServer(trimmed);
      tasks.push(newTask);
      render();
    } catch (err) {
      console.error(err);
      alert('Could not save task — is the backend server running on localhost:5000?');
    }
  }

  async function deleteTask(id) {
    try {
      await deleteTaskOnServer(id);
      tasks = tasks.filter(t => t.id !== id);
      render();
    } catch (err) {
      console.error(err);
      alert('Could not delete task.');
    }
  }

  async function toggleTask(id, currentlyCompleted) {
    try {
      const updated = await updateTaskOnServer(id, { completed: !currentlyCompleted });
      tasks = tasks.map(t => t.id === id ? updated : t); // only this one task is replaced
      render();
    } catch (err) {
      console.error(err);
      alert('Could not update task.');
    }
  }

  function startEdit(id) {
    editingId = id;
    render();
  }

  async function saveEdit(id, newText) {
    const trimmed = newText.trim();
    if (!trimmed) { cancelEdit(); return; }
    try {
      const updated = await updateTaskOnServer(id, { text: trimmed });
      tasks = tasks.map(t => t.id === id ? updated : t);
      editingId = null;
      render();
    } catch (err) {
      console.error(err);
      alert('Could not save changes.');
    }
  }

  function cancelEdit() {
    editingId = null;
    render();
  }

  async function clearCompleted() {
    const completedIds = tasks.filter(t => t.completed === true).map(t => t.id);
    if (completedIds.length === 0) return;
    try {
      await Promise.all(completedIds.map(id => deleteTaskOnServer(id)));
      tasks = tasks.filter(t => !t.completedIds.includes(t.id));
      render();
    } catch (err) {
      console.error(err);
      alert('Could not clear completed tasks.');
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addTask(input.value);
    input.value = '';
    input.focus();
  });

  clearDoneBtn.addEventListener('click', clearCompleted);

  // ---- Midnight rollover ("cron job") ----
  // Same idea as before, but now it deletes completed tasks from MongoDB
  // (via clearCompleted) instead of just filtering a local array.
  function runMidnightRollover() {
    const today = getTodayKey();
    const lastCleanup = localStorage.getItem(LAST_CLEANUP_KEY);
    if (lastCleanup === today) return; // already ran today

    clearCompleted();
    localStorage.setItem(LAST_CLEANUP_KEY, today);
  }

  function scheduleNextMidnightCheck() {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const msUntilMidnight = nextMidnight - now;

    setTimeout(() => {
      runMidnightRollover();
      scheduleNextMidnightCheck();
    }, msUntilMidnight);
  }

  // ---- Init: load from the database first, then paint the page ----
  async function init() {
    try {
      await fetchTasks();
    } catch (err) {
      console.error('Could not load tasks from server:', err);
      alert('Could not reach the backend. Make sure it is running on localhost:5000.');
    }
    render();
    runMidnightRollover();
    scheduleNextMidnightCheck();
  }

  init();
})();