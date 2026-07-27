import SpCategory from '../../models/SpCategory.js';
import { validationResult } from 'express-validator';
import { SP_SERVICE_STATUS } from '../../constants.js';

const getAllCategories = async (req, res) => {
  try {
    const { status, showOnHome, isPopular, cityId, page, limit } = req.query;
    const query = {};
    if (status) query.status = status;
    if (showOnHome !== undefined) query.showOnHome = showOnHome === 'true';
    if (isPopular !== undefined) query.isPopular = isPopular === 'true';
    if (cityId) {
      query.$or = [
        { cityIds: cityId },
        { cityIds: { $exists: false } },
        { cityIds: { $size: 0 } }
      ];
    }

    let dbQuery = SpCategory.find(query).select('-__v').sort({ homeOrder: 1, createdAt: -1, _id: 1 });

    let totalCount = 0;
    let totalPages = 1;
    let currentPage = 1;

    if (page && limit) {
      currentPage = parseInt(page);
      const limitNum = parseInt(limit);
      totalCount = await SpCategory.countDocuments(query);
      totalPages = Math.ceil(totalCount / limitNum);
      const skip = (currentPage - 1) * limitNum;
      dbQuery = dbQuery.skip(skip).limit(limitNum);
    } else {
      totalCount = await SpCategory.countDocuments(query);
    }

    const categories = await dbQuery.lean();

    res.status(200).json({ 
      success: true, 
      count: categories.length, 
      total: totalCount,
      totalPages: totalPages,
      currentPage: currentPage,
      categories: categories.map(cat => ({ id: cat._id, title: cat.title, slug: cat.slug, homeIconUrl: cat.homeIconUrl, homeBadge: cat.homeBadge, hasSaleBadge: cat.hasSaleBadge, showOnHome: cat.showOnHome, homeOrder: cat.homeOrder, description: cat.description, imageUrl: cat.imageUrl, status: cat.status, isPopular: cat.isPopular, cityIds: cat.cityIds || [], metaTitle: cat.metaTitle, metaDescription: cat.metaDescription, createdAt: cat.createdAt, updatedAt: cat.updatedAt })) 
    });
  } catch (error) { console.error('Get all categories error:', error); res.status(500).json({ success: false, message: 'Failed to fetch categories.' }); }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await SpCategory.findById(id).select('-__v').lean();
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.status(200).json({ success: true, category: { id: category._id, title: category.title, slug: category.slug, homeIconUrl: category.homeIconUrl, homeBadge: category.homeBadge, hasSaleBadge: category.hasSaleBadge, showOnHome: category.showOnHome, homeOrder: category.homeOrder, description: category.description, imageUrl: category.imageUrl, status: category.status, isPopular: category.isPopular, metaTitle: category.metaTitle, metaDescription: category.metaDescription, createdAt: category.createdAt, updatedAt: category.updatedAt } });
  } catch (error) { console.error('Get category by ID error:', error); res.status(500).json({ success: false, message: 'Failed to fetch category.' }); }
};

const createCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const { title, slug, homeIconUrl, homeBadge, hasSaleBadge, showOnHome, homeOrder, description, imageUrl, status, isPopular, metaTitle, metaDescription, cityIds } = req.body;
    const slugToCheck = slug?.trim().toLowerCase() || title.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const existingCategory = await SpCategory.findOne({ slug: slugToCheck });
    if (existingCategory) {
      const existingCities = existingCategory.cityIds?.map(id => id.toString()) || [];
      const newCities = (cityIds || []).map(id => id.toString());
      let isDuplicate = false;
      if (newCities.length === 0) { if (existingCities.length === 0) isDuplicate = true; }
      else { if (newCities.some(c => existingCities.includes(c)) || existingCities.length === 0) isDuplicate = true; }
      if (isDuplicate) return res.status(400).json({ success: false, message: 'Category with this title or slug already exists' });
    }
    const category = await SpCategory.create({ title: title.trim(), slug: slug?.trim().toLowerCase() || undefined, homeIconUrl: homeIconUrl || null, homeBadge: homeBadge?.trim() || null, hasSaleBadge: Boolean(hasSaleBadge), showOnHome: showOnHome !== false, homeOrder: Number(homeOrder) || 0, description: description?.trim() || null, imageUrl: imageUrl || null, status: status || SP_SERVICE_STATUS.ACTIVE, isPopular: Boolean(isPopular), metaTitle: metaTitle?.trim() || null, metaDescription: metaDescription?.trim() || null, cityIds: cityIds || [], createdBy: req.user.id });
    res.status(201).json({ success: true, message: 'Category created successfully', category: { id: category._id, title: category.title, slug: category.slug, status: category.status, createdAt: category.createdAt } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Category with this title or slug already exists' });
    console.error('Create category error:', error); res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const { id } = req.params;
    const { title, slug, homeIconUrl, homeBadge, hasSaleBadge, showOnHome, homeOrder, description, imageUrl, status, isPopular, metaTitle, metaDescription, cityIds: updateCityIds } = req.body;
    const category = await SpCategory.findById(id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    if (title !== undefined) category.title = title.trim();
    if (slug !== undefined) category.slug = slug.trim().toLowerCase();
    if (homeIconUrl !== undefined) category.homeIconUrl = homeIconUrl || null;
    if (homeBadge !== undefined) category.homeBadge = homeBadge?.trim() || null;
    if (hasSaleBadge !== undefined) category.hasSaleBadge = Boolean(hasSaleBadge);
    if (showOnHome !== undefined) category.showOnHome = showOnHome !== false;
    if (homeOrder !== undefined) category.homeOrder = Number(homeOrder) || 0;
    if (description !== undefined) category.description = description?.trim() || null;
    if (imageUrl !== undefined) category.imageUrl = imageUrl || null;
    if (status !== undefined) category.status = status;
    if (isPopular !== undefined) category.isPopular = Boolean(isPopular);
    if (metaTitle !== undefined) category.metaTitle = metaTitle?.trim() || null;
    if (metaDescription !== undefined) category.metaDescription = metaDescription?.trim() || null;
    if (updateCityIds !== undefined) { category.cityIds = updateCityIds; category.markModified('cityIds'); }
    await category.save();
    res.status(200).json({ success: true, message: 'Category updated successfully', category: { id: category._id, title: category.title, slug: category.slug, status: category.status } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Category with this title or slug already exists' });
    console.error('Update category error:', error); res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await SpCategory.findById(id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    category.status = SP_SERVICE_STATUS.DELETED;
    await category.save();
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) { console.error('Delete category error:', error); res.status(500).json({ success: false, message: 'Failed to delete category.' }); }
};

const updateCategoryOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { homeOrder } = req.body;
    if (homeOrder === undefined || isNaN(homeOrder)) return res.status(400).json({ success: false, message: 'homeOrder is required and must be a number' });
    const category = await SpCategory.findById(id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    category.homeOrder = Number(homeOrder);
    await category.save();
    res.status(200).json({ success: true, message: 'Category order updated successfully', category: { id: category._id, title: category.title, homeOrder: category.homeOrder } });
  } catch (error) { console.error('Update category order error:', error); res.status(500).json({ success: false, message: 'Failed to update category order.' }); }
};

export { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory, updateCategoryOrder };
