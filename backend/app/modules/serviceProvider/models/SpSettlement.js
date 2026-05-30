import mongoose from 'mongoose';

const spSettlementSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor', required: true },
  amount: { type: Number, required: true, min: 0 },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  paymentMethod: { type: String, enum: ['upi', 'bank_transfer', 'cash', 'other'], default: 'upi' },
  paymentReference: { type: String, default: null },
  paymentProof: { type: String, default: null },
  adminNotes: { type: String, default: null },
  vendorNotes: { type: String, default: null },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SpAdmin', default: null },
  processedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null }
}, { timestamps: true });

spSettlementSchema.index({ vendorId: 1, createdAt: -1 });
spSettlementSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('SpSettlement', spSettlementSchema);
