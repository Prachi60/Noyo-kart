import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isUser } from '../middleware/roleMiddleware.js';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  addReview,
  getUserRatings
} from '../controllers/bookingControllers/userBookingController.js';

const router = Router();

// Mounted at /users/bookings
router.post('/', authenticate, isUser, createBooking);
router.get('/', authenticate, isUser, getUserBookings);
router.get('/ratings', authenticate, isUser, getUserRatings);
router.get('/:id', authenticate, isUser, getBookingById);
router.post('/:id/cancel', authenticate, isUser, cancelBooking);
router.put('/:id/cancel', authenticate, isUser, cancelBooking);
router.put('/:id/reschedule', authenticate, isUser, rescheduleBooking);
router.post('/:id/review', authenticate, isUser, addReview);

export default router;
