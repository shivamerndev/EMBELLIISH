import mongoose from 'mongoose';
import { attachmentSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/** Every call, visit and reminder against a lead or a live project. */
const followupSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },

    type: {
      type: String,
      enum: ['CALL', 'MEETING', 'SITE_VISIT', 'WHATSAPP', 'EMAIL', 'REMINDER'],
      default: 'CALL',
    },
    subject: { type: String, required: true, trim: true },
    notes: String,
    outcome: {
      type: String,
      enum: ['INTERESTED', 'NOT_INTERESTED', 'CALL_LATER', 'NO_RESPONSE', 'MEETING_FIXED', 'CLOSED'],
    },

    scheduledAt: { type: Date, index: true },
    completedAt: Date,
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },

    attachments: [attachmentSchema],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/** A pending follow-up whose date has passed is what the dashboard nags about. */
followupSchema.virtual('isOverdue').get(function isOverdue() {
  return this.status === 'PENDING' && this.scheduledAt && this.scheduledAt < new Date();
});

applyJsonTransform(followupSchema);

export default mongoose.models.FollowUp || mongoose.model('FollowUp', followupSchema);
