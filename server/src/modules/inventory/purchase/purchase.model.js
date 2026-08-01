import mongoose from 'mongoose';
import { UOM } from '../../../constants/product.constants.js';
import { attachmentSchema, auditEntrySchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Steps 13 & 14 — the purchase order, and the truck that turns up against it.
 *
 * Receipts are recorded per line (`receivedQuantity`), because vendors part-ship
 * constantly: 300 of the 400 metres arrive, and the project must know it is still
 * 100 short rather than seeing the PO flip to "done".
 */

const purchaseLineSchema = new mongoose.Schema(
  {
    itemType: { type: String, enum: ['Fabric', 'Motor', 'Accessory'], required: true },
    item: { type: mongoose.Schema.Types.ObjectId, refPath: 'lines.itemType', required: true },
    itemName: String,
    description: String,

    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: Object.values(UOM), default: UOM.METER },
    rate: { type: Number, default: 0, min: 0 },
    amount: { type: Number, default: 0 },

    receivedQuantity: { type: Number, default: 0, min: 0 },
    rejectedQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

/** A single delivery against the PO — the "truck arrives" event of Step 14. */
const receiptSchema = new mongoose.Schema(
  {
    receivedAt: { type: Date, default: Date.now },
    invoiceNo: String,
    lines: [
      {
        _id: false,
        line: mongoose.Schema.Types.ObjectId,
        itemName: String,
        quantity: Number,
        rejectedQuantity: { type: Number, default: 0 },
        batchNo: String,
        // Stores check colour and quality before anything reaches the shelf.
        colourVerified: { type: Boolean, default: false },
        qualityVerified: { type: Boolean, default: false },
        remarks: String,
      },
    ],
    photos: [attachmentSchema],
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remarks: String,
  },
  { _id: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    boq: { type: mongoose.Schema.Types.ObjectId, ref: 'BOQ' },

    lines: [purchaseLineSchema],

    subtotal: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 18 },
    gstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    expectedDate: Date,
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    issuedAt: Date,
    completedAt: Date,

    receipts: [receiptSchema],
    attachments: [attachmentSchema],
    history: [auditEntrySchema],
    notes: String,
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

purchaseOrderSchema.virtual('isFullyReceived').get(function isFullyReceived() {
  return this.lines.length > 0 && this.lines.every((line) => line.receivedQuantity >= line.quantity);
});

applyJsonTransform(purchaseOrderSchema);

export default mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', purchaseOrderSchema);
