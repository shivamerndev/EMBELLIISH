import {
  PROJECT_STAGE,
  STAGE_GATES,
  STAGE_LABELS,
  PAYMENT_MILESTONE,
  APPROVAL_STATUS,
  PRODUCTION_STAGE,
  SNAG_STATUS,
  stageIndex,
  isSettled,
} from '../../../constants/workflow.constants.js';

import Measurement from '../measurement/measurement.model.js';
import SiteVisit from '../sitevisit/sitevisit.model.js';
import BOQ from '../boq/boq.model.js';
import Design from '../design/design.model.js';
import Drawing from '../drawing/drawing.model.js';
import Installation from '../installation/installation.model.js';
import Snag from '../snag/snag.model.js';
import Quotation from '../../crm/quotation/quotation.model.js';
import Payment from '../../accounts/payment/payment.model.js';
import ProductionOrder from '../../production/production/production.model.js';
import PackingBox from '../../production/packing/packing.model.js';

/**
 * The gate checks behind the stage machine.
 *
 * `STAGE_GATES` in workflow.constants.js says *which* conditions a stage needs;
 * this file says *how* each condition is answered. Keeping them apart means the
 * business rules stay readable as a list, and the queries stay testable one by one.
 *
 * Every checker returns `{ passed, detail }` so a refusal can tell the user which
 * specific thing is missing rather than "not allowed".
 */

const money = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

