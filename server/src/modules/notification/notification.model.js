import mongoose from 'mongoose';
import { applyJsonTransform } from '../../core/schemaPlugins.js';

/**
 * Module 19 — Notifications.
 *
 * "WhatsApp nahi. ERP me." The point of this module is that the things people
 * currently learn from a group message — the token cleared, QC failed, a discount
 * needs the founder, the fabric never arrived — land on the right person's screen
 * inside the system that already knows about them.
 *
 * One document per recipient rather than one broadcast with a read-list: read
 * state is per person, and a per-person index is what the unread badge queries
 * on every page load.
 */
const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    /** Coarse category, used for filtering and for the icon on the client. */
    type: { type: String, required: true, index: true },
    severity: {
      type: String,
      enum: ['INFO', 'SUCCESS', 'WARNING', 'CRITICAL'],
      default: 'INFO',
      index: true,
    },

    title: { type: String, required: true },
    body: String,

    /** What it is about, so the client can deep-link straight to the work. */
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
    link: String,

    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,

    /** Whether the copy that went out by email actually left the building. */
    emailStatus: {
      type: String,
      enum: ['NOT_SENT', 'SENT', 'FAILED'],
      default: 'NOT_SENT',
    },

    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
/** Housekeeping: a read notification is worth keeping for a quarter, not forever. */
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

applyJsonTransform(notificationSchema);

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
