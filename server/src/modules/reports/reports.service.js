import mongoose from 'mongoose';
import LeadModel from '../crm/lead/lead.model.js';
import ProjectModel from '../project/project/project.model.js';
import PaymentModel from '../accounts/payment/payment.model.js';
import InvoiceModel from '../accounts/invoice/invoice.model.js';
import ProductionOrderModel from '../production/production/production.model.js';
import SnagModel from '../project/snag/snag.model.js';
import StockModel from '../inventory/stock/stock.model.js';
import FollowUpModel from '../crm/followup/followup.model.js';
import { round } from '../../services/consumption.service.js';
import {
  STAGE_ORDER,
  STAGE_LABELS,
  LEAD_STATUS,
  PRODUCTION_STAGE_ORDER,
  SNAG_STATUS,
} from '../../constants/workflow.constants.js';

/**
 * "Management gets a complete end-to-end view of the project."
 *
 * These are read-only roll-ups across modules — the one place in the codebase
 * that is allowed to reach across every boundary at once.
 */
class ReportsService {
  /** Headline dashboard: pipeline, money, factory load, and what is overdue. */
  async dashboard() {
    const [
      leadRows,
      stageRows,
      projectCount,
      activeCount,
      paymentRow,
      outstandingRow,
      productionRows,
      openSnags,
      overdueFollowUps,
      lowStockCount,
    ] = await Promise.all([
      LeadModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$budget' } } }]),
      ProjectModel.aggregate([{ $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$contractValue' } } }]),
      ProjectModel.countDocuments({}),
      ProjectModel.countDocuments({ isActivated: true, stage: { $ne: 'CLOSED' } }),
      PaymentModel.aggregate([{ $match: { status: 'CLEARED' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      InvoiceModel.aggregate([
        { $match: { status: { $in: ['ISSUED', 'PARTIALLY_PAID'] } } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$total', '$amountPaid'] } } } },
      ]),
      ProductionOrderModel.aggregate([{ $group: { _id: '$stage', count: { $sum: 1 } } }]),
      SnagModel.countDocuments({ status: { $ne: SNAG_STATUS.CLOSED } }),
      FollowUpModel.countDocuments({ status: 'PENDING', scheduledAt: { $lte: new Date() } }),
      this.#lowStockCount(),
    ]);

    const leadsByStatus = Object.fromEntries(leadRows.map((r) => [r._id, r]));
    const stagesByKey = Object.fromEntries(stageRows.map((r) => [r._id, r]));
    const productionByStage = Object.fromEntries(productionRows.map((r) => [r._id, r.count]));

    const contractValue = stageRows.reduce((sum, row) => sum + (row.value || 0), 0);
    const received = paymentRow[0]?.total || 0;

    return {
      leads: {
        total: leadRows.reduce((sum, r) => sum + r.count, 0),
        open: [LEAD_STATUS.NEW, LEAD_STATUS.CONTACTED, LEAD_STATUS.QUALIFIED].reduce(
          (sum, status) => sum + (leadsByStatus[status]?.count || 0),
          0
        ),
        converted: leadsByStatus[LEAD_STATUS.CONVERTED]?.count || 0,
        pipelineValue: round(
          [LEAD_STATUS.NEW, LEAD_STATUS.CONTACTED, LEAD_STATUS.QUALIFIED].reduce(
            (sum, status) => sum + (leadsByStatus[status]?.value || 0),
            0
          ),
          0
        ),
        byStatus: Object.values(LEAD_STATUS).map((status) => ({
          status,
          count: leadsByStatus[status]?.count || 0,
        })),
      },
      projects: {
        total: projectCount,
        active: activeCount,
        closed: stagesByKey.CLOSED?.count || 0,
        contractValue: round(contractValue, 0),
        byStage: STAGE_ORDER.map((stage) => ({
          stage,
          label: STAGE_LABELS[stage],
          count: stagesByKey[stage]?.count || 0,
        })),
      },
      money: {
        contractValue: round(contractValue, 0),
        received: round(received, 0),
        outstanding: round(outstandingRow[0]?.total || 0, 0),
        collectionPercent: contractValue ? round((received / contractValue) * 100, 1) : 0,
      },
      production: {
        total: Object.values(productionByStage).reduce((sum, count) => sum + count, 0),
        byStage: PRODUCTION_STAGE_ORDER.map((stage) => ({ stage, count: productionByStage[stage] || 0 })),
      },
      alerts: {
        openSnags,
        overdueFollowUps,
        lowStockItems: lowStockCount,
      },
    };
  }

  /** One project, end to end — the closure pack of Step 21. */
  async projectReport(projectId) {
    const id = new mongoose.Types.ObjectId(String(projectId));

    const [project, payments, production, snags] = await Promise.all([
      ProjectModel.findById(projectId).populate('client architect assignedDCM').lean(),
      PaymentModel.aggregate([
        { $match: { project: id, status: 'CLEARED' } },
        { $group: { _id: '$milestone', total: { $sum: '$amount' } } },
      ]),
      ProductionOrderModel.aggregate([
        { $match: { project: id } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      SnagModel.aggregate([{ $match: { project: id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    if (!project) return null;

    const received = payments.reduce((sum, row) => sum + row.total, 0);

    return {
      project,
      payments: {
        byMilestone: payments.map((row) => ({ milestone: row._id, received: round(row.total, 2) })),
        received: round(received, 2),
        outstanding: round(Math.max(0, project.contractValue - received), 2),
      },
      production: production.map((row) => ({ stage: row._id, count: row.count })),
      snags: snags.map((row) => ({ status: row._id, count: row.count })),
    };
  }

  /** Which DCM is converting, and how much they are carrying. */
  async salesPerformance() {
    const rows = await LeadModel.aggregate([
      { $match: { assignedDCM: { $ne: null } } },
      {
        $group: {
          _id: '$assignedDCM',
          leads: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ['$status', LEAD_STATUS.CONVERTED] }, 1, 0] } },
          pipelineValue: { $sum: '$budget' },
        },
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          dcm: '$user.name',
          role: '$user.role',
          leads: 1,
          converted: 1,
          pipelineValue: 1,
          conversionRate: {
            $cond: [{ $eq: ['$leads', 0] }, 0, { $multiply: [{ $divide: ['$converted', '$leads'] }, 100] }],
          },
        },
      },
      { $sort: { converted: -1 } },
    ]);

    return rows.map((row) => ({ ...row, conversionRate: round(row.conversionRate, 1) }));
  }

  /** How much fabric this project actually consumed against what was quoted. */
  async materialConsumption(projectId) {
    const orders = await ProductionOrderModel.find({ project: projectId }).lean();

    const byFabric = new Map();
    orders.forEach((order) => {
      if (!order.fabricName) return;
      const current = byFabric.get(order.fabricName) || { fabric: order.fabricName, meters: 0, pieces: 0 };
      current.meters = round(current.meters + (order.fabricMeters || 0), 2);
      current.pieces += 1;
      byFabric.set(order.fabricName, current);
    });

    return {
      fabrics: [...byFabric.values()],
      totalMeters: round([...byFabric.values()].reduce((sum, f) => sum + f.meters, 0), 2),
      totalBlackout: round(orders.reduce((sum, o) => sum + (o.blackoutMeters || 0), 0), 2),
      totalStitchingRnft: round(orders.reduce((sum, o) => sum + (o.stitchingRnft || 0), 0), 2),
    };
  }

  async #lowStockCount() {
    const rows = await StockModel.find({ reorderLevel: { $gt: 0 } }).lean();
    return rows.filter((row) => row.quantity - row.reserved <= row.reorderLevel).length;
  }
}

export default new ReportsService();
