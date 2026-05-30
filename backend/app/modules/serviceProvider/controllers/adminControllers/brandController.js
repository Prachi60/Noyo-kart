import SpBrand from '../../models/SpBrand.js';
import SpCategory from '../../models/SpCategory.js';
import { validationResult } from 'express-validator';
import { SP_SERVICE_STATUS } from '../../constants.js';

const getAllBrands = async (req, res) => {
  try {
    const { status, categoryId, cityId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (categoryId) query.categoryIds = categoryId;
    if (cityId) query.cityIds = cityId;
    const brands = await SpBrand.find(query).select('-__v').sort({ createdAt: -1 }).lean();
    const cleanMongoIds = (obj) => { if (!obj) return obj; if (Array.isArray(obj)) return obj.map(item => cleanMongoIds(item)); if (typeof obj === 'object' && obj !== null) { const cleaned = {}; for (const [key, value] of Object.entries(obj)) { if (key === '_id') continue; cleaned[key] = cleanMongoIds(value); } return cleaned; } return obj; };
    res.status(200).json({ success: true, count: brands.length, brands: brands.map(brand => { const validCats = (Array.isArray(brand.categoryIds) ? brand.categoryIds : []).filter(c => c); const catIds = validCats.map(cat => { if (cat._id) return cat._id.toString(); if (typeof cat === 'string') return cat; if (cat.toString) return cat.toString(); return null; }).filter(Boolean); const catTitles = validCats.map(cat => cat.title).filter(Boolean); return { id: brand._id.toString(), title: brand.title, slug: brand.slug, cityIds: brand.cityIds || [], categoryIds: catIds, categoryTitles: catTitles, categoryId: catIds[0] || null, categoryTitle: catTitles[0] || null, iconUrl: brand.iconUrl, badge: brand.badge, routePath: brand.routePath, status: brand.status, isPopular: brand.isPopular, isFeatured: brand.isFeatured, rating: brand.rating, totalBookings: brand.totalBookings, page: cleanMongoIds(brand.page) || {}, sections: cleanMongoIds(brand.sections) || [], createdAt: brand.createdAt, updatedAt: brand.updatedAt }; }) });
  } catch (error) { console.error('Get all brands error:', error); res.status(500).json({ success: false, message: 'Failed to fetch brands.' }); }
};

const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await SpBrand.findById(id).populate('categoryIds', 'title slug').select('-__v').lean();
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    const cleanMongoIds = (obj) => { if (!obj) return obj; if (Array.isArray(obj)) return obj.map(item => cleanMongoIds(item)); if (typeof obj === 'object' && obj !== null) { const cleaned = {}; for (const [key, value] of Object.entries(obj)) { if (key === '_id') continue; cleaned[key] = cleanMongoIds(value); } return cleaned; } return obj; };
    res.status(200).json({ success: true, brand: { id: brand._id.toString(), title: brand.title, slug: brand.slug, cityIds: brand.cityIds || [], categoryIds: (brand.categoryIds || []).map(cat => cat._id?.toString() || cat.toString()), categoryTitles: (brand.categoryIds || []).map(cat => cat.title).filter(Boolean), iconUrl: brand.iconUrl, badge: brand.badge, routePath: brand.routePath, status: brand.status, isPopular: brand.isPopular, isFeatured: brand.isFeatured, rating: brand.rating, totalBookings: brand.totalBookings, page: cleanMongoIds(brand.page) || {}, sections: cleanMongoIds(brand.sections) || [], createdAt: brand.createdAt, updatedAt: brand.updatedAt } });
  } catch (error) { console.error('Get brand by ID error:', error); res.status(500).json({ success: false, message: 'Failed to fetch brand.' }); }
};

