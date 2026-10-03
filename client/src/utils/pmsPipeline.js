/**
 * Utility helper for managing PMS (Project Management System) pipeline stage transitions,
 * next step routing, stage definitions, and stage progress.
 */

export const PMS_WORKFLOW_STAGES = [
  {
    key: 'projectActivation',
    slug: 'project-activation',
    stepNumber: 1,
    label: 'Project Activation / Advance',
    shortLabel: 'Activation',
    path: '/pms/project-activation',
    desc: 'Project kickoff, advance payment receipt, KYC billing & execution owner assignment',
  },
  {
    key: 'executionSetup',
    slug: 'execution-setup',
    stepNumber: 2,
    label: 'Execution Setup / Context',
    shortLabel: 'Execution Setup',
    path: '/pms/execution-setup',
    desc: 'Design context, site risk assessment, technical feasibility & open site actions',
  },
  {
    key: 'designFinalisation',
    slug: 'design-finalisation',
    stepNumber: 3,
    label: 'Design Finalisation',
    shortLabel: 'Design Signoff',
    path: '/pms/design-finalisation',
    desc: 'Curtain track specs, pelmet recess depth, fabric selection & client sign-off',
  },
  {
    key: 'executionDrawingRequest',
    slug: 'execution-drawing-request',
    stepNumber: 4,
    label: 'Execution Drawing Request',
    shortLabel: 'Drawing Req.',
    path: '/pms/execution-drawing-request',
    desc: 'CAD/technical drawing requisition with site dimensions & motor recess specs',
  },
  {
    key: 'executionDrawingPreparation',
    slug: 'execution-drawing-preparation',
    stepNumber: 5,
    label: 'Execution Drawing Preparation',
    shortLabel: 'Drawing Prep',
    path: '/pms/execution-drawing-preparation',
    desc: 'Elevation, sectional drawings, motor channel wiring & structural approvals',
  },
  {
    key: 'approvals',
    slug: 'approvals',
    stepNumber: 6,
    label: 'Approvals',
    shortLabel: 'Approvals',
    path: '/pms/approvals',
    desc: 'Client design sign-off, measurement sign-off, order sheet & custom sampling approval',
  },
  {
    key: 'changeRevisionControl',
    slug: 'change-revision-control',
    stepNumber: 7,
    label: 'Change / Revision Control',
    shortLabel: 'Revision Control',
    path: '/pms/change-revision-control',
    desc: 'Design revisions, track profile changes, budget & timeline impact tracking',
  },
  {
    key: 'orderSheetFmsCreation',
    slug: 'order-sheet-fms-creation',
    stepNumber: 8,
    label: 'Order Sheet / FMS Creation',
    shortLabel: 'FMS Creation',
    path: '/pms/order-sheet-fms-creation',
    desc: 'Factory Manufacturing Sheet (FMS), cutting & stitching parameters, fabric yardage',
  },
  {
    key: 'procurementRequest',
    slug: 'procurement-request',
    stepNumber: 9,
    label: 'Procurement Request',
    shortLabel: 'Procurement',
    path: '/pms/procurement-request',
    desc: 'Raw material purchasing, Somfy motor orders, fabric supply & warehouse readiness',
  },
  {
    key: 'motorsAccessoriesControl',
    slug: 'motors-accessories-control',
    stepNumber: 10,
    label: 'Motors / Accessories Control',
    shortLabel: 'Motors & HW',
    path: '/pms/motors-accessories-control',
    desc: 'Smart automation motors, RTS remotes, track belts, brackets & wiring inspection',
  },
  {
    key: 'qcStatus',
    slug: 'qc-status',
    stepNumber: 11,
    label: 'Production / QC Status',
    shortLabel: 'QC & Stitching',
    path: '/pms/qc-status',
    desc: 'Fabric stitch inspection, hem drop accuracy, motor dry run test & QC clearance',
  },
  {
    key: 'packingDispatchReadiness',
    slug: 'packing-dispatch-readiness',
    stepNumber: 12,
    label: 'Packing / Dispatch Readiness',
    shortLabel: 'Packing & Ready',
    path: '/pms/packing-dispatch-readiness',
    desc: 'Protective packaging, crate boxing, accessories kit & delivery challan prep',
  },
  {
    key: 'finalPayment',
    slug: 'final-payment',
    stepNumber: 13,
    label: 'Final Payment',
    shortLabel: 'Final Payment',
    path: '/pms/final-payment',
    desc: 'Balance collection, invoice reconciliation, dispatch clearance & ledger settlement',
  },
  {
    key: 'installationScheduling',
    slug: 'installation-scheduling',
    stepNumber: 14,
    label: 'Installation Scheduling',
    shortLabel: 'Scheduling',
    path: '/pms/installation-scheduling',
    desc: 'Site slot confirmation, installation team assignment, site readiness & access pass',
  },
  {
    key: 'installationBriefDispatch',
    slug: 'installation-brief-dispatch',
    stepNumber: 15,
    label: 'Installation Brief / Dispatch',
    shortLabel: 'Site Dispatch',
    path: '/pms/installation-brief-dispatch',
    desc: 'Installer dispatch handover, drapery bundles dispatch, brief signoff & site supervisor',
  },
  {
    key: 'installationExecutionUpdates',
    slug: 'installation-execution-updates',
    stepNumber: 16,
    label: 'Installation Execution Updates',
    shortLabel: 'Daily Updates',
    path: '/pms/installation-execution-updates',
    desc: 'On-site track mounting, motorized limit programming, leveling & daily progress photos',
  },
  {
    key: 'clientExecutionUpdates',
    slug: 'client-execution-updates',
    stepNumber: 17,
    label: 'Client Execution Updates',
    shortLabel: 'Client Updates',
    path: '/pms/client-execution-updates',
    desc: 'Client status communication, milestone reports, completion demonstration & query handling',
  },
  {
    key: 'snagRework',
    slug: 'snag-rework',
    stepNumber: 18,
    label: 'Snag / Rework',
    shortLabel: 'Snag Punchlist',
    path: '/pms/snag-rework',
    desc: 'Post-installation snag punchlist, wave pitch tuning, re-measure & closure verification',
  },
  {
    key: 'maintenance',
    slug: 'maintenance',
    stepNumber: 19,
    label: 'Maintenance & Warranty',
    shortLabel: 'Maintenance',
    path: '/pms/maintenance',
    desc: '5-year Somfy motor & fabric warranty, AMC scheduled visits & ticket support',
  },
  {
    key: 'projectClosure',
    slug: 'project-closure',
    stepNumber: 20,
    label: 'Project Closure',
    shortLabel: 'Closure & Signoff',
    path: '/pms/project-closure',
    desc: 'Final project sign-off, client feedback, delivery handover document & project archive',
  },
];

