import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isSuperAdmin } from '../middleware/roleMiddleware.js';
import {
  getAllCities,
  getCity,
  createCity,
  updateCity,
  deleteCity,
  toggleCityStatus
} from '../controllers/cityController.js';

const router = Router();

router.use(authenticate, isSuperAdmin);

router.get('/', getAllCities);
router.get('/:id', getCity);
router.post('/', createCity);
router.put('/:id', updateCity);
router.delete('/:id', deleteCity);
router.patch('/:id/status', toggleCityStatus);

export default router;
