import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  initiateCashCollection,
  initiateOnlineCollection,
  verifyOnlinePayment,
  confirmManualOnlinePayment,
  confirmCashCollection,
  customerConfirmPayment,
  getCashCollectionStatus
} from '../controllers/bookingControllers/cashCollectionController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Vendor/Worker routes
router.post('/:id/initiate', initiateCashCollection);
router.post('/:id/initiate-online', initiateOnlineCollection);
router.post('/:id/confirm', confirmCashCollection);

// Explicit verification route
router.post('/:id/verify-online', verifyOnlinePayment);
router.post('/:id/confirm-manual-online', confirmManualOnlinePayment);

// Customer route
router.post('/:id/customer-confirm', customerConfirmPayment);

// Status route (read-only check)
router.get('/:id/status', getCashCollectionStatus);

export default router;
