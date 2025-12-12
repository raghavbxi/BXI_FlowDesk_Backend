const { getTaskActivities } = require('../utils/activityLogger');
const Task = require('../models/Task');

// @desc    Get activities for a task
// @route   GET /api/activities/tasks/:taskId
// @access  Private
exports.getTaskActivities = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check access (same logic as task access)
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      const isCreator = task.createdBy.toString() === req.user._id.toString();
      const isAssigned = task.assignedUsers.some(
        (userId) => userId.toString() === req.user._id.toString()
      );

      if (!isCreator && !isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this task',
        });
      }
    }

    const activities = await getTaskActivities(req.params.taskId);

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching activities',
      error: error.message,
    });
  }
};

