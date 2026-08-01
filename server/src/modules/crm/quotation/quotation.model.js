import mongoose from 'mongoose';
import { APPROVAL_STATUS, PAYMENT_SCHEDULE } from '../../../constants/workflow.constants.js';
import { attachmentSchema, auditEntrySchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Step 8 — the quotation, generated rather than typed.
 *
 * Because the ERP already knows fabric quantity, accessories, motors, stitching
 * and installation from the BOQ, the priced document falls out of the sheet. The
 * DCM adjusts rates and discounts; the arithmetic is never done by hand.
 */

const quotationLineSchema = new mongoose.Schema(
  {
    key: String,
    particular: { type: String, required: true },
    description: String,
    quantity: { type: Number, default: 0 },
    unit: String,
    rate: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },
    boq: { type: mongoose.Schema.Types.ObjectId, ref: 'BOQ' },

    revision: { type: Number, default: 1 },
    isCurrent: { type: Boolean, default: true, index: true },
    validUntil: Date,

    lines: [quotationLineSchema],

    subtotal: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 18 },
    gstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    /** The 10 / 60 / 30 split the client is agreeing to. */
    paymentTerms: {
      tokenPercent: { type: Number, default: PAYMENT_SCHEDULE.TOKEN },
      advancePercent: { type: Number, default: PAYMENT_SCHEDULE.ADVANCE },
      balancePercent: { type: Number, default: PAYMENT_SCHEDULE.BALANCE },
    },
    termsAndConditions: String,
    notes: String,

    /**
     * Step 7 — "Agar DCM 10% se jyada discount dega, to Founder approval lagega."
     *
     * The threshold is read from Settings when the discount is set, and frozen
     * here, so a quotation always records the rule it was actually judged against
     * rather than whatever the rule happens to be today. While this sits at
     * PENDING the quotation cannot be sent to the client or approved.
     */
    discountApproval: {
      required: { type: Boolean, default: false, index: true },
      status: {
        type: String,
        enum: ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'],
        default: 'NOT_REQUIRED',
        index: true,
      },
      thresholdPercent: { type: Number, default: 10 },
      requestedPercent: Number,
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      requestedAt: Date,
      reason: String,
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      decidedAt: Date,
      decisionNote: String,
    },

    status: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.DRAFT,
      index: true,
    },
    sentAt: Date,
    approvedAt: Date,
    approvedByClient: String,
    rejectionReason: String,

    attachments: [attachmentSchema],
    history: [auditEntrySchema],
    preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

quotationSchema.index({ project: 1, revision: -1 });

applyJsonTransform(quotationSchema);

export default mongoose.models.Quotation || mongoose.model('Quotation', quotationSchema);
