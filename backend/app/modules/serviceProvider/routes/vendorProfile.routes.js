import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { isVendor } from '../middleware/roleMiddleware.js';
import { getProfile, updateProfile, updateAddress, updateLocation } from '../controllers/vendorControllers/vendorProfileController.js';

const router = Router();

const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('businessName').optional().trim().isLength({ max: 100 }).withMessage('Business name must be less than 100 characters')
];

const updateAddressValidation = [
  body('fullAddress').notEmpty().trim().withMessage('Full address is required'),
  body('lat').notEmpty().isFloat().withMessage('Valid latitude is required'),
  body('lng').notEmpty().isFloat().withMessage('Valid longitude is required')
];

router.get('/profile', authenticate, isVendor, getProfile);
router.put('/profile', authenticate, isVendor, updateProfileValidation, updateProfile);
router.put('/address', authenticate, isVendor, updateAddressValidation, updateAddress);
router.put('/profile/location', authenticate, isVendor, updateLocation);

export default router;
