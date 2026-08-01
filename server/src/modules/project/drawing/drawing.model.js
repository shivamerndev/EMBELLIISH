import mongoose from 'mongoose';
import { APPROVAL_STATUS } from '../../../constants/workflow.constants.js';
import { attachmentSchema, auditEntrySchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Step 12 — the execution drawing. Technical, like a civil drawing: window,
 * track, bracket, pelmet, heights, motor position. The factory cannot work
 * without it, which is why it gates the purchase stage.
 */
const drawingSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', index: true },
    window: { type: mongoose.Schema.Types.ObjectId, ref: 'Measurement' },

    code: { type: String, index: true },
    title: { type: String, required: true, trim: true },
    version: { type: Number, default: 1 },
    isCurrent: { type: Boolean, default: true, index: true },

    // --- What the drawing specifies.
    trackType: String,
    trackLengthInch: Number,
    bracketType: String,
    bracketCount: Number,
    pelmetDepthInch: Number,
    pelmetDropInch: Number,
    finishedHeightInch: Number,
    floorClearanceInch: Number,
    motorPosition: { type: String, enum: ['LEFT', 'RIGHT', 'CENTRE', 'NONE'], default: 'NONE' },
    powerPointPosition: String,
    openingType: { type: String, enum: ['CENTRE_OPEN', 'LEFT_DRAW', 'RIGHT_DRAW', 'FIXED'], default: 'CENTRE_OPEN' },

    files: [attachmentSchema],
    notes: String,

    status: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.DRAFT,
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,

    history: [auditEntrySchema],
    preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

drawingSchema.index({ project: 1, version: -1 });

applyJsonTransform(drawingSchema);

export default mongoose.models.Drawing || mongoose.model('Drawing', drawingSchema);
