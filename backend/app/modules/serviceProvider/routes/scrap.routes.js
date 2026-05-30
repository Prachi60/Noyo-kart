import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isUser, isAdmin } from '../middleware/roleMiddleware.js';
import {
  createScrap,
  getMyScrap,
  getAvailableScrap,
  getMyAcceptedScrap,
  acceptScrap,
  completeScrap,
  getAllScrapAdmin,
  getScrapById,
  deleteScrap
} from '../controllers/scrapController.js';

const router = Router();

// User Routes
router.post('/', authenticate, isUser, createScrap);
router.get('/my', authenticate, isUser, getMyScrap);

// Admin Actions
router.put('/:id/accept', authenticate, isAdmin, acceptScrap);
router.put('/:id/complete', authenticate, isAdmin, completeScrap);
router.delete('/:id', authenticate, deleteScrap);

// Admin Routes
router.get('/all', authenticate, isAdmin, getAllScrapAdmin);

// Shared/Specific ID Route
router.get('/:id', authenticate, getScrapById);

export default router;
