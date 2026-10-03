import ApiError from '../../core/ApiError.js';
import PmsItem from './pms.model.js';
import {
  normalizeStageNames,
  findItemsByStage,
  findItemById,
  createItem,
  updateItem,
  deleteItem,
  findItemsByProject,
  syncApprovedLeads,
  getPipelineStatistics,
} from './pms.repo.js';

export const PMS_STAGES_CONFIG = [
  { key: 'projectActivation', slug: 'project-activation', label: 'Project Activation / Advance' },
  { key: 'executionSetup', slug: 'execution-setup', label: 'Execution Setup / Project Context' },
  { key: 'designFinalisation', slug: 'design-finalisation', label: 'Design Finalisation' },
  { key: 'executionDrawingRequest', slug: 'execution-drawing-request', label: 'Execution Drawing Request' },
  { key: 'executionDrawingPreparation', slug: 'execution-drawing-preparation', label: 'Execution Drawing Preparation' },
  { key: 'approvals', slug: 'approvals', label: 'Approvals' },
  { key: 'changeRevisionControl', slug: 'change-revision-control', label: 'Change / Revision Control' },
  { key: 'orderSheetFmsCreation', slug: 'order-sheet-fms-creation', label: 'Order Sheet / FMS Creation' },
  { key: 'procurementRequest', slug: 'procurement-request', label: 'Procurement Request' },
  { key: 'motorsAccessoriesControl', slug: 'motors-accessories-control', label: 'Motors / Accessories Control' },
  { key: 'qcStatus', slug: 'qc-status', label: 'Production / QC Status' },
  { key: 'packingDispatchReadiness', slug: 'packing-dispatch-readiness', label: 'Packing / Dispatch Readiness' },
  { key: 'finalPayment', slug: 'final-payment', label: 'Final Payment' },
  { key: 'installationScheduling', slug: 'installation-scheduling', label: 'Installation Scheduling' },
  { key: 'installationBriefDispatch', slug: 'installation-brief-dispatch', label: 'Installation Brief / Dispatch to Site' },
  { key: 'installationExecutionUpdates', slug: 'installation-execution-updates', label: 'Installation Execution / Daily Updates' },
  { key: 'clientExecutionUpdates', slug: 'client-execution-updates', label: 'Client Execution Updates' },
  { key: 'snagRework', slug: 'snag-rework', label: 'Snag / Rework' },
  { key: 'projectClosure', slug: 'project-closure', label: 'Project Closure' },
  { key: 'maintenance', slug: 'maintenance', label: 'Maintenance' },
];

/**
 * Generates smart carried-forward defaults for the next unlocked PMS stage.
 */
