const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    stepNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'blocked'],
      default: 'pending',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
stepSchema.index({ taskId: 1, stepNumber: 1 });
stepSchema.index({ taskId: 1, isActive: 1 });

module.exports = mongoose.model('Step', stepSchema);

