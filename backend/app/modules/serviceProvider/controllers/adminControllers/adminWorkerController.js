import SpWorker from '../../models/SpWorker.js';
import SpBooking from '../../models/SpBooking.js';
import { validationResult } from 'express-validator';
import { SP_BOOKING_STATUS } from '../../constants.js';
import { createNotification } from '../notificationController.js';

const getAllWorkers = async (req, res) => {
  try {
    const { search, approvalStatus, isActive, page = 1, limit = 20 } = req.query;
    const query = {};
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) { query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }, { serviceCategory: { $regex: search, $options: 'i' } }]; }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const workers = await SpWorker.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpWorker.countDocuments(query);
    res.status(200).json({ success: true, data: workers, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { console.error('Get all workers error:', error); res.status(500).json({ success: false, message: 'Failed to fetch workers.' }); }
};

const getWorkerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const worker = await SpWorker.findById(id).select('-password');
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    const jobStats = await SpBooking.aggregate([
      { $match: { workerId: worker._id } },
      { $group: { _id: null, totalJobs: { $sum: 1 }, completedJobs: { $sum: { $cond: [{ $eq: ['$status', SP_BOOKING_STATUS.COMPLETED] }, 1, 0] } }, totalJobValue: { $sum: '$finalAmount' } } }
    ]);
    res.status(200).json({ success: true, data: { worker, stats: jobStats[0] || { totalJobs: 0, completedJobs: 0, totalJobValue: 0 } } });
  } catch (error) { console.error('Get worker details error:', error); res.status(500).json({ success: false, message: 'Failed to fetch worker details.' }); }
};

const approveWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const worker = await SpWorker.findById(id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    worker.approvalStatus = 'approved';
    worker.isActive = true;
    await worker.save();
    res.status(200).json({ success: true, message: 'Worker approved successfully', data: worker });
  } catch (error) { console.error('Approve worker error:', error); res.status(500).json({ success: false, message: 'Failed to approve worker.' }); }
};

const rejectWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const worker = await SpWorker.findById(id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    worker.approvalStatus = 'rejected';
    worker.isActive = false;
    await worker.save();
    res.status(200).json({ success: true, message: 'Worker rejected successfully', data: worker });
  } catch (error) { console.error('Reject worker error:', error); res.status(500).json({ success: false, message: 'Failed to reject worker.' }); }
};

const suspendWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const worker = await SpWorker.findById(id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    worker.approvalStatus = 'suspended';
    worker.isActive = false;
    await worker.save();
    res.status(200).json({ success: true, message: 'Worker suspended successfully', data: worker });
  } catch (error) { console.error('Suspend worker error:', error); res.status(500).json({ success: false, message: 'Failed to suspend worker.' }); }
};

const getWorkerJobs = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const query = { workerId: id };
    if (status) query.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await SpBooking.find(query).populate('userId', 'name phone').populate('serviceId', 'title iconUrl').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpBooking.countDocuments(query);
    res.status(200).json({ success: true, data: jobs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { console.error('Get worker jobs error:', error); res.status(500).json({ success: false, message: 'Failed to fetch worker jobs.' }); }
};

const getWorkerEarnings = async (req, res) => {
  res.status(200).json({ success: true, data: { totalEarnings: 0 } });
};

const payWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ success: false, message: 'Please provide a valid amount' });
    const worker = await SpWorker.findById(id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    if (!worker.wallet) worker.wallet = { balance: 0 };
    worker.wallet.balance += parseFloat(amount);
    await worker.save();
    res.status(200).json({ success: true, message: `Successfully recorded payment of ₹${amount} to ${worker.name}`, data: { balance: worker.wallet.balance } });
  } catch (error) { console.error('Pay worker error:', error); res.status(500).json({ success: false, message: 'Failed to process payment.' }); }
};

const getAllWorkerJobs = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const query = { workerId: { $exists: true, $ne: null } };
    if (status) query.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    if (search) {
      const workers = await SpWorker.find({ $or: [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }] }).select('_id');
      query.workerId = { $in: workers.map(w => w._id) };
    }
    const jobs = await SpBooking.find(query).populate('workerId', 'name phone profileImage').populate('userId', 'name phone').populate('serviceId', 'title iconUrl').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpBooking.countDocuments(query);
    res.status(200).json({ success: true, data: jobs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { console.error('Get all worker jobs error:', error); res.status(500).json({ success: false, message: 'Failed to fetch all worker jobs.' }); }
};

const getWorkerPaymentsSummary = async (req, res) => {
  try {
    const workers = await SpWorker.find({ 'wallet.balance': { $exists: true } }).select('name phone wallet email serviceCategory approvalStatus').sort({ 'wallet.balance': -1 });
    res.status(200).json({ success: true, data: workers });
  } catch (error) { console.error('Get worker payments summary error:', error); res.status(500).json({ success: false, message: 'Failed to fetch worker payments summary.' }); }
};

const toggleWorkerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const worker = await SpWorker.findById(id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    worker.isActive = isActive;
    await worker.save();
    res.status(200).json({ success: true, message: `Worker ${isActive ? 'activated' : 'deactivated'} successfully`, data: worker });
  } catch (error) { console.error('Toggle worker status error:', error); res.status(500).json({ success: false, message: 'Failed to update worker status' }); }
};

const deleteWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const worker = await SpWorker.findByIdAndDelete(id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.status(200).json({ success: true, message: 'Worker deleted successfully' });
  } catch (error) { console.error('Delete worker error:', error); res.status(500).json({ success: false, message: 'Failed to delete worker' }); }
};

export { getAllWorkers, getWorkerDetails, approveWorker, rejectWorker, suspendWorker, getWorkerJobs, getWorkerEarnings, payWorker, getAllWorkerJobs, getWorkerPaymentsSummary, toggleWorkerStatus, deleteWorker };
