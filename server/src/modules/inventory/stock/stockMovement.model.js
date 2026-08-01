import mongoose from 'mongoose';
import { UOM } from '../../../constants/product.constants.js';
import { applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * The inventory ledger. Every change to a stock balance writes one immutable row
 * here with the resulting balance, so "where did 40 metres of velvet go?" is
 * always answerable without reconstructing history from documents.
 */
const stockMovementSchema = new mongoose.Schema(
  {
    stock: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true, index: true },
    itemType: { type: String, enum: ['Fabric', 'Motor', 'Accessory'], required: true },
    item: { type: mongoose.Schema.Types.ObjectId, refPath: 'itemType', required: true, index: true },
    itemName: String,

    type: {
      type: String,
      enum: ['IN', 'OUT', 'RESERVE', 'RELEASE', 'ADJUST', 'RETURN'],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true },
    unit: { type: String, enum: Object.values(UOM), default: UOM.METER },
    balanceAfter: { type: Number, default: 0 },
    reservedAfter: { type: Number, default: 0 },

    // --- What caused the movement.
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder' },
    referenceType: String,
    reason: String,

    warehouse: { type: String, default: 'MAIN' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

stockMovementSchema.index({ createdAt: -1 });

applyJsonTransform(stockMovementSchema);

export default mongoose.models.StockMovement || mongoose.model('StockMovement', stockMovementSchema);
