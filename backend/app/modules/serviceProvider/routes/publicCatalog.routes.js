import { Router } from 'express';
import { getCategories, getBrands, getServicesByCategory, getServiceById } from '../controllers/publicControllers/catalogController.js';
import SpBrand from '../models/SpBrand.js';
import SpHomeContent from '../models/SpHomeContent.js';
import SpCategory from '../models/SpCategory.js';
import SpUserService from '../models/SpUserService.js';

const router = Router();

router.get('/categories', getCategories);
router.get('/brands', getBrands);
router.get('/brands/slug/:slug', async (req, res) => {
  try {
    const brand = await SpBrand.findOne({ slug: req.params.slug, status: 'active' });
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    const services = await SpUserService.find({ brandId: brand._id, status: 'active' });
    res.status(200).json({ success: true, data: { brand, services } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch brand' }); }
});
router.get('/services', async (req, res) => {
  try {
    const { categoryId, brandId, search } = req.query;
    const query = { status: 'active' };
    if (categoryId) query.categoryId = categoryId;
    if (brandId) query.brandId = brandId;
    if (search) query.title = { $regex: String(search).trim(), $options: 'i' };
    const services = await SpUserService.find(query).sort({ title: 1 });
    res.status(200).json({ success: true, data: services });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch services' }); }
});
router.get('/services/:id', getServiceById);
router.get('/categories/:categoryId/services', getServicesByCategory);
router.get('/home-content', async (req, res) => {
  try {
    const { cityId } = req.query;
    const parsedCityId = (cityId === 'undefined' || cityId === 'null' || !cityId) ? null : cityId;
    const homeContent = await SpHomeContent.getHomeContent(parsedCityId);
    res.status(200).json({ success: true, data: homeContent });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch home content' }); }
});
router.get('/home-data', async (req, res) => {
  try {
    const { cityId } = req.query;
    const parsedCityId = (cityId === 'undefined' || cityId === 'null' || !cityId) ? null : cityId;
    const [homeContent, categories] = await Promise.all([
      SpHomeContent.getHomeContent(parsedCityId),
      SpCategory.find({ status: 'active' }).sort({ homeOrder: 1 })
    ]);
    res.status(200).json({ success: true, data: { homeContent, categories } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch home data' }); }
});

export default router;
