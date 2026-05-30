import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getAllUsers,
  getUserDetails,
  toggleUserStatus,
  deleteUser,
  getUserBookings,
  getUserWalletTransactions,
  getAllUserBookings
} from '../controllers/adminControllers/adminUserController.js';

const router = Router();

const toggleStatusValidation = [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
];

router.get('/', authenticate, isAdmin, getAllUsers);
router.get('/bookings', authenticate, isAdmin, getAllUserBookings);
router.get('/:id', authenticate, isAdmin, getUserDetails);
router.put('/:id/status', authenticate, isAdmin, toggleStatusValidation, toggleUserStatus);
router.delete('/:id', authenticate, isAdmin, deleteUser);
router.get('/:id/bookings', authenticate, isAdmin, getUserBookings);
router.get('/:id/wallet', authenticate, isAdmin, getUserWalletTransactions);

export default router;