const createBrand = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const { title, slug, categoryId, categoryIds: providedCategoryIds, iconUrl, badge, page, sections, cityIds } = req.body;
    const categoryIds = providedCategoryIds || (categoryId ? [categoryId] : []);
    if (categoryIds.length === 0) return res.status(400).json({ success: false, message: 'Please provide at least one category' });
    const categoriesCount = await SpCategory.countDocuments({ _id: { $in: categoryIds } });
    if (categoriesCount !== categoryIds.length) return res.status(400).json({ success: false, message: 'One or more categories not found' });
    const existingBrand = await SpBrand.findOne({ $or: [{ title: title.trim() }, { slug: slug?.trim().toLowerCase() }] });
    if (existingBrand) return res.status(400).json({ success: false, message: 'Brand with this title or slug already exists' });
    const brand = await SpBrand.create({ title: title.trim(), slug: slug?.trim().toLowerCase() || undefined, categoryIds, iconUrl: iconUrl || null, badge: badge?.trim() || null, routePath: `/user/brand/${slug?.trim().toLowerCase() || title.trim().toLowerCase().replace(/\s+/g, '-')}`, page: page || { banners: [], ratingTitle: title.trim(), ratingValue: '', bookingsText: '', paymentOffersEnabled: true, paymentOffers: [], serviceCategoriesGrid: [] }, sections: sections || [], cityIds: cityIds || [], status: SP_SERVICE_STATUS.ACTIVE, createdBy: req.user.id });
    res.status(201).json({ success: true, message: 'Brand created successfully', brand: { id: brand._id, title: brand.title, slug: brand.slug, categoryIds: brand.categoryIds.map(c => c.toString()), iconUrl: brand.iconUrl, badge: brand.badge, routePath: brand.routePath, page: brand.page, sections: brand.sections, createdAt: brand.createdAt } });
  } catch (error) { if (error.code === 11000) return res.status(400).json({ success: false, message: 'Brand with this title or slug already exists' }); console.error('Create brand error:', error); res.status(500).json({ success: false, message: 'Failed to create brand.' }); }
};

const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, categoryId, categoryIds: providedCategoryIds, iconUrl, badge, page, sections, status, cityIds: updateCityIds } = req.body;
    const categoryIds = providedCategoryIds || (categoryId ? [categoryId] : undefined);
    const brand = await SpBrand.findById(id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    if (categoryIds) { const count = await SpCategory.countDocuments({ _id: { $in: categoryIds } }); if (count !== categoryIds.length) return res.status(400).json({ success: false, message: 'One or more categories not found' }); }
    if (title !== undefined) brand.title = title.trim();
    if (slug !== undefined) { brand.slug = slug.trim().toLowerCase(); brand.routePath = `/user/brand/${slug.trim().toLowerCase()}`; }
    if (updateCityIds !== undefined) brand.cityIds = updateCityIds;
    if (categoryIds !== undefined) brand.categoryIds = categoryIds;
    if (iconUrl !== undefined) brand.iconUrl = iconUrl || null;
    if (badge !== undefined) brand.badge = badge?.trim() || null;
    if (page !== undefined) brand.page = page;
    if (sections !== undefined) brand.sections = sections;
    if (status !== undefined) brand.status = status;
    await brand.save();
    res.status(200).json({ success: true, message: 'Brand updated successfully', brand: { id: brand._id, title: brand.title, slug: brand.slug, categoryIds: brand.categoryIds.map(c => c.toString()), iconUrl: brand.iconUrl, badge: brand.badge, routePath: brand.routePath, page: brand.page, sections: brand.sections } });
  } catch (error) { if (error.code === 11000) return res.status(400).json({ success: false, message: 'Brand with this title or slug already exists' }); console.error('Update brand error:', error); res.status(500).json({ success: false, message: 'Failed to update brand.' }); }
};

const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await SpBrand.findById(id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    brand.status = SP_SERVICE_STATUS.DELETED;
    await brand.save();
    res.status(200).json({ success: true, message: 'Brand deleted successfully' });
  } catch (error) { console.error('Delete brand error:', error); res.status(500).json({ success: false, message: 'Failed to delete brand.' }); }
};

const updateBrandPage = async (req, res) => {
  try {
    const { id } = req.params;
    const { page } = req.body;
    const brand = await SpBrand.findById(id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    if (page !== undefined) { brand.page = page; brand.markModified('page'); }
    await brand.save();
    res.status(200).json({ success: true, message: 'Brand page content updated successfully', brand: { id: brand._id, page: brand.page } });
  } catch (error) { console.error('Update brand page error:', error); res.status(500).json({ success: false, message: 'Failed to update brand page.' }); }
};

const uploadBrandImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided' });
    res.status(200).json({ success: true, message: 'Image uploaded successfully', imageUrl: req.file.path });
  } catch (error) { console.error('Upload image error:', error); res.status(500).json({ success: false, message: error.message || 'Failed to upload image' }); }
};

export { getAllBrands, getBrandById, createBrand, updateBrand, deleteBrand, updateBrandPage, uploadBrandImage };
