import mongoose from 'mongoose';
import { QC_RESULT } from '../../../constants/workflow.constants.js';
import { attachmentSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Step 16 — the checking team opens the curtain.
 *
 *   Wrong stitch? Wrong size? Wrong colour? Damaged?
 *   PASS → Packing.  FAIL → Alteration.
 *
 * The four checks are explicit fields rather than free text, so failures can be
 * counted by cause and the factory can be told what it keeps getting wrong.
 */
const qcCheckSchema = new mongoose.Schema(
  {
    code: { type: String, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    productionOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionOrder',
      required: true,
      index: true,
    },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    roomName: String,
    windowLabel: String,

    checks: {
      stitchingOk: { type: Boolean, default: true },
      sizeOk: { type: Boolean, default: true },
      colourOk: { type: Boolean, default: true },
      undamaged: { type: Boolean, default: true },
      finishingOk: { type: Boolean, default: true },
    },

    /** Measured against the drawing; a 2-inch drift is exactly the Step-20 snag. */
    measuredWidthInch: Number,
    measuredHeightInch: Number,
    expectedWidthInch: Number,
    expectedHeightInch: Number,

    result: { type: String, enum: Object.values(QC_RESULT), required: true, index: true },
    defects: [
      {
        _id: false,
        type: {
          type: String,
          enum: ['STITCH', 'SIZE', 'COLOUR', 'DAMAGE', 'FINISH', 'OTHER'],
        },
        severity: { type: String, enum: ['MINOR', 'MAJOR', 'CRITICAL'], default: 'MINOR' },
        description: String,
      },
    ],
    remarks: String,
    photos: [attachmentSchema],

    /** Set when a FAIL spawns an alteration order. */
    reworkOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder' },

    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    inspectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

applyJsonTransform(qcCheckSchema);

export default mongoose.models.QCCheck || mongoose.model('QCCheck', qcCheckSchema);
