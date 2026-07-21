import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isVendor } from '../middleware/roleMiddleware.js';
import {
  getVendorBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  assignWorker,
  updateBookingStatus,
  addVendorNotes,
  startSelfJob,
  vendorReachedLocation,
  verifySelfVisit,
  completeSelfJob,
  collectSelfCash,
  payWorker,
  getVendorRatings,
  getPendingBookings
} from '../controllers/bookingControllers/vendorBookingController.js';
import {
  createOrUpdateBill,
  getBillByBookingId
} from '../controllers/vendorControllers/vendorBillController.js';

const router = Router();

const withBookingIdParam = (handler) => (req, res, next) => {
  req.params.bookingId = req.params.id;
  return handler(req, res, next);
};

// Mounted at /vendors/bookings
router.get('/', authenticate, isVendor, getVendorBookings);
router.get('/pending', authenticate, isVendor, getPendingBookings);
router.get('/ratings', authenticate, isVendor, getVendorRatings);

router.get('/:id', authenticate, isVendor, getBookingById);
router.post('/:id/accept', authenticate, isVendor, acceptBooking);
router.post('/:id/reject', authenticate, isVendor, rejectBooking);
router.post('/:id/assign-worker', authenticate, isVendor, assignWorker);
router.put('/:id/status', authenticate, isVendor, updateBookingStatus);
router.post('/:id/notes', authenticate, isVendor, addVendorNotes);
router.post('/:id/pay-worker', authenticate, isVendor, payWorker);

// Self-job flow
router.post('/:id/self/start', authenticate, isVendor, startSelfJob);
router.post('/:id/self/reached', authenticate, isVendor, vendorReachedLocation);
router.post('/:id/self/visit/verify', authenticate, isVendor, verifySelfVisit);
router.post('/:id/self/complete', authenticate, isVendor, completeSelfJob);
router.post('/:id/self/payment/collect', authenticate, isVendor, collectSelfCash);

// Bills (frontend: /vendors/bookings/:id/bill)
router.post('/:id/bill', authenticate, isVendor, withBookingIdParam(createOrUpdateBill));
router.get('/:id/bill', authenticate, isVendor, withBookingIdParam(getBillByBookingId));

export default router;
