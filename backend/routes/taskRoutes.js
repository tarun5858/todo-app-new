const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware.js')
const {
  getTasks,
  createTask,
  updateTask,
  deleteTask
} = require('../controllers/taskControllers.js');

router.use(protect);

router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

// router.use(protect) — applies the protect middleware to every route defined after this line in the file. So GET /, POST /, PUT /:id, DELETE /:id all now require a valid token before they run.

module.exports = router;