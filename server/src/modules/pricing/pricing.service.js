import BaseService from '../../core/BaseService.js';
import BaseRepository from '../../core/BaseRepository.js';
import ApiError from '../../core/ApiError.js';
import PriceItemModel from './pricing.model.js';
import settingsService from '../settings/settings.service.js';
import { DEFAULT_RATE_CARD } from '../../services/consumption.service.js';

const pricingRepository = new BaseRepository(PriceItemModel, {
  filterable: ['key', 'category', 'isActive', 'unit'],
  searchable: ['key', 'particular', 'description'],
  defaultSort: 'category key',
});

/**
 * Module 7 — the Pricing Master.
 *
 * The rate a BOQ costs with is resolved in three steps, most specific first:
 *
 *   1. the project's own rate card  (a negotiated rate, frozen onto the project)
 *   2. the published price list     (this module — what the founder set)
 *   3. the settings defaults        (module 20, then the engine's constants)
 *
 * So a project quoted last quarter keeps its numbers, a new project picks up
 * today's list, and nothing ever silently falls back to zero.
 */

/** Rate-card field each price-list key feeds. Mirrors `priceConsumption`. */
const RATE_CARD_KEYS = {
  FABRIC: 'defaultFabricRate',
  BLACKOUT: 'blackoutFabricRate',
  CURTAIN_STITCHING: 'curtainStitchingRate',
  LEAD_BAND: 'leadBandRate',
  ROMAN_STITCHING: 'romanStitchingRate',
  TRACK: 'trackRate',
  MOTOR: 'motorRate',
  INSTALLATION: 'installationRate',
};

class PricingService extends BaseService {
  constructor() {
    super(pricingRepository, 'Price list item');
  }

  /**
   * Publishing a rate closes the one it replaces rather than overwriting it, so
   * an old quotation can always be explained by the list that was live that day.
   */
  async create(data, user) {
    const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : new Date();

    await PriceItemModel.updateMany(
      { key: data.key.toUpperCase(), isActive: true, effectiveTo: { $exists: false } },
      { $set: { effectiveTo: effectiveFrom } }
    );

    return this.repository.create({
      ...data,
      key: data.key.toUpperCase(),
      effectiveFrom,
      createdBy: user?.id,
      history: [{ action: 'PUBLISHED', note: `Rate ${data.rate}`, by: user?.id }],
    });
  }

  /** The rates in force on a given date, one row per key. */
  async currentPriceList(on = new Date()) {
    const when = new Date(on);

    const items = await PriceItemModel.find({
      isActive: true,
      effectiveFrom: { $lte: when },
      $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gt: when } }],
    })
      .sort('key -effectiveFrom')
      .lean();

    // Most recently effective wins when two rows overlap.
    const byKey = new Map();
    items.forEach((item) => {
      if (!byKey.has(item.key)) byKey.set(item.key, item);
    });

    return [...byKey.values()];
  }

  /**
   * Builds the rate card the consumption engine costs with.
   *
   * @param {object} [projectRateCard] rates already frozen onto the project, which win
   */
  async resolveRateCard(projectRateCard = {}, on = new Date()) {
    const settings = await settingsService.get();
    const list = await this.currentPriceList(on);

    const fromList = {};
    list.forEach((item) => {
      const field = RATE_CARD_KEYS[item.key];
      if (field) fromList[field] = item.rate;
    });

    const resolved = {
      ...DEFAULT_RATE_CARD,
      ...(settings.rateCardDefaults || {}),
      ...fromList,
      gstPercent: settings.tax?.gstPercent ?? DEFAULT_RATE_CARD.gstPercent,
    };

    // A project's negotiated rate beats the published list — but only where one
    // was actually set, so a stored zero cannot wipe out a live rate.
    Object.entries(projectRateCard || {}).forEach(([field, value]) => {
      if (Number.isFinite(Number(value)) && Number(value) > 0) resolved[field] = Number(value);
    });

    return resolved;
  }

  /** Which price-list keys are still unpublished — the "why is this line missing?" answer. */
  async coverage() {
    const list = await this.currentPriceList();
    const published = new Set(list.map((item) => item.key));

    return Object.keys(RATE_CARD_KEYS).map((key) => ({
      key,
      rateCardField: RATE_CARD_KEYS[key],
      published: published.has(key),
      rate: list.find((item) => item.key === key)?.rate ?? null,
    }));
  }

  async retire(id, user) {
    const item = await PriceItemModel.findById(id);
    if (!item) throw ApiError.notFound('Price list item not found');

    item.isActive = false;
    item.effectiveTo = item.effectiveTo || new Date();
    item.history.push({ action: 'RETIRED', by: user?.id });
    await item.save();

    return item.toJSON();
  }
}

export default new PricingService();
export { pricingRepository, RATE_CARD_KEYS };
