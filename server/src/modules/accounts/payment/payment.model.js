import mongoose from 'mongoose';
import { PAYMENT_MILESTONE } from '../../../constants/workflow.constants.js';
import { attachmentSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Money actually received. These records are what the workflow gates read: no
 * token, no project; no advance, no production; no balance, no installation.
 *
 * Only `CLEARED` payments count towards a gate — a cheque that has not cleared has
 * not been paid, and the factory must not start on the strength of one.
 */
const paymentSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', index: true },

    milestone: {
      type: String,
      enum: [...Object.values(PAYMENT_MILESTONE), 'OTHER'],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    mode: {
      type: String,
      enum: ['CASH', 'CHEQUE', 'NEFT', 'RTGS', 'UPI', 'CARD', 'OTHER'],
      default: 'NEFT',
    },
    referenceNo: String,
    bank: String,
    receivedAt: { type: Date, default: Date.now, index: true },

    status: {
      type: String,
      enum: ['PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED'],
      default: 'CLEARED',
      index: true,
    },
    clearedAt: Date,

    remarks: String,
    attachments: [attachmentSchema],
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

paymentSchema.index({ project: 1, milestone: 1, status: 1 });

applyJsonTransform(paymentSchema);

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
