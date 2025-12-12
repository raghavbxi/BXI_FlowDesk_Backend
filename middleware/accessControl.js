const Task = require('../models/Task');

// Check if user can access a task
exports.canAccessTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Super admin and admin can access all tasks
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      req.task = task;
      return next();
    }

    // Creator can access their tasks
    if (task.createdBy.toString() === req.user._id.toString()) {
      req.task = task;
      return next();
    }

    // Check if user is assigned to the task
    const isAssigned = task.assignedUsers.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this task',
      });
    }

    req.task = task;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking task access',
      error: error.message,
    });
  }
};

