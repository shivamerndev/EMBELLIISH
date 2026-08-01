import mongoose from 'mongoose';
import { attachmentSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Step 17 — curtains packed room-wise.
 *
 *   Box 1 → Master Bedroom → Curtain, Motor, Remote, Tieback
 *
 * The ERP knows exactly what is inside each box, which is what makes the
 * installation checklist and any missing-item dispute resolvable.
 */
const packingBoxSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    boxNumber: { type: Number, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', index: true },
    roomName: String,

    contents: [
      {
        _id: false,
        type: {
          type: String,
          enum: ['CURTAIN', 'SHEER', 'ROMAN_BLIND', 'WOODEN_BLIND', 'MOTOR', 'REMOTE', 'TRACK', 'TIEBACK', 'BRACKET', 'ACCESSORY'],
          required: true,
        },
        description: String,
        quantity: { type: Number, default: 1, min: 0 },
        productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder' },
        windowLabel: String,
        /** Ticked off by the installer on site, against the same list. */
        verifiedOnSite: { type: Boolean, default: false },
      },
    ],

    weightKg: { type: Number, min: 0 },
    dimensions: String,
    photos: [attachmentSchema],

    status: {
      type: String,
      enum: ['PACKED', 'DISPATCHED', 'DELIVERED', 'OPENED'],
      default: 'PACKED',
      index: true,
    },
    dispatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispatch' },

    packedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    packedAt: { type: Date, default: Date.now },
    remarks: String,
  },
  { timestamps: true }
);

packingBoxSchema.index({ project: 1, boxNumber: 1 }, { unique: true });

applyJsonTransform(packingBoxSchema);

export default mongoose.models.PackingBox || mongoose.model('PackingBox', packingBoxSchema);
