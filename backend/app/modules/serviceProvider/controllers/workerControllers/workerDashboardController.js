import SpBooking from '../../models/SpBooking.js';
import SpWorker from '../../models/SpWorker.js';
import { SP_BOOKING_STATUS } from '../../constants.js';

/**
 * Get worker dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const workerId = req.user.id;

    // Get Worker Profile for Rating (fallback)
    const worker = await SpWorker.findById(workerId);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // 2. Calculate Total Earnings
    const earningStats = await SpBooking.aggregate([
      {
        $match: {
          workerId: worker._id,
          status: { $in: [SP_BOOKING_STATUS.COMPLETED, SP_BOOKING_STATUS.WORK_DONE] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$finalAmount" }
        }
      }
    ]);

    const totalEarnings = earningStats.length > 0 ? earningStats[0].total : 0;

    // 3. Count Active Jobs (Assigned, Visited, In Progress)
    const activeJobsCount = await SpBooking.countDocuments({
      workerId: worker._id,
      status: {
        $in: [
          SP_BOOKING_STATUS.ASSIGNED,
          SP_BOOKING_STATUS.VISITED,
          SP_BOOKING_STATUS.IN_PROGRESS,
          SP_BOOKING_STATUS.CONFIRMED
        ]
      }
    });

    // 4. Count Completed Jobs
    const completedJobsCount = await SpBooking.countDocuments({
      workerId: worker._id,
      status: { $in: [SP_BOOKING_STATUS.COMPLETED, SP_BOOKING_STATUS.WORK_DONE] }
    });

    // 5. Calculate Average Rating
    const ratingStats = await SpBooking.aggregate([
      {
        $match: {
          workerId: worker._id,
          rating: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" }
        }
      }
    ]);

    const averageRating = ratingStats.length > 0 ? parseFloat(ratingStats[0].avgRating.toFixed(1)) : (worker.rating || 0);

    // 6. Get Recent Jobs
    const recentJobs = await SpBooking.find({ workerId: worker._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name')
      .populate('serviceId', 'title');

    res.status(200).json({
      success: true,
      data: {
        totalEarnings,
        activeJobs: activeJobsCount,
        completedJobs: completedJobsCount,
        rating: averageRating,
        recentJobs
      }
    });

  } catch (error) {
    console.error('Get worker dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

export {
  getDashboardStats
};
