import mongoose from 'mongoose';

const spPlatformEarningSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true, index: true },
  totalRevenue: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },
  totalGST: { type: Number, default: 0 },
  totalTDS: { type: Number, default: 0 },
  platformCommission: { type: Number, default: 0 },
  vendorEarnings: { type: Number, default: 0 },
  totalSettlementReceived: { type: Number, default: 0 },
  totalPendingSettlement: { type: Number, default: 0 },
  totalAmountPaidToVendors: { type: Number, default: 0 },
  totalPendingAmountToVendors: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('SpPlatformEarning', spPlatformEarningSchema);
