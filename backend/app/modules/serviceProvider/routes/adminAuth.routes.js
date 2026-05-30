import { Router } from 'express';
import { body } from 'express-validator';
import {
  login,
  logout,
  updateProfile,
  getProfile
} from '../controllers/adminAuthController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/login', loginValidation, login);
router.post('/logout', authenticate, isAdmin, logout);
router.put('/profile', authenticate, isAdmin, updateProfile);
router.get('/profile', authenticate, isAdmin, getProfile);

export default router;