const getCarriedForwardStageDefaults = (nextKey, baseData) => {
  const defaults = {};
  const owner = baseData.currentOwner || baseData.assignedPcExecutionOwner || 'Execution Lead';
  const site = baseData.siteDetails || 'Site access verified';
  const quote = baseData.approvedQuote || '₹4,50,000';

  switch (nextKey) {
    case 'executionSetup':
      defaults.approvedDesign = baseData.approvedDesign || 'Approved Design Layout v1.0';
      defaults.approvedQuote = quote;
      defaults.clientContext = 'Design context, scope and site feasibility verified';
      defaults.paymentStatus = 'Complete';
      defaults.openActions = 'Finalize site laser measurements';
      defaults.executionOwnerPc = owner;
      defaults.openRisks = 'None identified';
      break;

    case 'designFinalisation':
      defaults.designVersion = 'v1.0';
      defaults.finalDesignStatus = 'Approved';
      defaults.approvedProposalQuote = quote;
      defaults.clientBrief = 'Custom motorized wave curtains & recess layout per client brief';
      defaults.pendingDesignDecisions = 'Pelmet recess depth confirmed';
      defaults.fabrics = 'Premium Belgian Sheer + Blackout Velvet';
      break;

    case 'executionDrawingRequest':
      defaults.requestedBy = owner;
      defaults.drawingVersion = 'v1.0';
      defaults.siteDetailSheet = `${site} - Laser Measurements Attached`;
      defaults.inputCompletenessStatus = 'Complete';
      defaults.drawingDueDate = new Date(Date.now() + 5 * 86400000);
      defaults.readyHeightStatus = 'Ready';
      defaults.pptDesignBrief = 'Motor recess & track layout brief';
      break;

    case 'executionDrawingPreparation':
      defaults.preparedBy = owner;
      defaults.checkedBy = 'Senior Technical Lead';
      defaults.drawingVersion = 'v1.0';
      defaults.elevationDrawing = 'Elevations confirmed';
      defaults.bracketPlacement = 'Standard heavy-duty ceiling brackets';
      defaults.drawingDueDate = new Date(Date.now() + 5 * 86400000);
      break;

    case 'approvals':
      defaults.designApprovalStatus = 'Approved';
      defaults.measurementApprovalStatus = 'Approved';
      defaults.clientSignoffStatus = 'Approved';
      defaults.approverName = baseData.clientName;
      defaults.approvalDate = new Date();
      break;

    case 'changeRevisionControl':
      defaults.revisionReason = 'Initial approved specification locked';
      defaults.changeStatus = 'Normal';
      defaults.costImpact = '₹0';
      defaults.timelineImpact = '0 Days';
      break;

    case 'orderSheetFmsCreation':
      defaults.fmsNumber = `FMS-${(baseData.code || 'PRJ').replace(/[^a-zA-Z0-9]/g, '')}`;
      defaults.fabricDetails = 'Cutting & stitching parameters allocated';
      defaults.fabricStatus = 'Reserved in Warehouse';
      defaults.stitchingType = 'Wave Pleat (80mm fullness)';
      break;

    case 'procurementRequest':
      defaults.supplier = 'Somfy Motors & Approved Fabric Mills';
      defaults.procurementStatus = 'Order Placed';
      defaults.estimatedDeliveryDate = new Date(Date.now() + 6 * 86400000);
      defaults.poReference = `PO-${Date.now().toString().slice(-4)}`;
      break;

    case 'motorsAccessoriesControl':
      defaults.motorBrand = 'Somfy Glydea Ultra 60 RTS';
      defaults.motorQuantity = 4;
      defaults.accessoriesStatus = 'Ready for Assembly';
      defaults.remoteType = 'Telis 4 RTS Pure';
      defaults.wiringDetails = 'Left-side 230V live power point verified';
      break;

    case 'qcStatus':
      defaults.qcInspector = owner;
      defaults.qcResult = 'Passed';
      defaults.stitchQuality = 'Inspected & Passed';
      defaults.motorTesting = 'Functional & Silent';
      break;

    case 'packingDispatchReadiness':
      defaults.packingStatus = 'Packed with protective sleeve';
      defaults.dispatchAddress = site;
      defaults.boxCount = 3;
      defaults.dispatchReadiness = 'Ready for Dispatch';
      break;

    case 'finalPayment':
      defaults.paymentStatus = 'Pending';
      defaults.totalAmount = quote;
      defaults.receivedAmount = quote;
      defaults.balanceAmount = '₹0';
      defaults.paymentMode = 'NEFT / Wire Transfer';
      break;

    case 'installationScheduling':
      defaults.installerTeam = 'Primary Installation Crew';
      defaults.leadInstaller = owner;
      defaults.siteAddress = site;
      defaults.scheduledDate = new Date(Date.now() + 5 * 86400000);
      defaults.clientConfirmation = 'Confirmed';
      break;

    case 'installationBriefDispatch':
      defaults.briefStatus = 'Brief Dispatched to Team';
      defaults.challanNumber = `CH-${Date.now().toString().slice(-4)}`;
      defaults.dispatchStatus = 'Dispatched to Site';
      defaults.siteContact = site;
      break;

    case 'installationExecutionUpdates':
      defaults.siteReadiness = 'Ready';
      defaults.installationStartDate = new Date();
      defaults.installedTracksCount = 'All tracks fitted';
      defaults.motorCommissioned = 'Yes';
      break;

    case 'clientExecutionUpdates':
      defaults.lastClientUpdateDate = new Date();
      defaults.projectStage = 'Installation in Progress';
      defaults.clientFeedback = 'Client satisfied with progress';
      break;

    case 'snagRework':
      defaults.snagOwner = owner;
      defaults.snagStatus = 'No Major Snags';
      defaults.reworkRequired = 'No';
      defaults.closureDate = new Date(Date.now() + 3 * 86400000);
      break;

    case 'maintenance':
      defaults.warrantyStatus = 'Active (5-Year Somfy & Fabric Coverage)';
      defaults.owner = owner;
      defaults.ticketId = `TKT-${(baseData.code || 'PRJ').replace(/[^a-zA-Z0-9]/g, '')}`;
      defaults.requestDate = new Date();
      defaults.amcSchedule = 'Preventive visit in 6 months';
      defaults.clientComplaint = baseData.maintenanceDetails || 'Maintenance requested from Project Closure';
      defaults.warrantyMaintenanceContext = baseData.maintenanceDetails || 'Standard warranty & AMC coverage';
      break;

    case 'projectClosure':
      defaults.approvedBy = baseData.clientName;
      defaults.installationCompletion = 'Completed';
      defaults.clientSignOff = 'Signed';
      defaults.snagStatus = 'Closed';
      defaults.paymentClosure = 'Closed';
      defaults.projectClosureDate = new Date();
      defaults.maintenanceRequired = 'No';
      defaults.maintenanceDetails = '';
      break;

    default:
      break;
  }

  return defaults;
};

/**
 * Automatically unlocks and advances a project into the next PMS stage
 * when current stage is completed.
 */
