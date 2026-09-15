import LeadModel from '../crm/lead/lead.model.js';
import ArchitectModel from '../crm/architect/architect.model.js';
import { round } from '../../services/consumption.service.js';
import { LEAD_STATUS } from '../../constants/workflow.constants.js';

/**
 * Read-only roll-ups for the CRM & Sales pipeline.
 * Only queries models that still exist after the cleanup.
 */
class ReportsService {
  /** Headline dashboard: pipeline snapshot and overdue counts. */
  async dashboard() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [leadRows, overdueLeadsCount, followupsToday, recentLeads] = await Promise.all([
      // Pipeline counts & value bucketed by status
      LeadModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$budget' } } },
      ]),
      // Delayed/overdue = leads with a nextFollowUpAt that has passed
      LeadModel.countDocuments({
        nextFollowUpAt: { $lt: new Date() },
        status: { $nin: [LEAD_STATUS.CONVERTED, LEAD_STATUS.LOST] },
      }),
      // Follow-ups scheduled today (leads updated today)
      LeadModel.countDocuments({
        nextFollowUpAt: { $gte: startOfDay, $lte: endOfDay },
      }),
      // 6 most recently touched leads as the activity feed
      LeadModel.find({})
        .sort({ updatedAt: -1 })
        .limit(6)
        .populate('assignedDCM', 'name')
        .lean(),
    ]);

    const leadsByStatus = Object.fromEntries(leadRows.map((r) => [r._id, r]));
    const totalLeadsCount = leadRows.reduce((sum, r) => sum + r.count, 0);
    const wonProjectsCount = leadsByStatus[LEAD_STATUS.CONVERTED]?.count || 0;
    const lostProjectsCount = leadsByStatus[LEAD_STATUS.LOST]?.count || 0;
    const pipelineValue = round(
      [LEAD_STATUS.NEW, LEAD_STATUS.CONTACTED, LEAD_STATUS.QUALIFIED].reduce(
        (sum, status) => sum + (leadsByStatus[status]?.value || 0),
        0
      ),
      0
    );

    // Shape recent leads as generic "activities" the Dashboard card expects
    const recentActivities = recentLeads.map((lead) => ({
      _id: lead._id,
      type: lead.status,
      subject: lead.clientName,
      notes: lead.location || lead.source || '',
      status: lead.status,
      createdAt: lead.updatedAt,
      lead: { clientName: lead.clientName, code: lead.code },
    }));

    return {
      kpis: {
        totalLeads: totalLeadsCount,
        newLeads: leadsByStatus[LEAD_STATUS.NEW]?.count || 0,
        followupToday: followupsToday,
        meetingToday: 0, // Meetings now tracked as lead stage transitions, not a separate model
        pendingQuotations: 0, // Quotations module removed; tracked in Sales Commercials stages
        wonProjects: wonProjectsCount,
        lostProjects: lostProjectsCount,
        revenuePipeline: pipelineValue,
      },
      recentActivities,
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
      alerts: {
        overdueFollowUps: overdueLeadsCount,
      },
    };
  }
}

export default new ReportsService();
