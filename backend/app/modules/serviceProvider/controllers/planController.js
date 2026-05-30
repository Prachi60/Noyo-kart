import SpPlan from '../models/SpPlan.js';
import SpCategory from '../models/SpCategory.js';
import SpBrand from '../models/SpBrand.js';
import SpUserService from '../models/SpUserService.js';
import SpService from '../models/SpService.js';

/**
 * Create Plan
 */
const createPlan = async (req, res) => {
  try {
    console.log('DEBUG: Create Plan Body:', JSON.stringify(req.body, null, 2));
    const { name, price, highlights, validityDays, freeCategories, freeBrands, freeServices, bonusServices } = req.body;

    // Check if plan exists
    const existingPlan = await SpPlan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({ success: false, message: 'Plan with this name already exists' });
    }

    const plan = new SpPlan({ name, price, highlights, validityDays, freeCategories, freeBrands, freeServices, bonusServices });
    await plan.save();
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    console.error('Create Plan Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

/**
 * Get All Plans (Public/User/Admin)
 */
const getAllPlans = async (req, res) => {
  try {
    const filter = {};
    if (req.query.activeOnly === 'true') {
      filter.isActive = true;
    }

    const plans = await SpPlan.find(filter)
      .populate('freeCategories', 'title')
      .populate({
        path: 'freeServices',
        select: 'title categoryId',
        populate: { path: 'categoryId', select: 'title' }
      })
      .populate({
        path: 'bonusServices',
        populate: [
          { path: 'categoryId', select: 'title' },
          { path: 'serviceId', select: 'title basePrice iconUrl description categoryId brandId status' }
        ]
      })
      .sort({ price: 1 });
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    console.error('Get All Plans Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

/**
 * Get Single Plan
 */
const getPlanById = async (req, res) => {
  try {
    const plan = await SpPlan.findById(req.params.id)
      .populate('freeCategories', 'title')
      .populate({
        path: 'freeServices',
        select: 'title categoryId',
        populate: { path: 'categoryId', select: 'title' }
      })
      .populate({
        path: 'bonusServices',
        populate: [
          { path: 'categoryId', select: 'title' },
          { path: 'serviceId', select: 'title basePrice iconUrl description categoryId brandId status' }
        ]
      });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Plan
 */
const updatePlan = async (req, res) => {
  try {
    console.log('DEBUG: Update Plan ID:', req.params.id);
    console.log('DEBUG: Update Plan Body:', JSON.stringify(req.body, null, 2));
    const plan = await SpPlan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete Plan
 */
const deletePlan = async (req, res) => {
  try {
    const plan = await SpPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.status(200).json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan
};
