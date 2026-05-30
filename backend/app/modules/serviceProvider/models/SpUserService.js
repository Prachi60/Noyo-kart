import mongoose from 'mongoose';
import { SP_SERVICE_STATUS } from '../constants.js';

const spUserServiceSchema = new mongoose.Schema({
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpBrand', required: true, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory', index: true },
  title: { type: String, required: true, trim: true, index: true },
  iconUrl: { type: String, default: null },
  basePrice: { type: Number, required: true, min: 0 },
  gstPercentage: { type: Number, required: true, min: 0, default: 18 },
  status: { type: String, enum: Object.values(SP_SERVICE_STATUS), default: SP_SERVICE_STATUS.ACTIVE, index: true },
  description: { type: String, trim: true }
}, { timestamps: true });

spUserServiceSchema.index({ brandId: 1, categoryId: 1 });

export default mongoose.model('SpUserService', spUserServiceSchema);
