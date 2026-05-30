import SpBooking from '../../models/SpBooking.js';
import SpVendor from '../../models/SpVendor.js';
import SpPlatformEarning from '../../models/SpPlatformEarning.js';
import { SP_BOOKING_STATUS, SP_PAYMENT_STATUS } from '../../constants.js';

export const getOverallReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const totalBookings = await SpBooking.countDocuments(dateFilter);
    const completedBookings = await SpBooking.countDocuments({ ...dateFilter, status: SP_BOOKING_STATUS.COMPLETED });
    const cancelledBookings = await SpBooking.countDocuments({ ...dateFilter, status: SP_BOOKING_STATUS.CANCELLED });

    const revenueResult = await SpBooking.aggregate([
      { $match: { status: SP_BOOKING_STATUS.COMPLETED, ...dateFilter } },
      { $group: { _id: null, totalRevenue: { $sum: '$finalAmount' }, avgBookingValue: { $avg: '$finalAmount' } } }
    ]);

    const revenue = revenueResult[0] || { totalRevenue: 0, avgBookingValue: 0 };

    res.status(200).json({
      success: true,
      data: { totalBookings, completedBookings, cancelledBookings, totalRevenue: revenue.totalRevenue, avgBookingValue: revenue.avgBookingValue, completionRate: totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : 0 }
    });
  } catch (error) { console.error('Get overall report error:', error); res.status(500).json({ success: false, message: 'Failed to fetch report' }); }
};

export const getPlatformEarnings = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 30 } = req.query;
    const query = {};
    if (startDate && endDate) { query.date = { $gte: new Date(startDate), $lte: new Date(endDate) }; }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const earnings = await SpPlatformEarning.find(query).sort({ date: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpPlatformEarning.countDocuments(query);
    const totals = await SpPlatformEarning.aggregate([
      { $match: query },
      { $group: { _id: null, totalRevenue: { $sum: '$totalRevenue' }, platformCommission: { $sum: '$platformCommission' }, vendorEarnings: { $sum: '$vendorEarnings' }, totalGST: { $sum: '$totalGST' } } }
    ]);
    res.status(200).json({ success: true, data: earnings, totals: totals[0] || { totalRevenue: 0, platformCommission: 0, vendorEarnings: 0, totalGST: 0 }, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { console.error('Get platform earnings error:', error); res.status(500).json({ success: false, message: 'Failed to fetch platform earnings' }); }
};

export const getFinanceOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate && endDate) { dateFilter.completedAt = { $gte: new Date(startDate), $lte: new Date(endDate) }; }
    const result = await SpBooking.aggregate([
      { $match: { status: SP_BOOKING_STATUS.COMPLETED, paymentStatus: { $in: [SP_PAYMENT_STATUS.SUCCESS, SP_PAYMENT_STATUS.COLLECTED_BY_VENDOR, 'success', 'collected_by_vendor'] }, ...dateFilter } },
      { $group: { _id: null, totalRevenue: { $sum: '$finalAmount' }, totalBookings: { $sum: 1 }, totalTax: { $sum: '$tax' } } }
    ]);
    res.status(200).json({ success: true, data: result[0] || { totalRevenue: 0, totalBookings: 0, totalTax: 0 } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch finance overview' }); }
};

export const getGSTRReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate && endDate) { dateFilter.completedAt = { $gte: new Date(startDate), $lte: new Date(endDate) }; }
    const result = await SpBooking.aggregate([
      { $match: { status: SP_BOOKING_STATUS.COMPLETED, ...dateFilter } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } }, totalGST: { $sum: '$tax' }, totalRevenue: { $sum: '$finalAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);
    res.status(200).json({ success: true, data: result });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch GST report' }); }
};

export const getTDSReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate && endDate) { dateFilter.date = { $gte: startDate, $lte: endDate }; }
    const result = await SpPlatformEarning.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, totalTDS: { $sum: '$totalTDS' }, totalRevenue: { $sum: '$totalRevenue' } } }
    ]);
    res.status(200).json({ success: true, data: result[0] || { totalTDS: 0, totalRevenue: 0 } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch TDS report' }); }
};

export const getCODReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate && endDate) { dateFilter.completedAt = { $gte: new Date(startDate), $lte: new Date(endDate) }; }
    const result = await SpBooking.aggregate([
      { $match: { status: SP_BOOKING_STATUS.COMPLETED, paymentMethod: { $in: ['cash', 'cash collected'] }, ...dateFilter } },
      { $group: { _id: null, totalCOD: { $sum: '$finalAmount' }, count: { $sum: 1 } } }
    ]);
    res.status(200).json({ success: true, data: result[0] || { totalCOD: 0, count: 0 } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch COD report' }); }
};

export const getPaymentTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentMethod } = req.query;
    const query = { status: SP_BOOKING_STATUS.COMPLETED };
    if (paymentMethod) query.paymentMethod = paymentMethod;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const bookings = await SpBooking.find(query).select('bookingNumber finalAmount paymentMethod paymentStatus completedAt userId vendorId').populate('userId', 'name phone').populate('vendorId', 'name businessName').sort({ completedAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpBooking.countDocuments(query);
    res.status(200).json({ success: true, data: bookings, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch payment transactions' }); }
};

export const getRevenueBreakdown = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    let groupFormat = '%Y-%m';
    if (period === 'daily') groupFormat = '%Y-%m-%d';
    else if (period === 'weekly') groupFormat = '%Y-%W';
    const result = await SpBooking.aggregate([
      { $match: { status: SP_BOOKING_STATUS.COMPLETED } },
      { $group: { _id: { $dateToString: { format: groupFormat, date: '$completedAt' } }, revenue: { $sum: '$finalAmount' }, bookings: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);
    res.status(200).json({ success: true, data: result });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch revenue breakdown' }); }
};
