const express = require('express');
const router = express.Router();
const {
  getComments,
  addComment,
  updateComment,
  deleteComment,
} = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/tasks/:taskId/comments', getComments);
router.post('/tasks/:taskId/comments', addComment);
router.put('/tasks/:taskId/comments/:commentId', updateComment);
router.delete('/tasks/:taskId/comments/:commentId', deleteComment);

module.exports = router;

