const Task = require('../models/Task');
const User = require('../models/User');
const Step = require('../models/Step');
const {
  calculateAutoProgress,
  getDaysRemaining,
  getTotalDays,
  getProgressColor,
  isOverdue,
} = require('../utils/progressCalculator');
const {
  sendTaskAssignmentEmail,
  sendHelpRequestEmail,
} = require('../utils/emailService');
const { logActivity } = require('../utils/activityLogger');
const { createNotification, createNotificationsForUsers } = require('../utils/notificationService');

// @desc    Get all tasks (filtered by user access)
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    const { status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query based on user role
    let query = { isActive: true };

    // Super admin and admin can see all tasks
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      // Get all task IDs where user is assigned to active step
      const activeSteps = await Step.find({ isActive: true })
        .select('taskId assignedUsers')
        .populate('assignedUsers', '_id');
      
      const taskIdsWithActiveStep = activeSteps
        .filter((step) =>
          step.assignedUsers.some(
            (user) => user._id.toString() === req.user._id.toString()
          )
        )
        .map((step) => step.taskId);

      query.$or = [
        { createdBy: req.user._id },
        { assignedUsers: req.user._id },
        { _id: { $in: taskIdsWithActiveStep } },
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Search by title or description
    if (search) {
      query.$or = [
        ...(query.$or || []),
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Sort
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const tasks = await Task.find(query)
      .populate('createdBy', 'name email avatar')
      .populate('assignedUsers', 'name email avatar')
      .populate('comments.userId', 'name email avatar')
      .populate('stopLogs.userId', 'name email avatar')
      .sort(sortOptions);

    // Get active steps for all tasks
    const taskIds = tasks.map((t) => t._id);
    const activeSteps = await Step.find({
      taskId: { $in: taskIds },
      isActive: true,
    })
      .populate('assignedUsers', 'name email avatar')
      .select('taskId assignedUsers stepNumber title status');
    
    // Create a map of taskId to active step
    const activeStepMap = {};
    activeSteps.forEach((step) => {
      activeStepMap[step.taskId.toString()] = step;
    });

    // Calculate auto progress and add metadata
    const tasksWithProgress = tasks.map((task) => {
      const autoProgress = calculateAutoProgress(task.startDate, task.endDate);
      const daysRemaining = getDaysRemaining(task.endDate);
      const totalDays = getTotalDays(task.startDate, task.endDate);
      const progressColor = getProgressColor(task.startDate, task.endDate);
      const overdue = isOverdue(task.endDate);
      
      // Use manual progress if set, otherwise use auto progress
      const displayProgress = task.manualProgress !== null && task.manualProgress !== undefined 
        ? task.manualProgress 
        : autoProgress;

      // Add active step information
      const activeStep = activeStepMap[task._id.toString()] || null;

      return {
        ...task.toObject(),
        autoProgress,
        displayProgress, // Main progress to display
        daysRemaining,
        totalDays,
        progressColor,
        overdue,
        activeStep, // Current active step with assigned users
      };
    });

    res.status(200).json({
      success: true,
      count: tasksWithProgress.length,
      data: tasksWithProgress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message,
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
  try {
    const task = req.task;

    // Check if user has access via active step
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      const isCreator = task.createdBy.toString() === req.user._id.toString();
      const isAssigned = task.assignedUsers.some(
        (userId) => userId.toString() === req.user._id.toString()
      );

      // Check if user is in active step
      const activeStep = await Step.findOne({
        taskId: task._id,
        isActive: true,
      });
      
      const isInActiveStep = activeStep && activeStep.assignedUsers.some(
        (userId) => userId.toString() === req.user._id.toString()
      );

      if (!isCreator && !isAssigned && !isInActiveStep) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this task',
        });
      }
    }

    const autoProgress = calculateAutoProgress(task.startDate, task.endDate);
    const daysRemaining = getDaysRemaining(task.endDate);
    const totalDays = getTotalDays(task.startDate, task.endDate);
    const progressColor = getProgressColor(task.startDate, task.endDate);
    const overdue = isOverdue(task.endDate);
    
    // Use manual progress if set, otherwise use auto progress
    const displayProgress = task.manualProgress !== null && task.manualProgress !== undefined 
      ? task.manualProgress 
      : autoProgress;

    // Get active step
    const activeStep = await Step.findOne({
      taskId: task._id,
      isActive: true,
    })
      .populate('assignedUsers', 'name email avatar')
      .select('stepNumber title description assignedUsers status');

    res.status(200).json({
      success: true,
      data: {
        ...task.toObject(),
        autoProgress,
        displayProgress, // Main progress to display
        daysRemaining,
        totalDays,
        progressColor,
        overdue,
        activeStep, // Current active step
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
      error: error.message,
    });
  }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedUsers, startDate, endDate, priority } = req.body;

    // Calculate initial auto progress
    const autoProgress = calculateAutoProgress(startDate, endDate);

    const task = await Task.create({
      title,
      description,
      createdBy: req.user._id,
      assignedUsers: assignedUsers || [],
      startDate,
      endDate,
      priority: priority || 'medium',
      autoProgress,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedUsers', 'name email avatar');

    // Send assignment emails and create notifications
    if (assignedUsers && assignedUsers.length > 0) {
      await sendTaskAssignmentEmail(assignedUsers, populatedTask);
      
      // Create in-app notifications
      await createNotificationsForUsers(
        assignedUsers,
        'task_assigned',
        'New Task Assigned',
        `${req.user.name} assigned you to task: "${title}"`,
        { taskId: task._id, relatedUserId: req.user._id }
      );
    }

    const daysRemaining = getDaysRemaining(task.endDate);
    const totalDays = getTotalDays(task.startDate, task.endDate);
    const progressColor = getProgressColor(task.startDate, task.endDate);
    const overdue = isOverdue(task.endDate);
    
    // Use manual progress if set, otherwise use auto progress
    const displayProgress = task.manualProgress !== null && task.manualProgress !== undefined 
      ? task.manualProgress 
      : autoProgress;

    res.status(201).json({
      success: true,
      data: {
        ...populatedTask.toObject(),
        autoProgress,
        displayProgress, // Main progress to display
        daysRemaining,
        totalDays,
        progressColor,
        overdue,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error.message,
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    const task = req.task;

    // Check if user can update (creator, admin, or superadmin)
    if (
      task.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'superadmin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this task',
      });
    }

    const { title, description, assignedUsers, startDate, endDate, status, priority } = req.body;

    const changes = [];
    
    // Update fields and track changes
    if (title && title !== task.title) {
      changes.push(`title from "${task.title}" to "${title}"`);
      task.title = title;
    }
    if (description !== undefined && description !== task.description) {
      changes.push('description');
      task.description = description;
    }
    if (startDate && new Date(startDate).getTime() !== new Date(task.startDate).getTime()) {
      changes.push('start date');
      task.startDate = startDate;
    }
    if (endDate && new Date(endDate).getTime() !== new Date(task.endDate).getTime()) {
      changes.push('end date');
      task.endDate = endDate;
    }
    if (status && status !== task.status) {
      changes.push(`status from "${task.status}" to "${status}"`);
      await logActivity(
        task._id,
        req.user._id,
        'status_changed',
        `${req.user.name} changed status from "${task.status}" to "${status}"`,
        { oldStatus: task.status, newStatus: status }
      );
      task.status = status;
      
      // Create notification for assigned users when status changes
      if (task.assignedUsers && task.assignedUsers.length > 0) {
        await createNotificationsForUsers(
          task.assignedUsers.map(u => u.toString()),
          'task_updated',
          'Task Status Updated',
          `${req.user.name} changed task "${task.title}" status to ${status}`,
          { taskId: task._id, relatedUserId: req.user._id }
        );
      }
    }
    if (priority && priority !== task.priority) {
      changes.push(`priority from "${task.priority}" to "${priority}"`);
      task.priority = priority;
    }

    // Handle assigned users
    if (assignedUsers) {
      const oldUsers = task.assignedUsers.map((id) => id.toString());
      const newUsers = assignedUsers.filter(
        (userId) => !oldUsers.includes(userId.toString())
      );
      const removedUsers = oldUsers.filter(
        (userId) => !assignedUsers.some((id) => id.toString() === userId)
      );
      
      task.assignedUsers = assignedUsers;

      // Send emails to newly assigned users
      if (newUsers.length > 0) {
        await sendTaskAssignmentEmail(newUsers, task);
        // Create notifications for newly assigned users
        await createNotificationsForUsers(
          newUsers,
          'task_assigned',
          'Task Assigned',
          `${req.user.name} assigned you to task: "${task.title}"`,
          { taskId: task._id, relatedUserId: req.user._id }
        );
        // Log assignment activity
        for (const userId of newUsers) {
          await logActivity(
            task._id,
            req.user._id,
            'assigned',
            `${req.user.name} assigned this task`,
            { assignedUserId: userId }
          );
        }
      }
      
      // Log unassignment activity
      if (removedUsers.length > 0) {
        for (const userId of removedUsers) {
          await logActivity(
            task._id,
            req.user._id,
            'unassigned',
            `${req.user.name} unassigned this task`,
            { unassignedUserId: userId }
          );
        }
      }
    }
    
    // Log update activity if there were changes
    if (changes.length > 0) {
      await logActivity(
        task._id,
        req.user._id,
        'updated',
        `${req.user.name} updated: ${changes.join(', ')}`,
        { changes }
      );
    }

    // Recalculate auto progress
    task.autoProgress = calculateAutoProgress(task.startDate, task.endDate);

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedUsers', 'name email avatar')
      .populate('comments.userId', 'name email avatar')
      .populate('stopLogs.userId', 'name email avatar');

    const daysRemaining = getDaysRemaining(task.endDate);
    const totalDays = getTotalDays(task.startDate, task.endDate);
    const progressColor = getProgressColor(task.startDate, task.endDate);
    const overdue = isOverdue(task.endDate);
    
    // Use manual progress if set, otherwise use auto progress
    const displayProgress = task.manualProgress !== null && task.manualProgress !== undefined 
      ? task.manualProgress 
      : task.autoProgress;

    res.status(200).json({
      success: true,
      data: {
        ...populatedTask.toObject(),
        autoProgress: task.autoProgress,
        displayProgress, // Main progress to display
        daysRemaining,
        totalDays,
        progressColor,
        overdue,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: error.message,
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res) => {
  try {
    const task = req.task;

    // Check if user can delete (creator, admin, or superadmin)
    if (
      task.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'superadmin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this task',
      });
    }

    task.isActive = false;
    await task.save();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: error.message,
    });
  }
};

// @desc    Stop work on task
// @route   POST /api/tasks/:id/stop
// @access  Private
exports.stopWork = async (req, res) => {
  try {
    const task = req.task;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for stopping work',
      });
    }

    // Check if user is assigned to task
    const isAssigned = task.assignedUsers.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isAssigned && task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task',
      });
    }

    // Add stop log
    task.stopLogs.push({
      userId: req.user._id,
      reason,
    });

    // Update status
    task.status = 'paused';

    await task.save();
    
    // Log pause activity
    await logActivity(
      task._id,
      req.user._id,
      'paused',
      `${req.user.name} paused work: ${reason}`,
      { reason }
    );

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedUsers', 'name email avatar')
      .populate('comments.userId', 'name email avatar')
      .populate('stopLogs.userId', 'name email avatar');

    const autoProgress = calculateAutoProgress(task.startDate, task.endDate);
    const daysRemaining = getDaysRemaining(task.endDate);
    const totalDays = getTotalDays(task.startDate, task.endDate);
    const progressColor = getProgressColor(task.startDate, task.endDate);
    const overdue = isOverdue(task.endDate);
    
    // Use manual progress if set, otherwise use auto progress
    const displayProgress = task.manualProgress !== null && task.manualProgress !== undefined 
      ? task.manualProgress 
      : autoProgress;

    res.status(200).json({
      success: true,
      data: {
        ...populatedTask.toObject(),
        autoProgress,
        displayProgress, // Main progress to display
        daysRemaining,
        totalDays,
        progressColor,
        overdue,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error stopping work',
      error: error.message,
    });
  }
};

