import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isWorker } from '../middleware/roleMiddleware.js';
import {
  getAssignedJobs,
  getJobById,
  updateJobStatus,
  startJob,
  completeJob,
  addWorkerNotes,
  verifyVisit,
  workerReachedLocation,
  collectCash,
  respondToJob
} from '../controllers/bookingControllers/workerBookingController.js';
import {
  createOrUpdateBill,
  getBillByBookingId
} from '../controllers/vendorControllers/vendorBillController.js';

const router = Router();

const withBookingIdParam = (handler) => (req, res, next) => {
  req.params.bookingId = req.params.id;
  return handler(req, res, next);
};

// Mounted at /workers/jobs
router.get('/', authenticate, isWorker, getAssignedJobs);
router.get('/:id', authenticate, isWorker, getJobById);
router.put('/:id/status', authenticate, isWorker, updateJobStatus);
router.put('/:id/respond', authenticate, isWorker, respondToJob);
router.post('/:id/start', authenticate, isWorker, startJob);
router.post('/:id/reached', authenticate, isWorker, workerReachedLocation);
router.post('/:id/complete', authenticate, isWorker, completeJob);
router.post('/:id/visit/verify', authenticate, isWorker, verifyVisit);
router.post('/:id/notes', authenticate, isWorker, addWorkerNotes);
router.post('/:id/payment/collect', authenticate, isWorker, collectCash);

// Bills (frontend: /workers/jobs/:id/bill)
router.post('/:id/bill', authenticate, isWorker, withBookingIdParam(createOrUpdateBill));
router.get('/:id/bill', authenticate, isWorker, withBookingIdParam(getBillByBookingId));

export default router;
