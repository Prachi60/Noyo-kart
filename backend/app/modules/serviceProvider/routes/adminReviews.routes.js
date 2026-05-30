import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getAllReviews,
  updateReviewStatus,
  getReviewStats
} from '../controllers/adminControllers/adminReviewController.js';

const router = Router();

router.use(authenticate, isAdmin);

router.get('/', getAllReviews);
router.get('/stats', getReviewStats);
router.patch('/:id/status', updateReviewStatus);

export default router;
