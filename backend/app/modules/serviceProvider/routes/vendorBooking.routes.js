import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isVendor } from '../middleware/roleMiddleware.js';

const router = Router();

// Placeholder routes - vendor booking controllers to be fully converted
router.get('/', authenticate, isVendor, (req, res) => {
  res.json({ success: true, message: 'SP Vendor booking route - pending full implementation' });
});

export default router;
