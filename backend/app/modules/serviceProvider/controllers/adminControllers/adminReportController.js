import SpBooking from '../../models/SpBooking.js';
import SpVendor from '../../models/SpVendor.js';
import SpWorker from '../../models/SpWorker.js';
import SpUser from '../../models/SpUser.js';
import SpUserService from '../../models/SpUserService.js';
import { SP_BOOKING_STATUS, SP_PAYMENT_STATUS, SP_VENDOR_STATUS } from '../../constants.js';

/**
 * Get Booking Report Data
 */
export const getBookingReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const statusDistribution = await SpBooking.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const serviceDistribution = await SpBooking.aggregate([
      { $match: filter },
      { $lookup: { from: 'spuserservices', localField: 'serviceId', foreignField: '_id', as: 'service' } },
      { $unwind: '$service' },
      { $group: { _id: '$service.title', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const monthlyTrends = await SpBooking.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', SP_BOOKING_STATUS.COMPLETED] }, 1, 0] } }, cancelled: { $sum: { $cond: [{ $eq: ['$status', SP_BOOKING_STATUS.CANCELLED] }, 1, 0] } } } },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ success: true, data: { statusDistribution, serviceDistribution, monthlyTrends } });
  } catch (error) {
    console.error('Booking report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking report' });
  }
};

/**
 * Get Vendor Report Data
 */
export const getVendorReport = async (req, res) => {
  try {
    const topVendors = await SpBooking.aggregate([
      { $match: { status: SP_BOOKING_STATUS.COMPLETED } },
      { $group: { _id: '$vendorId', totalRevenue: { $sum: '$finalAmount' }, bookingsCount: { $sum: 1 } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'spvendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
      { $unwind: '$vendor' },
      { $project: { businessName: '$vendor.businessName', name: '$vendor.name', totalRevenue: 1, bookingsCount: 1 } }
    ]);

    const statusDistribution = await SpVendor.aggregate([
      { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }
    ]);

    const categoryDistribution = await SpVendor.aggregate([
      { $group: { _id: '$service', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({ success: true, data: { topVendors, statusDistribution, categoryDistribution } });
  } catch (error) {
    console.error('Vendor report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor report' });
  }
};

/**
 * Get Worker Report Data
 */
export const getWorkerReport = async (req, res) => {
  try {
    const topWorkers = await SpBooking.aggregate([
      { $match: { status: SP_BOOKING_STATUS.COMPLETED, workerId: { $ne: null } } },
      { $group: { _id: '$workerId', completedJobs: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      { $sort: { completedJobs: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'spworkers', localField: '_id', foreignField: '_id', as: 'worker' } },
      { $unwind: '$worker' },
      { $project: { name: '$worker.name', phone: '$worker.phone', completedJobs: 1, avgRating: 1 } }
    ]);

    const availabilityDistribution = await SpWorker.aggregate([
      { $group: { _id: '$isAvailable', count: { $sum: 1 } } }
    ]);

    res.status(200).json({ success: true, data: { topWorkers, availabilityDistribution } });
  } catch (error) {
    console.error('Worker report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch worker report' });
  }
};

/**
 * Get Customer/User Report Data
 */
export const getCustomerReport = async (req, res) => {
  try {
    const totalUsers = await SpUser.countDocuments();
    const totalBookings = await SpBooking.countDocuments();

    const verificationStatus = await SpUser.aggregate([
      { $group: { _id: { $cond: [{ $and: ['$isPhoneVerified', '$isEmailVerified'] }, 'Fully Verified', { $cond: [{ $or: ['$isPhoneVerified', '$isEmailVerified'] }, 'Partially Verified', 'Unverified'] }] }, count: { $sum: 1 } } }
    ]);

    const topUsers = await SpBooking.aggregate([
      { $group: { _id: '$userId', bookingCount: { $sum: 1 }, totalSpent: { $sum: '$finalAmount' } } },
      { $sort: { bookingCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'spusers', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ['$user.name', 'Deleted User'] }, bookingCount: 1, totalSpent: 1 } }
    ]);

    const monthlyTrend = await SpUser.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 6 }
    ]);

    res.status(200).json({ success: true, data: { totalUsers, totalBookings, verificationStatus, topUsers, monthlyTrend } });
  } catch (error) {
    console.error('Customer report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer report' });
  }
};

/**
 * Get Revenue Report Data
 */
export const getRevenueReport = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    let groupFormat = '%Y-%m';
    if (period === 'daily') groupFormat = '%Y-%m-%d';

    const revenueTrends = await SpBooking.aggregate([
      { $match: { status: SP_BOOKING_STATUS.COMPLETED, paymentStatus: SP_PAYMENT_STATUS.SUCCESS } },
      { $group: { _id: { $dateToString: { format: groupFormat, date: '$completedAt' } }, revenue: { $sum: '$finalAmount' }, commission: { $sum: { $multiply: ['$finalAmount', 0.2] } } } },
      { $sort: { _id: 1 } }
    ]);

    const revenueByService = await SpBooking.aggregate([
      { $match: { status: SP_BOOKING_STATUS.COMPLETED } },
      { $lookup: { from: 'spuserservices', localField: 'serviceId', foreignField: '_id', as: 'service' } },
      { $unwind: '$service' },
      { $group: { _id: '$service.title', revenue: { $sum: '$finalAmount' } } },
      { $sort: { revenue: -1 } }
    ]);

    res.status(200).json({ success: true, data: { revenueTrends, revenueByService } });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue report' });
  }
};
