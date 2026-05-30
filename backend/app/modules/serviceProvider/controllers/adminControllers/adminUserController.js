import SpUser from '../../models/SpUser.js';
import SpBooking from '../../models/SpBooking.js';
import { validationResult } from 'express-validator';

const getAllUsers = async (req, res) => {
  try {
    const { search, isActive, isPhoneVerified, isEmailVerified, page = 1, limit = 20 } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isPhoneVerified !== undefined) query.isPhoneVerified = isPhoneVerified === 'true';
    if (isEmailVerified !== undefined) query.isEmailVerified = isEmailVerified === 'true';
    if (search) { query.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }]; }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await SpUser.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpUser.countDocuments(query);
    res.status(200).json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { console.error('Get all users error:', error); res.status(500).json({ success: false, message: 'Failed to fetch users.' }); }
};

const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await SpUser.findById(id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const bookingStats = await SpBooking.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, totalBookings: { $sum: 1 }, completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, totalSpent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'success'] }, '$finalAmount', 0] } } } }
    ]);
    res.status(200).json({ success: true, data: { user, stats: bookingStats[0] || { totalBookings: 0, completedBookings: 0, totalSpent: 0 } } });
  } catch (error) { console.error('Get user details error:', error); res.status(500).json({ success: false, message: 'Failed to fetch user details.' }); }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = await SpUser.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = isActive !== undefined ? isActive : !user.isActive;
    await user.save();
    res.status(200).json({ success: true, message: `User ${user.isActive ? 'activated' : 'blocked'} successfully`, data: user });
  } catch (error) { console.error('Toggle user status error:', error); res.status(500).json({ success: false, message: 'Failed to update user status.' }); }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await SpUser.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = false;
    await user.save();
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) { console.error('Delete user error:', error); res.status(500).json({ success: false, message: 'Failed to delete user.' }); }
};

const getUserBookings = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const query = { userId: id };
    if (status) query.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const bookings = await SpBooking.find(query).populate('vendorId', 'name businessName').populate('serviceId', 'title iconUrl').populate('workerId', 'name').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpBooking.countDocuments(query);
    res.status(200).json({ success: true, data: bookings, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { console.error('Get user bookings error:', error); res.status(500).json({ success: false, message: 'Failed to fetch user bookings.' }); }
};

const getUserWalletTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await SpUser.findById(id).select('wallet');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const transactions = await SpBooking.find({ userId: id, paymentMethod: 'wallet', paymentStatus: 'success' }).select('bookingNumber finalAmount createdAt').sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, data: { balance: user.wallet?.balance || 0, transactions } });
  } catch (error) { console.error('Get user wallet transactions error:', error); res.status(500).json({ success: false, message: 'Failed to fetch wallet transactions.' }); }
};

const getAllUserBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      const users = await SpUser.find({ $or: [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }] }).select('_id');
      query.userId = { $in: users.map(u => u._id) };
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const bookings = await SpBooking.find(query).populate('userId', 'name phone email').populate('workerId', 'name phone').populate('serviceId', 'title').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpBooking.countDocuments(query);
    res.status(200).json({ success: true, data: bookings, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { console.error('Get all user bookings error:', error); res.status(500).json({ success: false, message: 'Failed to fetch user bookings' }); }
};

export { getAllUsers, getUserDetails, toggleUserStatus, deleteUser, getUserBookings, getUserWalletTransactions, getAllUserBookings };
