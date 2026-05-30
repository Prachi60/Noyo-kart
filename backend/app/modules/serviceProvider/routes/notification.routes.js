import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isUser, isVendor, isWorker, isAdmin } from '../middleware/roleMiddleware.js';
import {
  getUserNotifications,
  getVendorNotifications,
  getWorkerNotifications,
  getAdminNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
} from '../controllers/notificationController.js';

const router = Router();

// Routes
router.get('/user', authenticate, isUser, getUserNotifications);
router.get('/vendor', authenticate, isVendor, getVendorNotifications);
router.get('/worker', authenticate, isWorker, getWorkerNotifications);
router.get('/admin', authenticate, isAdmin, getAdminNotifications);
router.put('/:id/read', authenticate, markAsRead);
router.put('/read-all', authenticate, markAllAsRead);
router.delete('/delete-all', authenticate, deleteAllNotifications);
router.delete('/:id', authenticate, deleteNotification);

export default router;
