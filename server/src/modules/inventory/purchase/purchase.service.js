import BaseService from '../../../core/BaseService.js';
import BaseRepository from '../../../core/BaseRepository.js';
import ApiError from '../../../core/ApiError.js';
import { nextCode } from '../../../core/sequence.js';
import PurchaseOrderModel from './purchase.model.js';
import FabricModel from '../fabric/fabric.model.js';
import stockService from '../stock/stock.service.js';
import projectService from '../../project/project/project.service.js';
import TransactionModel from '../../accounts/transaction/transaction.model.js';
import { round } from '../../../services/consumption.service.js';

const purchaseRepository = new BaseRepository(PurchaseOrderModel, {
  filterable: ['project', 'vendor', 'status'],
  searchable: ['code'],
  populate: [
    { path: 'vendor', select: 'name phone leadTimeDays' },
    { path: 'project', select: 'name code' },
  ],
});

/**
 * Steps 13 & 14 — purchase only what stock cannot cover, then book the truck in.
 */
class PurchaseService extends BaseService {
  constructor() {
    super(purchaseRepository, 'Purchase order');
  }

  #totals(order) {
    const lines = order.lines.map((line) => ({
      ...(line.toObject ? line.toObject() : line),
      amount: round((line.quantity || 0) * (line.rate || 0), 2),
    }));
    const subtotal = round(lines.reduce((sum, line) => sum + line.amount, 0), 2);
    const gstAmount = round((subtotal * (order.gstPercent ?? 18)) / 100, 2);
    return { lines, subtotal, gstAmount, grandTotal: round(subtotal + gstAmount, 2) };
  }

  async create(data, user) {
    const order = new PurchaseOrderModel({ ...data, code: await nextCode('PO'), raisedBy: user?.id });
    Object.assign(order, this.#totals(order));
    order.history.push({ action: 'CREATED', by: user?.id });
    await order.save();
    return order.toJSON();
  }

  /**
   * Raises exactly the shortfall the stock check reported — nothing that is
   * already on the shelf. Returns without creating an order when there is none,
   * which is the "If yes → no purchase" branch of Step 13.
   */
  async generateFromShortfall(projectId, { vendor, expectedDate } = {}, user) {
    const { shortages } = await stockService.checkProjectAvailability(projectId);

    if (!shortages.length) {
      return { created: false, message: 'Everything is already in stock — no purchase order needed', order: null };
    }
    if (!vendor) throw ApiError.badRequest('A vendor is required to raise a purchase order');

    const rates = new Map();
    const fabricIds = shortages.filter((s) => s.itemType === 'Fabric').map((s) => s.item);
    if (fabricIds.length) {
      const fabrics = await FabricModel.find({ _id: { $in: fabricIds } }).lean();
      fabrics.forEach((fabric) => rates.set(String(fabric._id), fabric.purchaseRate || 0));
    }

    const order = new PurchaseOrderModel({
      code: await nextCode('PO'),
      project: projectId,
      vendor,
      expectedDate,
      raisedBy: user?.id,
      lines: shortages.map((entry) => ({
        itemType: entry.itemType,
        item: entry.item,
        itemName: entry.itemName,
        quantity: entry.shortfall,
        unit: entry.unit,
        rate: rates.get(String(entry.item)) || 0,
      })),
    });

    Object.assign(order, this.#totals(order));
    order.history.push({ action: 'GENERATED', note: `${shortages.length} short item(s)`, by: user?.id });
    await order.save();

    return { created: true, message: `Purchase order ${order.code} raised`, order: order.toJSON() };
  }

  async issue(id, user) {
    const order = await this.#load(id);
    if (order.status !== 'DRAFT') throw ApiError.workflow(`Purchase order is already ${order.status}`);
    if (!order.lines.length) throw ApiError.badRequest('Cannot issue an empty purchase order');

    order.status = 'ISSUED';
    order.issuedAt = new Date();
    order.history.push({ action: 'ISSUED', by: user?.id });
    await order.save();

    return order.toJSON();
  }

  /**
   * Step 14 — the truck arrives. Stores verify colour, quantity and quality, take
   * photos, and only the accepted quantity reaches the shelf.
   */
  async receiveMaterial(id, { lines = [], invoiceNo, photos, remarks } = {}, user) {
    const order = await this.#load(id);
    if (order.status === 'DRAFT') throw ApiError.workflow('Issue the purchase order before receiving against it');
    if (order.status === 'CANCELLED') throw ApiError.workflow('This purchase order was cancelled');
    if (!lines.length) throw ApiError.badRequest('Nothing was recorded as received');

    const receiptLines = [];

    for (const entry of lines) {
      const line = order.lines.id(entry.line);
      if (!line) throw ApiError.badRequest(`Unknown purchase order line: ${entry.line}`);

      const accepted = round((entry.quantity || 0) - (entry.rejectedQuantity || 0), 2);
      if (accepted < 0) throw ApiError.badRequest('Rejected quantity cannot exceed the delivered quantity');

      const outstanding = round(line.quantity - line.receivedQuantity, 2);
      if (accepted > outstanding + 0.01) {
        throw ApiError.badRequest(
          `${line.itemName}: accepting ${accepted} ${line.unit} would exceed the ${outstanding} still on order`
        );
      }

      line.receivedQuantity = round(line.receivedQuantity + accepted, 2);
      line.rejectedQuantity = round(line.rejectedQuantity + (entry.rejectedQuantity || 0), 2);

      if (accepted > 0) {
        // eslint-disable-next-line no-await-in-loop
        await stockService.receive(
          {
            itemType: line.itemType,
            item: line.item,
            itemName: line.itemName,
            quantity: accepted,
            unit: line.unit,
            batchNo: entry.batchNo || null,
            project: order.project,
            purchaseOrder: order._id,
            reason: `Received against ${order.code}`,
          },
          user
        );
      }

      receiptLines.push({
        line: line._id,
        itemName: line.itemName,
        quantity: entry.quantity,
        rejectedQuantity: entry.rejectedQuantity || 0,
        batchNo: entry.batchNo,
        colourVerified: entry.colourVerified ?? false,
        qualityVerified: entry.qualityVerified ?? false,
        remarks: entry.remarks,
      });
    }

    order.receipts.push({ receivedAt: new Date(), invoiceNo, lines: receiptLines, photos, remarks, receivedBy: user?.id });

    const complete = order.lines.every((line) => line.receivedQuantity >= line.quantity);
    order.status = complete ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    if (complete) order.completedAt = new Date();
    order.history.push({ action: complete ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED', by: user?.id });

    await order.save();

    if (order.project) {
      await projectService.tryAutoAdvance(order.project, user, `Material received against ${order.code}`);
    }

    return order.toJSON();
  }

  async recordVendorPayment(id, { amount, mode, referenceNo }, user) {
    const order = await this.#load(id);

    await TransactionModel.create({
      code: await nextCode('TXN'),
      project: order.project,
      direction: 'DEBIT',
      category: 'VENDOR_PAYMENT',
      amount,
      description: `Payment against ${order.code}`,
      purchaseOrder: order._id,
      vendor: order.vendor,
      mode,
      referenceNo,
      recordedBy: user?.id,
    });

    return { purchaseOrder: order.code, amount };
  }

  async cancel(id, { reason }, user) {
    const order = await this.#load(id);
    if (order.receipts.length) {
      throw ApiError.workflow('Material has already been received against this order; it cannot be cancelled');
    }

    order.status = 'CANCELLED';
    order.history.push({ action: 'CANCELLED', note: reason, by: user?.id });
    await order.save();

    return order.toJSON();
  }

  async #load(id) {
    const order = await PurchaseOrderModel.findById(id);
    if (!order) throw ApiError.notFound('Purchase order not found');
    return order;
  }
}

export default new PurchaseService();
export { purchaseRepository };
