const mongoose = require('mongoose');

const taskUpdateSchema = new mongoose.Schema(
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
    updateText: {
      type: String,
      required: [true, 'Please provide an update text'],
      trim: true,
    },
    updateDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
taskUpdateSchema.index({ taskId: 1, updateDate: -1 });
taskUpdateSchema.index({ userId: 1 });

module.exports = mongoose.model('TaskUpdate', taskUpdateSchema);



