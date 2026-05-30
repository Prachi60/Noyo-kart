import mongoose from 'mongoose';
import SpVendor from '../../models/SpVendor.js';
import SpBooking from '../../models/SpBooking.js';
import SpVendorBill from '../../models/SpVendorBill.js';
import { validationResult } from 'express-validator';
import { SP_VENDOR_STATUS, SP_BOOKING_STATUS, SP_PAYMENT_STATUS } from '../../constants.js';
import { createNotification } from '../notificationController.js';

const getAllVendors = async (req, res) => {
  try {
    const { search, approvalStatus, isActive, page = 1, limit = 20 } = req.query;
    const query = {};
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) { query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }, { businessName: { $regex: search, $options: 'i' } }]; }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const vendors = await SpVendor.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpVendor.countDocuments(query);
    res.status(200).json({ success: true, data: vendors, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { console.error('Get all vendors error:', error); res.status(500).json({ success: false, message: 'Failed to fetch vendors.' }); }
};

const getVendorDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await SpVendor.findById(id).select('-password');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    const totalBookings = await SpBooking.countDocuments({ vendorId: vendor._id });
    const completedBookings = await SpBooking.countDocuments({ vendorId: vendor._id, status: SP_BOOKING_STATUS.COMPLETED });
    const earningsResult = await SpVendorBill.aggregate([
      { $match: { vendorId: vendor._id, status: 'paid' } },
      { $group: { _id: null, totalEarnings: { $sum: '$vendorTotalEarning' }, totalRevenue: { $sum: '$grandTotal' } } }
    ]);
    res.status(200).json({ success: true, data: { vendor, stats: { totalBookings, completedBookings, totalEarnings: earningsResult[0]?.totalEarnings || 0, totalRevenue: earningsResult[0]?.totalRevenue || 0 } } });
  } catch (error) { console.error('Get vendor details error:', error); res.status(500).json({ success: false, message: 'Failed to fetch vendor details.' }); }
};

const approveVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await SpVendor.findById(id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    vendor.approvalStatus = SP_VENDOR_STATUS.APPROVED;
    vendor.approvalDate = new Date();
    await vendor.save();
    await createNotification({ vendorId: vendor._id, type: 'vendor_approved', title: 'Vendor Registration Approved', message: 'Your vendor registration has been approved. You can now start accepting bookings.', relatedId: vendor._id, relatedType: 'vendor' });
    res.status(200).json({ success: true, message: 'Vendor approved successfully', data: vendor });
  } catch (error) { console.error('Approve vendor error:', error); res.status(500).json({ success: false, message: 'Failed to approve vendor.' }); }
};

const rejectVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const vendor = await SpVendor.findById(id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    vendor.approvalStatus = SP_VENDOR_STATUS.REJECTED;
    vendor.rejectedReason = reason || 'Registration rejected by admin';
    await vendor.save();
    await createNotification({ vendorId: vendor._id, type: 'vendor_rejected', title: 'Vendor Registration Rejected', message: `Your vendor registration has been rejected. Reason: ${vendor.rejectedReason}`, relatedId: vendor._id, relatedType: 'vendor' });
    res.status(200).json({ success: true, message: 'Vendor rejected successfully', data: vendor });
  } catch (error) { console.error('Reject vendor error:', error); res.status(500).json({ success: false, message: 'Failed to reject vendor.' }); }
};

const suspendVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await SpVendor.findById(id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    vendor.approvalStatus = SP_VENDOR_STATUS.SUSPENDED;
    vendor.isActive = false;
    await vendor.save();
    res.status(200).json({ success: true, message: 'Vendor suspended successfully', data: vendor });
  } catch (error) { console.error('Suspend vendor error:', error); res.status(500).json({ success: false, message: 'Failed to suspend vendor.' }); }
};

const getVendorBookings = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const query = { vendorId: id };
    if (status) query.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const bookings = await SpBooking.find(query).populate('userId', 'name phone').populate('serviceId', 'title iconUrl').populate('workerId', 'name').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpBooking.countDocuments(query);
    res.status(200).json({ success: true, data: bookings, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { console.error('Get vendor bookings error:', error); res.status(500).json({ success: false, message: 'Failed to fetch vendor bookings.' }); }
};

const getVendorEarnings = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const billQuery = { vendorId: new mongoose.Types.ObjectId(id), status: 'paid' };
    if (startDate || endDate) { billQuery.paidAt = {}; if (startDate) billQuery.paidAt.$gte = new Date(startDate); if (endDate) billQuery.paidAt.$lte = new Date(endDate); }
    const earnings = await SpVendorBill.aggregate([
      { $match: billQuery },
      { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' }, vendorEarnings: { $sum: '$vendorTotalEarning' }, platformCommission: { $sum: '$companyRevenue' }, totalBookings: { $sum: 1 } } }
    ]);
    res.status(200).json({ success: true, data: earnings[0] || { totalRevenue: 0, vendorEarnings: 0, platformCommission: 0, totalBookings: 0 } });
  } catch (error) { console.error('Get vendor earnings error:', error); res.status(500).json({ success: false, message: 'Failed to fetch vendor earnings.' }); }
};

const getAllVendorBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const query = { vendorId: { $exists: true, $ne: null } };
    if (status) query.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    if (search) {
      const vendors = await SpVendor.find({ $or: [{ businessName: { $regex: search, $options: 'i' } }, { name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }] }).select('_id');
      query.vendorId = { $in: vendors.map(v => v._id) };
    }
    const bookings = await SpBooking.find(query).populate('vendorId', 'name businessName phone profileImage').populate('userId', 'name phone').populate('serviceId', 'title iconUrl').populate('workerId', 'name phone').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpBooking.countDocuments(query);
    res.status(200).json({ success: true, data: bookings, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { console.error('Get all vendor bookings error:', error); res.status(500).json({ success: false, message: 'Failed to fetch all vendor bookings.' }); }
};

const getVendorPaymentsSummary = async (req, res) => {
  try {
    const vendors = await SpVendor.find({ 'wallet.balance': { $exists: true } }).select('name businessName phone wallet email approvalStatus').sort({ 'wallet.balance': -1 });
    res.status(200).json({ success: true, data: vendors });
  } catch (error) { console.error('Get vendor payments summary error:', error); res.status(500).json({ success: false, message: 'Failed to fetch vendor payments summary.' }); }
};

const toggleVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const vendor = await SpVendor.findById(id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    vendor.isActive = isActive;
    await vendor.save();
    res.status(200).json({ success: true, message: `Vendor ${isActive ? 'activated' : 'deactivated'} successfully`, data: vendor });
  } catch (error) { console.error('Toggle vendor status error:', error); res.status(500).json({ success: false, message: 'Failed to update vendor status' }); }
};

const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await SpVendor.findByIdAndDelete(id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.status(200).json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) { console.error('Delete vendor error:', error); res.status(500).json({ success: false, message: 'Failed to delete vendor' }); }
};

export { getAllVendors, getVendorDetails, approveVendor, rejectVendor, suspendVendor, getVendorBookings, getVendorEarnings, getAllVendorBookings, getVendorPaymentsSummary, toggleVendorStatus, deleteVendor };
