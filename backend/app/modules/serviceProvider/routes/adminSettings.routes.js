import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import { getSettings, updateSettings } from '../controllers/adminControllers/settingsController.js';

const router = Router();

router.use(authenticate, isAdmin);

// Mounted at /admin/settings
router.route('/')
  .get(getSettings)
  .put(updateSettings);

export default router;
