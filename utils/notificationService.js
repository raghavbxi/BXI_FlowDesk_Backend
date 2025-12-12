const Notification = require('../models/Notification');

/**
 * Create a notification for a user
 */
exports.createNotification = async (userId, type, title, message, options = {}) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      taskId: options.taskId || null,
      stepId: options.stepId || null,
      relatedUserId: options.relatedUserId || null,
      metadata: options.metadata || {},
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Create notifications for multiple users
 */
exports.createNotificationsForUsers = async (userIds, type, title, message, options = {}) => {
  try {
    const notifications = userIds.map((userId) => ({
      userId,
      type,
      title,
      message,
      taskId: options.taskId || null,
      stepId: options.stepId || null,
      relatedUserId: options.relatedUserId || null,
      metadata: options.metadata || {},
    }));

    await Notification.insertMany(notifications);
    return notifications;
  } catch (error) {
    console.error('Error creating notifications:', error);
    return [];
  }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return null;
  }
};

/**
 * Mark all notifications as read for a user
 */
exports.markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return null;
  }
};

