import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getDashboardStats,
  getRevenueAnalytics,
  getBookingTrends,
  getUserGrowthMetrics
} from '../controllers/adminControllers/adminDashboardController.js';

const router = Router();

router.get('/stats', authenticate, isAdmin, getDashboardStats);
router.get('/revenue', authenticate, isAdmin, getRevenueAnalytics);
router.get('/bookings/trends', authenticate, isAdmin, getBookingTrends);
router.get('/users/growth', authenticate, isAdmin, getUserGrowthMetrics);

export default router;
