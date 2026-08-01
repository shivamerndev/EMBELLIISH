import mongoose from 'mongoose';
import { attachmentSchema, auditEntrySchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Step 19 — the installation team reaches the villa and puts everything up:
 * curtains, tracks, motor, remote, roman blinds, sheers. Photos go back into the
 * ERP, and the project is marked installed.
 *
 * Installation is gated on the balance payment (Step 18) — the service refuses to
 * schedule one until accounts confirm the client has cleared it.
 */
const installationSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', index: true },
    roomName: String,

    scheduledDate: { type: Date, index: true },
    startedAt: Date,
    completedAt: Date,

    team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    leadInstaller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    /** Ticked off item by item, mirroring what the packing box said was inside. */
    checklist: [
      {
        _id: false,
        item: {
          type: String,
          enum: ['CURTAIN', 'SHEER', 'ROMAN_BLIND', 'WOODEN_BLIND', 'TRACK', 'MOTOR', 'REMOTE', 'TIEBACK', 'PELMET', 'BRACKET'],
        },
        windowLabel: String,
        installed: { type: Boolean, default: false },
        remarks: String,
      },
    ],

    status: {
      type: String,
      enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true,
    },

    photos: [attachmentSchema],
    clientPresent: { type: Boolean, default: false },
    clientRemarks: String,
    /** Snags raised on the day roll straight into Step 20 rework tickets. */
    snagsRaised: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Snag' }],

    history: [auditEntrySchema],
    remarks: String,
  },
  { timestamps: true }
);

installationSchema.index({ project: 1, scheduledDate: 1 });

applyJsonTransform(installationSchema);

export default mongoose.models.Installation || mongoose.model('Installation', installationSchema);
