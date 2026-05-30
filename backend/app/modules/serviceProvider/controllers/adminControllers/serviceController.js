import SpUserService from '../../models/SpUserService.js';
import SpBrand from '../../models/SpBrand.js';
import { validationResult } from 'express-validator';
import { SP_SERVICE_STATUS } from '../../constants.js';

const getAllServices = async (req, res) => {
  try {
    const { status, brandId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (brandId) query.brandId = brandId;
    const services = await SpUserService.find(query).populate('brandId', 'title').populate('categoryId', 'title').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: services.length, services });
  } catch (error) { console.error('Get all services error:', error); res.status(500).json({ success: false, message: 'Failed to fetch services' }); }
};

const getServiceById = async (req, res) => {
  try {
    const service = await SpUserService.findById(req.params.id).populate('brandId', 'title').populate('categoryId', 'title');
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.status(200).json({ success: true, service });
  } catch (error) { console.error('Get service error:', error); res.status(500).json({ success: false, message: 'Failed to fetch service' }); }
};

const createService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const { brandId, categoryId, title, basePrice, gstPercentage, description, status, iconUrl } = req.body;
    const brand = await SpBrand.findById(brandId);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    const service = await SpUserService.create({ brandId, categoryId, title, basePrice, gstPercentage: gstPercentage || 18, description, status: status || SP_SERVICE_STATUS.ACTIVE, iconUrl });
    res.status(201).json({ success: true, message: 'Service created successfully', service });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.slug) return res.status(409).json({ success: false, message: 'A service with this name already exists for this brand.' });
    console.error('Create service error:', error); res.status(500).json({ success: false, message: 'Failed to create service' });
  }
};

const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const service = await SpUserService.findById(id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    if (updates.brandId) { const brand = await SpBrand.findById(updates.brandId); if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' }); }
    if (updates.title) service.title = updates.title;
    if (updates.categoryId) service.categoryId = updates.categoryId;
    if (updates.basePrice !== undefined) service.basePrice = updates.basePrice;
    if (updates.gstPercentage !== undefined) service.gstPercentage = updates.gstPercentage;
    if (updates.description !== undefined) service.description = updates.description;
    if (updates.status) service.status = updates.status;
    if (updates.iconUrl !== undefined) service.iconUrl = updates.iconUrl;
    if (updates.brandId) service.brandId = updates.brandId;
    await service.save();
    res.status(200).json({ success: true, message: 'Service updated successfully', service });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.slug) return res.status(409).json({ success: false, message: 'A service with this name already exists for this brand.' });
    console.error('Update service error:', error); res.status(500).json({ success: false, message: 'Failed to update service' });
  }
};

const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await SpUserService.findByIdAndDelete(id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.status(200).json({ success: true, message: 'Service deleted permanently' });
  } catch (error) { console.error('Delete service error:', error); res.status(500).json({ success: false, message: 'Failed to delete service' }); }
};

export { getAllServices, getServiceById, createService, updateService, deleteService };