// @desc    Resume work on task
// @route   POST /api/tasks/:id/resume
// @access  Private
exports.resumeWork = async (req, res) => {
  try {
    const task = req.task;

    // Check if user is assigned to task
    const isAssigned = task.assignedUsers.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isAssigned && task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task',
      });
    }

    // Update status
    task.status = 'in-progress';

    await task.save();
    
    // Log resume activity
    await logActivity(
      task._id,
      req.user._id,
      'resumed',
      `${req.user.name} resumed work`
    );

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedUsers', 'name email avatar')
      .populate('comments.userId', 'name email avatar')
      .populate('stopLogs.userId', 'name email avatar');

    const autoProgress = calculateAutoProgress(task.startDate, task.endDate);
    const daysRemaining = getDaysRemaining(task.endDate);
    const totalDays = getTotalDays(task.startDate, task.endDate);
    const progressColor = getProgressColor(task.startDate, task.endDate);
    const overdue = isOverdue(task.endDate);
    
    // Use manual progress if set, otherwise use auto progress
    const displayProgress = task.manualProgress !== null && task.manualProgress !== undefined 
      ? task.manualProgress 
      : autoProgress;

    res.status(200).json({
      success: true,
      data: {
        ...populatedTask.toObject(),
        autoProgress,
        displayProgress, // Main progress to display
        daysRemaining,
        totalDays,
        progressColor,
        overdue,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resuming work',
      error: error.message,
    });
  }
};

