import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getFinanceOverview,
  getGSTRReport,
  getTDSReport,
  getCODReport,
  getPaymentTransactions,
  getRevenueBreakdown
} from '../controllers/adminControllers/reportController.js';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate, isAdmin);

router.get('/overview', getFinanceOverview);
router.get('/reports', getPaymentTransactions);
router.get('/reports/gst', getGSTRReport);
router.get('/reports/tds', getTDSReport);
router.get('/reports/cod', getCODReport);
router.get('/reports/revenue-breakdown', getRevenueBreakdown);

export default router;
