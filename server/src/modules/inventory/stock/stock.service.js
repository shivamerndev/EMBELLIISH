import BaseService from '../../../core/BaseService.js';
import BaseRepository from '../../../core/BaseRepository.js';
import ApiError from '../../../core/ApiError.js';
import StockModel from './stock.model.js';
import StockMovementModel from './stockMovement.model.js';
import BOQModel from '../../project/boq/boq.model.js';
import FabricModel from '../fabric/fabric.model.js';
import { MATERIAL_TYPE, UOM } from '../../../constants/product.constants.js';
import { round } from '../../../services/consumption.service.js';

const stockRepository = new BaseRepository(StockModel, {
  filterable: ['itemType', 'item', 'warehouse', 'materialType'],
  searchable: ['itemName', 'batchNo'],
  defaultSort: 'itemName',
});

/**
 * Steps 13 & 14 — what the warehouse actually holds.
 *
 * The interesting operation is `reserve`: committing material to a project so a
 * second project cannot be promised the same metres. Every balance change writes
 * a ledger row, so the shelf figure is always explainable.
 */
class StockService extends BaseService {
  constructor() {
    super(stockRepository, 'Stock');
  }

  /** Finds or opens the stock row for an item at a location. */
  async #row({ itemType, item, warehouse = 'MAIN', batchNo = null, itemName, unit, materialType }) {
    const existing = await StockModel.findOne({ itemType, item, warehouse, batchNo });
    if (existing) return existing;

