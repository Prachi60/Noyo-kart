import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isVendor } from '../../middleware/roleMiddleware.js';
import { getProfile, updateProfile, updateAddress, updateLocation } from '../../controllers/vendorControllers/vendorProfileController.js';

const router = Router();

router.get('/profile', authenticate, isVendor, getProfile);
router.put('/profile', authenticate, isVendor, updateProfile);
router.put('/address', authenticate, isVendor, updateAddress);
router.put('/location', authenticate, isVendor, updateLocation);

export default router;
