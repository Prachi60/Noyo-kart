import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isVendor } from '../../middleware/roleMiddleware.js';
import { getVendorServices, updateServiceAvailability, setServicePricing } from '../../controllers/vendorControllers/vendorServiceController.js';

const router = Router();

router.get('/services', authenticate, isVendor, getVendorServices);
router.put('/services/:serviceId/availability', authenticate, isVendor, updateServiceAvailability);
router.put('/services/:serviceId/pricing', authenticate, isVendor, setServicePricing);

export default router;
