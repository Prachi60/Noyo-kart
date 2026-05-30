import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getAllVendors,
  getVendorDetails,
  approveVendor,
  rejectVendor,
  suspendVendor,
  getVendorBookings,
  getVendorEarnings,
  getAllVendorBookings,
  getVendorPaymentsSummary,
  toggleVendorStatus,
  deleteVendor
} from '../controllers/adminControllers/adminVendorController.js';

const router = Router();

const rejectVendorValidation = [
  body('reason').optional().trim()
];

router.get('/', authenticate, isAdmin, getAllVendors);
router.get('/bookings', authenticate, isAdmin, getAllVendorBookings);
router.get('/payments', authenticate, isAdmin, getVendorPaymentsSummary);
router.get('/:id', authenticate, isAdmin, getVendorDetails);
router.post('/:id/approve', authenticate, isAdmin, approveVendor);
router.post('/:id/reject', authenticate, isAdmin, rejectVendorValidation, rejectVendor);
router.post('/:id/suspend', authenticate, isAdmin, suspendVendor);
router.patch('/:id/status', authenticate, isAdmin, toggleVendorStatus);
router.delete('/:id', authenticate, isAdmin, deleteVendor);
router.get('/:id/bookings', authenticate, isAdmin, getVendorBookings);
router.get('/:id/earnings', authenticate, isAdmin, getVendorEarnings);

export default router;
