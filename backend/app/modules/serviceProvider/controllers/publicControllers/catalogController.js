import SpCategory from '../../models/SpCategory.js';
import SpUserService from '../../models/SpUserService.js';
import SpBrand from '../../models/SpBrand.js';
import mongoose from 'mongoose';

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value)) return new mongoose.Types.ObjectId(value);
  return null;
};

const getCategories = async (req, res) => {
  try {
    const categories = await SpCategory.find({ status: 'active' }).sort({ homeOrder: 1, title: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

const getServicesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const services = await SpUserService.find({ categoryId, status: 'active' }).sort({ title: 1 });
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
};

const getBrands = async (req, res) => {
  try {
    const { categoryId, categorySlug, cityId, search } = req.query;
    const query = { status: 'active' };
    const and = [];

    let resolvedCategoryId = toObjectId(categoryId);
    if (!resolvedCategoryId && categorySlug) {
      const category = await SpCategory.findOne({
        slug: String(categorySlug).toLowerCase(),
        status: 'active'
      }).select('_id');
      resolvedCategoryId = category?._id || null;
    }

    if (resolvedCategoryId) {
      and.push({
        $or: [
          { categoryIds: resolvedCategoryId },
          { categoryId: resolvedCategoryId }
        ]
      });
    }

    const resolvedCityId = toObjectId(cityId);
    if (resolvedCityId) {
      and.push({
        $or: [
          { cityIds: resolvedCityId },
          { cityIds: { $exists: false } },
          { cityIds: { $size: 0 } }
        ]
      });
    }

    if (search) {
      and.push({ title: { $regex: String(search).trim(), $options: 'i' } });
    }

    if (and.length) query.$and = and;

    const brands = await SpBrand.find(query).sort({ title: 1 });
    res.status(200).json({ success: true, data: brands });
  } catch (error) {
    console.error('Get brands error:', error);
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
