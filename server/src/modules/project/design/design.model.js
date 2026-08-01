import mongoose from 'mongoose';
import { APPROVAL_STATUS } from '../../../constants/workflow.constants.js';
import { attachmentSchema, auditEntrySchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Steps 7 & 11 — the proposal and the room-by-room design that follows it.
 * "Master Bedroom → Blue Velvet → Motorized Track → Golden Tieback."
 *
 * Designs are versioned because clients change their minds and the factory must
 * always be able to prove which version it built against.
 */
const designSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', index: true },
    roomName: String,

    version: { type: Number, default: 1 },
    isCurrent: { type: Boolean, default: true, index: true },

    title: { type: String, trim: true },
    fabric: { type: mongoose.Schema.Types.ObjectId, ref: 'Fabric' },
    fabricName: String,
    sheerFabric: { type: mongoose.Schema.Types.ObjectId, ref: 'Fabric' },
    trackType: String,
    motorised: { type: Boolean, default: false },
    motor: { type: mongoose.Schema.Types.ObjectId, ref: 'Motor' },
    accessories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Accessory' }],
    tieback: String,
    colourScheme: String,
    description: String,

    /** Renders, mood boards, 3D views and physical sample photos. */
    renders: [attachmentSchema],
    samples: [attachmentSchema],

    status: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.DRAFT,
      index: true,
    },
    presentedAt: Date,
    approvedAt: Date,
    approvedByClient: String,
    revisionNotes: String,

    history: [auditEntrySchema],
    designedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

designSchema.index({ project: 1, room: 1, version: -1 });

applyJsonTransform(designSchema);

export default mongoose.models.Design || mongoose.model('Design', designSchema);
