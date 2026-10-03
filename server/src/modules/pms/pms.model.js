import mongoose from 'mongoose';
import { auditEntrySchema, applyJsonTransform } from '../../core/schemaPlugins.js';

/**
 * PmsItem Schema
 *
 * Dedicated collection for PMS (Project Management System) workflow records across all 20 stages:
 * 1. projectActivation / project-activation
 * 2. executionSetup / execution-setup
 * 3. designFinalisation / design-finalisation
 * 4. executionDrawingRequest / execution-drawing-request
 * 5. executionDrawingPreparation / execution-drawing-preparation
 * 6. approvals / approvals
 * 7. changeRevisionControl / change-revision-control
 * 8. orderSheetFmsCreation / order-sheet-fms-creation
 * 9. procurementRequest / procurement-request
 * 10. motorsAccessoriesControl / motors-accessories-control
 * 11. qcStatus / qc-status
 * 12. packingDispatchReadiness / packing-dispatch-readiness
 * 13. finalPayment / final-payment
 * 14. installationScheduling / installation-scheduling
 * 15. installationBriefDispatch / installation-brief-dispatch
 * 16. installationExecutionUpdates / installation-execution-updates
 * 17. clientExecutionUpdates / client-execution-updates
 * 18. snagRework / snag-rework
 * 19. projectClosure / project-closure
 * 20. maintenance / maintenance
 */
const pmsItemSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    code: { type: String, trim: true, index: true },
    clientName: { type: String, trim: true, index: true },
    stage: { type: String, required: true, trim: true, index: true },
    stageKey: { type: String, trim: true, index: true },
    stageSlug: { type: String, trim: true, index: true },
    status: { type: String, default: 'In Progress', index: true },
    delay: { type: String, default: 'No' },
    currentOwner: { type: String, trim: true },
    siteDetails: { type: String, trim: true },
    dueDate: { type: Date },
    approvedQuote: { type: String, trim: true },
    paymentReceipt: { type: String, trim: true },
    projectActivationDate: { type: Date },
    clientApproval: { type: String, trim: true },
    assignedPcExecutionOwner: { type: String, trim: true },
    kycBillingStatus: { type: String, trim: true },
    history: [auditEntrySchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    strict: false,
    collection: 'pms_items',
  }
);

pmsItemSchema.index({ stageKey: 1, code: 1 });
pmsItemSchema.index({ stageSlug: 1, code: 1 });
pmsItemSchema.index({ stage: 1, code: 1 });

applyJsonTransform(pmsItemSchema);

export default mongoose.models.PmsItem || mongoose.model('PmsItem', pmsItemSchema);
