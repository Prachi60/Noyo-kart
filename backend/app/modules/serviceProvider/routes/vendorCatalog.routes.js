import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isVendor } from '../middleware/roleMiddleware.js';
import SpVendorServiceCatalog from '../models/SpVendorServiceCatalog.js';
import SpVendorPartsCatalog from '../models/SpVendorPartsCatalog.js';

const router = Router();

/**
 * GET /services - Get all vendor services for catalog
 */
router.get('/services', authenticate, isVendor, async (req, res) => {
  try {
    const services = await SpVendorServiceCatalog.find({ status: 'active' })
      .populate('categoryId', 'title')
      .sort({ name: 1 });
    res.status(200).json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch services catalog' });
  }
});

/**
 * GET /parts - Get all vendor parts for catalog
 */
router.get('/parts', authenticate, isVendor, async (req, res) => {
  try {
    const parts = await SpVendorPartsCatalog.find({ status: 'active' })
      .populate('categoryId', 'title')
      .sort({ name: 1 });
    res.status(200).json({ success: true, parts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch parts catalog' });
  }
});

export default router;
