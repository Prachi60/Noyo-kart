import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan
} from '../controllers/planController.js';

const router = Router();

router.get('/', authenticate, getAllPlans);
router.get('/:id', authenticate, getPlanById);
router.post('/', authenticate, isAdmin, createPlan);
router.put('/:id', authenticate, isAdmin, updatePlan);
router.delete('/:id', authenticate, isAdmin, deletePlan);

export default router;
