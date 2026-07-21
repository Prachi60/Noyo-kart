import mongoose from 'mongoose';
import serviceDb from '../config/db.js';

const spBookingRequestSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpBooking', required: true, index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor', required: true, index: true },
  status: { type: String, enum: ['PENDING', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'], default: 'PENDING', index: true },
  wave: { type: Number, default: 1 },
  distance: { type: Number, default: null },
  sentAt: { type: Date, default: Date.now },
  viewedAt: { type: Date, default: null },
  respondedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  socketDelivered: { type: Boolean, default: false },
  pushDelivered: { type: Boolean, default: false },
  rejectReason: { type: String, default: null }
}, { timestamps: true });

spBookingRequestSchema.index({ bookingId: 1, vendorId: 1 }, { unique: true });
spBookingRequestSchema.index({ vendorId: 1, status: 1 });
spBookingRequestSchema.index({ bookingId: 1, status: 1 });
spBookingRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default serviceDb.model('SpBookingRequest', spBookingRequestSchema, 'bookingrequests');
