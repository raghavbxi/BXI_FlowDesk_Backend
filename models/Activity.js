const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'created',
        'updated',
        'paused',
        'resumed',
        'progress_updated',
        'commented',
        'assigned',
        'unassigned',
        'status_changed',
        'help_requested',
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

activitySchema.index({ taskId: 1, createdAt: -1 });
activitySchema.index({ userId: 1 });

module.exports = mongoose.model('Activity', activitySchema);

