import mongoose from 'mongoose';
import { SP_TOKEN_TYPES } from '../constants.js';

const spTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, index: true, default: null },
  email: { type: String, trim: true, lowercase: true, index: true },
  phone: { type: String, trim: true, index: true },
  type: { type: String, enum: Object.values(SP_TOKEN_TYPES), required: true },
  token: { type: String, required: true },
  otp: { type: String },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  isUsed: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 }
}, { timestamps: true });

spTokenSchema.index({ userId: 1, type: 1, isUsed: 1 });
spTokenSchema.index({ email: 1, type: 1, isUsed: 1 });
spTokenSchema.index({ phone: 1, type: 1, isUsed: 1 });

export default mongoose.model('SpToken', spTokenSchema);
