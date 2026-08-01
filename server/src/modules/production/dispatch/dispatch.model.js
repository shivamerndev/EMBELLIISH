import mongoose from 'mongoose';
import { attachmentSchema, auditEntrySchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/** The packed boxes leaving the factory for the villa. */
const dispatchSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    boxes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PackingBox' }],
    boxCount: { type: Number, default: 0 },

    vehicleNo: String,
    driverName: String,
    driverPhone: String,
    transporter: String,
    ewayBillNo: String,

    dispatchedAt: { type: Date, default: Date.now, index: true },
    expectedArrival: Date,
    deliveredAt: Date,
    receivedBy: String,

    status: {
      type: String,
      enum: ['SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED'],
      default: 'SCHEDULED',
      index: true,
    },

    photos: [attachmentSchema],
    history: [auditEntrySchema],
    remarks: String,
    dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

applyJsonTransform(dispatchSchema);

export default mongoose.models.Dispatch || mongoose.model('Dispatch', dispatchSchema);
