import SpCategory from '../../models/SpCategory.js';
import SpService from '../../models/SpService.js';
import SpUserService from '../../models/SpUserService.js';
import SpBrand from '../../models/SpBrand.js';

const getCategories = async (req, res) => {
  try {
    const categories = await SpCategory.find({ status: 'active' }).sort({ order: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

const getServicesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const services = await SpUserService.find({ categoryId, status: 'active' }).sort({ order: 1 });
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
};

const getBrands = async (req, res) => {
  try {
    const brands = await SpBrand.find({ status: 'active' }).sort({ order: 1 });
    res.status(200).json({ success: true, data: brands });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch brands' });
  }
};

const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await SpUserService.findById(id).populate('categoryId', 'title slug');
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.status(200).json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch service' });
  }
};

export { getCategories, getServicesByCategory, getBrands, getServiceById };
