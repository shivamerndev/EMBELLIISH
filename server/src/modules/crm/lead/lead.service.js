import BaseService from '../../../core/BaseService.js';
import BaseRepository from '../../../core/BaseRepository.js';
import ApiError from '../../../core/ApiError.js';
import { nextCode } from '../../../core/sequence.js';
import LeadModel from './lead.model.js';
import ClientModel from '../client/client.model.js';
import FollowUpModel from '../followup/followup.model.js';
import projectService from '../../project/project/project.service.js';
import { LEAD_STATUS } from '../../../constants/workflow.constants.js';

const leadRepository = new BaseRepository(LeadModel, {
  filterable: ['status', 'source', 'projectType', 'assignedDCM', 'architect', 'qualifiedBy'],
  searchable: ['clientName', 'companyName', 'phone', 'location', 'code'],
  populate: [
    { path: 'architect', select: 'name firm phone' },
    { path: 'assignedDCM', select: 'name email role' },
  ],
});

/**
 * Steps 1–3 — the call, the qualification conversation, and handing the project
 * to a DCM.
 */
class LeadService extends BaseService {
  constructor() {
    super(leadRepository, 'Lead');
  }

  async create(data, user) {
    return this.repository.create({
      ...data,
      code: await nextCode('LEAD'),
      createdBy: user?.id,
      history: [{ action: 'CREATED', to: LEAD_STATUS.NEW, by: user?.id }],
    });
  }

  /**
   * Step 2 — the Senior DCM has called: how many rooms, what budget, where.
   * Answers are folded back onto the lead so the pipeline reflects real numbers,
   * not the guess taken down on the first call.
   */
  async qualify(id, { qualified, budget, roomCount, location, notes, lostReason }, user) {
    const lead = await this.#load(id);

    if ([LEAD_STATUS.CONVERTED, LEAD_STATUS.LOST].includes(lead.status)) {
      throw ApiError.workflow(`Lead is already ${lead.status.toLowerCase()}`);
    }

    const previous = lead.status;
    lead.status = qualified ? LEAD_STATUS.QUALIFIED : LEAD_STATUS.UNQUALIFIED;
    lead.qualifiedBy = user?.id;
    lead.qualifiedAt = new Date();
    lead.qualificationNotes = notes;

    if (budget !== undefined) lead.budget = budget;
    if (roomCount !== undefined) lead.roomCount = roomCount;
    if (location) lead.location = location;
    if (!qualified) lead.lostReason = lostReason;

    lead.history.push({
      action: qualified ? 'QUALIFIED' : 'DISQUALIFIED',
      from: previous,
      to: lead.status,
      note: notes,
      by: user?.id,
    });

    await lead.save();
    return lead.toJSON();
  }

  /** Step 3 — "Rahul tum ye project handle karo." */
  async assign(id, { assignedDCM, note }, user) {
    const lead = await this.#load(id);

    if (lead.status === LEAD_STATUS.NEW) lead.status = LEAD_STATUS.CONTACTED;
    lead.assignedDCM = assignedDCM;
    lead.assignedAt = new Date();
    lead.history.push({ action: 'ASSIGNED', note, by: user?.id });

    await lead.save();
    return this.repository.findById(id);
  }

  /**
   * Turns a qualified lead into a client and opens their project at the start of
   * the spine. Idempotent by design — a double-click must not create two villas.
   */
  async convert(id, { projectName, siteAddress, estimatedValue } = {}, user) {
    const lead = await this.#load(id);

    if (lead.status === LEAD_STATUS.CONVERTED) {
      throw ApiError.conflict(`Lead ${lead.code} has already been converted`);
    }
    if (lead.status !== LEAD_STATUS.QUALIFIED) {
      throw ApiError.workflow('Only a qualified lead can be converted. Qualify it first.');
    }

    // Reuse an existing client on the same phone rather than duplicating them.
    let client = await ClientModel.findOne({ phone: lead.phone });
    if (!client) {
      client = await ClientModel.create({
        code: await nextCode('CL'),
        name: lead.clientName,
        company: lead.companyName,
        phone: lead.phone,
        email: lead.email,
        architect: lead.architect,
        siteAddress: siteAddress || lead.address,
        billingAddress: siteAddress || lead.address,
        sourceLead: lead._id,
        accountOwner: lead.assignedDCM || user?.id,
      });
    }

    const project = await projectService.create(
      {
        name: projectName || `${lead.clientName} — ${lead.projectType || 'Project'}`,
        client: client._id,
        architect: lead.architect,
        lead: lead._id,
        siteAddress: siteAddress || lead.address,
        projectType: lead.projectType,
        assignedDCM: lead.assignedDCM,
        estimatedValue: estimatedValue ?? lead.budget ?? 0,
      },
      user
    );

    lead.status = LEAD_STATUS.CONVERTED;
    lead.convertedClient = client._id;
    lead.convertedProject = project._id;
    lead.convertedAt = new Date();
    lead.history.push({ action: 'CONVERTED', to: LEAD_STATUS.CONVERTED, note: project.code, by: user?.id });
    await lead.save();

    return { lead: lead.toJSON(), client: client.toJSON(), project };
  }

  async markLost(id, { reason }, user) {
    const lead = await this.#load(id);
    lead.status = LEAD_STATUS.LOST;
    lead.lostReason = reason;
    lead.history.push({ action: 'LOST', to: LEAD_STATUS.LOST, note: reason, by: user?.id });
    await lead.save();
    return lead.toJSON();
  }

  /** Logs a call and schedules the next one in a single step. */
  async addFollowUp(id, data, user) {
    const lead = await this.#load(id);

    const followUp = await FollowUpModel.create({
      ...data,
      lead: lead._id,
      owner: data.owner || lead.assignedDCM || user?.id,
      createdBy: user?.id,
    });

    if (data.nextFollowUpAt) {
      lead.nextFollowUpAt = data.nextFollowUpAt;
      if (lead.status === LEAD_STATUS.NEW) lead.status = LEAD_STATUS.CONTACTED;
      await lead.save();
    }

    return followUp.toJSON();
  }

  /** Pipeline counts by status, for the CRM funnel. */
  async pipeline() {
    const rows = await LeadModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$budget' } } },
      { $project: { _id: 0, status: '$_id', count: 1, value: 1 } },
    ]);

    const byStatus = Object.fromEntries(rows.map((row) => [row.status, row]));
    return Object.values(LEAD_STATUS).map((status) => ({
      status,
      count: byStatus[status]?.count || 0,
      value: byStatus[status]?.value || 0,
    }));
  }

  async #load(id) {
    const lead = await LeadModel.findById(id);
    if (!lead) throw ApiError.notFound('Lead not found');
    return lead;
  }
}

export default new LeadService();
export { leadRepository };
