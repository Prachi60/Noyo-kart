import mongoose from 'mongoose';
import serviceDb from '../config/db.js';

const spCartItemSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpUserService', required: false },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory', required: false },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '' },
  category: { type: String, required: true },
  categoryTitle: { type: String, default: '' },
  categoryIcon: { type: String, default: null },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, default: null },
  unitPrice: { type: Number, required: true, min: 0 },
  serviceCount: { type: Number, default: 1, min: 1 },
  rating: { type: String, default: '4.8' },
  reviews: { type: String, default: '10k+' },
  sectionTitle: { type: String, default: '' },
  sectionIcon: { type: String, default: null },
  sectionId: { type: String, default: null },
  card: { title: String, subtitle: String, price: Number, originalPrice: Number, duration: String, description: String, imageUrl: String, features: [String] },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpVendor', default: null }
}, { _id: true });

const spCartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpUser', required: true, unique: true, index: true },
  items: [spCartItemSchema],
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

spCartSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default serviceDb.model('SpCart', spCartSchema, 'carts');
