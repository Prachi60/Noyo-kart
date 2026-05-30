import SpPlatformEarning from '../models/SpPlatformEarning.js';

/**
 * Track platform earnings for a completed booking
 */
export const trackBookingEarning = async ({ grandTotal, vendorEarning, companyRevenue, gst = 0, tds = 0 }) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    await SpPlatformEarning.findOneAndUpdate(
      { date: today },
      {
        $inc: {
          totalRevenue: grandTotal || 0,
          totalBookings: 1,
          totalGST: gst,
          totalTDS: tds,
          platformCommission: companyRevenue || 0,
          vendorEarnings: vendorEarning || 0
        }
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('[EarningTracker] Error tracking earning:', error.message);
  }
};

/**
 * Track settlement received from vendor
 */
export const trackSettlementReceived = async (amount) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await SpPlatformEarning.findOneAndUpdate(
      { date: today },
      { $inc: { totalSettlementReceived: amount } },
      { upsert: true }
    );
  } catch (error) {
    console.error('[EarningTracker] Error tracking settlement:', error.message);
  }
};

/**
 * Track payout to vendor
 */
export const trackPayoutToVendor = async (amount) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await SpPlatformEarning.findOneAndUpdate(
      { date: today },
      { $inc: { totalAmountPaidToVendors: amount } },
      { upsert: true }
    );
  } catch (error) {
    console.error('[EarningTracker] Error tracking payout:', error.message);
  }
};
