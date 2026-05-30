import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isVendor, isAdminOrVendor } from '../../middleware/roleMiddleware.js';
import { createOrUpdateBill, getBillByBookingId } from '../../controllers/vendorControllers/vendorBillController.js';

const router = Router();

router.post('/bookings/:bookingId/bill', authenticate, createOrUpdateBill);
router.get('/bookings/:bookingId/bill', authenticate, getBillByBookingId);

export default router;
