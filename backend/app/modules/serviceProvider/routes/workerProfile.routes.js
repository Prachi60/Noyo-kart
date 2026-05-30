import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { isWorker } from '../middleware/roleMiddleware.js';
import { getProfile, updateProfile, updateLocation } from '../controllers/workerControllers/workerProfileController.js';

const router = Router();

const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('serviceCategory').optional().trim().isLength({ max: 50 }).withMessage('Service category must be less than 50 characters'),
  body('skills').optional().isArray().withMessage('Skills must be an array')
];

router.get('/profile', authenticate, isWorker, getProfile);
router.put('/profile', authenticate, isWorker, updateProfileValidation, updateProfile);
router.put('/profile/location', authenticate, isWorker, updateLocation);

export default router;
