import mongoose from 'mongoose';
import serviceDb from '../config/db.js';
import { SP_SERVICE_STATUS } from '../constants.js';

const spServiceSchema = new mongoose.Schema({
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpBrand', required: true, index: true },
  title: { type: String, required: true, trim: true, index: true },
  slug: { type: String, required: true, unique: true, lowercase: true, index: true },
  iconUrl: { type: String, default: null },
  basePrice: { type: Number, required: true, min: 0 },
  gstPercentage: { type: Number, required: true, min: 0, default: 18 },
  status: { type: String, enum: Object.values(SP_SERVICE_STATUS), default: SP_SERVICE_STATUS.ACTIVE, index: true },
  description: { type: String, trim: true }
}, { timestamps: true });

spServiceSchema.pre('validate', async function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

export default serviceDb.model('SpService', spServiceSchema, 'services');
