import BaseService from '../../../core/BaseService.js';
import BaseRepository from '../../../core/BaseRepository.js';
import ApiError from '../../../core/ApiError.js';
import { nextCode } from '../../../core/sequence.js';
import ProductionOrderModel from './production.model.js';
import BOQModel from '../../project/boq/boq.model.js';
import ProjectModel from '../../project/project/project.model.js';
import projectService from '../../project/project/project.service.js';
import stockService from '../../inventory/stock/stock.service.js';
import { readySizeStatus, readySizeSheet } from '../../project/measurement/readysize.service.js';
import {
  PRODUCTION_STAGE,
  PRODUCTION_STAGE_ORDER,
} from '../../../constants/workflow.constants.js';

const productionRepository = new BaseRepository(ProductionOrderModel, {
  filterable: ['project', 'room', 'stage', 'qcStatus', 'assignedTo', 'isRework', 'priority'],
  searchable: ['code', 'roomName', 'windowLabel'],
  populate: [
    { path: 'project', select: 'name code' },
    { path: 'assignedTo', select: 'name role' },
  ],
});

/**
 * Step 15 — the factory floor.
 *
 * One work order per window, walked stage by stage. Fabric is issued from stock
 * when cutting starts, so the shelf figure falls as cloth is actually consumed
 * rather than when someone remembers to write it down.
 */
class ProductionService extends BaseService {
  constructor() {
    super(productionRepository, 'Production order');
  }

  /**
   * Explodes the current consumption sheet into work orders — one per BOQ line.
   * Refuses to run before activation, which is the whole point of Step 10.
   */
  async generateFromBOQ(projectId, { plannedStartDate, plannedEndDate } = {}, user) {
    const project = await ProjectModel.findById(projectId).lean();
    if (!project) throw ApiError.notFound('Project not found');

    if (!project.isActivated) {
      throw ApiError.workflow(
        'Production cannot start before the project is activated (token, advance, design and measurements must all be in)'
      );
    }

    // Step 4: "Ready Size confirm bina stitching nahi."
    const { pending, total } = await readySizeStatus(projectId);
    if (total === 0 || pending > 0) {
      throw ApiError.workflow(
        total === 0
          ? 'No windows have been measured, so there is no ready size to stitch to'
          : `${pending} of ${total} window(s) still need a ready-size sign-off before work orders can be released`
      );
    }

    const boq = await BOQModel.findOne({ project: projectId, isCurrent: true }).lean();
    if (!boq) throw ApiError.workflow('No consumption sheet to produce against');

    await this.#assertSheetMatchesReadySizes(boq, projectId);

    const existing = await ProductionOrderModel.countDocuments({ project: projectId, isRework: false });
    if (existing > 0) {
      throw ApiError.conflict(
        `${existing} work order(s) already exist for this project. Raise a rework order instead of regenerating.`
      );
    }

    const orders = [];
    for (const line of boq.lines) {
      // Sequential so the work-order codes come out in sheet order.
      // eslint-disable-next-line no-await-in-loop
      const code = await nextCode('WO');
      orders.push({
        code,
        project: projectId,
        room: line.room,
        roomName: line.roomName,
        window: line.window,
        windowLabel: line.windowLabel,
        boq: boq._id,
        particular: line.particular,
        particularLabel: line.particularLabel,
        windowWidthInch: line.windowWidthInch,
        windowHeightInch: line.windowHeightInch,
        // Sheets frozen before ready size existed carry the finished figure in
        // `width`/`height`; falling back keeps those work orders dimensioned.
        readyWidthInch: line.readyWidthInch ?? line.width,
        readyHeightInch: line.readyHeightInch ?? line.height,
        parts: line.roundedParts,
        fabricMeters: line.fabricMeters,
        blackoutMeters: line.blackoutMeters,
        stitchingRnft: line.stitchingRnft,
        romanSqft: line.romanSqft,
        fabric: line.fabric,
        fabricName: line.fabricName,
        motorRequired: line.motorRequired,
        plannedStartDate,
        plannedEndDate,
        stage: PRODUCTION_STAGE.PENDING,
        history: [{ action: 'CREATED', note: `From ${boq.code}`, by: user?.id }],
      });
    }

    const created = await ProductionOrderModel.insertMany(orders);
    await projectService.tryAutoAdvance(projectId, user, `${created.length} work orders released to the factory`);

    return { count: created.length, orders: created.map((o) => o.toJSON()) };
  }

  /**
   * Step 4 — refuses to cut against a sheet that predates the signed ready size.
   *
   * A BOQ is a frozen snapshot on purpose, so a drop confirmed at 127.9" after
   * the sheet was costed at 121.9" leaves two different numbers on the record.
   * Copying the frozen one onto the work order would put the stale figure in
   * front of the cutting table — and the fabric metres were computed from it too,
   * so quietly using the new drop would be just as wrong. The sheet has to be
   * regenerated, which is one command, and then everything agrees again.
   */
  async #assertSheetMatchesReadySizes(boq, projectId) {
    const sheet = await readySizeSheet(projectId);
    const byWindow = new Map(sheet.lines.map((line) => [String(line.id), line]));