/**
 * Normalize and find PMS stage index from key or slug or pathname
 */
export const getPmsStageIndex = (stageKeyOrSlugOrPath) => {
  if (!stageKeyOrSlugOrPath) return 0;
  const target = String(stageKeyOrSlugOrPath).toLowerCase().trim();

  return PMS_WORKFLOW_STAGES.findIndex((stage) => {
    if (stage.key.toLowerCase() === target) return true;
    if (stage.slug.toLowerCase() === target) return true;
    if (stage.path.toLowerCase() === target) return true;
    if (target.includes(stage.slug.toLowerCase())) return true;
    return false;
  });
};

export const getPmsStage = (stageKeyOrSlugOrPath) => {
  const idx = getPmsStageIndex(stageKeyOrSlugOrPath);
  return idx !== -1 ? PMS_WORKFLOW_STAGES[idx] : PMS_WORKFLOW_STAGES[0];
};

export const getPmsNextStage = (stageKeyOrSlugOrPath) => {
  const idx = getPmsStageIndex(stageKeyOrSlugOrPath);
  if (idx !== -1 && idx < PMS_WORKFLOW_STAGES.length - 1) {
    return PMS_WORKFLOW_STAGES[idx + 1];
  }
  return PMS_WORKFLOW_STAGES[PMS_WORKFLOW_STAGES.length - 1];
};

