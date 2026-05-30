import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isWorker } from '../middleware/roleMiddleware.js';

const router = Router();

// Placeholder routes - worker job controllers to be fully converted
router.get('/', authenticate, isWorker, (req, res) => {
  res.json({ success: true, message: 'SP Worker job route - pending full implementation' });
});

export default router;
