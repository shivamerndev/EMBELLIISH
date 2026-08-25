import mongoose from 'mongoose';
import { PARTICULAR, CURTAIN_STYLE } from '../../../constants/product.constants.js';
import { attachmentSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Step 5 — one row of the measurement sheet: a single window, and what is going
 * on it. This is the raw input to the consumption engine; nothing derived is
 * stored here, so re-running the calculation always agrees with the measurements.
 *
 * O2O ("outside to outside") is the track/pelmet span; F2F ("face to face") is the
 * recess opening. The paper sheet carries both columns and uses whichever applies.
 */
const measurementSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },

    label: { type: String, trim: true, default: 'W1' },
    sequence: { type: Number, default: 0 },
    particular: {
      type: String,
      enum: Object.values(PARTICULAR),
      default: PARTICULAR.MAIN_CURTAIN,
      index: true,
    },

    // --- Window size, in inches.
    o2o: {
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },
    f2f: {
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },

    /**
     * Step 4 — Ready Size, in inches. Deliberately a separate block from the
     * window size above.
     *
     * The window is 10 feet, the curtain touches the floor, so the finished piece
     * is 10.5. Storing only the opening and re-deriving the finished size in
     * whichever module happens to need it is exactly how this company ends up
     * with a curtain that is two inches short, so it is stored once, here, and
     * signed off before anything is cut.
     *
     * Leaving width/height blank means "derive it from the window size plus the
     * project's ready allowances"; filling them in overrides that derivation.
     */
    readySize: {
      widthInch: { type: Number, min: 0 },
      heightInch: { type: Number, min: 0 },
      /** Per-window allowance overrides, when this one window hangs differently. */
      widthAllowanceInch: { type: Number, min: 0 },
      dropAllowanceInch: { type: Number, min: 0 },
      /** No stitching starts until this is true. */
      confirmed: { type: Boolean, default: false, index: true },
      confirmedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      confirmedAt: Date,
      note: String,
    },

    // --- Pelmet size, in inches.
    pelmet: {
      o2oWidth: { type: Number, min: 0 },
      o2oDrop: { type: Number, min: 0 },
      f2fWidth: { type: Number, min: 0 },
      f2fDrop: { type: Number, min: 0 },
    },

    // --- Wire / power availability at the window, for motorised tracks.
    wire: {
      left: { type: Boolean, default: false },
      right: { type: Boolean, default: false },
    },
    wireDropFt: { type: Number, min: 0 },

    motorRequired: { type: Boolean, default: false },
    motorQty: { type: Number, default: 0, min: 0 },
    curtainStyle: { type: String, enum: Object.values(CURTAIN_STYLE), default: CURTAIN_STYLE.PINCH_PLEAT },

    // --- Per-window overrides of the calculation defaults. The reference sheet
    //     shows bolt width and panel counts varying room to room, so the engine
    //     has to let the coordinator say so rather than forcing one constant.
    fullness: { type: Number, min: 0 },
    fabricWidthInch: { type: Number, min: 0 },
    heightAllowanceInch: { type: Number, min: 0 },
    /** Forces the panel count, e.g. to make a sheer match its main curtain. */
    partsOverride: { type: Number, min: 0 },
    overrideReason: String,

    // --- Selected materials (filled in at design finalisation, Step 11).
    fabric: { type: mongoose.Schema.Types.ObjectId, ref: 'Fabric' },
    blackoutFabric: { type: mongoose.Schema.Types.ObjectId, ref: 'Fabric' },
    motor: { type: mongoose.Schema.Types.ObjectId, ref: 'Motor' },

    remarks: String,
    attachments: [attachmentSchema],
    measuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    measuredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

measurementSchema.index({ project: 1, room: 1, sequence: 1 });

/** True when neither measurement system was filled in — the row cannot be costed. */
measurementSchema.virtual('isIncomplete').get(function isIncomplete() {
  const width = this.o2o?.width || this.f2f?.width;
  const height = this.o2o?.height || this.f2f?.height;
  return !width || !height;
});

applyJsonTransform(measurementSchema);

export default mongoose.models.Measurement || mongoose.model('Measurement', measurementSchema);
