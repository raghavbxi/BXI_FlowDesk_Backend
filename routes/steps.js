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
router.post('/', createStep);
router.put('/:id', updateStep);
router.post('/:id/activate', activateStep);
router.post('/:id/complete', completeStep);
router.delete('/:id', deleteStep);

module.exports = router;

