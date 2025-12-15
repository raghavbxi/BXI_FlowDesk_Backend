const express = require('express');
const router = express.Router();
const {
  getTaskUpdates,
  createTaskUpdate,
  deleteTaskUpdate,
} = require('../controllers/updateController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/tasks/:taskId', getTaskUpdates);
router.post('/tasks/:taskId', createTaskUpdate);
router.delete('/:id', deleteTaskUpdate);

module.exports = router;



