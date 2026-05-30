import SpTransaction from '../../models/SpTransaction.js';
import SpBooking from '../../models/SpBooking.js';
import SpVendorBill from '../../models/SpVendorBill.js';
import SpUser from '../../models/SpUser.js';
import SpVendor from '../../models/SpVendor.js';
import SpWorker from '../../models/SpWorker.js';
import SpPlatformEarning from '../../models/SpPlatformEarning.js';

/**
 * Get all transactions with pagination and filtering
 */
const getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, type, entity } = req.query;

    // --- SPECIAL HANDLING FOR ADMIN REVENUE ---
    if (entity === 'admin') {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      let bookingQuery = { status: { $in: ['COMPLETED', 'completed', 'paid', 'PAID'] } };

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        const [users, vendors] = await Promise.all([
          SpUser.find({ $or: [{ name: searchRegex }, { email: searchRegex }] }).select('_id'),
          SpVendor.find({ $or: [{ name: searchRegex }, { email: searchRegex }] }).select('_id'),
        ]);
        bookingQuery.$or = [
          { bookingNumber: searchRegex },
          { userId: { $in: users.map(u => u._id) } },
          { vendorId: { $in: vendors.map(v => v._id) } }
        ];
      }

      const shouldInclude = (t) => type === 'all' || type === t;

      const bookings = await SpBooking.find(bookingQuery)
        .populate('userId', 'name email phone')
        .populate('vendorId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalBookings = await SpBooking.countDocuments(bookingQuery);

      const bookingIds = bookings.map(b => b._id);
      const bills = await SpVendorBill.find({ bookingId: { $in: bookingIds }, status: 'paid' });
      const billMap = {};
      bills.forEach(b => { billMap[b.bookingId.toString()] = b; });

      let virtualTransactions = [];
      bookings.forEach(booking => {
        const bill = billMap[booking._id.toString()];

        if (shouldInclude('commission') && bill && bill.companyRevenue > 0) {
          virtualTransactions.push({
            _id: `${booking._id}_comm`, referenceId: `REV-${booking.bookingNumber}`,
            bookingId: booking, userId: booking.userId, vendorId: booking.vendorId,
            type: 'commission', amount: bill.companyRevenue, status: 'completed', paymentMethod: 'system',
            createdAt: bill.paidAt || booking.completedAt || booking.updatedAt || booking.createdAt,
            description: `Company revenue for booking ${booking.bookingNumber}`
          });
        }

        if (shouldInclude('gst') && bill && bill.totalGST > 0) {
          virtualTransactions.push({
            _id: `${booking._id}_gst`, referenceId: `GST-${booking.bookingNumber}`,
            bookingId: booking, type: 'gst', amount: bill.totalGST, status: 'completed', paymentMethod: 'system',
            createdAt: bill.paidAt || booking.completedAt || booking.updatedAt || booking.createdAt,
            description: `GST for booking ${booking.bookingNumber}`
          });
        }

        if (shouldInclude('convenience_fee') && booking.visitingCharges > 0) {
          virtualTransactions.push({
            _id: `${booking._id}_conv`, referenceId: `FEE-${booking.bookingNumber}`,
            bookingId: booking, type: 'convenience_fee', amount: booking.visitingCharges, status: 'completed', paymentMethod: 'system',
            createdAt: booking.completedAt || booking.updatedAt || booking.createdAt,
            description: `Convenience Fee for booking ${booking.bookingNumber}`
          });
        }
      });

      return res.status(200).json({
        success: true, data: virtualTransactions,
        pagination: { total: totalBookings, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(totalBookings / parseInt(limit)) }
      });
    }

    // --- STANDARD LOGIC ---
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let query = {};

    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;

    if (entity) {
      if (entity === 'user') query.$or = [{ userId: { $ne: null } }, { type: 'cash_collected' }, { type: 'payment' }];
      else if (entity === 'vendor') query.vendorId = { $ne: null };
      else if (entity === 'worker') query.workerId = { $ne: null };
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const [users, vendors, workers, bookings] = await Promise.all([
        SpUser.find({ $or: [{ name: searchRegex }, { email: searchRegex }] }).select('_id'),
        SpVendor.find({ $or: [{ name: searchRegex }, { email: searchRegex }] }).select('_id'),
        SpWorker.find({ $or: [{ name: searchRegex }, { email: searchRegex }] }).select('_id'),
        SpBooking.find({ bookingNumber: searchRegex }).select('_id')
      ]);

      const userIds = users.map(u => u._id);
      const vendorIds = vendors.map(v => v._id);
      const workerIds = workers.map(w => w._id);
      const bookingIds = bookings.map(b => b._id);

      const userBookingIds = await SpBooking.find({ userId: { $in: userIds } }).select('_id');
      const allBookingIds = [...bookingIds, ...userBookingIds.map(b => b._id)];

      query.$or = [
        { referenceId: searchRegex },
        { userId: { $in: userIds } },
        { vendorId: { $in: vendorIds } },
        { workerId: { $in: workerIds } },
        { bookingId: { $in: allBookingIds } }
      ];

      if (search.match(/^[0-9a-fA-F]{24}$/)) {
        query.$or.push({ _id: search });
      }
    }

    const transactions = await SpTransaction.find(query)
      .populate('userId', 'name email phone')
      .populate('vendorId', 'name email phone')
      .populate('workerId', 'name email phone')
      .populate({ path: 'bookingId', select: 'bookingNumber userId', populate: { path: 'userId', select: 'name email phone' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SpTransaction.countDocuments(query);

    res.status(200).json({
      success: true, data: transactions,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

/**
 * Get transaction statistics for dashboard
 */
const getTransactionStats = async (req, res) => {
  try {
    const { entity } = req.query;

    if (entity === 'admin') {
      const stats = await SpPlatformEarning.aggregate([
        { $group: { _id: null, totalRevenue: { $sum: '$totalRevenue' }, totalCommission: { $sum: '$platformCommission' }, totalGST: { $sum: '$totalGST' }, totalVendorEarnings: { $sum: '$vendorEarnings' } } }
      ]);
      const data = stats[0] || { totalRevenue: 0, totalCommission: 0, totalGST: 0, totalVendorEarnings: 0 };
      return res.status(200).json({
        success: true,
        data: { totalRevenue: data.totalRevenue, totalCommission: data.totalCommission, totalGST: data.totalGST, totalVendorEarnings: data.totalVendorEarnings, netRevenue: data.totalCommission }
      });
    }

    let matchQuery = { status: 'completed', type: { $in: ['credit', 'debit', 'refund', 'commission', 'cash_collected', 'payment'] } };
    if (entity) {
      if (entity === 'user') matchQuery.userId = { $ne: null };
      if (entity === 'vendor') matchQuery.vendorId = { $ne: null };
      if (entity === 'worker') matchQuery.workerId = { $ne: null };
    }

    const revenueStats = await SpTransaction.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, totalRevenue: { $sum: { $cond: [{ $in: ['$type', ['credit', 'commission', 'cash_collected', 'payment', 'platform_fee', 'convenience_fee', 'gst', 'penalty', 'tds_deduction']] }, '$amount', 0] } }, totalRefunds: { $sum: { $cond: [{ $in: ['$type', ['refund', 'withdrawal']] }, '$amount', 0] } } } }
    ]);

    const stats = revenueStats[0] || { totalRevenue: 0, totalRefunds: 0 };
    res.status(200).json({ success: true, data: { totalRevenue: stats.totalRevenue, totalRefunds: stats.totalRefunds, netRevenue: stats.totalRevenue - stats.totalRefunds } });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transaction statistics' });
  }
};

export { getAllTransactions, getTransactionStats };