    const drifted = [];
    boq.lines.forEach((line) => {
      const live = byWindow.get(String(line.window));
      if (!live) return;

      // Sheets frozen before ready size existed carry the finished figure in
      // `width`/`height`, so that is what they are compared against.
      const sheetWidth = line.readyWidthInch ?? line.width;
      const sheetHeight = line.readyHeightInch ?? line.height;

      if (
        Math.abs((sheetWidth || 0) - live.readyWidthInch) > 0.01 ||
        Math.abs((sheetHeight || 0) - live.readyHeightInch) > 0.01
      ) {
        drifted.push(
          `${live.roomName} ${live.label}: sheet ${sheetWidth}" x ${sheetHeight}", signed ${live.readyWidthInch}" x ${live.readyHeightInch}"`
        );
      }
    });

    if (drifted.length) {
      throw ApiError.workflow(
        `${drifted.length} window(s) were signed off at a different ready size than ${boq.code} was costed against. Regenerate the consumption sheet before releasing work orders.`,
        drifted.map((detail) => ({ gate: 'readySizeMatchesSheet', message: detail }))
      );
    }
  }

  /**
   * Moves a work order to the next stage, or to a named one.
   *
   * Issuing fabric is tied to entering FABRIC_CUTTING because that is the moment
   * the cloth physically leaves the shelf.
   */
  async advanceStage(id, { toStage, remarks, attachments } = {}, user) {
    const order = await ProductionOrderModel.findById(id);
    if (!order) throw ApiError.notFound('Production order not found');

    const project = await ProjectModel.findById(order.project).lean();
    if (project && !project.isActivated) {
      throw ApiError.workflow(
        'Production cannot start before the project is activated (token, advance, design and measurements must all be in)'
      );
    }

    const currentIdx = PRODUCTION_STAGE_ORDER.indexOf(order.stage);
    const target = toStage || PRODUCTION_STAGE_ORDER[currentIdx + 1];

    if (!target) throw ApiError.workflow('Work order is already complete');
    const targetIdx = PRODUCTION_STAGE_ORDER.indexOf(target);
    if (targetIdx < 0) throw ApiError.badRequest(`Unknown production stage: ${target}`);
    if (targetIdx <= currentIdx) {
      throw ApiError.workflow(`Cannot move a work order backwards from ${order.stage} to ${target}`);
    }

    if (target === PRODUCTION_STAGE.FABRIC_CUTTING) {
      await this.#issueMaterial(order, user);
      order.startedAt = order.startedAt || new Date();
    }

    // Close off the stage being left, and open the one being entered.
    const openLog = order.stageLogs.find((log) => log.stage === order.stage && !log.completedAt);
    if (openLog) openLog.completedAt = new Date();

    order.stageLogs.push({
      stage: target,
      startedAt: new Date(),
      completedAt: target === PRODUCTION_STAGE.COMPLETED ? new Date() : undefined,
      operator: user?.id,
      remarks,
      attachments,
    });

    order.stage = target;
    if (target === PRODUCTION_STAGE.COMPLETED) order.completedAt = new Date();
    order.history.push({ action: 'STAGE_ADVANCED', from: PRODUCTION_STAGE_ORDER[currentIdx], to: target, note: remarks, by: user?.id });

    await order.save();
    await projectService.tryAutoAdvance(order.project, user, 'Production progressed');

    return order.toJSON();
  }

  /** Moves several work orders together — how a floor supervisor actually works. */
  async bulkAdvance({ ids = [], toStage, remarks }, user) {
    const results = [];
    for (const id of ids) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const order = await this.advanceStage(id, { toStage, remarks }, user);
        results.push({ id, ok: true, stage: order.stage });
      } catch (error) {
        results.push({ id, ok: false, message: error.message });
      }
    }
    return { results, advanced: results.filter((r) => r.ok).length };
  }

  /** Step 16/20 — an alteration order, from a QC failure or a snag from site. */
  async createRework(sourceId, { reason, priority = 'HIGH' }, user) {
    const source = await ProductionOrderModel.findById(sourceId).lean();
    if (!source) throw ApiError.notFound('Production order not found');

    const project = await ProjectModel.findById(source.project).lean();
    if (project && !project.isActivated) {
      throw ApiError.workflow(
        'Production cannot start before the project is activated (token, advance, design and measurements must all be in)'
      );
    }

    const rework = await ProductionOrderModel.create({
      ...source,
      _id: undefined,
      code: await nextCode('RW'),
      stage: PRODUCTION_STAGE.PENDING,
      stageLogs: [],
      qcStatus: 'PENDING',
      packingBox: undefined,
      startedAt: undefined,
      completedAt: undefined,
      isRework: true,
      reworkOf: source._id,
      reworkReason: reason,
      priority,
      history: [{ action: 'REWORK_CREATED', note: reason, by: user?.id }],
    });

    return rework.toJSON();
  }

  /** Kanban view: work orders grouped by factory stage. */
  async board(projectId) {
    const orders = await ProductionOrderModel.find({ project: projectId })
      .sort('roomName windowLabel')
      .lean();

    return PRODUCTION_STAGE_ORDER.map((stage) => ({
      stage,
      orders: orders.filter((order) => order.stage === stage),
    }));
  }

  /** Draws the fabric and lining this window needs out of stock. */
  async #issueMaterial(order, user) {
    if (!order.fabric || !(order.fabricMeters > 0)) return;

    await stockService.issue(
      {
        itemType: 'Fabric',
        item: order.fabric,
        itemName: order.fabricName,
        quantity: order.fabricMeters,
        project: order.project,
        productionOrder: order._id,
        reason: `Cutting for ${order.code}`,
      },
      user
    );
  }
}

export default new ProductionService();
export { productionRepository };
