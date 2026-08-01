import mongoose from 'mongoose';
import { PRODUCTION_STAGE, PRODUCTION_STAGE_ORDER } from '../../../constants/workflow.constants.js';
import { attachmentSchema, auditEntrySchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Step 15 — a work order on the factory floor, one per window.
 *
 *   Fabric Cutting → Embroidery → Hand Work → Stitching → Checking → Packing
 *
 * Each stage is stamped as it completes, so "where is the Master Bedroom curtain?"
 * has an answer that is not a WhatsApp group.
 */

const stageLogSchema = new mongoose.Schema(
  {
    stage: { type: String, enum: PRODUCTION_STAGE_ORDER, required: true },
    startedAt: Date,
    completedAt: Date,
    operator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remarks: String,
    attachments: [attachmentSchema],
  },
  { _id: false }
);

const productionOrderSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', index: true },
    roomName: String,
    window: { type: mongoose.Schema.Types.ObjectId, ref: 'Measurement', index: true },
    windowLabel: String,
    boq: { type: mongoose.Schema.Types.ObjectId, ref: 'BOQ' },

    particular: String,
    particularLabel: String,

    /**
     * Step 4 — the size this piece is stitched to, copied from the signed BOQ line.
     *
     * The factory works to `readyWidthInch` x `readyHeightInch`, never to the
     * window opening. Both are carried so a floor supervisor holding the work
     * order can see the difference for themselves, and so QC has an expected
     * figure to measure the finished curtain against.
     */
    windowWidthInch: { type: Number, min: 0 },
    windowHeightInch: { type: Number, min: 0 },
    readyWidthInch: { type: Number, min: 0 },
    readyHeightInch: { type: Number, min: 0 },

    /** Panels to make, and the material each consumes — copied from the BOQ line. */
    parts: { type: Number, default: 0, min: 0 },
    fabricMeters: { type: Number, default: 0, min: 0 },
    blackoutMeters: { type: Number, default: 0, min: 0 },
    stitchingRnft: { type: Number, default: 0, min: 0 },
    romanSqft: { type: Number, default: 0, min: 0 },

    fabric: { type: mongoose.Schema.Types.ObjectId, ref: 'Fabric' },
    fabricName: String,
    motorRequired: { type: Boolean, default: false },

    stage: {
      type: String,
      enum: PRODUCTION_STAGE_ORDER,
      default: PRODUCTION_STAGE.PENDING,
      index: true,
    },
    stageLogs: [stageLogSchema],

    priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
    plannedStartDate: Date,
    plannedEndDate: Date,
    startedAt: Date,
    completedAt: Date,

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    /** Set when QC fails, or when a snag from site sends the piece back. */
    isRework: { type: Boolean, default: false, index: true },
    reworkOf: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder' },
    reworkReason: String,

    qcStatus: { type: String, enum: ['PENDING', 'PASS', 'FAIL'], default: 'PENDING', index: true },
    packingBox: { type: mongoose.Schema.Types.ObjectId, ref: 'PackingBox' },

    history: [auditEntrySchema],
    notes: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

productionOrderSchema.index({ project: 1, stage: 1 });

productionOrderSchema.virtual('stageIndex').get(function stageIndexVirtual() {
  return PRODUCTION_STAGE_ORDER.indexOf(this.stage);
});

productionOrderSchema.virtual('progressPercent').get(function progressPercent() {
  const idx = PRODUCTION_STAGE_ORDER.indexOf(this.stage);
  if (idx < 0) return 0;
  return Math.round((idx / (PRODUCTION_STAGE_ORDER.length - 1)) * 100);
});

applyJsonTransform(productionOrderSchema);

export default mongoose.models.ProductionOrder || mongoose.model('ProductionOrder', productionOrderSchema);
