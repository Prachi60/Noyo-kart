import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { isVendor } from '../middleware/roleMiddleware.js';
import {
  getVendorServices,
  updateServiceAvailability,
  setServicePricing
} from '../controllers/vendorControllers/vendorServiceController.js';

const router = Router();

const updateAvailabilityValidation = [
  body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean')
];

const setPricingValidation = [
  body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('discountPrice').optional().isFloat({ min: 0 }).withMessage('Discount price must be a positive number')
];

router.get('/services', authenticate, isVendor, getVendorServices);
router.put('/services/:serviceId/availability', authenticate, isVendor, updateAvailabilityValidation, updateServiceAvailability);
router.put('/services/:serviceId/pricing', authenticate, isVendor, setPricingValidation, setServicePricing);

export default router;
