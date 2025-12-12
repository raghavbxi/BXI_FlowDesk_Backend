const express = require('express');
const router = express.Router();
const {
  getTaskSteps,
  createStep,
  updateStep,
  activateStep,
  completeStep,
  deleteStep,
} = require('../controllers/stepController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/tasks/:taskId', getTaskSteps);
router.post('/tasks/:taskId', createStep);
router.put('/:id', updateStep);
router.put('/:id/activate', activateStep);
router.put('/:id/complete', completeStep);
router.delete('/:id', deleteStep);

module.exports = router;

