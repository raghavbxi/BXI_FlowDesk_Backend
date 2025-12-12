const Activity = require('../models/Activity');

// Log activity
exports.logActivity = async (taskId, userId, action, description, metadata = {}) => {
  try {
    await Activity.create({
      taskId,
      userId,
      action,
      description,
      metadata,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error - activity logging shouldn't break the main flow
  }
};

// Get activities for a task
exports.getTaskActivities = async (taskId) => {
  try {
    return await Activity.find({ taskId })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
};

