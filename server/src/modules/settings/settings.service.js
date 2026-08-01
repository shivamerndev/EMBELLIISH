import ApiError from '../../core/ApiError.js';
import SettingsModel from './settings.model.js';

/**
 * Module 20 — Settings / Masters.
 *
 * Every other module asks this service rather than reading a constant, so a
 * change to the discount threshold or the payment split takes effect everywhere
 * at once. Reads are cached for a few seconds because the gates, the quotation
 * builder and the dashboard all ask for the same document within one request.
 */

const CACHE_TTL_MS = 10_000;
let cache = null;
let cachedAt = 0;

class SettingsService {
  /** The live settings, creating the singleton on first use. */
  async get({ fresh = false } = {}) {
    if (!fresh && cache && Date.now() - cachedAt < CACHE_TTL_MS) return cache;

    const settings = await SettingsModel.findOneAndUpdate(
      { key: 'GLOBAL' },
      { $setOnInsert: { key: 'GLOBAL' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    cache = settings;
    cachedAt = Date.now();
    return settings;
  }

  async update(patch = {}, user) {
    const settings = await SettingsModel.findOneAndUpdate(
      { key: 'GLOBAL' },
      { $setOnInsert: { key: 'GLOBAL' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // The payment split has to add up, or every milestone gate downstream lies.
    if (patch.payment) {
      const merged = { ...settings.payment.toObject(), ...patch.payment };
      const total = merged.tokenPercent + merged.advancePercent + merged.balancePercent;
      if (Math.round(total) !== 100) {
        throw ApiError.badRequest(
          `Token, advance and balance must add up to 100% — this adds up to ${Math.round(total)}%`
        );
      }
    }

    ['company', 'discount', 'payment', 'tax', 'notifications'].forEach((section) => {
      if (patch[section]) Object.assign(settings[section], patch[section]);
    });

    if (patch.consumptionDefaults) {
      settings.consumptionDefaults = { ...settings.consumptionDefaults, ...patch.consumptionDefaults };
    }
    if (patch.rateCardDefaults) {
      settings.rateCardDefaults = { ...settings.rateCardDefaults, ...patch.rateCardDefaults };
    }

    settings.updatedBy = user?.id;
    settings.history.push({
      action: 'UPDATED',
      note: Object.keys(patch).join(', '),
      by: user?.id,
    });

    await settings.save();
    this.invalidate();
    return this.get({ fresh: true });
  }

  /** Step 7 — the percentage a DCM may discount without asking the founder. */
  async discountThreshold() {
    const settings = await this.get();
    return settings.discount?.approvalThresholdPercent ?? 10;
  }

  async paymentSchedule() {
    const settings = await this.get();
    return {
      tokenPercent: settings.payment?.tokenPercent ?? 10,
      advancePercent: settings.payment?.advancePercent ?? 60,
      balancePercent: settings.payment?.balancePercent ?? 30,
    };
  }

  invalidate() {
    cache = null;
    cachedAt = 0;
  }
}

export default new SettingsService();
