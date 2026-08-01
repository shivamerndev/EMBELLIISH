import BaseService from '../../../core/BaseService.js';
import BaseRepository from '../../../core/BaseRepository.js';
import ApiError from '../../../core/ApiError.js';
import { nextCode } from '../../../core/sequence.js';
import BOQModel from './boq.model.js';
import Measurement from '../measurement/measurement.model.js';
import Room from '../room/room.model.js';
import Fabric from '../../inventory/fabric/fabric.model.js';
import ProjectModel from '../project/project.model.js';
import projectService from '../project/project.service.js';
import pricingService from '../../pricing/pricing.service.js';
import { buildConsumptionSheet, priceConsumption } from '../../../services/consumption.service.js';
import { APPROVAL_STATUS } from '../../../constants/workflow.constants.js';

const boqRepository = new BaseRepository(BOQModel, {
  filterable: ['project', 'status', 'isCurrent', 'revision'],
  searchable: ['code'],
  populate: [{ path: 'project', select: 'name code' }],
  defaultSort: '-revision',
});

/**
 * Step 6 — the ERP starts calculating.
 *
 * Measurements are pulled, run through the consumption engine, and frozen into a
 * revision. Regenerating never edits an existing sheet: it supersedes it, because
 * a BOQ that has already been quoted or purchased against must stay exactly as it
 * was when those decisions were made.
 */
class BOQService extends BaseService {
  constructor() {
    super(boqRepository, 'Consumption sheet');
  }

  /**
   * Computes the sheet without saving it. This is what the measurement screen
   * calls on every keystroke so the coordinator sees quantities update live.
   */
  async preview(projectId, overrides = {}) {
    const { project, windows } = await this.#gather(projectId);
    const config = { ...project.consumptionConfig, ...(overrides.consumptionConfig || {}) };
    const rateCard = await this.#rates(project, overrides.rateCard);

    const sheet = buildConsumptionSheet(windows, config);
    return { ...sheet, costing: priceConsumption(sheet.totals, rateCard), rateCard };
  }

  /**
   * Module 7 — the rate a line is costed at, resolved from the published price
   * list, with the project's own negotiated rates and any one-off override on top.
   */
  async #rates(project, override) {
    return pricingService.resolveRateCard({ ...project.rateCard, ...(override || {}) });
  }

  /** Freezes the current calculation as the next revision. */
  async generate(projectId, { consumptionConfig, rateCard, notes } = {}, user) {
    const { project, windows } = await this.#gather(projectId);

    if (!windows.length) {
      throw ApiError.workflow('Cannot generate a consumption sheet before any windows are measured');
    }

    const config = { ...project.consumptionConfig, ...(consumptionConfig || {}) };
    const rates = await this.#rates(project, rateCard);

    const sheet = buildConsumptionSheet(windows, config);
    const costing = priceConsumption(sheet.totals, rates);

    const previous = await BOQModel.findOne({ project: projectId, isCurrent: true }).lean();
    const revision = (previous?.revision || 0) + 1;

    // Only one revision may be current; supersede the old one first.
    if (previous) {
      await BOQModel.updateOne({ _id: previous._id }, { $set: { isCurrent: false } });
    }

    const boq = await BOQModel.create({
      code: await nextCode('BOQ'),
      project: projectId,
      revision,
      isCurrent: true,
      lines: sheet.lines,
      roomTotals: sheet.rooms.map((room) => ({
        room: room.room,
        roomName: room.roomName,
        floor: room.floor,
        totals: room.totals,
      })),
      totals: sheet.totals,
      costLines: costing.lines,
      subtotal: costing.subtotal,
      gstPercent: costing.gstPercent,
      gstAmount: costing.gstAmount,
      grandTotal: costing.grandTotal,
      consumptionConfig: config,
      rateCard: rates,
      notes,
      generatedBy: user?.id,
      history: [{ action: 'GENERATED', note: `Revision ${revision}`, by: user?.id }],
    });

    // The sheet is the firm's own estimate until a quotation is approved.
    await ProjectModel.updateOne(
      { _id: projectId },
      { $set: { estimatedValue: costing.grandTotal, consumptionConfig: config, rateCard: rates } }
    );

    await projectService.tryAutoAdvance(projectId, user, `Consumption sheet ${boq.code} generated`);

    return boq.toJSON();
  }

  async getCurrent(projectId) {
    const boq = await BOQModel.findOne({ project: projectId, isCurrent: true })
      .populate('project', 'name code')
      .lean();
    if (!boq) throw ApiError.notFound('No consumption sheet generated for this project yet');
    return boq;
  }

  async approve(id, user) {
    const boq = await BOQModel.findById(id);
    if (!boq) throw ApiError.notFound('Consumption sheet not found');
    if (!boq.isCurrent) throw ApiError.workflow('Only the current revision can be approved');

    boq.status = APPROVAL_STATUS.APPROVED;
    boq.approvedBy = user?.id;
    boq.approvedAt = new Date();
    boq.history.push({ action: 'APPROVED', by: user?.id });
    await boq.save();

    return boq.toJSON();
  }

  /**
   * Loads the project and flattens its measurements into the shape the engine
   * expects: room name, floor and fabric details denormalised onto each window.
   */
  async #gather(projectId) {
    const project = await ProjectModel.findById(projectId).lean();
    if (!project) throw ApiError.notFound('Project not found');

    const [rooms, measurements] = await Promise.all([
      Room.find({ project: projectId }).sort('floor sequence name').lean(),
      Measurement.find({ project: projectId }).sort('sequence').lean(),
    ]);

    const roomById = new Map(rooms.map((room) => [String(room._id), room]));

    const fabricIds = [...new Set(measurements.map((m) => m.fabric).filter(Boolean).map(String))];
    const fabrics = fabricIds.length ? await Fabric.find({ _id: { $in: fabricIds } }).lean() : [];
    const fabricById = new Map(fabrics.map((f) => [String(f._id), f]));

    // Order windows the way the paper sheet reads: by floor, then room, then window.
    const roomOrder = new Map(rooms.map((room, index) => [String(room._id), index]));
    const ordered = [...measurements].sort((a, b) => {
      const roomDiff = (roomOrder.get(String(a.room)) ?? 0) - (roomOrder.get(String(b.room)) ?? 0);
      return roomDiff !== 0 ? roomDiff : (a.sequence || 0) - (b.sequence || 0);
    });

    const windows = ordered.map((measurement) => {
      const room = roomById.get(String(measurement.room));
      const fabric = measurement.fabric ? fabricById.get(String(measurement.fabric)) : null;

      return {
        ...measurement,
        roomName: room?.name || 'Unassigned',
        floor: room?.floor || '',
        fabricName: fabric?.name || '',
        // A chosen fabric overrides the project default: its bolt width and
        // recommended fullness are physical facts about that cloth.
        fabricWidthInch: measurement.fabricWidthInch || fabric?.usableWidthInch,
        fullness: measurement.fullness || fabric?.recommendedFullness,
      };
    });

    return { project, rooms, windows };
  }
}

export default new BOQService();
export { boqRepository };
