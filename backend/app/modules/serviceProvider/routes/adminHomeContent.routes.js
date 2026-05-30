import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import { getHomeContent, updateHomeContent } from '../controllers/adminControllers/homeContentController.js';

const router = Router();

router.get('/', authenticate, isAdmin, getHomeContent);
router.put('/', authenticate, isAdmin, updateHomeContent);

export default router;
