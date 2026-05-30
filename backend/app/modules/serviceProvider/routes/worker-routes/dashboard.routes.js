import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isWorker } from '../../middleware/roleMiddleware.js';
import { getDashboardStats } from '../../controllers/workerControllers/workerDashboardController.js';

const router = Router();

router.get('/dashboard', authenticate, isWorker, getDashboardStats);

export default router;
