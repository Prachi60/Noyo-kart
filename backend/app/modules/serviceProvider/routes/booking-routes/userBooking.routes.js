import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isUser } from '../../middleware/roleMiddleware.js';
import { createBooking, getUserBookings, getBookingById, cancelBooking } from '../../controllers/bookingControllers/userBookingController.js';

const router = Router();

router.post('/', authenticate, isUser, createBooking);
router.get('/', authenticate, isUser, getUserBookings);
router.get('/:id', authenticate, isUser, getBookingById);
router.put('/:id/cancel', authenticate, isUser, cancelBooking);

export default router;
