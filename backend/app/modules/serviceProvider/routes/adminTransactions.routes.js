import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getAllTransactions,
  getTransactionStats
} from '../controllers/adminControllers/adminTransactionController.js';

const router = Router();

router.use(authenticate, isAdmin);

router.get('/', getAllTransactions);
router.get('/stats', getTransactionStats);

export default router;
