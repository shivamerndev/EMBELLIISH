import mongoose from 'mongoose';
import { attachmentSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * The project cash ledger: client receipts on one side, vendor payments, factory
 * labour and installation costs on the other. This is what turns a closed project
 * into a margin figure instead of a guess.
 */
const transactionSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },

    direction: { type: String, enum: ['CREDIT', 'DEBIT'], required: true, index: true },
    category: {
      type: String,
      enum: [
        'CLIENT_PAYMENT',
        'VENDOR_PAYMENT',
        'MATERIAL_PURCHASE',
        'LABOUR',
        'STITCHING',
        'INSTALLATION',
        'TRANSPORT',
        'COMMISSION',
        'REFUND',
        'OTHER',
      ],
      default: 'OTHER',
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    description: String,

    // --- Whichever document caused the entry.
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

    mode: { type: String, enum: ['CASH', 'CHEQUE', 'NEFT', 'RTGS', 'UPI', 'CARD', 'OTHER'], default: 'NEFT' },
    referenceNo: String,
    transactionDate: { type: Date, default: Date.now, index: true },

    attachments: [attachmentSchema],
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

applyJsonTransform(transactionSchema);

export default mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
