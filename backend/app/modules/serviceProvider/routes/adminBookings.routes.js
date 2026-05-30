import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getAllBookings,
  getBookingById,
  cancelBooking,
  getBookingAnalytics
} from '../controllers/bookingControllers/adminBookingController.js';

const router = Router();

const cancelBookingValidation = [
  body('cancellationReason').optional().trim()
];

router.get('/', authenticate, isAdmin, getAllBookings);
router.get('/analytics', authenticate, isAdmin, getBookingAnalytics);
router.get('/:id', authenticate, isAdmin, getBookingById);
router.post('/:id/cancel', authenticate, isAdmin, cancelBookingValidation, cancelBooking);

export default router;
