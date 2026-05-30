import mongoose from 'mongoose';
import { SP_BILL_STATUS } from '../constants.js';

const spVendorBillSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpBooking', required: true, unique: true, index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor', required: true, index: true },
  services: [{
    catalogId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendorServiceCatalog' },
    name: String, price: Number, gstPercentage: Number, quantity: { type: Number, default: 1 },
    gstAmount: Number, total: Number, isOriginal: { type: Boolean, default: false }
  }],
  parts: [{
    catalogId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendorPartsCatalog' },
    name: String, price: Number, gstPercentage: Number, quantity: { type: Number, default: 1 },
    gstAmount: Number, total: Number
  }],
  customItems: [{
    name: String, price: Number, gstPercentage: Number, quantity: { type: Number, default: 1 },
    gstAmount: Number, total: Number
  }],
  originalServiceBase: { type: Number, default: 0 },
  vendorServiceBase: { type: Number, default: 0 },
  totalServiceBase: { type: Number, default: 0 },
  totalPartsBase: { type: Number, default: 0 },
  visitingCharges: { type: Number, default: 0 },
  transportCharges: { type: Number, default: 0 },
  originalGST: { type: Number, default: 0 },
  vendorServiceGST: { type: Number, default: 0 },
  partsGST: { type: Number, default: 0 },
  totalGST: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  payoutConfig: {
    serviceSplitPercentage: { type: Number, default: 70 },
    partsSplitPercentage: { type: Number, default: 10 },
    serviceGstPercentage: { type: Number, default: 18 },
    partsGstPercentage: { type: Number, default: 18 }
  },
  vendorServiceEarning: { type: Number, default: 0 },
  vendorPartsEarning: { type: Number, default: 0 },
  vendorTotalEarning: { type: Number, default: 0 },
  companyRevenue: { type: Number, default: 0 },
  status: { type: String, enum: Object.values(SP_BILL_STATUS), default: SP_BILL_STATUS.DRAFT, index: true },
  generatedAt: { type: Date, default: Date.now },
  paidAt: { type: Date, default: null },
  applyPartsGST: { type: Boolean, default: true },
  note: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('SpVendorBill', spVendorBillSchema);
