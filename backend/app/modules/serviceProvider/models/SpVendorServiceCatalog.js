import mongoose from 'mongoose';
import { SP_SERVICE_STATUS } from '../constants.js';

const spVendorServiceCatalogSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory', index: true },
  price: { type: Number, required: true, min: 0 },
  status: { type: String, enum: Object.values(SP_SERVICE_STATUS), default: SP_SERVICE_STATUS.ACTIVE, index: true },
  description: { type: String, trim: true }
}, { timestamps: true });

export default mongoose.model('SpVendorServiceCatalog', spVendorServiceCatalogSchema);