export const autoAdvanceToNextStage = async (stageStr, currentItem, payload = {}, userId) => {
  const { key: currentKey, slug: currentSlug } = normalizeStageNames(stageStr);
  const currentIndex = PMS_STAGES_CONFIG.findIndex(
    (s) => s.key === currentKey || s.slug === currentSlug
  );

  // If current stage is projectClosure, transition to maintenance is strictly based on maintenanceRequired
  if (currentKey === 'projectClosure' || currentSlug === 'project-closure') {
    const isMnt = String(payload.maintenanceRequired ?? currentItem.maintenanceRequired ?? '').toLowerCase() === 'yes';
    if (!isMnt) {
      // If maintenance is not required, ensure any maintenance record for this lead/project is removed
      const leadId = currentItem.lead?._id || currentItem.lead;
      const projectCode = currentItem.code || payload.code;
      await PmsItem.deleteMany({
        $and: [
          {
            $or: [
              ...(leadId ? [{ lead: leadId }] : []),
              ...(projectCode ? [{ code: projectCode }] : []),
            ],
          },
          {
            $or: [
              { stageKey: 'maintenance' },
              { stageSlug: 'maintenance' },
              { stage: 'maintenance' },
            ],
          },
        ],
      });
      return null;
    }
    const maintenanceConfig = PMS_STAGES_CONFIG.find((s) => s.key === 'maintenance');
    if (!maintenanceConfig) return null;

    let nextStageConfig = maintenanceConfig;
    const leadId = currentItem.lead?._id || currentItem.lead;
    const projectCode = currentItem.code || payload.code;

    const nextQuery = {
      $and: [
        {
          $or: [
            ...(leadId ? [{ lead: leadId }] : []),
            ...(projectCode ? [{ code: projectCode }] : []),
          ],
        },
        {
          $or: [
            { stageKey: nextStageConfig.key },
            { stageSlug: nextStageConfig.slug },
            { stage: nextStageConfig.key },
            { stage: nextStageConfig.slug },
          ],
        },
      ],
    };

    const existingNext = await PmsItem.findOne(nextQuery);
    if (existingNext) {
      existingNext.status = 'Open';
      existingNext.clientComplaint = payload.maintenanceDetails || currentItem.maintenanceDetails || existingNext.clientComplaint;
      existingNext.warrantyMaintenanceContext = payload.maintenanceDetails || currentItem.maintenanceDetails || existingNext.warrantyMaintenanceContext;
      existingNext.updatedBy = userId;
      await existingNext.save();
      return { nextItem: existingNext.toJSON ? existingNext.toJSON() : existingNext, nextStage: nextStageConfig };
    }

    const carriedOwner = payload.currentOwner || currentItem.currentOwner || 'Support Team';
    const carriedSite = payload.siteDetails || currentItem.siteDetails || '';
    const details = payload.maintenanceDetails || currentItem.maintenanceDetails || 'Maintenance requested at project closure';

    const createdNext = await createItem({
      lead: leadId,
      code: projectCode,
      clientName: payload.clientName || currentItem.clientName || '',
      siteDetails: carriedSite,
      currentOwner: carriedOwner,
      assignedPcExecutionOwner: carriedOwner,
      owner: carriedOwner,
      stage: nextStageConfig.key,
      stageKey: nextStageConfig.key,
      stageSlug: nextStageConfig.slug,
      status: 'Open',
      ticketId: projectCode ? `TKT-${projectCode}` : `TKT-${Date.now().toString().slice(-4)}`,
      requestDate: new Date(),
      warrantyStatus: 'Active (5-Year Somfy & Fabric Coverage)',
      clientComplaint: details,
      warrantyMaintenanceContext: details,
      delay: '0 days',
      dueDate: new Date(Date.now() + 7 * 86400000),
      targetResolutionDate: new Date(Date.now() + 5 * 86400000),
      createdBy: userId,
      source: 'projectClosure',
    });

    return { nextItem: createdNext, nextStage: nextStageConfig };
  }

  // If already at last stage, no further auto-advance needed
  if (currentIndex === -1 || currentIndex >= PMS_STAGES_CONFIG.length - 1) {
    return null;
  }

  let nextStageConfig = PMS_STAGES_CONFIG[currentIndex + 1];

  // If next stage is snagRework, check if this project actually has a snag reported
  if (nextStageConfig.key === 'snagRework') {
    const hasSnag = String(currentItem.snag || payload.snag || '').toLowerCase() === 'yes';
    if (!hasSnag) {
      // If no snag reported during installation execution, bypass snagRework and proceed directly to projectClosure
      const closureIndex = PMS_STAGES_CONFIG.findIndex((s) => s.key === 'projectClosure');
      if (closureIndex !== -1) {
        nextStageConfig = PMS_STAGES_CONFIG[closureIndex];
      }
    }
  }

  // If current stage is snagRework, completing it moves the lead directly into projectClosure
  if (currentKey === 'snagRework' || currentSlug === 'snag-rework') {
    const projectClosureIndex = PMS_STAGES_CONFIG.findIndex((s) => s.key === 'projectClosure');
    if (projectClosureIndex !== -1) {
      nextStageConfig = PMS_STAGES_CONFIG[projectClosureIndex];
    }
  }

  // Search if next stage item already exists for this project
  const leadId = currentItem.lead?._id || currentItem.lead;
  const projectCode = currentItem.code || payload.code;

  const nextQuery = {
    $and: [
      {
        $or: [
          ...(leadId ? [{ lead: leadId }] : []),
          ...(projectCode ? [{ code: projectCode }] : []),
        ],
      },
      {
        $or: [
          { stageKey: nextStageConfig.key },
          { stageSlug: nextStageConfig.slug },
          { stage: nextStageConfig.key },
          { stage: nextStageConfig.slug },
        ],
      },
    ],
  };

  const existingNext = await PmsItem.findOne(nextQuery);

  if (existingNext) {
    let shouldSave = false;
    // If existing next record was pending, set it to In Progress
    if (existingNext.status === 'Pending') {
      existingNext.status = 'In Progress';
      shouldSave = true;
    }
    if (currentKey === 'snagRework' || currentSlug === 'snag-rework') {
      existingNext.snagStatus = payload.snagStatus || currentItem.snagStatus || 'Completed';
      shouldSave = true;
    }
    if (shouldSave) {
      existingNext.updatedBy = userId;
      await existingNext.save();
    }
    return { nextItem: existingNext.toJSON ? existingNext.toJSON() : existingNext, nextStage: nextStageConfig };
  }

  // Create new record for the next stage carrying forward data
  const carriedOwner =
    payload.currentOwner ||
    currentItem.currentOwner ||
    payload.assignedPcExecutionOwner ||
    currentItem.assignedPcExecutionOwner ||
    '';

  const carriedQuote = payload.approvedQuote || currentItem.approvedQuote || '';
  const carriedSite = payload.siteDetails || currentItem.siteDetails || '';

  const baseNextData = {
    lead: leadId,
    code: projectCode,
    clientName: payload.clientName || currentItem.clientName || '',
    siteDetails: carriedSite,
    currentOwner: carriedOwner,
    assignedPcExecutionOwner: carriedOwner,
    approvedQuote: carriedQuote,
    stage: nextStageConfig.key,
    stageKey: nextStageConfig.key,
    stageSlug: nextStageConfig.slug,
    status: 'In Progress',
    delay: 'No',
    dueDate: new Date(Date.now() + 7 * 86400000),
    createdBy: userId,
    history: [
      {
        action: 'AUTO_ADVANCED_STAGE',
        note: `Automatically unlocked and advanced from Stage ${currentIndex + 1}: ${PMS_STAGES_CONFIG[currentIndex].label}`,
        by: userId,
        at: new Date(),
      },
    ],
  };

  const stageSpecificDefaults = getCarriedForwardStageDefaults(nextStageConfig.key, {
    ...currentItem,
    ...payload,
    currentOwner: carriedOwner,
    siteDetails: carriedSite,
    approvedQuote: carriedQuote,
  });

  const createdNext = await createItem({
    ...baseNextData,
    ...stageSpecificDefaults,
  });

  return { nextItem: createdNext, nextStage: nextStageConfig };
};

