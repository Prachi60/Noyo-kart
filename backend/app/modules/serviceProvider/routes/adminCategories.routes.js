import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryOrder
} from '../controllers/adminControllers/categoryController.js';

const router = Router();

const createCategoryValidation = [
  body('title').trim().notEmpty().withMessage('Category title is required')
    .isLength({ min: 2, max: 100 }).withMessage('Title must be between 2 and 100 characters'),
  body('slug').optional({ checkFalsy: true }).trim().toLowerCase()
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('homeOrder').optional().isInt({ min: 0 }).withMessage('Home order must be a non-negative integer'),
  body('status').optional().isIn(['active', 'inactive', 'deleted']).withMessage('Status must be active, inactive, or deleted')
];

const updateCategoryValidation = [
  body('title').optional().trim().notEmpty().withMessage('Category title cannot be empty')
    .isLength({ min: 2, max: 100 }).withMessage('Title must be between 2 and 100 characters'),
  body('slug').optional().trim().toLowerCase()
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('homeOrder').optional().isInt({ min: 0 }).withMessage('Home order must be a non-negative integer'),
  body('status').optional().isIn(['active', 'inactive', 'deleted']).withMessage('Status must be active, inactive, or deleted')
];

router.get('/', authenticate, isAdmin, getAllCategories);
router.get('/:id', authenticate, isAdmin, getCategoryById);
router.post('/', authenticate, isAdmin, createCategoryValidation, createCategory);
router.put('/:id', authenticate, isAdmin, updateCategoryValidation, updateCategory);
router.delete('/:id', authenticate, isAdmin, deleteCategory);
router.patch('/:id/order', authenticate, isAdmin, updateCategoryOrder);

export default router;
