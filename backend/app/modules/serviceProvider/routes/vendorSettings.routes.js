import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isVendor } from '../middleware/roleMiddleware.js';
import { getSettings, updateSettings, updateBusinessHours } from '../controllers/vendorControllers/vendorSettingsController.js';

const router = Router();

// Mounted at /vendors/settings
router.get('/', authenticate, isVendor, getSettings);
router.put('/', authenticate, isVendor, updateSettings);
router.put('/business-hours', authenticate, isVendor, updateBusinessHours);

export default router;
