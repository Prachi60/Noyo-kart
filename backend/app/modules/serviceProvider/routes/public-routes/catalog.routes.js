import { Router } from 'express';
import { getCategories, getServicesByCategory, getBrands, getServiceById } from '../../controllers/publicControllers/catalogController.js';

const router = Router();

router.get('/categories', getCategories);
router.get('/categories/:categoryId/services', getServicesByCategory);
router.get('/brands', getBrands);
router.get('/services/:id', getServiceById);

export default router;