/**
 * Synchronizes Snag / Rework items specifically based on whether Snag / Rework
 * was flagged ("Yes" / "No") in the Installation Execution Updates stage.
 */
export const syncSnagsFromInstallationUpdates = async (specificLeadId = null, specificCode = null) => {
  try {
    const instQuery = {
      $or: [
        { stageKey: 'installationExecutionUpdates' },
        { stageSlug: 'installation-execution-updates' },
        { stage: 'installationExecutionUpdates' },
        { stage: 'installation-execution-updates' },
      ],
    };

    if (specificLeadId || specificCode) {
      instQuery.$and = [
        {
          $or: [
            ...(specificLeadId ? [{ lead: specificLeadId }] : []),
            ...(specificCode ? [{ code: specificCode }] : []),
          ],
        },
      ];
    }

    const instItems = await PmsItem.find(instQuery).lean();

    for (const inst of instItems) {
      const leadId = inst.lead?._id || inst.lead;
      const projectCode = inst.code;
      if (!leadId && !projectCode) continue;

      const snagQuery = {
        $and: [
          {
            $or: [
              ...(leadId ? [{ lead: leadId }] : []),
              ...(projectCode ? [{ code: projectCode }] : []),
            ],
          },
          {
            $or: [
              { stageKey: 'snagRework' },
              { stageSlug: 'snag-rework' },
              { stage: 'snagRework' },
              { stage: 'snag-rework' },
            ],
          },
        ],
      };

      const hasSnag = String(inst.snag || '').toLowerCase() === 'yes';

      if (hasSnag) {
        const existingSnag = await PmsItem.findOne(snagQuery);
        const snagId = projectCode ? `SNG-${projectCode}` : `SNG-${inst._id ? inst._id.toString().slice(-4) : Date.now().toString().slice(-4)}`;
        const note = inst.snagNote || 'Snag reported during installation execution';

        if (!existingSnag) {
          await createItem({
            lead: leadId,
            code: projectCode,
            clientName: inst.clientName || '',
            siteDetails: inst.siteDetails || '',
            siteItem: inst.siteDetails || 'Site Installation',
            currentOwner: inst.currentOwner || inst.installerName || 'Site Team',
            assignedPcExecutionOwner: inst.assignedPcExecutionOwner || inst.currentOwner || 'Site Team',
            snagOwner: inst.currentOwner || inst.installerName || 'Site Team',
            stage: 'snagRework',
            stageKey: 'snagRework',
            stageSlug: 'snag-rework',
            status: 'Open',
            snagStatus: 'Open',
            snagId,
            issueReport: note,
            clientComplaint: note,
            delay: '0 days',
            dueDate: inst.dueDate || new Date(Date.now() + 5 * 86400000),
            targetClosureDate: new Date(Date.now() + 3 * 86400000),
            createdBy: inst.createdBy,
            source: 'installationExecutionUpdates',
            sourceInstallationId: inst._id,
          });
        } else {
          let changed = false;
          if (existingSnag.snagStatus === 'No Major Snags') {
            existingSnag.snagStatus = 'Open';
            changed = true;
          }
          if (note && (!existingSnag.issueReport || existingSnag.issueReport === 'No Major Snags')) {
            existingSnag.issueReport = note;
            changed = true;
          }
          if (!existingSnag.clientName && inst.clientName) {
            existingSnag.clientName = inst.clientName;
            changed = true;
          }
          if (changed) {
            await existingSnag.save();
          }
        }
      } else {
        // Snag is 'No' or not 'Yes'; ensure any open or auto-created placeholder snag record is removed
        // so this lead is NOT visible on the snag/rework page
        await PmsItem.deleteMany({
          ...snagQuery,
          $or: [
            { source: 'installationExecutionUpdates' },
            { snagStatus: { $in: ['Open', 'No Major Snags'] } },
            { issueReport: { $in: [null, '', 'No Major Snags'] } },
          ],
        });
      }
    }

    // Clean up any legacy placeholder items with 'No Major Snags' and no note
    if (!specificLeadId && !specificCode) {
      await PmsItem.deleteMany({
        $or: [
          { stageKey: 'snagRework' },
          { stageSlug: 'snag-rework' },
          { stage: 'snagRework' },
          { stage: 'snag-rework' },
        ],
        snagStatus: 'No Major Snags',
        issueReport: { $in: [null, '', 'No Major Snags'] },
      });
    }
  } catch (err) {
    // Non-blocking sync error
    console.error('Error in syncSnagsFromInstallationUpdates:', err.message);
  }
};