// @desc    Update manual progress
// @route   PUT /api/tasks/:id/progress
// @access  Private
exports.updateProgress = async (req, res) => {
  try {
    const task = req.task;
    const { manualProgress, comment } = req.body;

    if (manualProgress === undefined || manualProgress < 0 || manualProgress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid progress value (0-100)',
      });
    }

    if (!comment || comment.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a comment explaining the progress update',
      });
    }

    // Check if user is assigned to task
    const isAssigned = task.assignedUsers.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isAssigned && task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task',
      });
    }

    const oldProgress = task.manualProgress;
    task.manualProgress = manualProgress;

    // Auto-update status based on progress
    if (manualProgress === 100) {
      task.status = 'completed';
    } else if (task.status === 'not-started' && manualProgress > 0) {
      task.status = 'in-progress';
    }

    await task.save();
    
    // Log progress update activity
    await logActivity(
      task._id,
      req.user._id,
      'progress_updated',
      `${req.user.name} updated progress from ${oldProgress}% to ${manualProgress}%: ${comment}`,
      { oldProgress, newProgress: manualProgress, comment }
    );

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedUsers', 'name email avatar')
      .populate('comments.userId', 'name email avatar')
      .populate('stopLogs.userId', 'name email avatar');

    const autoProgress = calculateAutoProgress(task.startDate, task.endDate);
    const daysRemaining = getDaysRemaining(task.endDate);
    const totalDays = getTotalDays(task.startDate, task.endDate);
    const progressColor = getProgressColor(task.startDate, task.endDate);
    const overdue = isOverdue(task.endDate);
    
    // Use manual progress if set, otherwise use auto progress
    const displayProgress = task.manualProgress !== null && task.manualProgress !== undefined 
      ? task.manualProgress 
      : autoProgress;

    res.status(200).json({
      success: true,
      data: {
        ...populatedTask.toObject(),
        autoProgress,
        displayProgress, // Main progress to display
        daysRemaining,
        totalDays,
        progressColor,
        overdue,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating progress',
      error: error.message,
    });
  }
};

// @desc    Request help on task
// @route   POST /api/tasks/:id/help
// @access  Private
exports.requestHelp = async (req, res) => {
  try {
    const task = req.task;

    // Check if user is assigned to task
    const isAssigned = task.assignedUsers.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task',
      });
    }

    // Send help request emails
    await sendHelpRequestEmail(task, req.user);

    res.status(200).json({
      success: true,
      message: 'Help request sent successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending help request',
      error: error.message,
    });
  }
};

