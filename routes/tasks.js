const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  stopWork,
  resumeWork,
  updateProgress,
  requestHelp,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { canAccessTask } = require('../middleware/accessControl');

// All routes are protected
router.use(protect);

router.route('/').get(getTasks).post(createTask);
router.route('/:id').get(canAccessTask, getTask).put(canAccessTask, updateTask).delete(canAccessTask, deleteTask);
router.post('/:id/stop', canAccessTask, stopWork);
router.post('/:id/resume', canAccessTask, resumeWork);
router.put('/:id/progress', canAccessTask, updateProgress);
router.post('/:id/help', canAccessTask, requestHelp);

module.exports = router;

