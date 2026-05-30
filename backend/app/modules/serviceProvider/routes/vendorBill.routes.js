import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isVendor } from '../middleware/roleMiddleware.js';
import {
  createOrUpdateBill,
  getBillByBookingId
} from '../controllers/vendorControllers/vendorBillController.js';

const router = Router();

router.post('/bookings/:bookingId/bill', authenticate, isVendor, createOrUpdateBill);
router.get('/bookings/:bookingId/bill', authenticate, isVendor, getBillByBookingId);

export default router;
