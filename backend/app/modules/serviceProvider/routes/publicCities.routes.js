import { Router } from 'express';
import { getActiveCities } from '../controllers/cityController.js';

const router = Router();

/**
 * GET / - Get all active cities for public use
 */
router.get('/', getActiveCities);

export default router;
