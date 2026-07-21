import { Router } from 'express';
import { getAllPlans } from '../controllers/planController.js';

const router = Router();

// Mounted at /public/plans
router.get('/', (req, res, next) => {
  req.query.activeOnly = 'true';
  next();
}, getAllPlans);

export default router;
