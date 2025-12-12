const Task = require('../models/Task');
const User = require('../models/User');
const { sendMentionEmail } = require('../utils/emailService');
const { logActivity } = require('../utils/activityLogger');
const { createNotificationsForUsers } = require('../utils/notificationService');

// Extract mentions from text (@username)
const extractMentions = (text) => {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
};

// @desc    Get comments for a task
// @route   GET /api/comments/tasks/:taskId/comments
// @access  Private
exports.getComments = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('comments.userId', 'name email avatar')
      .populate('comments.mentions', 'name email avatar');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    res.status(200).json({
      success: true,
      count: task.comments.length,
      data: task.comments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error.message,
    });
  }
};

// @desc    Add comment to task
// @route   POST /api/comments/tasks/:taskId/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Please provide comment text',
      });
    }

    // Extract mentions from text
    const mentionUsernames = extractMentions(text);
    let mentionedUserIds = [];

    if (mentionUsernames.length > 0) {
      const mentionedUsers = await User.find({
        name: { $in: mentionUsernames },
      });
      mentionedUserIds = mentionedUsers.map((user) => user._id);
    }

    // Add comment
    const comment = {
      userId: req.user._id,
      text,
      mentions: mentionedUserIds,
    };

    task.comments.push(comment);
    await task.save();

    // Populate the new comment
    const populatedTask = await Task.findById(task._id)
      .populate('comments.userId', 'name email avatar')
      .populate('comments.mentions', 'name email avatar');

    const newComment = populatedTask.comments[populatedTask.comments.length - 1];

    // Send mention emails and create notifications
    if (mentionedUserIds.length > 0) {
      await sendMentionEmail(mentionedUserIds, task, req.user, text);
      
      // Create in-app notifications for mentions
      await createNotificationsForUsers(
        mentionedUserIds.map(id => id.toString()),
        'task_mentioned',
        'You were mentioned',
        `${req.user.name} mentioned you in a comment on task: "${task.title}"`,
        { taskId: task._id, relatedUserId: req.user._id }
      );
    }
    
    // Create notification for task creator and assigned users (except commenter)
    const notifyUserIds = [
      ...task.assignedUsers.map(id => id.toString()),
      task.createdBy.toString()
    ].filter(id => id !== req.user._id.toString());
    
    if (notifyUserIds.length > 0) {
      await createNotificationsForUsers(
        notifyUserIds,
        'task_comment',
        'New Comment',
        `${req.user.name} commented on task: "${task.title}"`,
        { taskId: task._id, relatedUserId: req.user._id }
      );
    }
    
    // Log comment activity
    await logActivity(
      task._id,
      req.user._id,
      'commented',
      `${req.user.name} commented: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
      { commentId: newComment._id, mentions: mentionedUserIds }
    );

    res.status(201).json({
      success: true,
      data: newComment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message,
    });
  }
};

// @desc    Update comment
// @route   PUT /api/comments/tasks/:taskId/comments/:commentId
// @access  Private
exports.updateComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const { text } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const comment = task.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Check if user owns the comment
    if (comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this comment',
      });
    }

    comment.text = text;

    // Re-extract mentions
    const mentionUsernames = extractMentions(text);
    let mentionedUserIds = [];

    if (mentionUsernames.length > 0) {
      const mentionedUsers = await User.find({
        name: { $in: mentionUsernames },
      });
      mentionedUserIds = mentionedUsers.map((user) => user._id);
    }

    comment.mentions = mentionedUserIds;
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('comments.userId', 'name email avatar')
      .populate('comments.mentions', 'name email avatar');

    res.status(200).json({
      success: true,
      data: populatedTask.comments.id(commentId),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating comment',
      error: error.message,
    });
  }
};

// @desc    Delete comment
// @route   DELETE /api/comments/tasks/:taskId/comments/:commentId
// @access  Private
exports.deleteComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const comment = task.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Check if user owns the comment or is admin/superadmin
    if (
      comment.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'superadmin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this comment',
      });
    }

    task.comments.pull(commentId);
    await task.save();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting comment',
      error: error.message,
    });
  }
};

