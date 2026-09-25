import mongoose from 'mongoose';
import { auditEntrySchema, applyJsonTransform } from '../../core/schemaPlugins.js';
import { salesCommercialFields, normalizeLeadArrays } from '../crm/lead/sales.schema.js';

/**
 * SalesCommercial (Edge Collection)
 *
 * Graph Edge Model connecting:
 * - `from`: The CRM Lead (source vertex)
 * - `to`: The Converted Project (target vertex, populated upon conversion)
 * - `lead`: Convenient direct reference and unique index
 *
 * Stores all 12 Sales & Commercials lifecycle stages between lead qualification
 * and customer/project handover (Pre-site Visit, Measurement, Studio Meeting,
 * Ready Size, Consumption/BOQ, Proposal, Advance, Costing, Quotation,
 * Client Approval, Presentation, KYC Verification).
 */
const salesCommercialSchema = new mongoose.Schema(
  {
    // --- Edge Graph Vertices ---
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, unique: true, index: true },

    // --- Edge Properties (Sales & Commercials Lifecycle) ---
    ...salesCommercialFields,

    status: {
      type: String,
      default: 'IN_PROGRESS',
    },
    history: [auditEntrySchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'sales_commercials',
  }
);

salesCommercialSchema.index({ from: 1, to: 1 });

salesCommercialSchema.pre('save', function (next) {
  if (!this.from && this.lead) {
    this.from = this.lead;
  }
  normalizeLeadArrays(this);
  next();
});

salesCommercialSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany', 'update'], function (next) {
  const update = this.getUpdate();
  if (update) {
    normalizeLeadArrays(update);
    if (update.$set) {
      normalizeLeadArrays(update.$set);
      if (update.$set.lead && !update.$set.from) {
        update.$set.from = update.$set.lead;
      }
    }
  }
  next();
});

salesCommercialSchema.post(['find', 'findOne', 'findOneAndUpdate'], function (docs) {
  if (!docs) return;
  if (Array.isArray(docs)) {
    docs.forEach(normalizeLeadArrays);
  } else {
    normalizeLeadArrays(docs);
  }
});

applyJsonTransform(salesCommercialSchema);

export default mongoose.models.SalesCommercial || mongoose.model('SalesCommercial', salesCommercialSchema);
