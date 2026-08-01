import mongoose from 'mongoose';
import BaseService from '../../../core/BaseService.js';
import BaseRepository from '../../../core/BaseRepository.js';
import ApiError from '../../../core/ApiError.js';
import { nextCode } from '../../../core/sequence.js';
import QCCheckModel from './qc.model.js';
import ProductionOrderModel from '../production/production.model.js';
import productionService from '../production/production.service.js';
import projectService from '../../project/project/project.service.js';
import notify from '../../notification/notification.service.js';
import { QC_RESULT, PRODUCTION_STAGE } from '../../../constants/workflow.constants.js';

const qcRepository = new BaseRepository(QCCheckModel, {
  filterable: ['project', 'productionOrder', 'result', 'inspectedBy'],
  searchable: ['code', 'roomName', 'windowLabel'],
  populate: [
    { path: 'project', select: 'name code' },
    { path: 'inspectedBy', select: 'name role' },
  ],
  defaultSort: '-inspectedAt',
});

/**
 * Step 16 — PASS goes to packing, FAIL goes to alteration.
 *
 * The result is derived from the individual checks rather than trusted from the
 * caller: if any box is unticked, the piece has failed, whatever the form said.
 */
class QCService extends BaseService {
  constructor() {
    super(qcRepository, 'QC check');
  }

  async inspect(productionOrderId, payload, user) {
    const order = await ProductionOrderModel.findById(productionOrderId);
    if (!order) throw ApiError.notFound('Production order not found');

    const expectedWidth = order.readyWidthInch ?? payload.expectedWidthInch;
    const expectedHeight = order.readyHeightInch ?? payload.expectedHeightInch;

    const checks = {
      stitchingOk: payload.checks?.stitchingOk ?? true,
      sizeOk: payload.checks?.sizeOk ?? true,
      colourOk: payload.checks?.colourOk ?? true,
      undamaged: payload.checks?.undamaged ?? true,
      finishingOk: payload.checks?.finishingOk ?? true,
    };

    // A piece that measures outside tolerance against the signed ready size fails
    // the size check whatever the form said — this is Step 4 being enforced at
    // the last point where the mistake is still cheap.
    const drift = this.#sizeDrift(payload, expectedWidth, expectedHeight);
    if (drift.outOfTolerance) checks.sizeOk = false;

    const result = Object.values(checks).every(Boolean) ? QC_RESULT.PASS : QC_RESULT.FAIL;

    const defects = payload.defects?.length
      ? payload.defects
      : Object.entries(checks)
          .filter(([, ok]) => !ok)
          .map(([key]) => ({
            type: { stitchingOk: 'STITCH', sizeOk: 'SIZE', colourOk: 'COLOUR', undamaged: 'DAMAGE', finishingOk: 'FINISH' }[key],
            severity: 'MAJOR',
            description:
              key === 'sizeOk' && drift.outOfTolerance
                ? drift.description
                : `Failed the ${key.replace('Ok', '')} check`,
          }));

    const check = await QCCheckModel.create({
      code: await nextCode('QC'),
      project: order.project,
      productionOrder: order._id,
      room: order.room,
      roomName: order.roomName,
      windowLabel: order.windowLabel,
      checks,
      defects,
      result,
      measuredWidthInch: payload.measuredWidthInch,
      measuredHeightInch: payload.measuredHeightInch,
      // Step 4: what the piece should measure is the signed ready size, not
      // whatever the inspector types into the form.
      expectedWidthInch: order.readyWidthInch ?? payload.expectedWidthInch,
      expectedHeightInch: order.readyHeightInch ?? payload.expectedHeightInch,
      remarks: payload.remarks,
      photos: payload.photos,
      inspectedBy: user?.id,
    });

    order.qcStatus = result;
    order.history.push({ action: `QC_${result}`, note: check.code, by: user?.id });

    if (result === QC_RESULT.PASS) {
      // A passed piece is ready to be boxed.
      if (order.stage === PRODUCTION_STAGE.CHECKING) order.stage = PRODUCTION_STAGE.PACKING;
      await order.save();
      await projectService.tryAutoAdvance(order.project, user, `QC passed for ${order.code}`);
      return { check: check.toJSON(), reworkOrder: null };
    }

    await order.save();

    // FAIL → alteration. The rework order carries the defect list forward.
    const rework = await productionService.createRework(
      order._id,
      { reason: defects.map((d) => d.description).join('; ') || payload.remarks || 'Failed QC' },
      user
    );

    check.reworkOrder = rework.id;
    await check.save();

    // Module 19: a failure at QC is the last cheap moment to catch the mistake.
    await notify.toProjectTeam(
      order.project,
      {
        type: 'QC_FAILED',
        severity: 'WARNING',
        title: `QC failed — ${order.roomName || ''} ${order.windowLabel || order.code}`.trim(),
        body: `${defects.map((d) => d.description).join('; ') || 'Failed inspection'}. Alteration order ${rework.code} raised.`,
        entityType: 'QCCheck',
        entityId: check._id,
        link: `/projects/${order.project}?tab=production`,
      },
      user?.id
    );

    return { check: check.toJSON(), reworkOrder: rework };
  }

  /**
   * How far the finished piece is from the signed ready size.
   *
   * Half an inch is the working tolerance on a stitched drape; beyond that the
   * curtain reads as short or long on site, which is the Step-20 snag.
   */
  #sizeDrift(payload, expectedWidth, expectedHeight) {
    const TOLERANCE_INCH = 0.5;
    const parts = [];

    [
      ['Width', payload.measuredWidthInch, expectedWidth],
      ['Height', payload.measuredHeightInch, expectedHeight],
    ].forEach(([label, measured, expected]) => {
      if (!(measured > 0) || !(expected > 0)) return;
      const delta = Math.round((measured - expected) * 100) / 100;
      if (Math.abs(delta) > TOLERANCE_INCH) {
        parts.push(`${label} ${Math.abs(delta)}" ${delta > 0 ? 'over' : 'under'} the ready size of ${expected}"`);
      }
    });

    return {
      outOfTolerance: parts.length > 0,
      description: parts.join('; '),
    };
  }

  async projectSummary(projectId) {
    const [total, passed, failed, pending] = await Promise.all([
      ProductionOrderModel.countDocuments({ project: projectId }),
      ProductionOrderModel.countDocuments({ project: projectId, qcStatus: 'PASS' }),
      ProductionOrderModel.countDocuments({ project: projectId, qcStatus: 'FAIL' }),
      ProductionOrderModel.countDocuments({ project: projectId, qcStatus: 'PENDING' }),
    ]);

    const defectRows = await QCCheckModel.aggregate([
      // Scoped to this project — an unfiltered $match reported the whole factory's
      // defect mix on every project's QC panel.
      { $match: { project: new mongoose.Types.ObjectId(String(projectId)), result: QC_RESULT.FAIL } },
      { $unwind: '$defects' },
      { $group: { _id: '$defects.type', count: { $sum: 1 } } },
      { $project: { _id: 0, type: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);

    return {
      total,
      passed,
      failed,
      pending,
      passRate: total ? Math.round((passed / total) * 100) : 0,
      defectsByType: defectRows,
    };
  }
}

export default new QCService();
export { qcRepository };
