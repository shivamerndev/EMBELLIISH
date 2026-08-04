import mongoose from 'mongoose';
import LeadModel from '../crm/lead/lead.model.js';
import ProjectModel from '../project/project/project.model.js';
import PaymentModel from '../accounts/payment/payment.model.js';
import InvoiceModel from '../accounts/invoice/invoice.model.js';
import ProductionOrderModel from '../production/production/production.model.js';
import SnagModel from '../project/snag/snag.model.js';
import StockModel from '../inventory/stock/stock.model.js';
import FollowUpModel from '../crm/followup/followup.model.js';
import QuotationModel from '../crm/quotation/quotation.model.js';
import ArchitectModel from '../crm/architect/architect.model.js';
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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

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
      followupsToday,
      meetingsToday,
      pendingQuotationsCount,
      recentFollowUps,
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
      FollowUpModel.countDocuments({ scheduledAt: { $gte: startOfDay, $lte: endOfDay } }),
      FollowUpModel.countDocuments({ type: 'MEETING', scheduledAt: { $gte: startOfDay, $lte: endOfDay } }),
      QuotationModel.countDocuments({ $or: [{ status: { $in: ['DRAFT', 'SENT'] } }, { 'discountApproval.status': 'PENDING' }] }),
      FollowUpModel.find({})
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('lead', 'clientName code')
        .populate('project', 'name code')
        .populate('createdBy', 'name')
        .lean(),
    ]);

    const leadsByStatus = Object.fromEntries(leadRows.map((r) => [r._id, r]));
    const stagesByKey = Object.fromEntries(stageRows.map((r) => [r._id, r]));
    const productionByStage = Object.fromEntries(productionRows.map((r) => [r._id, r.count]));

    const contractValue = stageRows.reduce((sum, row) => sum + (row.value || 0), 0);
    const received = paymentRow[0]?.total || 0;
    const totalLeadsCount = leadRows.reduce((sum, r) => sum + r.count, 0);
    const newLeadsCount = leadsByStatus[LEAD_STATUS.NEW]?.count || 0;
    const wonProjectsCount = leadsByStatus[LEAD_STATUS.CONVERTED]?.count || 0;
    const lostProjectsCount = leadsByStatus[LEAD_STATUS.LOST]?.count || 0;
    const pipelineValue = round(
      [LEAD_STATUS.NEW, LEAD_STATUS.CONTACTED, LEAD_STATUS.QUALIFIED].reduce(
        (sum, status) => sum + (leadsByStatus[status]?.value || 0),
        0
      ),
      0
    );

    return {
      kpis: {
        totalLeads: totalLeadsCount,
        newLeads: newLeadsCount,
        followupToday: followupsToday,
        meetingToday: meetingsToday,
        pendingQuotations: pendingQuotationsCount,
        wonProjects: wonProjectsCount,
        lostProjects: lostProjectsCount,
        revenuePipeline: pipelineValue,
      },
      recentActivities: recentFollowUps,
      leads: {
        total: totalLeadsCount,
        open: [LEAD_STATUS.NEW, LEAD_STATUS.CONTACTED, LEAD_STATUS.QUALIFIED].reduce(
          (sum, status) => sum + (leadsByStatus[status]?.count || 0),
          0
        ),
        converted: wonProjectsCount,
        pipelineValue,
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

  /** Comprehensive analytics covering all 7 report modules */
  async analytics() {
    const [
      leadsByStatus,
      monthlySalesData,
      sourceData,
      architectData,
      dcmData,
      lostReasonsData,
      upcomingRevenueData,
    ] = await Promise.all([
      // 1. Lead Conversion %
      LeadModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            value: { $sum: '$budget' },
          },
        },
      ]),

      // 2. Monthly Sales
      ProjectModel.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            projectsCount: { $sum: 1 },
            contractValue: { $sum: '$contractValue' },
            estimatedValue: { $sum: '$estimatedValue' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
      ]),

      // 3. Lead Source Wise
      LeadModel.aggregate([
        {
          $group: {
            _id: '$source',
            totalLeads: { $sum: 1 },
            converted: { $sum: { $cond: [{ $eq: ['$status', LEAD_STATUS.CONVERTED] }, 1, 0] } },
            lost: { $sum: { $cond: [{ $eq: ['$status', LEAD_STATUS.LOST] }, 1, 0] } },
            pipelineValue: { $sum: '$budget' },
          },
        },
        { $sort: { totalLeads: -1 } },
      ]),

      // 4. Architect Wise Revenue
      LeadModel.aggregate([
        { $match: { architect: { $ne: null } } },
        {
          $group: {
            _id: '$architect',
            leadsCount: { $sum: 1 },
            convertedCount: { $sum: { $cond: [{ $eq: ['$status', LEAD_STATUS.CONVERTED] }, 1, 0] } },
            pipelineValue: { $sum: '$budget' },
          },
        },
        {
          $lookup: {
            from: 'architects',
            localField: '_id',
            foreignField: '_id',
            as: 'architectDetails',
          },
        },
        { $unwind: '$architectDetails' },
        {
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: 'architect',
            as: 'projects',
          },
        },
        {
          $project: {
            _id: 1,
            name: '$architectDetails.name',
            firm: '$architectDetails.firm',
            commissionPercent: '$architectDetails.commissionPercent',
            leadsCount: 1,
            convertedCount: 1,
            pipelineValue: 1,
            projectCount: { $size: '$projects' },
            contractValue: { $sum: '$projects.contractValue' },
          },
        },
        { $sort: { contractValue: -1, pipelineValue: -1 } },
      ]),

      // 5. DCM Wise Performance
      LeadModel.aggregate([
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
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: 'assignedDCM',
            as: 'projects',
          },
        },
        {
          $project: {
            _id: 0,
            dcmId: '$_id',
            dcm: '$user.name',
            role: '$user.role',
            leads: 1,
            converted: 1,
            pipelineValue: 1,
            contractValue: { $sum: '$projects.contractValue' },
            conversionRate: {
              $cond: [{ $eq: ['$leads', 0] }, 0, { $multiply: [{ $divide: ['$converted', '$leads'] }, 100] }],
            },
          },
        },
        { $sort: { converted: -1, contractValue: -1 } },
      ]),

      // 6. Lost Reasons
      LeadModel.aggregate([
        { $match: { status: LEAD_STATUS.LOST } },
        {
          $group: {
            _id: { $ifNull: ['$lostReason', 'Unspecified'] },
            count: { $sum: 1 },
            lostValue: { $sum: '$budget' },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // 7. Upcoming Revenue
      ProjectModel.aggregate([
        { $match: { stage: { $ne: 'CLOSED' } } },
        {
          $group: {
            _id: '$stage',
            count: { $sum: 1 },
            totalContractValue: { $sum: '$contractValue' },
            totalEstimatedValue: { $sum: '$estimatedValue' },
          },
        },
        { $sort: { totalContractValue: -1 } },
      ]),
    ]);

    const statusMap = Object.fromEntries(leadsByStatus.map((r) => [r._id, r]));
    const totalLeads = leadsByStatus.reduce((sum, r) => sum + r.count, 0);
    const convertedLeads = statusMap[LEAD_STATUS.CONVERTED]?.count || 0;
    const lostLeads = statusMap[LEAD_STATUS.LOST]?.count || 0;
    const openLeads = [LEAD_STATUS.NEW, LEAD_STATUS.CONTACTED, LEAD_STATUS.QUALIFIED].reduce(
      (sum, s) => sum + (statusMap[s]?.count || 0),
      0
    );
    const unqualifiedLeads = statusMap[LEAD_STATUS.UNQUALIFIED]?.count || 0;
    const overallConversionRate = totalLeads ? round((convertedLeads / totalLeads) * 100, 1) : 0;

    const monthlyPayments = await PaymentModel.aggregate([
      { $match: { status: 'CLEARED' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$clearedAt' } },
          amountReceived: { $sum: '$amount' },
        },
      },
    ]);
    const paymentsByMonth = Object.fromEntries(monthlyPayments.map((p) => [p._id, p.amountReceived]));

    const formattedMonthlySales = monthlySalesData.map((row) => ({
      month: row._id,
      projectsCount: row.projectsCount,
      contractValue: round(row.contractValue, 0),
      estimatedValue: round(row.estimatedValue, 0),
      receivedAmount: round(paymentsByMonth[row._id] || 0, 0),
    }));

    const formattedSource = sourceData.map((s) => ({
      source: s._id || 'OTHER',
      totalLeads: s.totalLeads,
      converted: s.converted,
      lost: s.lost,
      conversionRate: s.totalLeads ? round((s.converted / s.totalLeads) * 100, 1) : 0,
      pipelineValue: round(s.pipelineValue || 0, 0),
    }));

    const formattedArchitects = architectData.map((a) => ({
      id: a._id,
      name: a.name,
      firm: a.firm || 'Independent',
      commissionPercent: a.commissionPercent || 0,
      leadsCount: a.leadsCount,
      convertedCount: a.convertedCount,
      projectCount: a.projectCount,
      pipelineValue: round(a.pipelineValue || 0, 0),
      contractValue: round(a.contractValue || 0, 0),
      estimatedCommission: round((a.contractValue * (a.commissionPercent || 0)) / 100, 0),
    }));

    const formattedDCM = dcmData.map((d) => ({
      ...d,
      pipelineValue: round(d.pipelineValue || 0, 0),
      contractValue: round(d.contractValue || 0, 0),
      conversionRate: round(d.conversionRate, 1),
    }));

    const totalLostLeadsCount = lostReasonsData.reduce((sum, r) => sum + r.count, 0);
    const formattedLostReasons = lostReasonsData.map((l) => ({
      reason: l._id,
      count: l.count,
      lostValue: round(l.lostValue || 0, 0),
      percentage: totalLostLeadsCount ? round((l.count / totalLostLeadsCount) * 100, 1) : 0,
    }));

    const totalUpcomingRevenue = upcomingRevenueData.reduce((sum, u) => sum + u.totalContractValue, 0);
    const formattedUpcomingRevenue = upcomingRevenueData.map((u) => ({
      stage: u._id,
      label: STAGE_LABELS[u._id] || u._id,
      count: u.count,
      contractValue: round(u.totalContractValue || 0, 0),
      estimatedValue: round(u.totalEstimatedValue || 0, 0),
    }));

    return {
      conversion: {
        totalLeads,
        convertedLeads,
        openLeads,
        lostLeads,
        unqualifiedLeads,
        conversionRate: overallConversionRate,
        byStatus: Object.values(LEAD_STATUS).map((status) => ({
          status,
          count: statusMap[status]?.count || 0,
          value: round(statusMap[status]?.value || 0, 0),
        })),
      },
      monthlySales: formattedMonthlySales,
      leadSourceWise: formattedSource,
      architectWiseRevenue: formattedArchitects,
      dcmWisePerformance: formattedDCM,
      lostReasons: formattedLostReasons,
      upcomingRevenue: {
        totalValue: round(totalUpcomingRevenue, 0),
        byStage: formattedUpcomingRevenue,
      },
    };
  }

  async #lowStockCount() {
    const rows = await StockModel.find({ reorderLevel: { $gt: 0 } }).lean();
    return rows.filter((row) => row.quantity - row.reserved <= row.reorderLevel).length;
  }
}

export default new ReportsService();
