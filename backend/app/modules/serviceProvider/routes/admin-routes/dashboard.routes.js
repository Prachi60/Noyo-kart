import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isAdmin } from '../../middleware/roleMiddleware.js';
import { getDashboardStats } from '../../controllers/adminControllers/adminDashboardController.js';

const router = Router();

router.get('/dashboard', authenticate, isAdmin, getDashboardStats);

export default router;
