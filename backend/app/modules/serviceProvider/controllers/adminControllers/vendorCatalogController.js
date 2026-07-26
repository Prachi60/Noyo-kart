import SpVendorServiceCatalog from '../../models/SpVendorServiceCatalog.js';
import SpVendorPartsCatalog from '../../models/SpVendorPartsCatalog.js';
import { validationResult } from 'express-validator';

export const getServiceCatalog = async (req, res) => {
  try {
    const { categoryId } = req.query;
    const query = {};
    if (categoryId) query.categoryId = categoryId;
    const catalog = await SpVendorServiceCatalog.find(query).populate('categoryId', 'title').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: catalog });
  } catch (error) { console.error('Get service catalog error:', error); res.status(500).json({ success: false, message: 'Failed to fetch service catalog' }); }
};

export const getPartsCatalog = async (req, res) => {
  try {
    const { categoryId } = req.query;
    const query = {};
    if (categoryId) query.categoryId = categoryId;
    const catalog = await SpVendorPartsCatalog.find(query).populate('categoryId', 'title').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: catalog });
  } catch (error) { console.error('Get parts catalog error:', error); res.status(500).json({ success: false, message: 'Failed to fetch parts catalog' }); }
};

export const createServiceCatalogItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const item = await SpVendorServiceCatalog.create(req.body);
    res.status(201).json({ success: true, message: 'Service catalog item created', data: item });
  } catch (error) { console.error('Create service catalog item error:', error); res.status(500).json({ success: false, message: 'Failed to create catalog item' }); }
};

export const createPartsCatalogItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const item = await SpVendorPartsCatalog.create(req.body);
    res.status(201).json({ success: true, message: 'Parts catalog item created', data: item });
  } catch (error) { console.error('Create parts catalog item error:', error); res.status(500).json({ success: false, message: 'Failed to create catalog item' }); }
};

export const deleteServiceCatalogItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await SpVendorServiceCatalog.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.status(200).json({ success: true, message: 'Service catalog item deleted' });
  } catch (error) { console.error('Delete service catalog item error:', error); res.status(500).json({ success: false, message: 'Failed to delete catalog item' }); }
};

export const deletePartsCatalogItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await SpVendorPartsCatalog.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.status(200).json({ success: true, message: 'Parts catalog item deleted' });
  } catch (error) { console.error('Delete parts catalog item error:', error); res.status(500).json({ success: false, message: 'Failed to delete catalog item' }); }
};
