import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getBookingReport,
  getVendorReport,
  getWorkerReport,
  getRevenueReport,
  getCustomerReport
} from '../controllers/adminControllers/adminReportController.js';

const router = Router();

router.use(authenticate, isAdmin);

router.get('/bookings', getBookingReport);
router.get('/vendors', getVendorReport);
router.get('/workers', getWorkerReport);
router.get('/revenue', getRevenueReport);
router.get('/customers', getCustomerReport);

export default router;
