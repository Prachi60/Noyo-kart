import mongoose from 'mongoose';
import serviceDb from '../config/db.js';

const spNotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpUser', default: null, index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor', default: null, index: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpWorker', default: null, index: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpAdmin', default: null, index: true },
  type: {
    type: String, required: true,
    enum: ['booking_created', 'booking_request', 'booking_requested', 'booking_accepted', 'booking_confirmed', 'booking_cancelled', 'booking_completed', 'booking_rejected', 'booking_rescheduled', 'job_accepted', 'job_rejected', 'job_cancelled', 'worker_assigned', 'worker_started', 'worker_completed', 'work_done', 'work_completed', 'vendor_reached', 'journey_started', 'visit_verified', 'payment_received', 'payment_success', 'payment_failed', 'payment_refunded', 'review_submitted', 'vendor_approved', 'vendor_rejected', 'wallet_topup', 'payout_requested', 'payout_processed', 'scrap_listed', 'new_scrap_added', 'scrap_accepted', 'scrap_completed', 'vendor_withdrawal_request', 'general'],
    index: true
  },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
  relatedType: { type: String, enum: ['booking', 'payment', 'user', 'vendor', 'worker', 'service', 'scrap', 'withdrawal'], default: null },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

spNotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
spNotificationSchema.index({ vendorId: 1, isRead: 1, createdAt: -1 });
spNotificationSchema.index({ workerId: 1, isRead: 1, createdAt: -1 });

export default serviceDb.model('SpNotification', spNotificationSchema, 'notifications');
