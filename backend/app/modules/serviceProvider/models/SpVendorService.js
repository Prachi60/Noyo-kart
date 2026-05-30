import mongoose from 'mongoose';

const spVendorServiceSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor', required: true, index: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpService', required: true, index: true },
  customPrice: { type: Number, default: null },
  customDescription: { type: String, default: null },
  isAvailable: { type: Boolean, default: true },
  customImages: [{ type: String }],
  customDuration: { type: Number, default: null }
}, { timestamps: true });

spVendorServiceSchema.index({ vendorId: 1, serviceId: 1 }, { unique: true });

export default mongoose.model('SpVendorService', spVendorServiceSchema);
