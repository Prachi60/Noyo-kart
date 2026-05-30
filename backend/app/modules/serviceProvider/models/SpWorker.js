import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { SP_WORKER_STATUS } from '../constants.js';

const spWorkerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, trim: true, lowercase: true, default: null },
  phone: { type: String, required: true, unique: true, trim: true },
  role: { type: String, enum: ['worker'], default: 'worker' },
  password: { type: String, select: false },
  aadhar: { number: { type: String, trim: true }, document: String, backDocument: String },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor', default: null },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  serviceCategories: [{ type: String }],
  status: { type: String, enum: Object.values(SP_WORKER_STATUS), default: SP_WORKER_STATUS.OFFLINE },
  profilePhoto: { type: String, default: null },
  address: { addressLine1: String, addressLine2: String, city: String, state: String, pincode: String, landmark: String },
  rating: { type: Number, default: 0 },
  totalJobs: { type: Number, default: 0 },
  completedJobs: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isPhoneVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  wallet: { balance: { type: Number, default: 0 } },
  settings: { notifications: { type: Boolean, default: true }, soundAlerts: { type: Boolean, default: true }, language: { type: String, default: 'en' } },
  location: { lat: Number, lng: Number, updatedAt: Date },
  cancelledJobs: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  fcmTokens: { type: [String], default: [] },
  fcmTokenMobile: { type: [String], default: [] },
  loginSessionId: { type: String, default: null }
}, { timestamps: true });

spWorkerSchema.index({ status: 1 });
spWorkerSchema.index({ serviceCategories: 1 });
spWorkerSchema.index({ vendorId: 1 });

spWorkerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

spWorkerSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('SpWorker', spWorkerSchema);
