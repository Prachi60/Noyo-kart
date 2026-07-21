import mongoose from 'mongoose';
import serviceDb from '../config/db.js';

const spScrapSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpUser', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  images: [{ type: String }],
  address: { addressLine1: String, city: String, state: String, pincode: String, lat: Number, lng: Number },
  status: { type: String, enum: ['pending', 'accepted', 'completed', 'cancelled'], default: 'pending', index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor', default: null },
  pickupDate: { type: Date },
  finalPrice: { type: Number }
}, { timestamps: true });

export default serviceDb.model('SpScrap', spScrapSchema, 'scraps');