/**
 * Synchronizes Maintenance items specifically based on whether Maintenance Required
 * was flagged ("Yes" / "No") in the Project Closure stage.
 */
export const syncMaintenanceFromProjectClosure = async (specificLeadId = null, specificCode = null) => {
  try {
    const closureQuery = {
      $or: [
        { stageKey: 'projectClosure' },
        { stageSlug: 'project-closure' },
        { stage: 'projectClosure' },
        { stage: 'project-closure' },
      ],
    };

    if (specificLeadId || specificCode) {
      closureQuery.$and = [
        {
          $or: [
            ...(specificLeadId ? [{ lead: specificLeadId }] : []),
            ...(specificCode ? [{ code: specificCode }] : []),
          ],
        },
      ];

      const closure = await PmsItem.findOne(closureQuery).lean();
      const leadId = specificLeadId || closure?.lead?._id || closure?.lead;
      const projectCode = specificCode || closure?.code;
      const isMntRequired = closure && String(closure.maintenanceRequired || '').trim().toLowerCase() === 'yes';

      const mntQuery = {
        $and: [
          {
            $or: [
              ...(leadId ? [{ lead: leadId }] : []),
              ...(projectCode ? [{ code: projectCode }] : []),
            ],
          },
          {
            $or: [
              { stageKey: 'maintenance' },
              { stageSlug: 'maintenance' },
              { stage: 'maintenance' },
            ],
          },
        ],
      };

      if (isMntRequired) {
        const existingMnt = await PmsItem.findOne(mntQuery);
        const mntTicketId = projectCode
          ? `TKT-${projectCode}`
          : `TKT-${closure._id ? closure._id.toString().slice(-4) : Date.now().toString().slice(-4)}`;
        const details = closure.maintenanceDetails || 'Maintenance requested at project closure';

        if (!existingMnt) {
          await createItem({
            lead: leadId,
            code: projectCode,
            clientName: closure.clientName || '',
            siteDetails: closure.siteDetails || '',
            currentOwner: closure.currentOwner || 'Support Team',
            assignedPcExecutionOwner: closure.assignedPcExecutionOwner || 'Support Team',
            owner: closure.currentOwner || 'Support Team',
            stage: 'maintenance',
            stageKey: 'maintenance',
            stageSlug: 'maintenance',
            status: 'Open',
            ticketId: mntTicketId,
            requestDate: new Date(),
            warrantyStatus: 'Active (5-Year Somfy & Fabric Coverage)',
            clientComplaint: details,
            warrantyMaintenanceContext: details,
            delay: '0 days',
            dueDate: new Date(Date.now() + 7 * 86400000),
            targetResolutionDate: new Date(Date.now() + 5 * 86400000),
            createdBy: closure.createdBy,
            source: 'projectClosure',
          });
        } else {
          let modified = false;
          if (details && existingMnt.clientComplaint !== details) {
            existingMnt.clientComplaint = details;
            modified = true;
          }
          if (details && existingMnt.warrantyMaintenanceContext !== details) {
            existingMnt.warrantyMaintenanceContext = details;
            modified = true;
          }
          if (modified) {
            await existingMnt.save();
          }
        }
      } else {
        // If maintenance is not 'Yes', remove from maintenance stage completely
        await PmsItem.deleteMany(mntQuery);
      }
      return;
    }

    // Bulk sync across all projects:
    // Only leads with maintenanceRequired === 'Yes' in Project Closure are eligible for Maintenance
    const closureItems = await PmsItem.find(closureQuery).lean();
    const yesClosures = closureItems.filter(
      (c) => String(c.maintenanceRequired || '').trim().toLowerCase() === 'yes'
    );

    const allowedCodes = new Set(yesClosures.map((c) => c.code).filter(Boolean));
    const allowedLeadIds = new Set(
      yesClosures.map((c) => (c.lead?._id || c.lead)?.toString()).filter(Boolean)
    );

    // Find all existing maintenance items and remove any that are NOT authorized by a "Yes" in Project Closure
    const allMaintenanceItems = await PmsItem.find({
      $or: [
        { stageKey: 'maintenance' },
        { stageSlug: 'maintenance' },
        { stage: 'maintenance' },
      ],
    }).lean();

    const unauthorizedMntIds = allMaintenanceItems
      .filter((mnt) => {
        const codeMatch = mnt.code && allowedCodes.has(mnt.code);
        const leadIdStr = (mnt.lead?._id || mnt.lead)?.toString();
        const leadMatch = leadIdStr && allowedLeadIds.has(leadIdStr);
        return !codeMatch && !leadMatch;
      })
      .map((mnt) => mnt._id);

    if (unauthorizedMntIds.length > 0) {
      await PmsItem.deleteMany({ _id: { $in: unauthorizedMntIds } });
    }

    // Ensure all yesClosures have a maintenance record
    for (const closure of yesClosures) {
      const leadId = closure.lead?._id || closure.lead;
      const projectCode = closure.code;
      if (!leadId && !projectCode) continue;

      const mntQuery = {
        $and: [
          {
            $or: [
              ...(leadId ? [{ lead: leadId }] : []),
              ...(projectCode ? [{ code: projectCode }] : []),
            ],
          },
          {
            $or: [
              { stageKey: 'maintenance' },
              { stageSlug: 'maintenance' },
              { stage: 'maintenance' },
            ],
          },
        ],
      };

      const existingMnt = await PmsItem.findOne(mntQuery);
      const mntTicketId = projectCode
        ? `TKT-${projectCode}`
        : `TKT-${closure._id ? closure._id.toString().slice(-4) : Date.now().toString().slice(-4)}`;
      const details = closure.maintenanceDetails || 'Maintenance requested at project closure';

      if (!existingMnt) {
        await createItem({
          lead: leadId,
          code: projectCode,
          clientName: closure.clientName || '',
          siteDetails: closure.siteDetails || '',
          currentOwner: closure.currentOwner || 'Support Team',
          assignedPcExecutionOwner: closure.assignedPcExecutionOwner || 'Support Team',
          owner: closure.currentOwner || 'Support Team',
          stage: 'maintenance',
          stageKey: 'maintenance',
          stageSlug: 'maintenance',
          status: 'Open',
          ticketId: mntTicketId,
          requestDate: new Date(),
          warrantyStatus: 'Active (5-Year Somfy & Fabric Coverage)',
          clientComplaint: details,
          warrantyMaintenanceContext: details,
          delay: '0 days',
          dueDate: new Date(Date.now() + 7 * 86400000),
          targetResolutionDate: new Date(Date.now() + 5 * 86400000),
          createdBy: closure.createdBy,
          source: 'projectClosure',
        });
      } else {
        let modified = false;
        if (details && existingMnt.clientComplaint !== details) {
          existingMnt.clientComplaint = details;
          modified = true;
        }
        if (details && existingMnt.warrantyMaintenanceContext !== details) {
          existingMnt.warrantyMaintenanceContext = details;
          modified = true;
        }
        if (modified) {
          await existingMnt.save();
        }
      }
    }
  } catch (err) {
    console.error('Error in syncMaintenanceFromProjectClosure:', err.message);
  }
};

