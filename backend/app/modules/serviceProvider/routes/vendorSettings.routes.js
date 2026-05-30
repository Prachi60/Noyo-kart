import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isVendor } from '../middleware/roleMiddleware.js';
import { getSettings, updateSettings, updateBusinessHours } from '../controllers/vendorControllers/vendorSettingsController.js';

const router = Router();

router.get('/settings', authenticate, isVendor, getSettings);
router.put('/settings', authenticate, isVendor, updateSettings);
router.put('/business-hours', authenticate, isVendor, updateBusinessHours);

export default router;
