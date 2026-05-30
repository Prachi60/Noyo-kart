import { Router } from 'express';
import { body } from 'express-validator';
import { sendOTP, register, login, logout, verifyLogin, refreshToken } from '../../controllers/userControllers/userAuthController.js';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isUser } from '../../middleware/roleMiddleware.js';

const router = Router();

const sendOTPValidation = [body('phone').trim().notEmpty().withMessage('Phone number is required').isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits')];
const verifyLoginValidation = [body('phone').trim().notEmpty().isLength({ min: 10, max: 10 }), body('otp').isLength({ min: 6, max: 6 })];
const registerValidation = [body('name').trim().notEmpty().withMessage('Name is required'), body('email').optional({ nullable: true, checkFalsy: true }).isEmail()];

router.post('/send-otp', sendOTPValidation, sendOTP);
router.post('/verify-login', verifyLoginValidation, verifyLogin);
router.post('/register', registerValidation, register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', authenticate, isUser, logout);

export default router;
