import mongoose from 'mongoose';

const spPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  tagline: { type: String, default: '' },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  duration: { type: String, required: true },
  freeCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory' }],
  freeServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SpUserService' }],
  bonusServices: [{ categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory' }, serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpUserService' } }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('SpPlan', spPlanSchema);
