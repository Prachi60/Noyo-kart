import mongoose from 'mongoose';

const spTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpUser', default: null },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor', default: null },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpWorker', default: null },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpBooking', default: null },
  type: { type: String, enum: ['credit', 'debit', 'refund', 'withdrawal', 'commission', 'cash_collected', 'settlement', 'worker_payment', 'earnings_credit', 'tds_deduction', 'payment', 'platform_fee', 'convenience_fee', 'gst', 'penalty'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending' },
  paymentMethod: { type: String, enum: ['wallet', 'razorpay', 'cash', 'bank_transfer', 'system', 'other', 'hand_to_hand', 'online', 'cash collected', 'Qr online'], default: 'wallet' },
  description: { type: String, required: true },
  referenceId: { type: String, default: null },
  balanceBefore: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

spTransactionSchema.index({ userId: 1, createdAt: -1 });
spTransactionSchema.index({ vendorId: 1, createdAt: -1 });
spTransactionSchema.index({ workerId: 1, createdAt: -1 });
spTransactionSchema.index({ bookingId: 1 });
spTransactionSchema.index({ type: 1, status: 1 });

export default mongoose.model('SpTransaction', spTransactionSchema);
