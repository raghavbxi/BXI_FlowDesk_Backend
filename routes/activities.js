const express = require('express');
const router = express.Router();
const { getTaskActivities } = require('../controllers/activityController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/tasks/:taskId', getTaskActivities);

module.exports = router;

