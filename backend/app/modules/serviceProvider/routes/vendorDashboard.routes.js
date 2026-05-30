import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isVendor } from '../middleware/roleMiddleware.js';
import {
  getDashboardStats,
  getRevenueAnalytics,
  getWorkerPerformance,
  getServicePerformance
} from '../controllers/vendorControllers/vendorDashboardController.js';

const router = Router();

router.get('/stats', authenticate, isVendor, getDashboardStats);
router.get('/revenue', authenticate, isVendor, getRevenueAnalytics);
router.get('/workers', authenticate, isVendor, getWorkerPerformance);
router.get('/services', authenticate, isVendor, getServicePerformance);

export default router;
