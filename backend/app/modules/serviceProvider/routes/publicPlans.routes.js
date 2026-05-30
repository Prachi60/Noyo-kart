import { Router } from 'express';
import { getAllPlans } from '../controllers/planController.js';

const router = Router();

// GET /plans - Get all active plans (public)
router.get('/plans', (req, res, next) => {
  req.query.activeOnly = 'true';
  next();
}, getAllPlans);

export default router;
