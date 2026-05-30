import mongoose from 'mongoose';

const spSettingsSchema = new mongoose.Schema({
  type: { type: String, default: 'global', unique: true },
  visitedCharges: { type: Number, default: 0, min: 0 },
  serviceGstPercentage: { type: Number, default: 18, min: 0, max: 100 },
  partsGstPercentage: { type: Number, default: 18, min: 0, max: 100 },
  servicePayoutPercentage: { type: Number, default: 90, min: 0, max: 100 },
  partsPayoutPercentage: { type: Number, default: 100, min: 0, max: 100 },
  tdsPercentage: { type: Number, default: 1, min: 0, max: 100 },
  platformFeePercentage: { type: Number, default: 1, min: 0, max: 100 },
  vendorCashLimit: { type: Number, default: 10000, min: 0 },
  cancellationPenalty: { type: Number, default: 49, min: 0 },
  maxSearchTime: { type: Number, default: 5, min: 1 },
  waveDuration: { type: Number, default: 60, min: 10 },
  searchRadius: { type: Number, default: 10, min: 1 },
  razorpayKeyId: { type: String, default: null },
  razorpayKeySecret: { type: String, default: null },
  razorpayWebhookSecret: { type: String, default: null },
  currency: { type: String, default: 'INR' },
  companyName: { type: String, default: 'Noyo Services' },
  companyGSTIN: { type: String, default: '' },
  companyPAN: { type: String, default: '' },
  companyAddress: { type: String, default: '' },
  companyCity: { type: String, default: '' },
  companyState: { type: String, default: '' },
  companyPincode: { type: String, default: '' },
  companyPhone: { type: String, default: '' },
  companyEmail: { type: String, default: '' },
  invoicePrefix: { type: String, default: 'INV' },
  sacCode: { type: String, default: '998599' },
  currentInvoiceNumber: { type: Number, default: 0 },
  supportEmail: { type: String, default: '' },
  supportPhone: { type: String, default: '' },
  supportWhatsapp: { type: String, default: '' },
  isOnlinePaymentEnabled: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('SpSettings', spSettingsSchema);