/** Total cleared money against a milestone. Pending cheques deliberately do not count. */
const clearedTotal = async (projectId, milestone) => {
  const [row] = await Payment.aggregate([
    {
      $match: {
        project: projectId,
        milestone,
        status: 'CLEARED',
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return row?.total || 0;
};

const milestoneGate = (milestone, percentKey, label) => async (project) => {
  if (!project.contractValue) {
    return {
      passed: false,
      detail: 'No approved quotation yet, so there is no contract value to bill against',
    };
  }

  const percent = project.paymentSchedule?.[percentKey] ?? 0;
  const due = Math.round((project.contractValue * percent) / 100);
  const received = await clearedTotal(project._id, milestone);

  return {
    passed: isSettled(received, due),
    detail: isSettled(received, due)
      ? `${label} of ${money(due)} received`
      : `${label} short by ${money(due - received)} (${money(received)} of ${money(due)} cleared)`,
    meta: { due, received, percent },
  };
};

const GATE_CHECKS = {
  siteVisitDone: async (project) => {
    const count = await SiteVisit.countDocuments({ project: project._id, status: 'COMPLETED' });
    return {
      passed: count > 0,
      detail: count > 0 ? `${count} completed site visit(s)` : 'No completed site visit recorded',
    };
  },

  hasMeasurements: async (project) => {
    const count = await Measurement.countDocuments({ project: project._id });
    return {
      passed: count > 0,
      detail: count > 0 ? `${count} window(s) measured` : 'No window measurements entered',
    };
  },

  /**
   * Step 4 — the finished size is signed off for every window.
   *
   * This is the gate the FRD keeps coming back to: a curtain cut to the window
   * opening instead of the floor-touch drop is scrap, and the ERP exists partly
   * to make that impossible.
   */
  readySizeConfirmed: async (project) => {
    const { readySizeStatus } = await import('../measurement/readysize.service.js');
    const { total, pending, pendingWindows } = await readySizeStatus(project._id);

    if (total === 0) return { passed: false, detail: 'No windows measured yet' };

    const names = pendingWindows
      .slice(0, 5)
      .map((w) => w.label || 'window')
      .join(', ');

    return {
      passed: pending === 0,
      detail:
        pending === 0
          ? `Ready size confirmed for all ${total} window(s)`
          : `${pending} of ${total} window(s) awaiting ready-size sign-off: ${names}${pending > 5 ? '…' : ''}`,
      meta: { total, pending },
    };
  },

  boqGenerated: async (project) => {
    const boq = await BOQ.findOne({ project: project._id, isCurrent: true }).lean();
    return {
      passed: Boolean(boq),
      detail: boq ? `Consumption sheet ${boq.code} (rev ${boq.revision})` : 'No consumption sheet generated',
    };
  },

  quotationApproved: async (project) => {
    const quotation = await Quotation.findOne({
      project: project._id,
      status: APPROVAL_STATUS.APPROVED,
    }).lean();
    return {
      passed: Boolean(quotation),
      detail: quotation ? `Quotation ${quotation.code} approved` : 'No approved quotation',
    };
  },

  designApproved: async (project) => {
    const approved = await Design.countDocuments({
      project: project._id,
      isCurrent: true,
      status: APPROVAL_STATUS.APPROVED,
    });
    const total = await Design.countDocuments({ project: project._id, isCurrent: true });
    return {
      passed: total > 0 && approved === total,
      detail:
        total === 0
          ? 'No designs created yet'
          : `${approved} of ${total} current design(s) approved by the client`,
    };
  },

  tokenPaid: milestoneGate(PAYMENT_MILESTONE.TOKEN, 'tokenPercent', 'Token'),
  advancePaid: milestoneGate(PAYMENT_MILESTONE.ADVANCE, 'advancePercent', 'Advance'),
  balanceCleared: milestoneGate(PAYMENT_MILESTONE.BALANCE, 'balancePercent', 'Balance'),

  fullyPaid: async (project) => {
    const [row] = await Payment.aggregate([
      { $match: { project: project._id, status: 'CLEARED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const received = row?.total || 0;
    const settled = isSettled(received, project.contractValue);
    return {
      passed: settled,
      detail: settled
        ? `Fully paid — ${money(received)} received`
        : `${money(project.contractValue - received)} still outstanding`,
      meta: { received, contractValue: project.contractValue },
    };
  },

  projectActivated: async (project) => ({
    passed: Boolean(project.isActivated),
    detail: project.isActivated ? 'Project is active' : 'Project has not been activated',
  }),

  drawingApproved: async (project) => {
    const approved = await Drawing.countDocuments({
      project: project._id,
      isCurrent: true,
      status: APPROVAL_STATUS.APPROVED,
    });
    return {
      passed: approved > 0,
      detail: approved > 0 ? `${approved} approved execution drawing(s)` : 'No approved execution drawing',
    };
  },

  /**
   * Material is "available" once nothing is still short. Purchase can legitimately
   * be a no-op when the warehouse already holds enough, which is exactly the
   * Step 13 question, so an empty shortage list passes.
   */
  materialAvailable: async (project) => {
    const { shortages } = await import('../../inventory/stock/stock.service.js').then((m) =>
      m.default.checkProjectAvailability(project._id)
    );
    return {
      passed: shortages.length === 0,
      detail:
        shortages.length === 0
          ? 'All material available in stock'
          : `${shortages.length} item(s) short: ${shortages.map((s) => s.itemName).join(', ')}`,
      meta: { shortages },
    };
  },

  productionComplete: async (project) => {
    const total = await ProductionOrder.countDocuments({ project: project._id });
    const done = await ProductionOrder.countDocuments({
      project: project._id,
      stage: { $in: [PRODUCTION_STAGE.CHECKING, PRODUCTION_STAGE.PACKING, PRODUCTION_STAGE.COMPLETED] },
    });
    return {
      passed: total > 0 && done === total,
      detail:
        total === 0
          ? 'No production orders created'
          : `${done} of ${total} work order(s) off the stitching floor`,
    };
  },

  qcPassed: async (project) => {
    const total = await ProductionOrder.countDocuments({ project: project._id });
    const passed = await ProductionOrder.countDocuments({ project: project._id, qcStatus: 'PASS' });
    return {
      passed: total > 0 && passed === total,
      detail:
        total === 0 ? 'No production orders to check' : `${passed} of ${total} piece(s) passed QC`,
    };
  },

  packingComplete: async (project) => {
    const boxes = await PackingBox.countDocuments({ project: project._id });
    const unpacked = await ProductionOrder.countDocuments({
      project: project._id,
      qcStatus: 'PASS',
      packingBox: { $exists: false },
    });
    return {
      passed: boxes > 0 && unpacked === 0,
      detail:
        boxes === 0
          ? 'Nothing packed yet'
          : unpacked === 0
            ? `${boxes} box(es) packed`
            : `${unpacked} passed piece(s) not yet in a box`,
    };
  },

  installationComplete: async (project) => {
    const total = await Installation.countDocuments({ project: project._id });
    const done = await Installation.countDocuments({ project: project._id, status: 'COMPLETED' });
    return {
      passed: total > 0 && done === total,
      detail:
        total === 0 ? 'No installation recorded' : `${done} of ${total} installation visit(s) complete`,
    };
  },

  snagsResolved: async (project) => {
    const open = await Snag.countDocuments({
      project: project._id,
      status: { $ne: SNAG_STATUS.CLOSED },
    });
    return {
      passed: open === 0,
      detail: open === 0 ? 'No open snags' : `${open} snag ticket(s) still open`,
    };
  },
};

/**
 * Evaluates every gate guarding entry into `stage`.
 *
 * @returns {{ allowed: boolean, gates: Array<{key, passed, detail}> }}
 */
const evaluateStage = async (project, stage) => {
  const required = STAGE_GATES[stage] || [];

  const gates = await Promise.all(
    required.map(async (key) => {
      const check = GATE_CHECKS[key];
      if (!check) return { key, passed: true, detail: 'No check configured' };
      const result = await check(project);
      return { key, ...result };
    })
  );

  return { allowed: gates.every((gate) => gate.passed), gates };
};

/**
 * The whole spine with each stage's status — what the project timeline renders.
 * Stages already behind the project are reported as done without re-querying.
 */
const evaluateAllStages = async (project) => {
  const current = stageIndex(project.stage);

  return Promise.all(
    Object.values(PROJECT_STAGE).map(async (stage) => {
      const idx = stageIndex(stage);
      const label = STAGE_LABELS[stage];

      if (idx <= current) {
        return { stage, label, status: idx === current ? 'CURRENT' : 'DONE', gates: [] };
      }

      const { allowed, gates } = await evaluateStage(project, stage);
      return {
        stage,
        label,
        status: idx === current + 1 && allowed ? 'READY' : 'BLOCKED',
        gates,
      };
    })
  );
};

export { GATE_CHECKS, evaluateStage, evaluateAllStages, clearedTotal };
