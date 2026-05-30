import SpNotification from '../../models/SpNotification.js';
import { sendNotificationToUser, sendNotificationToVendor, sendNotificationToWorker, sendNotificationToAdmin } from '../../services/firebaseAdmin.js';

const createNotification = async ({ userId = null, vendorId = null, workerId = null, adminId = null, type, title, message, relatedId = null, relatedType = null, data = {}, skipPush = false, pushData = {}, priority = null }) => {
  try {
    const notification = await SpNotification.create({ userId, vendorId, workerId, adminId, type, title, message, relatedId, relatedType, data });
    if (!skipPush) {
      const payload = { title, body: message, priority: priority || 'normal', data: { ...data, ...pushData, type: pushData.type || type, relatedId: relatedId ? String(relatedId) : '', notificationId: String(notification._id) } };
      try {
        if (userId) await sendNotificationToUser(userId, payload);
        if (vendorId) await sendNotificationToVendor(vendorId, payload);
        if (workerId) await sendNotificationToWorker(workerId, payload);
        if (adminId) await sendNotificationToAdmin(adminId, payload);
      } catch (pushError) { console.error('Push notification failed:', pushError); }
    }
    return notification;
  } catch (error) { console.error('Create notification error:', error); return null; }
};

const getUserNotifications = async (req, res) => { try { const userId = req.user.id; const { isRead, page = 1, limit = 20 } = req.query; const query = { userId }; if (isRead !== undefined) query.isRead = isRead === 'true'; const skip = (parseInt(page) - 1) * parseInt(limit); const notifications = await SpNotification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)); const total = await SpNotification.countDocuments(query); const unreadCount = await SpNotification.countDocuments({ userId, isRead: false }); res.status(200).json({ success: true, data: notifications, unreadCount, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } }); } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch notifications.' }); } };

const getVendorNotifications = async (req, res) => { try { const vendorId = req.user.id; const { isRead, page = 1, limit = 20 } = req.query; const query = { vendorId }; if (isRead !== undefined) query.isRead = isRead === 'true'; const skip = (parseInt(page) - 1) * parseInt(limit); const notifications = await SpNotification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)); const total = await SpNotification.countDocuments(query); const unreadCount = await SpNotification.countDocuments({ vendorId, isRead: false }); res.status(200).json({ success: true, data: notifications, unreadCount, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } }); } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch notifications.' }); } };

const getWorkerNotifications = async (req, res) => { try { const workerId = req.user.id; const { isRead, page = 1, limit = 20 } = req.query; const query = { workerId }; if (isRead !== undefined) query.isRead = isRead === 'true'; const skip = (parseInt(page) - 1) * parseInt(limit); const notifications = await SpNotification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)); const total = await SpNotification.countDocuments(query); const unreadCount = await SpNotification.countDocuments({ workerId, isRead: false }); res.status(200).json({ success: true, data: notifications, unreadCount, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } }); } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch notifications.' }); } };

const getAdminNotifications = async (req, res) => { try { const adminId = req.user.id; const { isRead, page = 1, limit = 20 } = req.query; const query = { adminId }; if (isRead !== undefined) query.isRead = isRead === 'true'; const skip = (parseInt(page) - 1) * parseInt(limit); const notifications = await SpNotification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)); const total = await SpNotification.countDocuments(query); const unreadCount = await SpNotification.countDocuments({ adminId, isRead: false }); res.status(200).json({ success: true, data: notifications, unreadCount, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } }); } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch notifications.' }); } };

const markAsRead = async (req, res) => { try { const { id } = req.params; const notification = await SpNotification.findById(id); if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' }); notification.isRead = true; notification.readAt = new Date(); await notification.save(); res.status(200).json({ success: true, message: 'Notification marked as read' }); } catch (error) { res.status(500).json({ success: false, message: 'Failed to mark as read.' }); } };

const markAllAsRead = async (req, res) => { try { const userId = req.user.id; const userRole = req.userRole; let query = { isRead: false }; if (userRole === 'USER') query.userId = userId; else if (userRole === 'VENDOR') query.vendorId = userId; else if (userRole === 'WORKER') query.workerId = userId; else if (userRole === 'ADMIN') query.adminId = userId; await SpNotification.updateMany(query, { isRead: true, readAt: new Date() }); res.status(200).json({ success: true, message: 'All notifications marked as read' }); } catch (error) { res.status(500).json({ success: false, message: 'Failed to mark all as read.' }); } };

const deleteNotification = async (req, res) => { try { const { id } = req.params; const notification = await SpNotification.findByIdAndDelete(id); if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' }); res.status(200).json({ success: true, message: 'Notification deleted' }); } catch (error) { res.status(500).json({ success: false, message: 'Failed to delete notification.' }); } };

const deleteAllNotifications = async (req, res) => { try { const userId = req.user.id; const userRole = req.userRole; let query = {}; if (userRole === 'USER') query.userId = userId; else if (userRole === 'VENDOR') query.vendorId = userId; else if (userRole === 'WORKER') query.workerId = userId; else if (userRole === 'ADMIN') query.adminId = userId; const result = await SpNotification.deleteMany(query); res.status(200).json({ success: true, message: 'All notifications deleted', count: result.deletedCount }); } catch (error) { res.status(500).json({ success: false, message: 'Failed to delete notifications.' }); } };

export { createNotification, getUserNotifications, getVendorNotifications, getWorkerNotifications, getAdminNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications };
