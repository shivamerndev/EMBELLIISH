/**
 * The Embellish operating spine, encoded.
 *
 *   Lead → Qualification → Assign DCM → Site Visit → Measurement → Consumption
 *   Sheet (BOQ) → Design → Quotation → Token → Advance → Activation → Execution
 *   Drawing → Purchase → Inventory → Production → QC → Packing → Dispatch →
 *   Final Payment → Installation → Rework → Closure
 *
 * A project may only advance one stage at a time, and only when that stage's
 * gates are satisfied. The gates are what stop a project from reaching the
 * factory floor before the client has paid the advance.
 */

const PROJECT_STAGE = {
  SITE_VISIT: 'SITE_VISIT',
  MEASUREMENT: 'MEASUREMENT',
  BOQ: 'BOQ',
  DESIGN: 'DESIGN',
  QUOTATION: 'QUOTATION',
  TOKEN_RECEIVED: 'TOKEN_RECEIVED',
  ADVANCE_RECEIVED: 'ADVANCE_RECEIVED',
  ACTIVE: 'ACTIVE',
  EXECUTION_DRAWING: 'EXECUTION_DRAWING',
  PURCHASE: 'PURCHASE',
  MATERIAL_RECEIVED: 'MATERIAL_RECEIVED',
  PRODUCTION: 'PRODUCTION',
  QC: 'QC',
  PACKING: 'PACKING',
  DISPATCH: 'DISPATCH',
  FINAL_PAYMENT: 'FINAL_PAYMENT',
  INSTALLATION: 'INSTALLATION',
  SNAG: 'SNAG',
  CLOSED: 'CLOSED',
};

/** Ordered stage pipeline. Index doubles as progress percentage basis. */
const STAGE_ORDER = [
  PROJECT_STAGE.SITE_VISIT,
  PROJECT_STAGE.MEASUREMENT,
  PROJECT_STAGE.BOQ,
  PROJECT_STAGE.DESIGN,
  PROJECT_STAGE.QUOTATION,
  PROJECT_STAGE.TOKEN_RECEIVED,
  PROJECT_STAGE.ADVANCE_RECEIVED,
  PROJECT_STAGE.ACTIVE,
  PROJECT_STAGE.EXECUTION_DRAWING,
  PROJECT_STAGE.PURCHASE,
  PROJECT_STAGE.MATERIAL_RECEIVED,
  PROJECT_STAGE.PRODUCTION,
  PROJECT_STAGE.QC,
  PROJECT_STAGE.PACKING,
  PROJECT_STAGE.DISPATCH,
  PROJECT_STAGE.FINAL_PAYMENT,
  PROJECT_STAGE.INSTALLATION,
  PROJECT_STAGE.SNAG,
  PROJECT_STAGE.CLOSED,
];

const STAGE_LABELS = {
  [PROJECT_STAGE.SITE_VISIT]: 'Site Visit',
  [PROJECT_STAGE.MEASUREMENT]: 'Measurement Sheet',
  [PROJECT_STAGE.BOQ]: 'Consumption Sheet (BOQ)',
  [PROJECT_STAGE.DESIGN]: 'Design Finalisation',
  [PROJECT_STAGE.QUOTATION]: 'Quotation',
  [PROJECT_STAGE.TOKEN_RECEIVED]: 'Token Received',
  [PROJECT_STAGE.ADVANCE_RECEIVED]: 'Advance Received',
  [PROJECT_STAGE.ACTIVE]: 'Project Active',
  [PROJECT_STAGE.EXECUTION_DRAWING]: 'Execution Drawing',
  [PROJECT_STAGE.PURCHASE]: 'Purchase',
  [PROJECT_STAGE.MATERIAL_RECEIVED]: 'Material Received',
  [PROJECT_STAGE.PRODUCTION]: 'Factory Production',
  [PROJECT_STAGE.QC]: 'Quality Check',
  [PROJECT_STAGE.PACKING]: 'Packing',
  [PROJECT_STAGE.DISPATCH]: 'Dispatch',
  [PROJECT_STAGE.FINAL_PAYMENT]: 'Final Payment',
  [PROJECT_STAGE.INSTALLATION]: 'Installation',
  [PROJECT_STAGE.SNAG]: 'Snag / Rework',
  [PROJECT_STAGE.CLOSED]: 'Closed',
};

/**
 * Gate keys checked before entering a stage. Each key maps to a checker in
 * project.gates.js — keeping the rules declarative here and the queries there.
 */
const STAGE_GATES = {
  [PROJECT_STAGE.MEASUREMENT]: ['siteVisitDone'],
  [PROJECT_STAGE.BOQ]: ['hasMeasurements'],
  [PROJECT_STAGE.DESIGN]: ['boqGenerated'],
  [PROJECT_STAGE.QUOTATION]: ['boqGenerated'],
  [PROJECT_STAGE.TOKEN_RECEIVED]: ['quotationApproved', 'tokenPaid'],
  [PROJECT_STAGE.ADVANCE_RECEIVED]: ['advancePaid'],
  // Step 10: token + advance + design + measurement, all four, before Active.
  [PROJECT_STAGE.ACTIVE]: ['tokenPaid', 'advancePaid', 'designApproved', 'hasMeasurements'],
  [PROJECT_STAGE.EXECUTION_DRAWING]: ['projectActivated'],
  [PROJECT_STAGE.PURCHASE]: ['drawingApproved'],
  [PROJECT_STAGE.MATERIAL_RECEIVED]: ['materialAvailable'],
  // Step 4: "Ready Size confirm bina stitching nahi." Nothing is cut against an
  // unsigned finished size, whatever else is ready.
  [PROJECT_STAGE.PRODUCTION]: ['projectActivated', 'materialAvailable', 'readySizeConfirmed'],
  [PROJECT_STAGE.QC]: ['productionComplete'],
  [PROJECT_STAGE.PACKING]: ['qcPassed'],
  [PROJECT_STAGE.DISPATCH]: ['packingComplete'],
  [PROJECT_STAGE.FINAL_PAYMENT]: ['packingComplete'],
  // Step 18: no balance, no installation.
  [PROJECT_STAGE.INSTALLATION]: ['balanceCleared'],
  [PROJECT_STAGE.CLOSED]: ['installationComplete', 'snagsResolved', 'fullyPaid'],
};

/** Payment milestones from Steps 9, 10 and 18. */
const PAYMENT_MILESTONE = {
  TOKEN: 'TOKEN',
  ADVANCE: 'ADVANCE',
  BALANCE: 'BALANCE',
};

const PAYMENT_SCHEDULE = {
  [PAYMENT_MILESTONE.TOKEN]: 10,
  [PAYMENT_MILESTONE.ADVANCE]: 60,
  [PAYMENT_MILESTONE.BALANCE]: 30,
};

/**
 * Milestone demands are raised in whole rupees, so 10% + 60% + 30% of an
 * unrounded contract value can land a fraction short of it. A rupee of slack
 * keeps that arithmetic artefact from holding a fully paid project open.
 * Shared by the workflow gates and the accounts summary so the two never disagree.
 */
const PAYMENT_TOLERANCE = 1;

const isSettled = (received, due) => (received || 0) >= (due || 0) - PAYMENT_TOLERANCE;

/** Step 15: every stage on the factory floor updates the ERP. */
const PRODUCTION_STAGE = {
  PENDING: 'PENDING',
  FABRIC_CUTTING: 'FABRIC_CUTTING',
  EMBROIDERY: 'EMBROIDERY',
  HAND_WORK: 'HAND_WORK',
  STITCHING: 'STITCHING',
  CHECKING: 'CHECKING',
  PACKING: 'PACKING',
  COMPLETED: 'COMPLETED',
};

const PRODUCTION_STAGE_ORDER = [
  PRODUCTION_STAGE.PENDING,
  PRODUCTION_STAGE.FABRIC_CUTTING,
  PRODUCTION_STAGE.EMBROIDERY,
  PRODUCTION_STAGE.HAND_WORK,
  PRODUCTION_STAGE.STITCHING,
  PRODUCTION_STAGE.CHECKING,
  PRODUCTION_STAGE.PACKING,
  PRODUCTION_STAGE.COMPLETED,
];

const LEAD_STATUS = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  UNQUALIFIED: 'UNQUALIFIED',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST',
};

const APPROVAL_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REVISED: 'REVISED',
};

const QC_RESULT = { PASS: 'PASS', FAIL: 'FAIL' };

const SNAG_STATUS = {
  OPEN: 'OPEN',
  IN_REWORK: 'IN_REWORK',
  READY: 'READY',
  CLOSED: 'CLOSED',
};

const stageIndex = (stage) => STAGE_ORDER.indexOf(stage);

/** True when `stage` is at or beyond `target` in the pipeline. */
const stageAtLeast = (stage, target) => stageIndex(stage) >= stageIndex(target);

const nextStage = (stage) => STAGE_ORDER[stageIndex(stage) + 1] ?? null;

const stageProgress = (stage) => {
  const idx = stageIndex(stage);
  if (idx < 0) return 0;
  return Math.round((idx / (STAGE_ORDER.length - 1)) * 100);
};

export {
  PROJECT_STAGE,
  STAGE_ORDER,
  STAGE_LABELS,
  STAGE_GATES,
  PAYMENT_MILESTONE,
  PAYMENT_SCHEDULE,
  PAYMENT_TOLERANCE,
  isSettled,
  PRODUCTION_STAGE,
  PRODUCTION_STAGE_ORDER,
  LEAD_STATUS,
  APPROVAL_STATUS,
  QC_RESULT,
  SNAG_STATUS,
  stageIndex,
  stageAtLeast,
  nextStage,
  stageProgress,
};
