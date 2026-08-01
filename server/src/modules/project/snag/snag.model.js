import mongoose from 'mongoose';
import { SNAG_STATUS } from '../../../constants/workflow.constants.js';
import { attachmentSchema, auditEntrySchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Step 20 — "This curtain is 2 inches longer."
 *
 * The installer reports it, the ERP raises a rework ticket, the factory alters the
 * curtain and returns it, and the ticket closes. A project cannot reach closure
 * with a snag still open.
 */
const snagSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', index: true },
    roomName: String,
    window: { type: mongoose.Schema.Types.ObjectId, ref: 'Measurement' },
    windowLabel: String,
    installation: { type: mongoose.Schema.Types.ObjectId, ref: 'Installation' },
    productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder' },

    type: {
      type: String,
      enum: ['SIZE', 'COLOUR', 'STITCH', 'DAMAGE', 'MOTOR_FAULT', 'MISSING_ITEM', 'FINISH', 'OTHER'],
      default: 'SIZE',
      index: true,
    },
    severity: { type: String, enum: ['MINOR', 'MAJOR', 'CRITICAL'], default: 'MINOR', index: true },
    title: { type: String, required: true, trim: true },
    description: String,
    /** e.g. "2 inches longer" — the concrete correction the factory must make. */
    deviation: String,

    status: {
      type: String,
      enum: Object.values(SNAG_STATUS),
      default: SNAG_STATUS.OPEN,
      index: true,
    },

    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportedAt: { type: Date, default: Date.now },
    /** The alteration work order the factory picks up. */
    reworkOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder' },
    reworkStartedAt: Date,
    readyAt: Date,
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolution: String,

    targetDate: Date,
    photos: [attachmentSchema],
    history: [auditEntrySchema],
  },
  { timestamps: true }
);

snagSchema.index({ project: 1, status: 1 });

applyJsonTransform(snagSchema);

export default mongoose.models.Snag || mongoose.model('Snag', snagSchema);
