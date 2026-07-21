import mongoose from 'mongoose';
import serviceDb from '../config/db.js';
import bcrypt from 'bcrypt';
import { SP_VENDOR_STATUS } from '../constants.js';

const spVendorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  phone: { type: String, required: true, unique: true, trim: true },
  role: { type: String, enum: ['vendor'], default: 'vendor' },
  password: { type: String, select: false },
  businessName: { type: String, trim: true },
  service: { type: [String], default: [] },
  categories: { type: [String], default: [] },
  skills: { type: [String], default: [] },
  aadhar: {
    number: { type: String, required: true, trim: true },
    document: { type: String, required: true },
    backDocument: { type: String, required: true }
  },
  pan: {
    number: { type: String, required: true, trim: true, uppercase: true },
    document: { type: String, required: true }
  },
  otherDocuments: [{ type: String }],
  approvalStatus: { type: String, enum: Object.values(SP_VENDOR_STATUS), default: SP_VENDOR_STATUS.PENDING },
  approvalDate: { type: Date },
  rejectedReason: { type: String },
  profilePhoto: { type: String, default: null },
  address: {
    fullAddress: String, addressLine1: String, addressLine2: String,
    city: String, state: String, pincode: String, landmark: String,
    lat: { type: Number, default: null }, lng: { type: Number, default: null }
  },
  wallet: {
    dues: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    totalCashCollected: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    totalSettled: { type: Number, default: 0 },
    cashLimit: { type: Number, default: 10000 },
    isBlocked: { type: Boolean, default: false },
    blockedAt: { type: Date, default: null },
    blockReason: { type: String, default: null }
  },
  isActive: { type: Boolean, default: true },
  isPhoneVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  settings: {
    notifications: { type: Boolean, default: true },
    soundAlerts: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    serviceRange: { type: Number, default: 10, min: 1 }
  },
  location: { lat: Number, lng: Number, updatedAt: Date },
  geoLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  isOnline: { type: Boolean, default: false, index: true },
  lastSeenAt: { type: Date, default: null },
  currentSocketId: { type: String, default: null },
  availability: { type: String, enum: ['AVAILABLE', 'BUSY', 'ON_JOB', 'OFFLINE'], default: 'OFFLINE', index: true },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalJobs: { type: Number, default: 0 },
  completedJobs: { type: Number, default: 0 },
  cancelledJobs: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  businessHours: {
    monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } }
  },
  fcmTokens: { type: [String], default: [] },
  fcmTokenMobile: { type: [String], default: [] },
  loginSessionId: { type: String, default: null }
}, { timestamps: true });

spVendorSchema.index({ approvalStatus: 1 });
spVendorSchema.index({ 'wallet.earnings': -1 });
spVendorSchema.index({ geoLocation: '2dsphere' });
spVendorSchema.index({ isOnline: 1, availability: 1, approvalStatus: 1 });

spVendorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

spVendorSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default serviceDb.model('SpVendor', spVendorSchema, 'vendors');
