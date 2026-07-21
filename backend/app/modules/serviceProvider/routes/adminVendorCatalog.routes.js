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

const servicesRouter = Router();
servicesRouter.get('/', authenticate, isAdmin, getServiceCatalog);
servicesRouter.post('/', authenticate, isAdmin, createServiceCatalogItem);
servicesRouter.delete('/:id', authenticate, isAdmin, deleteServiceCatalogItem);

const partsRouter = Router();
partsRouter.get('/', authenticate, isAdmin, getPartsCatalog);
partsRouter.post('/', authenticate, isAdmin, createPartsCatalogItem);
partsRouter.delete('/:id', authenticate, isAdmin, deletePartsCatalogItem);

// Legacy combined mount at /admin/vendor-catalog
const router = Router();
router.use('/vendor-services', servicesRouter);
router.use('/vendor-parts', partsRouter);

export { servicesRouter as adminVendorServicesRoutes, partsRouter as adminVendorPartsRoutes };
export default router;
