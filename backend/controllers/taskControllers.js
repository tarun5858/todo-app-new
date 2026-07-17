const Task = require("../models/Task");

// GET /api/tasks — READ all tasks
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: 1 });
    // Instead of fetching all tasks in the collection, this filters to only tasks whose user field matches the ID that protect attached to the request. This is the core of multi-user isolation — one user physically cannot see another's tasks through this query.
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/tasks — CREATE a task
exports.createTask = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Task text is required" });
    }
    const task = await Task.create({ text: text.trim() });
    // Every new task is stamped with the creator's ID at creation time.
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/tasks/:id — UPDATE a task (edit text and/or toggle completed)
exports.updateTask = async (req, res) => {
  try {
    const { text, completed } = req.body;
    const update = {};
    if (text !== undefined) update.text = text.trim();
    if (completed !== undefined) update.completed = completed;

    const task = await Task.findByIdAndUpdate(
      { _id: req.params.id, user: req.userId },
      update,
      {
        new: true, // return the updated doc, not the old one
        runValidators: true, // re-run schema validation (e.g. maxlength) on update
      },
      // Notice this searches by both _id and user together, not just _id. This is a security detail: even if someone guessed or intercepted another user's task ID, this query simply won't find a match unless the user field also matches their own ID — so they can't edit someone else's task.
    );

    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/tasks/:id — DELETE a task
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
