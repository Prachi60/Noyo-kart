import { Router } from 'express';
import mongoose from 'mongoose';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  updateBrandPage,
  uploadBrandImage
} from '../controllers/adminControllers/brandController.js';
import { uploadImage } from '../middleware/uploadMiddleware.js';

const router = Router();

const createBrandValidation = [
  body('title').trim().notEmpty().withMessage('Brand title is required')
    .isLength({ min: 2, max: 100 }).withMessage('Title must be between 2 and 100 characters'),
  body('categoryId').optional().isMongoId().withMessage('Invalid category ID'),
  body('categoryIds').optional().isArray({ min: 1 }).withMessage('At least one category is required')
    .custom((ids) => {
      if (ids && ids.some(id => !mongoose.Types.ObjectId.isValid(id))) {
        throw new Error('One or more category IDs are invalid');
      }
      return true;
    }),
  body('slug').optional().trim().toLowerCase()
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a non-negative number'),
  body('discountPrice').optional().isFloat({ min: 0 }).withMessage('Discount price must be a non-negative number'),
  body('status').optional().isIn(['active', 'inactive', 'deleted']).withMessage('Status must be active, inactive, or deleted')
];

const updateBrandValidation = [
  body('title').optional().trim().notEmpty().withMessage('Brand title cannot be empty')
    .isLength({ min: 2, max: 100 }).withMessage('Title must be between 2 and 100 characters'),
  body('categoryId').optional().isMongoId().withMessage('Invalid category ID'),
  body('categoryIds').optional().isArray().withMessage('Category IDs must be an array')
    .custom((ids) => {
      if (ids && ids.some(id => !mongoose.Types.ObjectId.isValid(id))) {
        throw new Error('One or more category IDs are invalid');
      }
      return true;
    }),
  body('slug').optional().trim().toLowerCase()
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a non-negative number'),
  body('discountPrice').optional().isFloat({ min: 0 }).withMessage('Discount price must be a non-negative number'),
  body('status').optional().isIn(['active', 'inactive', 'deleted']).withMessage('Status must be active, inactive, or deleted')
];

router.get('/', authenticate, isAdmin, getAllBrands);
router.get('/:id', authenticate, isAdmin, getBrandById);
router.post('/', authenticate, isAdmin, createBrandValidation, createBrand);
router.put('/:id', authenticate, isAdmin, updateBrandValidation, updateBrand);
router.delete('/:id', authenticate, isAdmin, deleteBrand);
router.patch('/:id/page', authenticate, isAdmin, updateBrandPage);
router.post('/upload-image', authenticate, isAdmin, uploadImage, uploadBrandImage);

export default router;
