import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import serviceDb from '../config/db.js';

const spAdminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['super_admin', 'city_admin', 'support'], default: 'super_admin' },
  cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCity', default: null },
  cityName: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null }
}, { timestamps: true });

spAdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

spAdminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default serviceDb.model('SpAdmin', spAdminSchema, 'admins');
