import mongoose from 'mongoose';
import { attachmentSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * A room on site — "Master Bedroom", "Lounge Area". Windows hang off it, and the
 * consumption sheet subtotals by it, because that is how the factory packs boxes
 * and how the installers work their way through the villa.
 */
const roomSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true, trim: true },
    floor: { type: String, trim: true, default: 'Ground Floor' },
    /** Display order within the floor, so the sheet reads top to bottom like the paper one. */
    sequence: { type: Number, default: 0 },

    ceilingHeightInch: { type: Number, min: 0 },
    pelmetPresent: { type: Boolean, default: false },
    wiringAvailable: { type: Boolean, default: false },
    curtainStyle: String,

    notes: String,
    attachments: [attachmentSchema],
  },
  { timestamps: true }
);

roomSchema.index({ project: 1, name: 1 }, { unique: true });

applyJsonTransform(roomSchema);

export default mongoose.models.Room || mongoose.model('Room', roomSchema);
