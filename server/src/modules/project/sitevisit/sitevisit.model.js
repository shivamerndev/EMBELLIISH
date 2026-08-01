import mongoose from 'mongoose';
import { attachmentSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Step 4 — Rahul, the coordinator and the installer go to the villa. They sell
 * nothing; they collect. Photos, videos, ceiling heights, pelmet and wiring
 * conditions, and the curtain style the client leans towards.
 */
const siteVisitSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    visitDate: { type: Date, default: Date.now, index: true },

    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    /** People on site who are not ERP users — the client, the architect's junior. */
    externalAttendees: [String],

    // --- Site conditions the factory and installers need to know about.
    ceilingHeightInch: { type: Number, min: 0 },
    pelmetAvailable: { type: Boolean, default: false },
    wiringAvailable: { type: Boolean, default: false },
    falseCeiling: { type: Boolean, default: false },
    curtainStylePreference: String,
    accessNotes: String,

    roomsSurveyed: { type: Number, default: 0, min: 0 },
    windowsSurveyed: { type: Number, default: 0, min: 0 },

    photos: [attachmentSchema],
    videos: [attachmentSchema],
    observations: String,

    status: {
      type: String,
      enum: ['PLANNED', 'COMPLETED', 'CANCELLED'],
      default: 'PLANNED',
      index: true,
    },
    completedAt: Date,
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

applyJsonTransform(siteVisitSchema);

export default mongoose.models.SiteVisit || mongoose.model('SiteVisit', siteVisitSchema);
