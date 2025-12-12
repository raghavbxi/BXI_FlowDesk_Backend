// Calculate time-based progress percentage
exports.calculateAutoProgress = (startDate, endDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  // If task hasn't started yet
  if (now < start) {
    return 0;
  }

  // If task is overdue
  if (now > end) {
    return 100;
  }

  // Calculate progress
  const totalDuration = end - start;
  const elapsed = now - start;
  const progress = Math.round((elapsed / totalDuration) * 100);

  return Math.min(100, Math.max(0, progress));
};

// Get days remaining
exports.getDaysRemaining = (endDate) => {
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Get total days for a task
exports.getTotalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Get progress bar color based on time remaining
exports.getProgressColor = (startDate, endDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Overdue
  if (now > end) {
    return {
      color: 'error',
      gradient: 'linear-gradient(90deg, #f44336, #c62828)',
      status: 'overdue',
    };
  }

  // Not started
  if (now < start) {
    return {
      color: 'info',
      gradient: 'linear-gradient(90deg, #6DD5FA, #2980B9)',
      status: 'upcoming',
    };
  }

  const totalDuration = end - start;
  const elapsed = now - start;
  const remaining = end - now;
  const percentageRemaining = (remaining / totalDuration) * 100;

  // More than 60% time remaining - Green
  if (percentageRemaining > 60) {
    return {
      color: 'success',
      gradient: 'linear-gradient(90deg, #4CAF50, #2E7D32)',
      status: 'on-track',
    };
  }

  // 40-60% time remaining - Yellow
  if (percentageRemaining >= 40 && percentageRemaining <= 60) {
    return {
      color: 'warning',
      gradient: 'linear-gradient(90deg, #FFC107, #F57C00)',
      status: 'attention',
    };
  }

  // 20-40% time remaining - Orange
  if (percentageRemaining >= 20 && percentageRemaining < 40) {
    return {
      color: 'warning',
      gradient: 'linear-gradient(90deg, #FF9800, #E65100)',
      status: 'urgent',
    };
  }

  // Less than 20% time remaining - Red
  return {
    color: 'error',
    gradient: 'linear-gradient(90deg, #FF5722, #BF360C)',
    status: 'critical',
  };
};

// Check if task is overdue
exports.isOverdue = (endDate) => {
  const now = new Date();
  const end = new Date(endDate);
  return now > end;
};

