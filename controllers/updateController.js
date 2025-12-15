const TaskUpdate = require('../models/TaskUpdate');
const Task = require('../models/Task');
const { logActivity } = require('../utils/activityLogger');

// @desc    Get all updates for a task
// @route   GET /api/updates/tasks/:taskId
// @access  Private
exports.getTaskUpdates = async (req, res) => {
  try {
    const { taskId } = req.params;

    // Verify task exists and user has access
    const task = await Task.findById(taskId);
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

    const updates = await TaskUpdate.find({ taskId })
      .populate('userId', 'name email avatar')
      .sort({ updateDate: -1 });

    res.status(200).json({
      success: true,
      count: updates.length,
      data: updates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching task updates',
      error: error.message,
    });
  }
};

// @desc    Create a new task update
// @route   POST /api/updates/tasks/:taskId
// @access  Private
exports.createTaskUpdate = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { updateText, updateDate } = req.body;

    if (!updateText || updateText.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide an update text',
      });
    }

    // Verify task exists and user has access
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user is assigned to task or is creator
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      const isCreator = task.createdBy.toString() === req.user._id.toString();
      const isAssigned = task.assignedUsers.some(
        (userId) => userId.toString() === req.user._id.toString()
      );

      if (!isCreator && !isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this task',
        });
      }
    }

    // Validate updateDate if provided (must be between task start and end date)
    let updateDateValue = updateDate ? new Date(updateDate) : new Date();
    
    if (updateDate) {
      const taskStartDate = new Date(task.startDate);
      const taskEndDate = new Date(task.endDate);
      
      if (updateDateValue < taskStartDate || updateDateValue > taskEndDate) {
        return res.status(400).json({
          success: false,
          message: 'Update date must be between task start date and end date',
        });
      }
    }

    // Create update
    const update = await TaskUpdate.create({
      taskId,
      userId: req.user._id,
      updateText: updateText.trim(),
      updateDate: updateDateValue,
    });

    // Populate user info
    await update.populate('userId', 'name email avatar');

    // Log activity
    await logActivity(
      taskId,
      req.user._id,
      'update_added',
      `${req.user.name} added an update`,
      { updateId: update._id }
    );

    res.status(201).json({
      success: true,
      data: update,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating task update',
      error: error.message,
    });
  }
};

// @desc    Delete a task update
// @route   DELETE /api/updates/:id
// @access  Private
exports.deleteTaskUpdate = async (req, res) => {
  try {
    const update = await TaskUpdate.findById(req.params.id).populate('taskId');

    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'Update not found',
      });
    }

    // Check if user is the creator of the update or has admin privileges
    const isUpdateCreator = update.userId.toString() === req.user._id.toString();
    const isTaskCreator = update.taskId.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isUpdateCreator && !isTaskCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this update',
      });
    }

    await TaskUpdate.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity(
      update.taskId._id,
      req.user._id,
      'update_deleted',
      `${req.user.name} deleted an update`
    );

    res.status(200).json({
      success: true,
      message: 'Update deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting task update',
      error: error.message,
    });
  }
};



