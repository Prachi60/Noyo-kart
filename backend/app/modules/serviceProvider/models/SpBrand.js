import mongoose from 'mongoose';
import { SP_SERVICE_STATUS } from '../constants.js';

const spBrandSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, index: true },
  slug: { type: String, required: true, unique: true, lowercase: true, index: true },
  categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory', required: true, index: true }],
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory', index: true },
  cityIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SpCity', index: true }],
  iconUrl: { type: String, default: null },
  badge: { type: String, default: null, trim: true },
  routePath: { type: String, default: null },
  status: { type: String, enum: Object.values(SP_SERVICE_STATUS), default: SP_SERVICE_STATUS.ACTIVE, index: true },
  isPopular: { type: Boolean, default: false, index: true },
  isFeatured: { type: Boolean, default: false, index: true },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalBookings: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SpAdmin', default: null }
}, { timestamps: true });

spBrandSchema.pre('save', async function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
  }
  if (this.isModified('slug') && !this.routePath) {
    this.routePath = `/user/brand/${this.slug}`;
  }
  if (this.isModified('categoryId') && this.categoryId && !this.categoryIds.includes(this.categoryId)) {
    this.categoryIds.push(this.categoryId);
  }
  if (this.isModified('categoryIds') && this.categoryIds.length > 0) {
    this.categoryId = this.categoryIds[0];
  }
  next();
});

spBrandSchema.index({ categoryIds: 1, status: 1 });
spBrandSchema.index({ status: 1, isPopular: 1, isFeatured: 1 });

export default mongoose.model('SpBrand', spBrandSchema);
