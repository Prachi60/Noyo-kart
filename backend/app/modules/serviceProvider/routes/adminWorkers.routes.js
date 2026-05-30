import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getAllWorkers,
  getWorkerDetails,
  approveWorker,
  rejectWorker,
  suspendWorker,
  getWorkerJobs,
  getWorkerEarnings,
  payWorker,
  getAllWorkerJobs,
  getWorkerPaymentsSummary,
  toggleWorkerStatus,
  deleteWorker
} from '../controllers/adminControllers/adminWorkerController.js';

const router = Router();

const rejectWorkerValidation = [
  body('reason').optional().trim()
];

const payWorkerValidation = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('reference').optional().trim(),
  body('notes').optional().trim()
];

router.get('/', authenticate, isAdmin, getAllWorkers);
router.get('/jobs', authenticate, isAdmin, getAllWorkerJobs);
router.get('/payments', authenticate, isAdmin, getWorkerPaymentsSummary);
router.get('/:id', authenticate, isAdmin, getWorkerDetails);
router.post('/:id/approve', authenticate, isAdmin, approveWorker);
router.post('/:id/reject', authenticate, isAdmin, rejectWorkerValidation, rejectWorker);
router.post('/:id/suspend', authenticate, isAdmin, suspendWorker);
router.post('/:id/pay', authenticate, isAdmin, payWorkerValidation, payWorker);
router.patch('/:id/status', authenticate, isAdmin, toggleWorkerStatus);
router.delete('/:id', authenticate, isAdmin, deleteWorker);
router.get('/:id/jobs', authenticate, isAdmin, getWorkerJobs);
router.get('/:id/earnings', authenticate, isAdmin, getWorkerEarnings);

export default router;
