import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import {
  getServiceCatalog,
  createServiceCatalogItem,
  deleteServiceCatalogItem,
  getPartsCatalog,
  createPartsCatalogItem,
  deletePartsCatalogItem
} from '../controllers/adminControllers/vendorCatalogController.js';

const router = Router();

// Vendor Service Catalog Routes
router.get('/vendor-services', authenticate, isAdmin, getServiceCatalog);
router.post('/vendor-services', authenticate, isAdmin, createServiceCatalogItem);
router.delete('/vendor-services/:id', authenticate, isAdmin, deleteServiceCatalogItem);

// Vendor Parts Catalog Routes
router.get('/vendor-parts', authenticate, isAdmin, getPartsCatalog);
router.post('/vendor-parts', authenticate, isAdmin, createPartsCatalogItem);
router.delete('/vendor-parts/:id', authenticate, isAdmin, deletePartsCatalogItem);

export default router;