/**
 * Ensures any projects completed in the previous stage exist in current stage.
 */
const ensureSequentialStageCascade = async (currentStageKey, currentStageSlug) => {
  // If current stage is snagRework, visibility is strictly based on snags reported in Installation Execution Updates
  if (currentStageKey === 'snagRework' || currentStageSlug === 'snag-rework') {
    await syncSnagsFromInstallationUpdates();
    return;
  }

  // If current stage is maintenance, visibility is strictly based on Maintenance Required in Project Closure
  if (currentStageKey === 'maintenance' || currentStageSlug === 'maintenance') {
    await syncMaintenanceFromProjectClosure();
    return;
  }

  // If current stage is projectClosure, cascade completed snags from snagRework directly
  if (currentStageKey === 'projectClosure' || currentStageSlug === 'project-closure') {
    const completedSnags = await PmsItem.find({
      $or: [
        { stageKey: 'snagRework' },
        { stageSlug: 'snag-rework' },
        { stage: 'snagRework' },
        { stage: 'snag-rework' },
      ],
      $or: [
        { snagStatus: { $regex: /^(completed|closed|resolved)$/i } },
        { status: { $regex: /^(completed|approved|closed|passed|signed|verified)$/i } },
      ],
    }).lean();

    for (const snagItem of completedSnags) {
      const leadId = snagItem.lead?._id || snagItem.lead;
      const projectCode = snagItem.code;

      const exists = await PmsItem.findOne({
        $and: [
          {
            $or: [
              ...(leadId ? [{ lead: leadId }] : []),
              ...(projectCode ? [{ code: projectCode }] : []),
            ],
          },
          {
            $or: [
              { stageKey: 'projectClosure' },
              { stageSlug: 'project-closure' },
              { stage: 'projectClosure' },
              { stage: 'project-closure' },
            ],
          },
        ],
      });

      if (!exists) {
        await autoAdvanceToNextStage('snagRework', snagItem, {}, null);
      }
    }
  }

  const currentIndex = PMS_STAGES_CONFIG.findIndex(
    (s) => s.key === currentStageKey || s.slug === currentStageSlug
  );

  // If Stage 1, cascade from previous stage is not applicable (synced directly from CRM)
  if (currentIndex <= 0) return;

  const prevStageConfig = PMS_STAGES_CONFIG[currentIndex - 1];

  // Find all completed items from previous stage
  const prevCompletedItems = await PmsItem.find({
    $or: [
      { stageKey: prevStageConfig.key },
      { stageSlug: prevStageConfig.slug },
      { stage: prevStageConfig.key },
    ],
    status: { $regex: /^(completed|approved|closed|passed|signed|verified)$/i },
  }).lean();

  if (!prevCompletedItems || prevCompletedItems.length === 0) return;

  for (const prevItem of prevCompletedItems) {
    const leadId = prevItem.lead?._id || prevItem.lead;
    const projectCode = prevItem.code;

    const exists = await PmsItem.findOne({
      $and: [
        {
          $or: [
            ...(leadId ? [{ lead: leadId }] : []),
            ...(projectCode ? [{ code: projectCode }] : []),
          ],
        },
        {
          $or: [
            { stageKey: currentStageKey },
            { stageSlug: currentStageSlug },
            { stage: currentStageKey },
          ],
        },
      ],
    });

    if (!exists) {
      await autoAdvanceToNextStage(prevStageConfig.key, prevItem, {}, null);
    }
  }
};

/**
 * Fetches all items for a given PMS stage from MongoDB.
 */
