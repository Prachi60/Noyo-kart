import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isUser } from '../middleware/roleMiddleware.js';

const router = Router();

// Placeholder routes - booking controllers to be fully converted
router.get('/', authenticate, isUser, (req, res) => {
  res.json({ success: true, message: 'SP User booking route - pending full implementation' });
});

export default router;
