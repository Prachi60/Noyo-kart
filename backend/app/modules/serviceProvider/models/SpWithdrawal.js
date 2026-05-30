import mongoose from 'mongoose';

const spWithdrawalSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor', required: true },
  amount: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestDate: { type: Date, default: Date.now },
  processedDate: { type: Date },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SpAdmin' },
  transactionReference: { type: String },
  adminNotes: { type: String },
  rejectionReason: { type: String },
  bankDetails: { accountNumber: String, ifscCode: String, accountHolderName: String, bankName: String, upiId: String },
  tdsRate: { type: Number, default: 2 },
  tdsAmount: { type: Number, default: 0 },
  platformFeeRate: { type: Number, default: 0 },
  platformFeeAmount: { type: Number, default: 0 },
  netAmount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('SpWithdrawal', spWithdrawalSchema);
