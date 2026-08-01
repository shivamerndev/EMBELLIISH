import mongoose from 'mongoose';
import { PAYMENT_MILESTONE } from '../../../constants/workflow.constants.js';
import { attachmentSchema, auditEntrySchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * A demand against a project, raised per milestone: the 10% token, the 60%
 * advance, and the 30% balance due before installation.
 */
const invoiceSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },
    quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },

    milestone: {
      type: String,
      enum: [...Object.values(PAYMENT_MILESTONE), 'OTHER'],
      default: PAYMENT_MILESTONE.TOKEN,
      index: true,
    },
    type: { type: String, enum: ['PROFORMA', 'TAX_INVOICE', 'CREDIT_NOTE'], default: 'PROFORMA' },

    lines: [
      {
        _id: false,
        particular: String,
        quantity: { type: Number, default: 1 },
        unit: String,
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    ],

    subtotal: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 18 },
    gstAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    /** Kept in step with linked payments so ageing reports need no joins. */
    amountPaid: { type: Number, default: 0 },

    issueDate: { type: Date, default: Date.now },
    dueDate: Date,

    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },

    notes: String,
    attachments: [attachmentSchema],
    history: [auditEntrySchema],
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

invoiceSchema.virtual('balance').get(function balance() {
  return Math.max(0, (this.total || 0) - (this.amountPaid || 0));
});

applyJsonTransform(invoiceSchema);

export default mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
