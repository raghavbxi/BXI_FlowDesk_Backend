const mongoose = require('mongoose');

const stopLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a task title'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    startDate: {
      type: Date,
      required: [true, 'Please provide a start date'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide an end date'],
    },
    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'paused', 'completed'],
      default: 'not-started',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    autoProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    manualProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    stopLogs: [stopLogSchema],
    comments: [commentSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
taskSchema.index({ assignedUsers: 1, status: 1 });
taskSchema.index({ endDate: 1 });
taskSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Task', taskSchema);

