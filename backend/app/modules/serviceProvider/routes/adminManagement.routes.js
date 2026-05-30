import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { isSuperAdmin } from '../middleware/roleMiddleware.js';
import {
  getAllAdmins,
  createAdmin,
  deleteAdmin,
  updateAdminRole,
  updateAdmin,
  toggleAdminStatus
} from '../controllers/adminControllers/adminManagementController.js';

const router = Router();

const createAdminValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['super_admin', 'admin']).withMessage('Invalid role')
];

// All routes require Super Admin
router.use(authenticate, isSuperAdmin);

router.get('/', getAllAdmins);
router.post('/', createAdminValidation, createAdmin);
router.delete('/:id', deleteAdmin);
router.put('/:id/role', updateAdminRole);
router.put('/:id', updateAdmin);
router.patch('/:id/status', toggleAdminStatus);

export default router;
