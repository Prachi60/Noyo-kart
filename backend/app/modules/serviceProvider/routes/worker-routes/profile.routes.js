import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isWorker } from '../../middleware/roleMiddleware.js';
import { getProfile, updateProfile, updateLocation } from '../../controllers/workerControllers/workerProfileController.js';

const router = Router();

router.get('/profile', authenticate, isWorker, getProfile);
router.put('/profile', authenticate, isWorker, updateProfile);
router.put('/location', authenticate, isWorker, updateLocation);

export default router;
