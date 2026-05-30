import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} from '../controllers/adminControllers/serviceController.js';

const router = Router();

const serviceValidation = [
  body('brandId').isMongoId().withMessage('Valid Brand ID is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('basePrice').isNumeric().withMessage('Base Price must be a number'),
  body('gstPercentage').isNumeric().withMessage('GST Percentage must be a number')
];

router.get('/', authenticate, isAdmin, getAllServices);
router.get('/:id', authenticate, isAdmin, getServiceById);
router.post('/', authenticate, isAdmin, serviceValidation, createService);
router.put('/:id', authenticate, isAdmin, updateService);
router.delete('/:id', authenticate, isAdmin, deleteService);

export default router;
