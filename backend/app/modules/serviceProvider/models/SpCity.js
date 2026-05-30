import mongoose from 'mongoose';

const spCitySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  slug: { type: String, required: true, unique: true, lowercase: true, index: true },
  state: { type: String, trim: true, default: '' },
  country: { type: String, trim: true, default: 'India' },
  isActive: { type: Boolean, default: true, index: true },
  isDefault: { type: Boolean, default: false, index: true },
  currency: { type: String, default: 'INR' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  displayOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SpAdmin', default: null }
}, { timestamps: true });

spCitySchema.pre('validate', function (next) {
  if (this.isModified('name') && !this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

spCitySchema.pre('save', async function (next) {
  if (this.isModified('isDefault') && this.isDefault) {
    await this.constructor.updateMany({ _id: { $ne: this._id }, isDefault: true }, { isDefault: false });
  }
  next();
});

spCitySchema.index({ isActive: 1, displayOrder: 1 });
spCitySchema.index({ isActive: 1, isDefault: 1 });

spCitySchema.statics.getDefaultCity = async function () {
  let defaultCity = await this.findOne({ isDefault: true, isActive: true });
  if (!defaultCity) defaultCity = await this.findOne({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 });
  return defaultCity;
};

export default mongoose.model('SpCity', spCitySchema);
