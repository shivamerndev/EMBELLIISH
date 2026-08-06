import mongoose from 'mongoose';
import { APPROVAL_STATUS } from '../../../constants/workflow.constants.js';
import { auditEntrySchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Step 6 — the Consumption Sheet, frozen.
 *
 * The engine can recompute quantities from measurements at any time, but the
 * moment a sheet is used to quote or to purchase it has to stop moving. So a BOQ
 * is an immutable snapshot: the lines, the totals, and the configuration that
 * produced them. Changing a measurement afterwards produces a new revision rather
 * than silently restating a number the client already signed against.
 */

const boqLineSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    roomName: String,
    floor: String,
    window: { type: mongoose.Schema.Types.ObjectId, ref: 'Measurement' },
    windowLabel: String,
    particular: String,
    particularLabel: String,

    basis: String,
    /** Step 4: the opening as measured, and the finished size it is made to. */
    windowWidthInch: Number,
    windowHeightInch: Number,
    readyWidthInch: Number,
    readyHeightInch: Number,
    readySizeSource: String,
    readySizeConfirmed: Boolean,
    /** `width`/`height` are the ready size — every quantity on this line derives from them. */
    width: Number,
    height: Number,

    rnft: Number,
    totalParts: Number,
    suggestedParts: Number,
    roundedParts: Number,
    partsOverridden: Boolean,
    heightPerPartM: Number,

    drapeMeters: Number,
    fabricMeters: Number,
    blackoutMeters: Number,
    romanSqft: Number,

    stitchingRnft: Number,
    leadBandRnft: Number,
    romanStitchingSqft: Number,
    wireRnft: Number,
    trackRnft: Number,
    pelmetRnft: Number,
    motorQty: Number,

    fabric: { type: mongoose.Schema.Types.ObjectId, ref: 'Fabric' },
    fabricName: String,
    motorRequired: Boolean,

    // Measurement detail breakdown matching original paper consumption sheet
    o2o: { width: Number, height: Number },
    f2f: { width: Number, height: Number },
    pelmet: { o2oWidth: Number, o2oDrop: Number, f2fWidth: Number, f2fDrop: Number },
    wire: { right: Boolean, left: Boolean },
  },
  { _id: false }
);

const totalsSchema = new mongoose.Schema(
  {
    rnft: { type: Number, default: 0 },
    fabricMeters: { type: Number, default: 0 },
    blackoutMeters: { type: Number, default: 0 },
    romanSqft: { type: Number, default: 0 },
    stitchingRnft: { type: Number, default: 0 },
    leadBandRnft: { type: Number, default: 0 },
    romanStitchingSqft: { type: Number, default: 0 },
    wireRnft: { type: Number, default: 0 },
    trackRnft: { type: Number, default: 0 },
    pelmetRnft: { type: Number, default: 0 },
    motorQty: { type: Number, default: 0 },
    parts: { type: Number, default: 0 },
  },
  { _id: false }
);

const costLineSchema = new mongoose.Schema(
  {
    key: String,
    particular: String,
    quantity: Number,
    unit: String,
    rate: Number,
    amount: Number,
  },
  { _id: false }
);

const boqSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    revision: { type: Number, default: 1 },
    /** Exactly one revision per project is current; older ones stay for audit. */
    isCurrent: { type: Boolean, default: true, index: true },

    lines: [boqLineSchema],
    /** Room-wise subtotals, mirroring the paper sheet's per-area rows. */
    roomTotals: [
      {
        _id: false,
        room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
        roomName: String,
        floor: String,
        totals: totalsSchema,
      },
    ],
    totals: totalsSchema,

    // --- Costing (the FIXED COST block of the reference sheet).
    costLines: [costLineSchema],
    subtotal: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 18 },
    gstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    /** The exact settings used, so the snapshot is reproducible. */
    consumptionConfig: Object,
    rateCard: Object,

    status: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.DRAFT,
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,

    notes: String,
    history: [auditEntrySchema],
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

boqSchema.index({ project: 1, revision: -1 });

applyJsonTransform(boqSchema);

export default mongoose.models.BOQ || mongoose.model('BOQ', boqSchema);
