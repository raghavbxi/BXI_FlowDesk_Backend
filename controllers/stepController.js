const Step = require('../models/Step');
const Task = require('../models/Task');
const { logActivity } = require('../utils/activityLogger');
const { sendTaskAssignmentEmail } = require('../utils/emailService');

// @desc    Get all steps for a task
// @route   GET /api/steps/tasks/:taskId
// @access  Private
exports.getTaskSteps = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check access
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

    const steps = await Step.find({ taskId: req.params.taskId })
      .populate('assignedUsers', 'name email avatar')
      .populate('completedBy', 'name email avatar')
      .sort({ stepNumber: 1 });

    res.status(200).json({
      success: true,
      count: steps.length,
      data: steps,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching steps',
      error: error.message,
    });
  }
};

// @desc    Create a new step
// @route   POST /api/steps/tasks/:taskId
// @access  Private
exports.createStep = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { title, description, assignedUsers, startDate, endDate } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user can create steps (creator, admin, or superadmin)
    if (
      task.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'superadmin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create steps for this task',
      });
    }

    // Get the next step number
    const existingSteps = await Step.find({ taskId }).sort({ stepNumber: -1 });
    const nextStepNumber = existingSteps.length > 0 ? existingSteps[0].stepNumber + 1 : 1;

    // Only first step should be active by default
    const isActive = existingSteps.length === 0;

    const step = await Step.create({
      taskId,
      stepNumber: nextStepNumber,
      title,
      description,
      assignedUsers: assignedUsers || [],
      startDate,
      endDate,
      isActive,
      status: isActive ? 'in-progress' : 'pending',
    });

    // If this is the first step and it's active, update task status
    if (isActive && task.status === 'not-started') {
      task.status = 'in-progress';
      await task.save();
    }

    const populatedStep = await Step.findById(step._id)
      .populate('assignedUsers', 'name email avatar')
      .populate('completedBy', 'name email avatar');

    // Send assignment emails
    if (assignedUsers && assignedUsers.length > 0) {
      await sendTaskAssignmentEmail(assignedUsers, task);
    }

    // Log activity
    await logActivity(
      taskId,
      req.user._id,
      'created',
      `${req.user.name} created step ${nextStepNumber}: ${title}`,
      { stepId: step._id, stepNumber: nextStepNumber }
    );

    res.status(201).json({
      success: true,
      data: populatedStep,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating step',
      error: error.message,
    });
  }
};

// @desc    Update a step
// @route   PUT /api/steps/:id
// @access  Private
exports.updateStep = async (req, res) => {
  try {
    const step = await Step.findById(req.params.id).populate('taskId');

    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'Step not found',
      });
    }

    const task = step.taskId;

    // Check if user can update (creator, admin, or superadmin)
    if (
      task.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'superadmin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this step',
      });
    }

    const { title, description, assignedUsers, startDate, endDate, status } = req.body;

    if (title) step.title = title;
    if (description !== undefined) step.description = description;
    if (startDate) step.startDate = startDate;
    if (endDate) step.endDate = endDate;
    if (status) step.status = status;

    // Handle assigned users
    if (assignedUsers) {
      const oldUsers = step.assignedUsers.map((id) => id.toString());
      const newUsers = assignedUsers.filter(
        (userId) => !oldUsers.includes(userId.toString())
      );
      const removedUsers = oldUsers.filter(
        (userId) => !assignedUsers.some((id) => id.toString() === userId)
      );

      step.assignedUsers = assignedUsers;

      // Send emails to newly assigned users
      if (newUsers.length > 0) {
        await sendTaskAssignmentEmail(newUsers, task);
      }

      // Log assignment changes
      if (newUsers.length > 0 || removedUsers.length > 0) {
        await logActivity(
          task._id,
          req.user._id,
          'updated',
          `${req.user.name} updated step ${step.stepNumber} assignments`,
          { stepId: step._id, newUsers, removedUsers }
        );
      }
    }

    await step.save();

    const populatedStep = await Step.findById(step._id)
      .populate('assignedUsers', 'name email avatar')
      .populate('completedBy', 'name email avatar');

    res.status(200).json({
      success: true,
      data: populatedStep,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating step',
      error: error.message,
    });
  }
};

// @desc    Activate a step (make it active and deactivate others)
// @route   PUT /api/steps/:id/activate
// @access  Private
exports.activateStep = async (req, res) => {
  try {
    const step = await Step.findById(req.params.id).populate('taskId');

    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'Step not found',
      });
    }

    const task = step.taskId;

    // Check if user can activate (creator, admin, or superadmin)
    if (
      task.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'superadmin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to activate this step',
      });
    }

    // Deactivate all other steps for this task
    await Step.updateMany(
      { taskId: task._id, _id: { $ne: step._id } },
      { isActive: false }
    );

    // Activate this step
    step.isActive = true;
    if (step.status === 'pending') {
      step.status = 'in-progress';
    }
    await step.save();

    // Log activity
    await logActivity(
      task._id,
      req.user._id,
      'updated',
      `${req.user.name} activated step ${step.stepNumber}: ${step.title}`,
      { stepId: step._id, stepNumber: step.stepNumber }
    );

    const populatedStep = await Step.findById(step._id)
      .populate('assignedUsers', 'name email avatar')
      .populate('completedBy', 'name email avatar');

    res.status(200).json({
      success: true,
      data: populatedStep,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error activating step',
      error: error.message,
    });
  }
};

// @desc    Complete a step
// @route   PUT /api/steps/:id/complete
// @access  Private
exports.completeStep = async (req, res) => {
  try {
    const step = await Step.findById(req.params.id).populate('taskId');

    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'Step not found',
      });
    }

    const task = step.taskId;

    // Check if user is assigned to this step
    const isAssigned = step.assignedUsers.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isAssigned && task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this step',
      });
    }

    step.status = 'completed';
    step.completedAt = new Date();
    step.completedBy = req.user._id;
    step.isActive = false;

    await step.save();

    // Find next pending step and activate it
    const nextStep = await Step.findOne({
      taskId: task._id,
      stepNumber: { $gt: step.stepNumber },
      status: 'pending',
    }).sort({ stepNumber: 1 });

    if (nextStep) {
      nextStep.isActive = true;
      nextStep.status = 'in-progress';
      await nextStep.save();
    } else {
      // All steps completed, mark task as completed
      task.status = 'completed';
      task.manualProgress = 100;
      await task.save();
    }

    // Log activity
    await logActivity(
      task._id,
      req.user._id,
      'updated',
      `${req.user.name} completed step ${step.stepNumber}: ${step.title}`,
      { stepId: step._id, stepNumber: step.stepNumber }
    );

    const populatedStep = await Step.findById(step._id)
      .populate('assignedUsers', 'name email avatar')
      .populate('completedBy', 'name email avatar');

    res.status(200).json({
      success: true,
      data: populatedStep,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error completing step',
      error: error.message,
    });
  }
};

// @desc    Delete a step
// @route   DELETE /api/steps/:id
// @access  Private
exports.deleteStep = async (req, res) => {
  try {
    const step = await Step.findById(req.params.id).populate('taskId');

    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'Step not found',
      });
    }

    const task = step.taskId;

    // Check if user can delete (creator, admin, or superadmin)
    if (
      task.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'superadmin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this step',
      });
    }

    await Step.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity(
      task._id,
      req.user._id,
      'updated',
      `${req.user.name} deleted step ${step.stepNumber}: ${step.title}`,
      { stepId: step._id, stepNumber: step.stepNumber }
    );

    res.status(200).json({
      success: true,
      message: 'Step deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting step',
      error: error.message,
    });
  }
};

