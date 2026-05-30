import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isAdmin } from '../../middleware/roleMiddleware.js';
import { login, refreshToken, logout, getProfile } from '../../controllers/adminControllers/adminAuthController.js';

const router = Router();

router.post('/login', [body('email').isEmail(), body('password').notEmpty()], login);
router.post('/refresh-token', refreshToken);
router.post('/logout', authenticate, isAdmin, logout);
router.get('/profile', authenticate, isAdmin, getProfile);

export default router;