    return StockModel.create({
      itemType,
      item,
      warehouse,
      batchNo,
      itemName,
      unit: unit || UOM.METER,
      materialType,
      quantity: 0,
      reserved: 0,
    });
  }

  async #log(stock, type, quantity, context = {}) {
    return StockMovementModel.create({
      stock: stock._id,
      itemType: stock.itemType,
      item: stock.item,
      itemName: stock.itemName,
      type,
      quantity,
      unit: stock.unit,
      balanceAfter: stock.quantity,
      reservedAfter: stock.reserved,
      warehouse: stock.warehouse,
      ...context,
    });
  }

  /** Material arriving — from a vendor delivery, or an opening balance. */
  async receive(payload, user) {
    const { quantity, reason, project, purchaseOrder } = payload;
    if (!(quantity > 0)) throw ApiError.badRequest('Received quantity must be greater than zero');

    const stock = await this.#row(payload);
    stock.quantity = round(stock.quantity + quantity, 2);
    stock.lastMovementAt = new Date();
    await stock.save();

    await this.#log(stock, 'IN', quantity, { reason, project, purchaseOrder, performedBy: user?.id });
    return stock.toJSON();
  }

  /**
   * Commits material to a project. Refuses to over-commit: `available` already
   * nets off other projects' reservations, so two villas cannot share the same bolt.
   */
  async reserve(payload, user) {
    const { quantity, project, reason } = payload;
    const stock = await this.#row(payload);

    const available = stock.quantity - stock.reserved;
    if (quantity > available) {
      throw ApiError.workflow(
        `Only ${round(available, 2)} ${stock.unit} of ${stock.itemName} available to reserve (asked for ${quantity})`
      );
    }

    stock.reserved = round(stock.reserved + quantity, 2);
    stock.lastMovementAt = new Date();
    await stock.save();

    await this.#log(stock, 'RESERVE', quantity, { project, reason, performedBy: user?.id });
    return stock.toJSON();
  }

  async release(payload, user) {
    const { quantity, project, reason } = payload;
    const stock = await this.#row(payload);

    stock.reserved = round(Math.max(0, stock.reserved - quantity), 2);
    await stock.save();

    await this.#log(stock, 'RELEASE', quantity, { project, reason, performedBy: user?.id });
    return stock.toJSON();
  }

  /**
   * Material leaving the shelf for the cutting table. Consumes the reservation
   * first, so issuing against a reserved project does not double-count.
   */
  async issue(payload, user) {
    const { quantity, project, productionOrder, reason } = payload;
    const stock = await this.#row(payload);

    if (quantity > stock.quantity) {
      throw ApiError.workflow(
        `Only ${stock.quantity} ${stock.unit} of ${stock.itemName} in stock (asked to issue ${quantity})`
      );
    }

    stock.quantity = round(stock.quantity - quantity, 2);
    stock.reserved = round(Math.max(0, stock.reserved - quantity), 2);
    stock.lastMovementAt = new Date();
    await stock.save();

    await this.#log(stock, 'OUT', quantity, { project, productionOrder, reason, performedBy: user?.id });
    return stock.toJSON();
  }

  async adjust(payload, user) {
    const { quantity, reason } = payload;
    if (!reason) throw ApiError.badRequest('An adjustment needs a reason');

    const stock = await this.#row(payload);
    stock.quantity = round(Math.max(0, quantity), 2);
    await stock.save();

    await this.#log(stock, 'ADJUST', quantity, { reason, performedBy: user?.id });
    return stock.toJSON();
  }

  /**
   * Step 13 — "Do we already have Blue Velvet, 400 meters?"
   *
   * Walks the project's current consumption sheet, sums what each fabric needs,
   * and compares it with free stock. An empty `shortages` array is the answer
   * "no purchase order needed".
   */
  async checkProjectAvailability(projectId) {
    const boq = await BOQModel.findOne({ project: projectId, isCurrent: true }).lean();
    if (!boq) return { required: [], shortages: [], boq: null };

    /** @type {Map<string, {itemType, item, itemName, unit, required}>} */
    const required = new Map();

    const need = (key, entry, quantity) => {
      if (!(quantity > 0)) return;
      const current = required.get(key) || { ...entry, required: 0 };
      current.required = round(current.required + quantity, 2);
      required.set(key, current);
    };

    boq.lines.forEach((line) => {
      if (line.fabric) {
        need(`fabric:${line.fabric}`, {
          itemType: 'Fabric',
          item: line.fabric,
          itemName: line.fabricName || 'Curtain fabric',
          unit: UOM.METER,
          materialType: MATERIAL_TYPE.FABRIC,
        }, line.fabricMeters);
      }
    });

    // Blackout lining is bought as a single generic item rather than per window.
    const blackoutMeters = boq.totals?.blackoutMeters || 0;
    if (blackoutMeters > 0) {
      const blackout = await FabricModel.findOne({ type: 'BLACKOUT', isActive: true }).lean();
      if (blackout) {
        need(`fabric:${blackout._id}`, {
          itemType: 'Fabric',
          item: blackout._id,
          itemName: blackout.name,
          unit: UOM.METER,
          materialType: MATERIAL_TYPE.BLACKOUT,
        }, blackoutMeters);
      }
    }

    const entries = [...required.values()];

    const withStock = await Promise.all(
      entries.map(async (entry) => {
        const rows = await StockModel.find({ itemType: entry.itemType, item: entry.item }).lean();
        const inStock = round(rows.reduce((sum, row) => sum + row.quantity, 0), 2);
        const reservedElsewhere = round(rows.reduce((sum, row) => sum + row.reserved, 0), 2);
        const available = round(Math.max(0, inStock - reservedElsewhere), 2);

        return {
          ...entry,
          inStock,
          reserved: reservedElsewhere,
          available,
          shortfall: round(Math.max(0, entry.required - available), 2),
        };
      })
    );

    return {
      boq: boq.code,
      required: withStock,
      shortages: withStock.filter((entry) => entry.shortfall > 0),
    };
  }

  /** Commits everything the project needs, up to what is free. */
  async reserveForProject(projectId, user) {
    const { required } = await this.checkProjectAvailability(projectId);

    const results = [];
    for (const entry of required) {
      const quantity = Math.min(entry.required, entry.available);
      if (quantity <= 0) continue;
      // Sequential on purpose: reservations must see each other's effect.
      // eslint-disable-next-line no-await-in-loop
      const stock = await this.reserve(
        { ...entry, quantity, project: projectId, reason: 'Reserved for project' },
        user
      );
      results.push({ item: entry.itemName, reserved: quantity, stock: stock.id });
    }

    return { reserved: results };
  }

  async lowStock() {
    const rows = await StockModel.find().lean();
    return rows
      .filter((row) => row.reorderLevel > 0 && row.quantity - row.reserved <= row.reorderLevel)
      .map((row) => ({ ...row, available: round(row.quantity - row.reserved, 2) }));
  }

  async movements(query) {
    const repo = new BaseRepository(StockMovementModel, {
      filterable: ['stock', 'item', 'itemType', 'type', 'project', 'warehouse'],
      searchable: ['itemName', 'reason'],
      defaultSort: '-createdAt',
    });
    return repo.paginate(query);
  }
}

export default new StockService();
export { stockRepository };
