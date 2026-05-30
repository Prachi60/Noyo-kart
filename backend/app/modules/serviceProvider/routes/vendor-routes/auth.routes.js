import { Router } from 'express';
import { body } from 'express-validator';
import { sendOTP, register, login, logout, verifyLogin, refreshToken } from '../../controllers/vendorControllers/vendorAuthController.js';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isVendor } from '../../middleware/roleMiddleware.js';

const router = Router();

router.post('/send-otp', [body('phone').trim().notEmpty().isLength({ min: 10, max: 10 })], sendOTP);
router.post('/verify-login', [body('phone').trim().notEmpty(), body('otp').isLength({ min: 6, max: 6 })], verifyLogin);
router.post('/register', [body('name').trim().notEmpty()], register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', authenticate, isVendor, logout);

export default router;
