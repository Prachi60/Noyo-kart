import mongoose from 'mongoose';
import serviceDb from '../config/db.js';

const spReviewSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpBooking', required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpUser', required: true, index: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpService', required: true, index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor', required: true, index: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpWorker', index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  review: { type: String, trim: true },
  images: [{ type: String }],
  isVerified: { type: Boolean, default: true },
  helpfulCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'hidden', 'deleted'], default: 'active' }
}, { timestamps: true });

spReviewSchema.index({ vendorId: 1, rating: -1 });
spReviewSchema.index({ serviceId: 1, rating: -1 });

export default serviceDb.model('SpReview', spReviewSchema, 'reviews');
