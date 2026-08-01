import mongoose from 'mongoose';
import {
  PROJECT_STAGE,
  STAGE_ORDER,
  PAYMENT_SCHEDULE,
} from '../../../constants/workflow.constants.js';
import {
  DEFAULT_CONSUMPTION_CONFIG,
  DEFAULT_RATE_CARD,
} from '../../../services/consumption.service.js';
import {
  addressSchema,
  attachmentSchema,
  auditEntrySchema,
  applyJsonTransform,
} from '../../../core/schemaPlugins.js';

/**
 * The project is the record every department shares. A measurement, a BOQ, a
 * quotation, a purchase order, a curtain on the factory floor and an installation
 * photo all point back here, which is the whole point of the ERP.
 */
const projectSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },

    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    architect: { type: mongoose.Schema.Types.ObjectId, ref: 'Architect', index: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },

    siteAddress: addressSchema,
    projectType: {
      type: String,
      enum: ['VILLA', 'APARTMENT', 'BUNGALOW', 'FARMHOUSE', 'HOTEL', 'OFFICE', 'RETAIL', 'OTHER'],
      default: 'VILLA',
    },

    // --- Ownership (Step 3). Rahul owns the project; a coordinator, designer,
    //     execution engineer and installer join as the work moves down the spine.
    assignedDCM: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    projectCoordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    designer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    executionEngineer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    installer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    // --- Where the project currently sits on the spine.
    stage: {
      type: String,
      enum: STAGE_ORDER,
      default: PROJECT_STAGE.SITE_VISIT,
      index: true,
    },
    isOnHold: { type: Boolean, default: false },
    holdReason: String,

    /** Set once all four Step-10 gates clear; production may not start before it. */
    isActivated: { type: Boolean, default: false, index: true },
    activatedAt: Date,

    // --- Money. `contractValue` is stamped from the approved quotation, so the
    //     10/60/30 milestones are computed against a figure the client agreed to.
    estimatedValue: { type: Number, default: 0 },
    contractValue: { type: Number, default: 0 },
    approvedQuotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
    paymentSchedule: {
      tokenPercent: { type: Number, default: PAYMENT_SCHEDULE.TOKEN },
      advancePercent: { type: Number, default: PAYMENT_SCHEDULE.ADVANCE },
      balancePercent: { type: Number, default: PAYMENT_SCHEDULE.BALANCE },
    },

    // --- Calculation settings, snapshotted per project so a rate-card change
    //     tomorrow cannot silently restate a BOQ signed today.
    consumptionConfig: {
      type: Object,
      default: () => ({ ...DEFAULT_CONSUMPTION_CONFIG }),
    },
    rateCard: {
      type: Object,
      default: () => ({ ...DEFAULT_RATE_CARD }),
    },

    // --- Dates.
    expectedStartDate: Date,
    expectedDeliveryDate: Date,
    installationDate: Date,
    closedAt: Date,

    // --- Step 21 closure pack.
    clientSignOff: {
      signedBy: String,
      signedAt: Date,
      remarks: String,
      attachments: [attachmentSchema],
    },

    attachments: [attachmentSchema],
    history: [auditEntrySchema],
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

projectSchema.index({ name: 'text', code: 'text' });

projectSchema.virtual('stageIndex').get(function stageIndexVirtual() {
  return STAGE_ORDER.indexOf(this.stage);
});

projectSchema.virtual('tokenDue').get(function tokenDue() {
  return Math.round((this.contractValue * (this.paymentSchedule?.tokenPercent ?? 10)) / 100);
});

projectSchema.virtual('advanceDue').get(function advanceDue() {
  return Math.round((this.contractValue * (this.paymentSchedule?.advancePercent ?? 60)) / 100);
});

projectSchema.virtual('balanceDue').get(function balanceDue() {
  return Math.round((this.contractValue * (this.paymentSchedule?.balancePercent ?? 30)) / 100);
});

applyJsonTransform(projectSchema);

export default mongoose.models.Project || mongoose.model('Project', projectSchema);
