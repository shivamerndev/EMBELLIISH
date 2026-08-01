import mongoose from 'mongoose';
import { PAYMENT_SCHEDULE } from '../../constants/workflow.constants.js';
import {
  DEFAULT_CONSUMPTION_CONFIG,
  DEFAULT_RATE_CARD,
} from '../../services/consumption.service.js';
import { addressSchema, auditEntrySchema, applyJsonTransform } from '../../core/schemaPlugins.js';

/**
 * Module 20 — Settings / Masters.
 *
 * The house rules, in one editable document instead of scattered constants: what
 * counts as a big discount, what the payment split is, what GST to charge, what
 * the consumption engine assumes when a project says nothing.
 *
 * A singleton. `key` is fixed so the collection can only ever hold one row, and
 * so the record can be upserted without a race deciding which copy wins.
 */
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'GLOBAL', unique: true, immutable: true },

    company: {
      name: { type: String, default: 'Embellish' },
      legalName: String,
      gstin: String,
      pan: String,
      phone: String,
      email: String,
      website: String,
      address: addressSchema,
      bankName: String,
      bankAccount: String,
      bankIfsc: String,
      /** Printed at the foot of every proposal and quotation. */
      termsAndConditions: String,
      quotationValidityDays: { type: Number, default: 15 },
    },

    /**
     * Step 7 — "Agar DCM 10% se jyada discount dega, to Founder approval lagega."
     * The threshold lives here so the founder can move it without a deploy.
     */
    discount: {
      approvalThresholdPercent: { type: Number, default: 10, min: 0, max: 100 },
      /** A hard ceiling nobody can approve past. 100 means "no ceiling". */
      maximumPercent: { type: Number, default: 100, min: 0, max: 100 },
    },

    /** Steps 9, 10, 18 — the 10 / 60 / 30 split new projects inherit. */
    payment: {
      tokenPercent: { type: Number, default: PAYMENT_SCHEDULE.TOKEN, min: 0, max: 100 },
      advancePercent: { type: Number, default: PAYMENT_SCHEDULE.ADVANCE, min: 0, max: 100 },
      balancePercent: { type: Number, default: PAYMENT_SCHEDULE.BALANCE, min: 0, max: 100 },
      invoiceDueDays: { type: Number, default: 7 },
    },

    tax: {
      gstPercent: { type: Number, default: 18, min: 0, max: 100 },
    },

    /** Step 6 defaults — fullness, bolt width, hem allowances, ready-size allowances. */
    consumptionDefaults: { type: Object, default: () => ({ ...DEFAULT_CONSUMPTION_CONFIG }) },
    /** Module 7 fallback, when the pricing master has no live entry for a line. */
    rateCardDefaults: { type: Object, default: () => ({ ...DEFAULT_RATE_CARD }) },

    notifications: {
      emailEnabled: { type: Boolean, default: false },
      notifyOnStageAdvance: { type: Boolean, default: true },
      notifyOnPayment: { type: Boolean, default: true },
      notifyOnQcFailure: { type: Boolean, default: true },
      notifyOnSnag: { type: Boolean, default: true },
      notifyOnLowStock: { type: Boolean, default: true },
    },

    history: [auditEntrySchema],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

applyJsonTransform(settingsSchema);

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
