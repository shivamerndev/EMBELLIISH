import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../../constants/roles.constants.js';
import { applyJsonTransform } from '../../core/schemaPlugins.js';

/**
 * The single identity record for everyone who touches a project: Hitesh at the
 * desk, Rahul the DCM, the coordinator, the factory floor, stores and accounts.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    // `select: false` keeps the hash out of every ordinary query by default.
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.DCM, index: true },
    /** Grants beyond the role's baseline, for one-off exceptions. */
    permissions: [{ type: String }],
    department: { type: String, trim: true },
    employeeCode: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPasswordOnChange(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

applyJsonTransform(userSchema);
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

export default mongoose.models.User || mongoose.model('User', userSchema);