export const fetchStageItemsService = async (stageStr, query = {}) => {
  const { key, slug } = normalizeStageNames(stageStr);
  if (!key && !slug) {
    throw ApiError.badRequest('Valid stage parameter is required');
  }

  // 1. Ensure any newly verified KYC / converted CRM leads are mirrored into PMS Stage 1
  await syncApprovedLeads();

  // 2. Ensure projects completed in the preceding stage flow smoothly into this stage
  await ensureSequentialStageCascade(key, slug);

  // 3. Return active items for this stage
  const items = await findItemsByStage(key, slug, query);

  // If maintenance stage, strictly ensure ONLY leads with maintenanceRequired === 'Yes' in Project Closure are returned
  if (key === 'maintenance' || slug === 'maintenance') {
    const closureItems = await PmsItem.find({
      $or: [
        { stageKey: 'projectClosure' },
        { stageSlug: 'project-closure' },
        { stage: 'projectClosure' },
        { stage: 'project-closure' },
      ],
      maintenanceRequired: { $regex: /^yes$/i },
    }).lean();

    const allowedCodes = new Set(closureItems.map((c) => c.code).filter(Boolean));
    const allowedLeadIds = new Set(
      closureItems.map((c) => (c.lead?._id || c.lead)?.toString()).filter(Boolean)
    );

    return items.filter((item) => {
      const codeMatch = item.code && allowedCodes.has(item.code);
      const leadIdStr = (item.lead?._id || item.lead)?.toString();
      const leadMatch = leadIdStr && allowedLeadIds.has(leadIdStr);
      return Boolean(codeMatch || leadMatch);
    });
  }

  return items;
};

/**
 * Fetches a single PMS stage item by ID.
 */
export const getStageItemDetailService = async (stageStr, id) => {
  const item = await findItemById(id);
  if (!item) {
    throw ApiError.notFound(`PMS stage item not found for ID: ${id}`);
  }
  return item;
};

/**
 * Creates a new PMS item for a stage in MongoDB.
 */
export const createStageItemService = async (stageStr, payload, userId) => {
  const { key, slug } = normalizeStageNames(stageStr);

  const itemData = {
    ...payload,
    stage: key,
    stageKey: key,
    stageSlug: slug,
    createdBy: userId || payload.createdBy,
  };

  // If ID was sent as a dummy or temporary string, remove it so Mongoose generates a real ObjectId
  if (itemData.id && typeof itemData.id === 'string' && (itemData.id.startsWith('local-') || itemData.id.startsWith('pms-') || itemData.id.startsWith('item-'))) {
    delete itemData.id;
  }
  if (itemData._id && typeof itemData._id === 'string' && (itemData._id.startsWith('local-') || itemData._id.startsWith('pms-') || itemData._id.startsWith('item-'))) {
    delete itemData._id;
  }

  const created = await createItem(itemData);

  // If created directly as completed, auto-advance
  if (itemData.status && ['completed', 'approved', 'closed', 'verified'].includes(String(itemData.status).toLowerCase())) {
    await autoAdvanceToNextStage(stageStr, created, payload, userId);
  }

  // If installationExecutionUpdates stage, trigger snag sync immediately
  if (key === 'installationExecutionUpdates') {
    const leadId = created.lead?._id || created.lead;
    const projectCode = created.code;
    await syncSnagsFromInstallationUpdates(leadId, projectCode);
  }

  // If projectClosure stage, handle Maintenance transition immediately
  if (key === 'projectClosure' || slug === 'project-closure') {
    const leadId = created.lead?._id || created.lead;
    const projectCode = created.code;
    const isMntRequired = String(payload.maintenanceRequired ?? created.maintenanceRequired ?? '').toLowerCase() === 'yes';
    if (isMntRequired) {
      await syncMaintenanceFromProjectClosure(leadId, projectCode);
    }
  }

  return created;
};

/**
 * Updates a PMS stage item in MongoDB.
 * If status is marked "Completed", auto-advances the project to the next stage.
 */
