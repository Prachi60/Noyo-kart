import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isVendor } from '../../middleware/roleMiddleware.js';
import { getVendorWorkers, getVendorWorkerById, addWorker, linkWorker, updateWorker, removeWorker, getWorkerPerformance } from '../../controllers/vendorControllers/vendorWorkerController.js';

const router = Router();

router.get('/', authenticate, isVendor, getVendorWorkers);
router.get('/:id', authenticate, isVendor, getVendorWorkerById);
router.post('/', authenticate, isVendor, addWorker);
router.post('/link', authenticate, isVendor, linkWorker);
router.put('/:id', authenticate, isVendor, updateWorker);
router.delete('/:id', authenticate, isVendor, removeWorker);
router.get('/:id/performance', authenticate, isVendor, getWorkerPerformance);

export default router;
