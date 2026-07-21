import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import serviceDb from '../config/db.js';

const spUserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, sparse: true },
  phone: { type: String, required: true, unique: true, trim: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  password: { type: String, select: false },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  profilePhoto: { type: String, default: null },
  addresses: [{
    type: { type: String, default: 'home' },
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String,
    isDefault: { type: Boolean, default: false }
  }],
  wallet: {
    balance: { type: Number, default: 0 },
    penalty: { type: Number, default: 0 }
  },
  plans: {
    isActive: { type: Boolean, default: false },
    name: { type: String, default: null },
    expiry: { type: Date, default: null },
    price: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  settings: {
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'en' }
  },
  totalBookings: { type: Number, default: 0 },
  completedBookings: { type: Number, default: 0 },
  cancelledBookings: { type: Number, default: 0 },
  fcmTokens: { type: [String], default: [] },
  fcmTokenMobile: { type: [String], default: [] },
  loginSessionId: { type: String, default: null }
}, { timestamps: true });

spUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

spUserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default serviceDb.model('SpUser', spUserSchema, 'users');
