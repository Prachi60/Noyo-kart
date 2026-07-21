import mongoose from 'mongoose';
import serviceDb from '../config/db.js';
import { SP_SERVICE_STATUS } from '../constants.js';

const spVendorPartsCatalogSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  hsnCode: { type: String, trim: true, index: true },
  price: { type: Number, required: true, min: 0 },
  gstApplicable: { type: Boolean, default: true },
  gstPercentage: { type: Number, default: 18, min: 0 },
  status: { type: String, enum: Object.values(SP_SERVICE_STATUS), default: SP_SERVICE_STATUS.ACTIVE, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory', required: true, index: true },
  description: { type: String, trim: true }
}, { timestamps: true });

export default serviceDb.model('SpVendorPartsCatalog', spVendorPartsCatalogSchema, 'vendorpartscatalogs');
