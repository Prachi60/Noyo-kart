import mongoose from 'mongoose';
import serviceDb from '../config/db.js';
import { SP_SERVICE_STATUS } from '../constants.js';

const spCategorySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, index: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  homeIconUrl: { type: String, default: null },
  homeBadge: { type: String, default: null, trim: true },
  hasSaleBadge: { type: Boolean, default: false },
  showOnHome: { type: Boolean, default: true, index: true },
  homeOrder: { type: Number, default: 0, index: true },
  cityIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SpCity', index: true }],
  description: { type: String, trim: true },
  imageUrl: { type: String, default: null },
  status: { type: String, enum: Object.values(SP_SERVICE_STATUS), default: SP_SERVICE_STATUS.ACTIVE, index: true },
  isPopular: { type: Boolean, default: false, index: true },
  metaTitle: { type: String, trim: true },
  metaDescription: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SpAdmin', default: null }
}, { timestamps: true });

spCategorySchema.pre('validate', async function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

spCategorySchema.index({ status: 1, homeOrder: 1 });
spCategorySchema.index({ isPopular: 1, status: 1 });
spCategorySchema.index({ showOnHome: 1, homeOrder: 1 });

export default serviceDb.model('SpCategory', spCategorySchema, 'categories');
