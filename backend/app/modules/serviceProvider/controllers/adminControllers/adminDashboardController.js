import SpUser from '../../models/SpUser.js';
import SpVendor from '../../models/SpVendor.js';
import SpWorker from '../../models/SpWorker.js';
import SpBooking from '../../models/SpBooking.js';
import SpWithdrawal from '../../models/SpWithdrawal.js';
import SpSettlement from '../../models/SpSettlement.js';
import SpScrap from '../../models/SpScrap.js';
import { SP_BOOKING_STATUS, SP_PAYMENT_STATUS, SP_VENDOR_STATUS } from '../../constants.js';

/**
 * Get overall dashboard stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); dateFilter.createdAt.$lte = end; }
    }

    const revenueDateFilter = {};
    if (startDate || endDate) {
      revenueDateFilter.completedAt = {};
      if (startDate) revenueDateFilter.completedAt.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); revenueDateFilter.completedAt.$lte = end; }
    }

    const totalUsers = await SpUser.countDocuments({ isActive: true, ...dateFilter });
    const totalVendors = await SpVendor.countDocuments({ isActive: true, ...dateFilter });
    const totalWorkers = await SpWorker.countDocuments({ isActive: true, ...dateFilter });
    const totalBookings = await SpBooking.countDocuments(dateFilter);

    const pendingBookings = await SpBooking.countDocuments({ ...dateFilter, status: { $nin: [SP_BOOKING_STATUS.COMPLETED, SP_BOOKING_STATUS.CANCELLED] } });
    const completedBookings = await SpBooking.countDocuments({ ...dateFilter, status: SP_BOOKING_STATUS.COMPLETED });
    const cancelledBookings = await SpBooking.countDocuments({ ...dateFilter, status: SP_BOOKING_STATUS.CANCELLED });

    const revenueResult = await SpBooking.aggregate([
      { $match: { status: SP_BOOKING_STATUS.COMPLETED, paymentStatus: { $in: [SP_PAYMENT_STATUS.SUCCESS, SP_PAYMENT_STATUS.COLLECTED_BY_VENDOR, 'success', 'collected_by_vendor', 'collected_by_worker', 'paid'] }, ...revenueDateFilter } },
      { $group: { _id: null, totalRevenue: { $sum: '$finalAmount' }, totalBookings: { $sum: 1 } } }
    ]);

    const revenue = revenueResult[0] || { totalRevenue: 0, totalBookings: 0 };
    const platformCommission = revenue.totalRevenue * 0.2;

    const pendingVendors = await SpVendor.countDocuments({ approvalStatus: SP_VENDOR_STATUS.PENDING, ...dateFilter });
    const approvedVendors = await SpVendor.countDocuments({ approvalStatus: SP_VENDOR_STATUS.APPROVED, ...dateFilter });

    const pendingWithdrawals = await SpWithdrawal.countDocuments({ status: 'pending', ...dateFilter });
    const pendingSettlementsCount = await SpSettlement.countDocuments({ status: 'pending', ...dateFilter });
    const pendingScraps = await SpScrap.countDocuments({ status: 'pending', ...dateFilter });

    const recentActivityDocs = await SpBooking.find(dateFilter)
      .populate('userId', 'name phone').populate('vendorId', 'name businessName').populate('serviceId', 'title')
      .sort({ createdAt: -1 }).limit(20);

    const recentBookings = recentActivityDocs.map(b => ({
      id: b.bookingNumber || b._id, _id: b._id, status: b.status,
      user: { name: b.userId?.name || 'Customer' },
      serviceType: b.serviceId?.title || b.serviceName,
      price: b.finalAmount || b.basePrice || 0,
      createdAt: b.createdAt, acceptedAt: b.acceptedAt, assignedAt: b.assignedAt,
      visitedAt: b.visitedAt, completedAt: b.completedAt, workerPaymentStatus: b.workerPaymentStatus
    }));

    res.status(200).json({
      success: true,
      data: {
        stats: { totalUsers, totalVendors, totalWorkers, totalBookings, pendingBookings, completedBookings, cancelledBookings, totalRevenue: revenue.totalRevenue, platformCommission, pendingVendors, approvedVendors, pendingWithdrawals, pendingSettlements: pendingSettlementsCount, pendingScraps },
        recentBookings
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats. Please try again.' });
  }
};

/**
 * Get revenue analytics
 */
const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;
    let groupFormat = '%Y-%m';
    if (period === 'daily') groupFormat = '%Y-%m-%d';
    else if (period === 'weekly') groupFormat = '%Y-%W';

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const revenueData = await SpBooking.aggregate([
      { $match: { ...dateFilter } },
      { $group: { 
          _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, 
          bookings: { $sum: 1 }, 
          revenue: { 
            $sum: { 
              $cond: [ 
                { $and: [
                    { $eq: ['$status', SP_BOOKING_STATUS.COMPLETED] },
                    { $in: ['$paymentStatus', [SP_PAYMENT_STATUS.SUCCESS, SP_PAYMENT_STATUS.COLLECTED_BY_VENDOR, 'success', 'collected_by_vendor', 'collected_by_worker', 'paid']] }
                  ] 
                }, 
                '$finalAmount', 
                0 
              ] 
            } 
          },
          platformCommission: { 
            $sum: { 
              $cond: [ 
                { $and: [
                    { $eq: ['$status', SP_BOOKING_STATUS.COMPLETED] },
                    { $in: ['$paymentStatus', [SP_PAYMENT_STATUS.SUCCESS, SP_PAYMENT_STATUS.COLLECTED_BY_VENDOR, 'success', 'collected_by_vendor', 'collected_by_worker', 'paid']] }
                  ] 
                }, 
                { $multiply: ['$finalAmount', 0.2] }, 
                0 
              ] 
            } 
          }
      } },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ success: true, data: { period, revenueData } });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue analytics.' });
  }
};

/**
 * Get booking trends
 */
const getBookingTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const trends = await SpBooking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', SP_BOOKING_STATUS.COMPLETED] }, 1, 0] } }, cancelled: { $sum: { $cond: [{ $eq: ['$status', SP_BOOKING_STATUS.CANCELLED] }, 1, 0] } } } },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ success: true, data: { days: parseInt(days), trends } });
  } catch (error) {
    console.error('Get booking trends error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking trends.' });
  }
};

/**
 * Get user growth metrics
 */
const getUserGrowthMetrics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const userGrowth = await SpUser.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const vendorGrowth = await SpVendor.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ success: true, data: { days: parseInt(days), userGrowth, vendorGrowth } });
  } catch (error) {
    console.error('Get user growth metrics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user growth metrics.' });
  }
};

export { getDashboardStats, getRevenueAnalytics, getBookingTrends, getUserGrowthMetrics };
