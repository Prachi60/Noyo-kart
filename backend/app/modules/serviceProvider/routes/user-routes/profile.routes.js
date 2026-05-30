import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isUser } from '../../middleware/roleMiddleware.js';
import { getProfile, updateProfile, getCheckoutData } from '../../controllers/userControllers/userProfileController.js';

const router = Router();
const updateProfileValidation = [body('name').optional().trim().isLength({ min: 2, max: 50 }), body('email').optional({ nullable: true, checkFalsy: true }).isEmail()];

router.get('/profile', authenticate, isUser, getProfile);
router.get('/checkout-data', authenticate, isUser, getCheckoutData);
router.put('/profile', authenticate, isUser, updateProfileValidation, updateProfile);

export default router;
