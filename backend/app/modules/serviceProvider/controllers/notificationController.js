import SpNotification from '../models/SpNotification.js';
import { getRedis, isRedisConnected } from '../services/redisService.js';

/**
 * Create notification (internal use)
 */
export const createNotification = async ({
  userId = null,
  vendorId = null,
  workerId = null,
  adminId = null,
  type,
  title,
  message,
  relatedId = null,
  relatedType = null,
  data = {},
  skipPush = false,
  pushData = {},
  priority = null
}) => {
  try {
    // Dedup check
    let isDuplicate = false;
    const dedupTarget = userId || vendorId || workerId || adminId || 'unknown';
    const dedupKey = `notif:dedup:${type}:${String(relatedId || '')}:${String(dedupTarget)}`;

    if (isRedisConnected()) {
      const set = await getRedis().set(dedupKey, '1', 'EX', 5, 'NX');
      isDuplicate = set === null;
    } else {
      const duplicateQuery = {
        type,
        title,
        createdAt: { $gt: new Date(Date.now() - 5000) }
      };
      if (userId) duplicateQuery.userId = userId;
      if (vendorId) duplicateQuery.vendorId = vendorId;
      if (workerId) duplicateQuery.workerId = workerId;
      if (adminId) duplicateQuery.adminId = adminId;
      if (relatedId) duplicateQuery.relatedId = relatedId;

      const existing = await SpNotification.findOne(duplicateQuery);
      isDuplicate = !!existing;
      if (isDuplicate) return existing;
    }

    if (isDuplicate) {
      console.log(`[Notification] Dedup hit (Redis): ${type} for ${relatedId}`);
      return null;
    }

    const notification = await SpNotification.create({
      userId,
      vendorId,
      workerId,
      adminId,
      type,
      title,
      message,
      relatedId,
      relatedType,
      data
    });

    // Note: Socket.io and FCM push logic would be integrated at the app level
    // This module creates the notification record; push delivery is handled by the host app's socket/FCM setup

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

/**
 * Get user notifications
 */
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isRead, page = 1, limit = 20 } = req.query;

    const query = { userId };
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await SpNotification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SpNotification.countDocuments(query);
    const unreadCount = await SpNotification.countDocuments({ userId, isRead: false });

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
};

/**
 * Get vendor notifications
 */
export const getVendorNotifications = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { isRead, page = 1, limit = 20 } = req.query;

    const query = { vendorId };
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await SpNotification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SpNotification.countDocuments(query);
    const unreadCount = await SpNotification.countDocuments({ vendorId, isRead: false });

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get vendor notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
};

/**
 * Get worker notifications
 */
export const getWorkerNotifications = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { isRead, page = 1, limit = 20 } = req.query;

    const query = { workerId };
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await SpNotification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SpNotification.countDocuments(query);
    const unreadCount = await SpNotification.countDocuments({ workerId, isRead: false });

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get worker notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
};

/**
 * Get admin notifications
 */
export const getAdminNotifications = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { isRead, page = 1, limit = 20 } = req.query;

    const query = { adminId };
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await SpNotification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SpNotification.countDocuments(query);
    const unreadCount = await SpNotification.countDocuments({ adminId, isRead: false });

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get admin notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole;

    let query = { _id: id };
    if (userRole === 'USER') query.userId = userId;
    else if (userRole === 'VENDOR') query.vendorId = userId;
    else if (userRole === 'WORKER') query.workerId = userId;
    else if (userRole === 'ADMIN') query.adminId = userId;

    const notification = await SpNotification.findOne(query);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({ success: true, message: 'Notification marked as read', data: notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.userRole;

    let query = { isRead: false };
    if (userRole === 'USER') query.userId = userId;
    else if (userRole === 'VENDOR') query.vendorId = userId;
    else if (userRole === 'WORKER') query.workerId = userId;
    else if (userRole === 'ADMIN') query.adminId = userId;

    await SpNotification.updateMany(query, { isRead: true, readAt: new Date() });

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read.' });
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole;

    let query = { _id: id };
    if (userRole === 'USER') query.userId = userId;
    else if (userRole === 'VENDOR') query.vendorId = userId;
    else if (userRole === 'WORKER') query.workerId = userId;
    else if (userRole === 'ADMIN') query.adminId = userId;

    const notification = await SpNotification.findOneAndDelete(query);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notification.' });
  }
};

/**
 * Delete all notifications for the current user
 */
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.userRole;

    let query = {};
    if (userRole === 'USER' || userRole === 'user') query.userId = userId;
    else if (userRole === 'VENDOR' || userRole === 'vendor') query.vendorId = userId;
    else if (userRole === 'WORKER' || userRole === 'worker') query.workerId = userId;
    else if (userRole === 'ADMIN' || userRole === 'admin' || userRole === 'super_admin') query.adminId = userId;
    else {
      return res.status(403).json({ success: false, message: 'Invalid user role' });
    }

    const result = await SpNotification.deleteMany(query);

    res.status(200).json({
      success: true,
      message: 'All notifications deleted successfully',
      count: result.deletedCount
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete all notifications.' });
  }
};