export const updateStageItemService = async (stageStr, id, payload, userId) => {
  const { key, slug } = normalizeStageNames(stageStr);
  const existing = await findItemById(id);
  if (!existing) {
    // If not found by ID, attempt creation with provided data
    const created = await createItem({
      ...payload,
      stage: key,
      stageKey: key,
      stageSlug: slug,
      createdBy: userId,
    });

    if (payload.status && ['completed', 'approved', 'closed', 'verified'].includes(String(payload.status).toLowerCase())) {
      await autoAdvanceToNextStage(stageStr, created, payload, userId);
    }

    if (key === 'installationExecutionUpdates') {
      const leadId = created.lead?._id || created.lead;
      const projectCode = created.code;
      await syncSnagsFromInstallationUpdates(leadId, projectCode);
    }

    return created;
  }

  const historyEntry = {
    action: 'UPDATE_PMS_STAGE',
    note: `Updated stage item in ${stageStr}`,
    by: userId,
    at: new Date(),
  };

  const currentHistory = Array.isArray(existing.history) ? existing.history : [];

  const updateData = {
    ...payload,
    updatedBy: userId,
    history: [...currentHistory, historyEntry],
  };

  const updated = await updateItem(id, updateData);

  // If installationExecutionUpdates stage, trigger snag sync immediately
  if (key === 'installationExecutionUpdates') {
    const leadId = updated.lead?._id || updated.lead;
    const projectCode = updated.code;
    await syncSnagsFromInstallationUpdates(leadId, projectCode);
  }

  // Check if snagStatus is marked completed/closed in snagRework
  const isSnagCompleted =
    (key === 'snagRework' || slug === 'snag-rework') &&
    ['completed', 'closed', 'resolved'].includes(
      String(payload.snagStatus || updated.snagStatus || '').toLowerCase()
    );

  // Check if status transitioned to or is Completed/Approved
  const isCompleted =
    isSnagCompleted ||
    (payload.status &&
      ['completed', 'approved', 'closed', 'verified'].includes(String(payload.status).toLowerCase()));

  if (isSnagCompleted && (!payload.status || payload.status === 'Open')) {
    await updateItem(id, {
      status: 'Completed',
      snagStatus: payload.snagStatus || updated.snagStatus || 'Completed',
      ...(updated.closureDate ? {} : { closureDate: new Date() }),
    });
    updated.status = 'Completed';
    updated.snagStatus = payload.snagStatus || updated.snagStatus || 'Completed';
    if (!updated.closureDate) updated.closureDate = new Date();
  }

  let advanceResult = null;
  if (isCompleted) {
    advanceResult = await autoAdvanceToNextStage(stageStr, updated, payload, userId);
  }

  // If projectClosure stage, handle Maintenance transition based on maintenanceRequired
  if (key === 'projectClosure' || slug === 'project-closure') {
    const leadId = updated.lead?._id || updated.lead;
    const projectCode = updated.code;
    const isMntRequired = String(payload.maintenanceRequired ?? updated.maintenanceRequired ?? '').toLowerCase() === 'yes';

    if (isMntRequired) {
      await syncMaintenanceFromProjectClosure(leadId, projectCode);
    } else {
      // If not 'Yes', completely remove any maintenance records for this lead/project
      await PmsItem.deleteMany({
        $and: [
          {
            $or: [
              ...(leadId ? [{ lead: leadId }] : []),
              ...(projectCode ? [{ code: projectCode }] : []),
            ],
          },
          {
            $or: [
              { stageKey: 'maintenance' },
              { stageSlug: 'maintenance' },
              { stage: 'maintenance' },
            ],
          },
        ],
      });
    }
  }

  return {
    ...updated,
    _autoAdvancedNextStage: advanceResult?.nextStage?.label || (String(payload.maintenanceRequired || updated.maintenanceRequired || '').toLowerCase() === 'yes' ? 'Maintenance' : null),
    _nextStageItem: advanceResult?.nextItem || null,
  };
};

/**
 * Explicitly completes and advances a stage item into the next PMS stage.
 */
export const advanceStageItemService = async (stageStr, id, payload = {}, userId) => {
  const existing = await findItemById(id);
  if (!existing) {
    throw ApiError.notFound(`PMS stage item not found to advance: ${id}`);
  }

  const updatedCurrent = await updateItem(id, {
    ...payload,
    status: 'Completed',
    updatedBy: userId,
    history: [
      ...(Array.isArray(existing.history) ? existing.history : []),
      {
        action: 'STAGE_COMPLETED_AND_ADVANCED',
        note: `Stage manually completed and advanced to next step`,
        by: userId,
        at: new Date(),
      },
    ],
  });

  const advanceResult = await autoAdvanceToNextStage(stageStr, updatedCurrent, payload, userId);

  return {
    currentItem: updatedCurrent,
    nextStageItem: advanceResult?.nextItem || null,
    nextStage: advanceResult?.nextStage || null,
    message: advanceResult?.nextStage
      ? `Stage marked Completed. Project auto-advanced to ${advanceResult.nextStage.label}`
      : 'Stage marked Completed. Project has reached final stage.',
  };
};

/**
 * Deletes a PMS stage item.
 */
export const deleteStageItemService = async (stageStr, id) => {
  const deleted = await deleteItem(id);
  if (!deleted) {
    throw ApiError.notFound(`PMS item not found to delete: ${id}`);
  }
  return deleted;
};

/**
 * Returns full lifecycle status across all 20 stages for a specific project.
 */
export const getProjectLifecycleService = async (projectIdentifier) => {
  const items = await findItemsByProject(projectIdentifier);

  const stageRecordMap = {};
  items.forEach((item) => {
    if (item.stageKey) stageRecordMap[item.stageKey] = item;
    if (item.stageSlug) stageRecordMap[item.stageSlug] = item;
    if (item.stage) stageRecordMap[item.stage] = item;
  });

  const stagesSummary = PMS_STAGES_CONFIG.map((cfg, index) => {
    const record = stageRecordMap[cfg.key] || stageRecordMap[cfg.slug] || null;
    return {
      index: index + 1,
      key: cfg.key,
      slug: cfg.slug,
      label: cfg.label,
      hasRecord: Boolean(record),
      status: record?.status || (index === 0 ? 'In Progress' : 'Pending'),
      delay: record?.delay || 'No',
      record,
    };
  });

  const completedCount = stagesSummary.filter((s) =>
    ['completed', 'approved', 'passed', 'closed', 'verified', 'cleared', 'signed'].includes(
      String(s.status).toLowerCase()
    )
  ).length;

  return {
    projectIdentifier,
    totalStages: PMS_STAGES_CONFIG.length,
    completedStages: completedCount,
    progressPercentage: Math.round((completedCount / PMS_STAGES_CONFIG.length) * 100),
    stages: stagesSummary,
    records: items,
  };
};

/**
 * Summarizes PMS statistics across pipeline.
 */
export const getPipelineSummaryService = async () => {
  const stats = await getPipelineStatistics();
  return {
    stages: PMS_STAGES_CONFIG,
    stats,
  };
};