export const getPmsPrevStage = (stageKeyOrSlugOrPath) => {
  const idx = getPmsStageIndex(stageKeyOrSlugOrPath);
  if (idx > 0) {
    return PMS_WORKFLOW_STAGES[idx - 1];
  }
  return PMS_WORKFLOW_STAGES[0];
};

export const getPmsNextStageUrl = (stageKeyOrSlugOrPath, projectCode = '') => {
  const next = getPmsNextStage(stageKeyOrSlugOrPath);
  const search = projectCode ? `?search=${encodeURIComponent(projectCode)}` : '';
  return {
    nextStage: next,
    url: `${next.path}${search}`,
  };
};

/**
 * Standard fields for each stage if not passed explicitly in pageFields
 */
export const DEFAULT_STAGE_FIELDS = {
  projectActivation: [
    { key: 'approvedQuote', label: 'Approved Quote', type: 'currency' },
    { key: 'paymentReceipt', label: 'Payment Receipt' },
    { key: 'projectActivationDate', label: 'Activation Date', type: 'date' },
    { key: 'clientApproval', label: 'Client Approval', type: 'badge' },
    { key: 'assignedPcExecutionOwner', label: 'Assigned PC / Execution Owner' },
    { key: 'kycBillingStatus', label: 'KYC / Billing Status', type: 'badge' },
    { key: 'siteDetails', label: 'Site Details' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  executionSetup: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'approvedDesign', label: 'Approved Design' },
    { key: 'approvedQuote', label: 'Approved Quote', type: 'currency' },
    { key: 'clientContext', label: 'Client Context' },
    { key: 'paymentStatus', label: 'Payment Status', type: 'badge' },
    { key: 'executionOwnerPc', label: 'Execution Owner / PC' },
    { key: 'currentOwner', label: 'Current Owner' },
    { key: 'openActions', label: 'Open Actions' },
    { key: 'openRisks', label: 'Open Risks' },
    { key: 'delay', label: 'Delay / SLA', type: 'badge' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  designFinalisation: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'finalDesignStatus', label: 'Final Design Status', type: 'badge' },
    { key: 'designVersion', label: 'Design Version' },
    { key: 'designApprovalDate', label: 'Design Approval Date', type: 'date' },
    { key: 'pendingDesignDecisions', label: 'Pending Decisions' },
    { key: 'clientBrief', label: 'Client Brief' },
    { key: 'approvedProposalQuote', label: 'Proposal Quote Reference' },
    { key: 'fabrics', label: 'Fabrics & Materials' },
    { key: 'designReferences', label: 'Design References' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  executionDrawingRequest: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'requestDate', label: 'Request Date', type: 'date' },
    { key: 'requestedBy', label: 'Requested By' },
    { key: 'drawingRequiredByDate', label: 'Required By Date', type: 'date' },
    { key: 'inputCompletenessStatus', label: 'Input Completeness', type: 'badge' },
    { key: 'drawingVersion', label: 'Drawing Version' },
    { key: 'preparedBy', label: 'Prepared By' },
    { key: 'checkedBy', label: 'Checked By' },
    { key: 'siteDetailSheet', label: 'Site Detail Sheet' },
    { key: 'pelmetMotorChannelDetails', label: 'Pelmet & Motor Specs' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  executionDrawingPreparation: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'structuredRequest', label: 'Structured Request' },
    { key: 'designBrief', label: 'Design Brief' },
    { key: 'siteDetail', label: 'Site Detail' },
    { key: 'sizes', label: 'Sizes / Measurements' },
    { key: 'pelmetChannelMotorDetails', label: 'Pelmet Channel & Motor Details' },
    { key: 'technicalFeasibilityInput', label: 'Technical Feasibility' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  approvals: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'approvedBy', label: 'Approved By' },
    { key: 'approvalDate', label: 'Approval Date', type: 'date' },
    { key: 'status', label: 'Approval Status', type: 'badge' },
    { key: 'revisionReason', label: 'Revision Reason' },
    { key: 'approvedDesign', label: 'Approved Design' },
    { key: 'executionDrawingStatus', label: 'Drawing Status', type: 'badge' },
    { key: 'orderSheet', label: 'Order Sheet Ref' },
    { key: 'measurementStatus', label: 'Measurement Status', type: 'badge' },
    { key: 'customSamplingNeeds', label: 'Custom Sampling' },
    { key: 'currentOwner', label: 'Current Owner' },
  ],
  changeRevisionControl: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'changeRequested', label: 'Change Requested' },
    { key: 'changeDetails', label: 'Change Details' },
    { key: 'costImpact', label: 'Cost Impact' },
    { key: 'timelineImpact', label: 'Timeline Impact' },
    { key: 'approvalStatus', label: 'Approval Status', type: 'badge' },
    { key: 'revisedVersion', label: 'Revised Version' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  orderSheetFmsCreation: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'orderSheetFmsNo', label: 'FMS / Order Sheet No' },
    { key: 'versionCreatedBy', label: 'Version & Creator' },
    { key: 'creationDate', label: 'Creation Date', type: 'date' },
    { key: 'productionReleaseStatusDate', label: 'Production Release' },
    { key: 'roomDetails', label: 'Room Details' },
    { key: 'design', label: 'Design Specs' },
    { key: 'fabric', label: 'Fabric Breakdown' },
    { key: 'motorAccessoryNeeds', label: 'Motor & Accessories' },
    { key: 'stageDates', label: 'Cutting / Stitching Dates' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  procurementRequest: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'approvedOrderSheet', label: 'Approved FMS Sheet' },
    { key: 'procurementStatus', label: 'Procurement Status', type: 'badge' },
    { key: 'materialReadiness', label: 'Material Readiness', type: 'badge' },
    { key: 'expectedMaterialDate', label: 'Expected Date', type: 'date' },
    { key: 'procurementDelayException', label: 'Delay / Exception' },
    { key: 'paymentApprovalIfNeeded', label: 'Payment Approval' },
    { key: 'fabricMaterialList', label: 'Fabric & Material List' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  motorsAccessoriesControl: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'requirement', label: 'Requirement' },
    { key: 'expectedReadinessDate', label: 'Expected Readiness', type: 'date' },
    { key: 'motorType', label: 'Motor Type' },
    { key: 'automationWiringDetails', label: 'Wiring & Power Drop' },
    { key: 'vendorOrder', label: 'Purchase Order No' },
    { key: 'accessoriesList', label: 'Accessories' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  qcStatus: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'qcDoneDate', label: 'QC Date', type: 'date' },
    { key: 'qcDoneBy', label: 'QC Inspector' },
    { key: 'qcStatus', label: 'QC Status', type: 'badge' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  packingDispatchReadiness: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'packingStatus', label: 'Packing Status', type: 'badge' },
    { key: 'dispatchReadinessStatus', label: 'Dispatch Readiness', type: 'badge' },
    { key: 'targetDispatchDate', label: 'Target Dispatch', type: 'date' },
    { key: 'installationDate', label: 'Installation Date', type: 'date' },
    { key: 'packingList', label: 'Packing List' },
    { key: 'accessories', label: 'Accessories Included' },
    { key: 'challan', label: 'Delivery Challan No' },
    { key: 'roomWiseScope', label: 'Room Scope' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  finalPayment: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'invoicePaymentSummary', label: 'Invoice Summary' },
    { key: 'paymentStatus', label: 'Payment Status', type: 'badge' },
    { key: 'paymentClearanceDate', label: 'Clearance Date', type: 'date' },
    { key: 'outstandingAmount', label: 'Outstanding Amount', type: 'currency' },
    { key: 'clientStatus', label: 'Client Status', type: 'badge' },
    { key: 'dispatchReadiness', label: 'Dispatch Clearance', type: 'badge' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  installationScheduling: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'confirmedInstallationDateTime', label: 'Confirmed Date & Time' },
    { key: 'assignedInstallerTeam', label: 'Installer Team' },
    { key: 'clientConfirmationStatus', label: 'Client Confirmation', type: 'badge' },
    { key: 'finalPaymentStatus', label: 'Payment Clearance', type: 'badge' },
    { key: 'qcStatus', label: 'QC Clearance', type: 'badge' },
    { key: 'packingStatus', label: 'Packing Status', type: 'badge' },
    { key: 'siteReadiness', label: 'Site Readiness', type: 'badge' },
    { key: 'challan', label: 'Challan No' },
    { key: 'installerAvailability', label: 'Installer Availability', type: 'badge' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  installationBriefDispatch: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'dispatchDateTime', label: 'Dispatch Date & Time' },
    { key: 'materialHandedOverToReceivedByInstaller', label: 'Handover To Installer' },
    { key: 'installationBriefAcknowledged', label: 'Brief Acknowledged', type: 'badge' },
    { key: 'packingList', label: 'Packing List' },
    { key: 'challan', label: 'Challan No' },
    { key: 'clientSiteContact', label: 'Site Contact' },
    { key: 'motorWiringInfo', label: 'Wiring Info' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  installationExecutionUpdates: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'installationStartDate', label: 'Start Date', type: 'date' },
    { key: 'siteIssueBlocker', label: 'Site Issue / Blocker' },
    { key: 'installationPhotosProof', label: 'Photos & Proof' },
    { key: 'installationBrief', label: 'Brief Followed' },
    { key: 'siteReadiness', label: 'Site Readiness', type: 'badge' },
    { key: 'snag', label: 'Snag / Rework', type: 'badge' },
    { key: 'snagNote', label: 'Snag Note' },
    { key: 'material', label: 'Material Verified' },
    { key: 'tools', label: 'Tools Ready' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  clientExecutionUpdates: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'lastClientUpdateDate', label: 'Last Update Date', type: 'date' },
    { key: 'updatedBy', label: 'Updated By' },
    { key: 'nextUpdateDueDate', label: 'Next Due Date', type: 'date' },
    { key: 'projectStage', label: 'Reported Stage' },
    { key: 'productionStatus', label: 'Production Status', type: 'badge' },
    { key: 'expectedDates', label: 'Expected Dates' },
    { key: 'installationStatus', label: 'Installation Status', type: 'badge' },
    { key: 'clientQueries', label: 'Client Queries & Answers' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  snagRework: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'snagId', label: 'Snag ID' },
    { key: 'snagOwner', label: 'Snag Owner' },
    { key: 'targetClosureDate', label: 'Target Closure', type: 'date' },
    { key: 'snagStatus', label: 'Snag Status', type: 'badge' },
    { key: 'issueReport', label: 'Issue Report' },
    { key: 'closureDate', label: 'Closure Date', type: 'date' },
    { key: 'closureProof', label: 'Closure Proof' },
    { key: 'siteItem', label: 'Site Item' },
    { key: 'clientComplaint', label: 'Client Complaint' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  maintenance: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'ticketId', label: 'Ticket ID' },
    { key: 'requestDate', label: 'Request Date', type: 'date' },
    { key: 'warrantyStatus', label: 'Warranty Status', type: 'badge' },
    { key: 'owner', label: 'Support Owner' },
    { key: 'targetResolutionDate', label: 'Resolution Date', type: 'date' },
    { key: 'closureDate', label: 'Closure Date', type: 'date' },
    { key: 'clientComplaint', label: 'Complaint / Request' },
    { key: 'warrantyMaintenanceContext', label: 'Warranty Scope' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
  projectClosure: [
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'projectClosureDate', label: 'Closure Date', type: 'date' },
    { key: 'approvedBy', label: 'Approved By' },
    { key: 'installationCompletion', label: 'Installation Signoff', type: 'badge' },
    { key: 'clientSignOff', label: 'Client Sign-off', type: 'badge' },
    { key: 'snagStatus', label: 'Snag Status', type: 'badge' },
    { key: 'paymentClosure', label: 'Payment Ledger', type: 'badge' },
    { key: 'challans', label: 'Challans Reconciled' },
    { key: 'finalPhotos', label: 'Media Archive' },
    { key: 'status', label: 'Stage Status', type: 'badge' },
  ],
};
