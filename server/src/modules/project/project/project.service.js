import BaseService from '../../../core/BaseService.js';
import ApiError from '../../../core/ApiError.js';
import { nextCode } from '../../../core/sequence.js';
import projectRepository from './project.repository.js';
import ProjectModel from './project.model.js';
import { evaluateStage, evaluateAllStages } from './project.gates.js';
import notify from '../../notification/notification.service.js';
import {
  PROJECT_STAGE,
  STAGE_LABELS,
  STAGE_ORDER,
  stageIndex,
  nextStage,
  stageProgress,
} from '../../../constants/workflow.constants.js';

/**
 * Owns movement along the spine. Nothing else in the codebase is allowed to write
 * `project.stage` directly — every advance goes through `advanceStage`, so the
 * gates cannot be sidestepped by a well-meaning controller somewhere else.
 */
class ProjectService extends BaseService {
  constructor() {
    super(projectRepository, 'Project');
  }

  async create(data, user) {
    const code = await nextCode('PRJ');
    return this.repository.create({
      ...data,
      code,
      createdBy: user?.id,
      history: [{ action: 'CREATED', to: PROJECT_STAGE.SITE_VISIT, by: user?.id }],
    });
  }

  /** Full workspace payload: the project plus its live gate status. */
  async getWorkspace(id) {
    const project = await ProjectModel.findById(id)
      .populate('client architect assignedDCM projectCoordinator designer executionEngineer installer approvedQuotation');
    if (!project) throw ApiError.notFound('Project not found');

    const timeline = await evaluateAllStages(project);
    const next = nextStage(project.stage);
    const nextGate = next ? await evaluateStage(project, next) : { allowed: false, gates: [] };

    return {
      project: project.toJSON(),
      progress: stageProgress(project.stage),
      stageLabel: STAGE_LABELS[project.stage],
      timeline,
      nextStage: next,
      nextStageLabel: next ? STAGE_LABELS[next] : null,
      canAdvance: nextGate.allowed && !project.isOnHold,
      blockedBy: nextGate.gates.filter((gate) => !gate.passed),
    };
  }

  /** Read-only "why can't I move on?" — used by the UI to explain itself. */
  async getStageStatus(id) {
    const project = await this.#load(id);
    return {
      stage: project.stage,
      stageLabel: STAGE_LABELS[project.stage],
      progress: stageProgress(project.stage),
      timeline: await evaluateAllStages(project),
    };
  }

  /**
   * Moves the project exactly one stage forward, after its gates pass.
   *
   * Skipping is refused deliberately: a project that jumps from Quotation to
   * Production is precisely the failure the ERP exists to prevent.
   */
  async advanceStage(id, { toStage, note } = {}, user) {
    const project = await this.#load(id);

    if (project.isOnHold) {
      throw ApiError.workflow(`Project is on hold: ${project.holdReason || 'no reason recorded'}`);
    }

    const target = toStage || nextStage(project.stage);
    if (!target) throw ApiError.workflow('Project is already at the final stage');
    if (!STAGE_ORDER.includes(target)) throw ApiError.badRequest(`Unknown stage: ${target}`);

    const from = stageIndex(project.stage);
    const to = stageIndex(target);

    if (to <= from) {
      throw ApiError.workflow(
        `Cannot move backwards from ${STAGE_LABELS[project.stage]} to ${STAGE_LABELS[target]}`
      );
    }
    if (to > from + 1) {
      throw ApiError.workflow(
        `Cannot skip stages. ${STAGE_LABELS[STAGE_ORDER[from + 1]]} must be completed first.`
      );
    }

    const { allowed, gates } = await evaluateStage(project, target);
    if (!allowed) {
      throw ApiError.workflow(
        `Cannot move to ${STAGE_LABELS[target]} yet`,
        gates.filter((gate) => !gate.passed).map((gate) => ({ gate: gate.key, message: gate.detail }))
      );
    }

    const previous = project.stage;
    project.stage = target;
    project.history.push({ action: 'STAGE_ADVANCED', from: previous, to: target, note, by: user?.id });

    // Step 10: reaching ACTIVE is what unlocks the factory.
    if (target === PROJECT_STAGE.ACTIVE && !project.isActivated) {
      project.isActivated = true;
      project.activatedAt = new Date();
      project.history.push({ action: 'ACTIVATED', to: PROJECT_STAGE.ACTIVE, by: user?.id });
    }

    if (target === PROJECT_STAGE.CLOSED) {
      project.closedAt = new Date();
    }

    await project.save();

    // Module 19: the point of the spine is that the next department finds out
    // without being telephoned.
    await notify.toProjectTeam(
      project._id,
      {
        type: target === PROJECT_STAGE.ACTIVE ? 'PROJECT_ACTIVATED' : 'STAGE_ADVANCED',
        severity: target === PROJECT_STAGE.ACTIVE ? 'SUCCESS' : 'INFO',
        title: `${project.code} moved to ${STAGE_LABELS[target]}`,
        body: note || `From ${STAGE_LABELS[previous]}.`,
        entityType: 'Project',
        entityId: project._id,
        link: `/projects/${project._id}`,
      },
      user?.id
    );

    return this.getWorkspace(id);
  }

  /**
   * Called by other services when their own work satisfies the next gate — a
   * payment clearing, a BOQ being generated. Silently does nothing if the gate
   * is not actually open, so callers never have to pre-check.
   */
  async tryAutoAdvance(projectId, user, note) {
    const project = await ProjectModel.findById(projectId);
    if (!project || project.isOnHold) return null;

    const target = nextStage(project.stage);
    if (!target) return null;

    const { allowed } = await evaluateStage(project, target);
    if (!allowed) return null;

    return this.advanceStage(projectId, { toStage: target, note: note || 'Auto-advanced' }, user);
  }

  async setHold(id, { isOnHold, reason }, user) {
    const project = await this.#load(id);
    project.isOnHold = Boolean(isOnHold);
    project.holdReason = isOnHold ? reason : undefined;
    project.history.push({
      action: isOnHold ? 'PUT_ON_HOLD' : 'RESUMED',
      note: reason,
      by: user?.id,
    });
    await project.save();
    return project.toJSON();
  }

  async assignTeam(id, assignments, user) {
    const project = await this.#load(id);
    const fields = ['assignedDCM', 'projectCoordinator', 'designer', 'executionEngineer', 'installer'];

    fields.forEach((field) => {
      if (assignments[field] !== undefined) {
        project[field] = assignments[field] || undefined;
        project.history.push({ action: 'ASSIGNED', note: `${field} updated`, by: user?.id });
      }
    });

    await project.save();
    return this.repository.findById(id);
  }

  /** Step 21 — archive the project once installation, snags and money are all clear. */
  async close(id, { signedBy, remarks, attachments } = {}, user) {
    const project = await this.#load(id);

    const { allowed, gates } = await evaluateStage(project, PROJECT_STAGE.CLOSED);
    if (!allowed) {
      throw ApiError.workflow(
        'Project cannot be closed yet',
        gates.filter((gate) => !gate.passed).map((gate) => ({ gate: gate.key, message: gate.detail }))
      );
    }

    project.stage = PROJECT_STAGE.CLOSED;
    project.closedAt = new Date();
    project.clientSignOff = { signedBy, remarks, attachments, signedAt: new Date() };
    project.history.push({ action: 'CLOSED', to: PROJECT_STAGE.CLOSED, note: remarks, by: user?.id });

    await project.save();
    return project.toJSON();
  }

  async #load(id) {
    const project = await ProjectModel.findById(id);
    if (!project) throw ApiError.notFound('Project not found');
    return project;
  }
}

export default new ProjectService();
