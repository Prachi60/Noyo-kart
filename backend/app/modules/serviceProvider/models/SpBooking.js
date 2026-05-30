import mongoose from 'mongoose';
import { SP_BOOKING_STATUS, SP_PAYMENT_STATUS } from '../constants.js';

const spBookingSchema = new mongoose.Schema({
  bookingNumber: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpUser', required: true, index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor', required: false, index: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpWorker', default: null, index: true },
  notifiedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor' }],
  potentialVendors: [{ vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor' }, distance: Number }],
  currentWave: { type: Number, default: 1 },
  waveStartedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpUserService', required: true, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory', required: false, index: true },
  serviceName: { type: String, required: true },
  serviceCategory: { type: String, required: true },
  categoryIcon: { type: String, default: null },
  brandName: { type: String, default: null },
  brandIcon: { type: String, default: null },
  description: { type: String, trim: true },
  serviceImages: [{ type: String }],
  bookedItems: [{
    brandName: { type: String, default: '' },
    brandIcon: { type: String, default: null },
    serviceName: { type: String, default: '' },
    card: { title: String, subtitle: String, price: { type: Number, default: 0 }, originalPrice: Number, duration: String, description: String, imageUrl: String, features: [String] },
    quantity: { type: Number, default: 1 }
  }],
  basePrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  visitingCharges: { type: Number, default: 0, min: 0 },
  penalty: { type: Number, default: 0, min: 0 },
  extraCharges: [{ name: { type: String, required: true }, quantity: { type: Number, default: 1 }, price: { type: Number, required: true }, total: { type: Number, required: true } }],
  extraChargesTotal: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true, min: 0 },
  userPayableAmount: { type: Number, default: 0 },
  vendorBillId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendorBill', default: null },
  paymentStatus: { type: String, enum: Object.values(SP_PAYMENT_STATUS), default: SP_PAYMENT_STATUS.PENDING, index: true },
  paymentMethod: { type: String, default: null },
  paymentId: { type: String, default: null },
  razorpayOrderId: { type: String, default: null, index: true },
  razorpayPaymentId: { type: String, default: null },
  razorpayQrId: { type: String, default: null, index: true },
  cashCollected: { type: Boolean, default: false },
  cashCollectedAt: { type: Date, default: null },
  cashCollectedBy: { type: String, enum: ['vendor', 'worker'], default: null },
  cashCollectorId: { type: mongoose.Schema.Types.ObjectId, refPath: 'cashCollectedBy', default: null },
  address: {
    type: { type: String, default: 'home' },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  scheduledDate: { type: Date, required: true, index: true },
  scheduledTime: { type: String, required: true },
  timeSlot: { start: { type: String, required: true }, end: { type: String, required: true }, date: String, time: String },
  bookingType: { type: String, enum: ['instant', 'scheduled'], default: 'scheduled', index: true },
  status: { type: String, enum: Object.values(SP_BOOKING_STATUS), default: SP_BOOKING_STATUS.PENDING, index: true },
  workerResponse: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING' },
  acceptedAt: { type: Date, default: null },
  assignedAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  journeyStartedAt: { type: Date, default: null },
  visitedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  visitOtp: { type: String, select: false },
  paymentOtp: { type: String, select: false },
  customerConfirmationOTP: { type: String, default: null },
  customerConfirmed: { type: Boolean, default: false },
  workPhotos: [{ type: String }],
  visitLocation: { lat: Number, lng: Number, address: String, verifiedAt: Date },
  workDoneDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null },
  cancelledBy: { type: String, default: null },
  rating: { type: Number, default: null, min: 1, max: 5 },
  review: { type: String, default: null },
  reviewImages: [{ type: String }],
  reviewedAt: { type: Date, default: null },
  workerPaymentStatus: { type: String, enum: ['PENDING', 'PAID', 'SUCCESS'], default: 'PENDING' },
  isWorkerPaid: { type: Boolean, default: false },
  workerPaidAt: { type: Date, default: null },
  finalSettlementStatus: { type: String, enum: ['PENDING', 'DONE'], default: 'PENDING' },
  vendorNotes: { type: String, default: null },
  workerNotes: { type: String, default: null }
}, { timestamps: true });

spBookingSchema.pre('save', async function (next) {
  if (this.isNew && !this.bookingNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.bookingNumber = `BK${timestamp}${random}`;
  }
  next();
});

spBookingSchema.index({ userId: 1, status: 1, createdAt: -1 });
spBookingSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
spBookingSchema.index({ workerId: 1, status: 1, createdAt: -1 });
spBookingSchema.index({ scheduledDate: 1, status: 1 });
spBookingSchema.index({ status: 1, waveStartedAt: 1 });
spBookingSchema.index({ notifiedVendors: 1, status: 1 });
spBookingSchema.index({ 'potentialVendors.vendorId': 1 });

export default mongoose.model('SpBooking', spBookingSchema);
