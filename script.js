(function () {
  const STORAGE_KEY = "ledger-tasks";

  const form = document.getElementById("entry-form");
  const input = document.getElementById("task-input");
  const list = document.getElementById("task-list");
  const statsText = document.getElementById("stats-text");
  const clearDoneBtn = document.getElementById("clear-done");

  // Load tasks from localStorage, or start with an empty list.

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("Could not read saved tasks: ", err);
      return [];
    }
  }

  let tasks = loadTasks();

  function saveTasks(tasks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error("Could not save tasks:", err);
    }
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }


  // Returns today's date as "YYYY-MM-DD" in the user's local timezone
  // (not UTC — avoids the date flipping early/late depending on where you live).
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
    list.innerHTML = "";

    if (tasks.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-state";
      empty.innerHTML =
        '<span class="mark">-</span>Nothing on the To-Do. Add your first task above.';
      list.appendChild(empty);
    } else {
      tasks.forEach((task, i) => {
        const li = document.createElement("li");
        li.className = "task" + (task.completed ? "completed" : "");

        const index = document.createElement("span");
        index.className = "task-index";
        index.textContent = String(i + 1).padStart(2, "0");

        const checkbox = document.createElement("button");
        checkbox.type = "button";
        checkbox.className = "checkbox" + (task.completed ? " checked" : "");
        checkbox.setAttribute(
          "aria-label",
          task.completed ? "Mark as not completed" : "Mark as completed",
        );
        checkbox.setAttribute("aria-pressed", String(task.completed));
        checkbox.addEventListener("click", () => toggleTask(task.id));

        
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


          const deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.className = 'delete-btn';
          deleteBtn.textContent = 'Cancel';
          deleteBtn.addEventListener('click', () => cancelEdit());

          li.appendChild(editInput);
          li.appendChild(saveBtn);
          li.appendChild(deleteBtn);
          list.appendChild(li);

          // Focus + place cursor at the end once it's in the DOM.
          setTimeout(() => { editInput.focus(); editInput.selectionStart = editInput.value.length; }, 0);
          return; // skip the normal (non-edit) row below
        }


        const text = document.createElement("span");
        text.className = "task-text";
        text.textContent = task.text;
        li.appendChild(text);

        // If a task is still open after one or more midnights have passed,
        // show how many days it's been carried forward.
        const age = daysSince(task.createdDate || getTodayKey());
        if (!task.completed && age > 0) {
          const badge = document.createElement('span');
          badge.className = 'carry-badge';
          badge.textContent = age === 1 ? '+1 day' : `+${age} days`;
          li.appendChild(badge);
        }

        // Edit button only shows for pending (not completed) tasks.
        if (!task.completed) {
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'edit-btn';
          editBtn.setAttribute('aria-label', 'Edit task: ' + task.text);
          editBtn.textContent = 'Edit Task';
          editBtn.addEventListener('click', () => startEdit(task.id));
          li.appendChild(editBtn);
        }

        const del = document.createElement("button");
        del.type = "button";
        del.className = "delete-btn";
        del.setAttribute("aria-label", "Delete task: " + task.text);
        del.textContent = "✕";
        del.addEventListener("click", () => deleteTask(task.id));
        li.appendChild(del);

        list.appendChild(li);
      });
    }

    const openCount = tasks.filter(t => !t.completed).length;
    statsText.textContent =
      openCount +
      (openCount === 1 ? "open" : "open") +
      " . " +
      tasks.length +
      "total";
    const hasDone = tasks.some((t) => t.completed);
    clearDoneBtn.disabled = !hasDone;
  }

  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    tasks.push({ id: makeId(), text: trimmed, completed: false, createdDate: getTodayKey() });
    saveTasks(tasks);
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(tasks);
    render();
  }

  function toggleTask(id) {
    tasks = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasks(tasks);
    render();
  }

  let editingId = null; // id of the task currently being edited, or null

  function startEdit(id) {
    editingId = id;
    render();
  }

  function saveEdit(id, newText) {
    const trimmed = newText.trim();
    if (!trimmed) { cancelEdit(); return; } // empty edit = just cancel, don't blank the task
    tasks = tasks.map(t => t.id === id ? { ...t, text: trimmed } : t);
    saveTasks(tasks);
    editingId = null;
    render();
  }

  function cancelEdit() {
    editingId = null;
    render();
  }


  function clearCompleted() {
    tasks = tasks.filter((t) => !t.completed);
    saveTasks(tasks);
    render();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addTask(input.value);
    input.value = "";
    input.focus();
  });

  clearDoneBtn.addEventListener("click", clearCompleted);



  // ---- Midnight rollover ("cron job") ----
  // A static page can't run a real background cron job, so we simulate one:
  // remember the last date we cleaned up on, and whenever "today" no longer
  // matches that date, wipe completed tasks. Incomplete tasks are never
  // touched here — they simply remain in `tasks` and roll into the new day.
  const LAST_CLEANUP_KEY = 'ledger-last-cleanup';
 
  function runMidnightRollover() {
    const today = getTodayKey();
    const lastCleanup = localStorage.getItem(LAST_CLEANUP_KEY);
 
    if (lastCleanup === today) return; // already cleaned up today, nothing to do
 
    tasks = tasks.filter(t => !t.completed);
    saveTasks(tasks);
    localStorage.setItem(LAST_CLEANUP_KEY, today);
  }
 
  // While the tab is open, fire the rollover the instant local midnight hits,
  // then schedule the next one. setTimeout (not setInterval) is used because
  // it lets us re-calculate the exact gap to the *next* midnight each time.
  function scheduleNextMidnightCheck() {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const msUntilMidnight = nextMidnight - now;
 
    setTimeout(() => {
      runMidnightRollover();
      render();
      scheduleNextMidnightCheck(); // queue up the following midnight too
    }, msUntilMidnight);
  }
 
  // Catch up immediately in case the page was closed when midnight passed
  // (e.g. opened yesterday, reopened today) — then arm the live timer.
  runMidnightRollover();
  scheduleNextMidnightCheck();



  
  // Initial paint from whatever was loaded on page start.
  render();
})();
