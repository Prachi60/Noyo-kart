import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isVendor } from '../../middleware/roleMiddleware.js';
import { getDashboardStats, getRevenueAnalytics, getWorkerPerformance, getServicePerformance } from '../../controllers/vendorControllers/vendorDashboardController.js';

const router = Router();

router.get('/dashboard', authenticate, isVendor, getDashboardStats);
router.get('/analytics/revenue', authenticate, isVendor, getRevenueAnalytics);
router.get('/analytics/workers', authenticate, isVendor, getWorkerPerformance);
router.get('/analytics/services', authenticate, isVendor, getServicePerformance);

export default router;
