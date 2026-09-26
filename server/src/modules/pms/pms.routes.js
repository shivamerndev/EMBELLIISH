import express from 'express';
import { sendSuccess } from '../../utils/responseHandler.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { findApprovedLeads } from '../sales/sales.repo.js';

const router = express.Router();

// In-memory stage store seeded on demand from approved projects
const stageStore = new Map();

const getStageKey = (stageSlug) => {
  return stageSlug.toLowerCase().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
};

const seedStageData = (stageSlug, lead, idx) => {
  const edge = lead.salesCommercial || {};
  const clientName = lead.clientName || 'Private Residence';
  const code = lead.code || `PRJ-${100 + idx + 1}`;
  const location = lead.location || lead.siteAddress || 'Gurgaon, Haryana';
  const quoteVal = edge.quotation?.grandTotal || edge.proposal?.total || '4,50,000';
  const owner = lead.assignedDCM?.name || 'Vikram Mehta';
  const baseDate = new Date(Date.now() - (idx + 1) * 86400000 * 4).toISOString().slice(0, 10);
  const futureDate = new Date(Date.now() + (idx + 1) * 86400000 * 3).toISOString().slice(0, 10);

  const baseItem = {
    id: `pms-${stageSlug}-${lead._id || idx + 1}`,
    _id: `pms-${stageSlug}-${lead._id || idx + 1}`,
    code: `${code} (${clientName})`,
    clientName,
    siteDetails: `${location}, Site access verified`,
    currentOwner: owner,
    delay: 'No',
    createdAt: new Date().toISOString(),
  };

  switch (stageSlug) {
    case 'project-activation':
      return {
        ...baseItem,
        approvedQuote: `₹${quoteVal}`,
        paymentReceipt: `RCP-2026-${100 + idx}`,
        projectActivationDate: baseDate,
        clientApproval: 'Approved',
        assignedPcExecutionOwner: owner,
        kycBillingStatus: 'Verified',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'execution-setup':
      return {
        ...baseItem,
        dueDate: futureDate,
        approvedDesign: 'v2.0 Approved',
        approvedQuote: `₹${quoteVal}`,
        clientContext: 'Motorized ripplefold sheer and blackout drapery in living and master bedroom',
        paymentStatus: 'Complete',
        openActions: 'Power points and wiring boxes verified with site electrician',
        executionOwnerPc: owner,
        openRisks: 'Double height ceiling requires specialized scaffolding',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'design-finalisation':
      return {
        ...baseItem,
        dueDate: futureDate,
        finalDesignStatus: 'Approved',
        designVersion: 'v2.1',
        designApprovalDate: baseDate,
        pendingDesignDecisions: 'Pelmet pocket depth confirmed at 160mm',
        clientBrief: 'Wave curtain tracks flush recessed in false ceiling',
        approvedProposalQuote: `Q-2026-${200 + idx}`,
        fabrics: 'Belgian Linen Sheer (Code BL-04) + Charcoal Velvet (Code CV-12)',
        designReferences: 'Architectural moodboard Ref #M-88',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'execution-drawing-request':
      return {
        ...baseItem,
        dueDate: futureDate,
        requestDate: baseDate,
        requestedBy: owner,
        drawingRequiredByDate: futureDate,
        inputCompletenessStatus: 'Complete',
        drawingVersion: 'v2.0',
        preparedBy: 'Karan Patel',
        checkedBy: 'Sanjay Rao',
        drawingDueDate: futureDate,
        siteDetailSheet: `${location} - Final Laser Measurements Attached`,
        pptDesignBrief: 'Drawing Brief PPT v2 with motor wiring detail',
        roomWindowReference: 'Living Bay Window (3 panels), Master Bed (2 panels)',
        measurements: 'Span 4200mm x Drop 3180mm',
        readyHeightStatus: 'Ready',
        pelmetMotorChannelDetails: 'Somfy Glydea Ultra 60 RTS left side housing',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'execution-drawing-preparation':
      return {
        ...baseItem,
        dueDate: futureDate,
        structuredRequest: 'Elevation & pocket detail for 4 motorized tracks',
        designBrief: 'Wave curtain track recess 160mm x 150mm deep',
        siteDetail: 'Laser measured ceiling height: 3200mm floor-to-ceiling',
        sizes: 'Living: 4200 x 3180mm; Master: 3600 x 3180mm',
        pelmetChannelMotorDetails: 'Somfy Glydea Ultra 60 RTS with left-hand housing',
        technicalFeasibilityInput: 'Approved by structural checker. Ceiling load capacity verified.',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'approvals':
      return {
        ...baseItem,
        dueDate: futureDate,
        approvedBy: clientName,
        approvalDate: baseDate,
        status: 'Approved',
        revisionReason: 'No revisions needed',
        approvedDesign: 'v2.1 Approved',
        executionDrawingStatus: 'Approved',
        orderSheet: `OS-2026-${100 + idx}`,
        measurementStatus: 'Approved',
        customSamplingNeeds: 'Fabric swatch sample approved on site',
      };

    case 'change-revision-control':
      return {
        ...baseItem,
        changeRequested: 'Track Profile Finish',
        changeDetails: 'Changed motorized track extrusion finish from Powder White to Anodized Anthracite Gray.',
        costImpact: '₹4,500 (Covered in margin)',
        timelineImpact: '+0 Days (In-stock extrusion used)',
        approvalStatus: 'Approved',
        revisedVersion: 'v2.2',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'order-sheet-fms-creation':
      return {
        ...baseItem,
        dueDate: futureDate,
        orderSheetFmsNo: `OS/FMS-2026-${100 + idx}`,
        versionCreatedBy: `v2.0, ${owner}`,
        creationDate: baseDate,
        productionReleaseStatusDate: `Released on ${baseDate}`,
        approvedOrder: 'Approved by DCM & Client',
        roomDetails: 'Living Room: 1x Sheer Wave + 1x Blackout; Master: 1x Motorized Drapes (Fabric: BL-04 / Motor: Glydea 60)',
        design: 'Ripplefold 120% Fullness Flush Ceiling Recess',
        fabric: '85m Belgian Linen Sheer (BL-04) + 110m Velvet Drapes (CV-12)',
        motorAccessoryNeeds: '4x Somfy Glydea Ultra 60 RTS + 2x Telis 4 RTS Remotes',
        stageDates: `Cut: ${baseDate} | Stitch: ${futureDate} | QC: ${futureDate}`,
        status: idx === 0 ? 'Completed' : 'In Production',
      };

    case 'procurement-request':
      return {
        ...baseItem,
        dueDate: futureDate,
        approvedOrderSheet: `OS/FMS-2026-${100 + idx}`,
        procurementStatus: 'Ordered',
        materialReadiness: 'Ready in Warehouse',
        expectedMaterialDate: futureDate,
        procurementDelayException: 'None',
        paymentApprovalIfNeeded: 'Approved by Finance',
        fabricMaterialList: 'BL-04 Sheer Fabric 85m, Somfy Glydea Motors 4 pcs, Heavy Duty Carriers',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'motors-accessories-control':
      return {
        ...baseItem,
        dueDate: futureDate,
        requirement: '4x Somfy Glydea Ultra 60 RTS with center opening carriers',
        expectedReadinessDate: futureDate,
        motorType: 'Somfy Glydea Ultra 60 RTS (AC 230V)',
        automationWiringDetails: 'Left-hand power drop with 230V 6A socket above pelmet',
        siteRoomRequirement: 'Living Room (2x tracks 4.2m), Master Bed (2x tracks 3.6m)',
        vendorOrder: 'PO-SOMFY-2026-081',
        accessoriesList: '2x Telis 4 RTS Remotes, 8x Ceiling Brackets, Heavy-duty Belt Drivers',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'qc-status':
      return {
        ...baseItem,
        dueDate: futureDate,
        qcDoneDate: baseDate,
        qcDoneBy: 'Amit Verma (Chief QC)',
        qcStatus: 'Passed',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'packing-dispatch-readiness':
      return {
        ...baseItem,
        dueDate: futureDate,
        packingStatus: 'Completed',
        dispatchReadinessStatus: 'Ready for Dispatch',
        targetDispatchDate: futureDate,
        installationDate: futureDate,
        packingList: 'Box 1: Living Sheers, Box 2: Master Drapes, Crate 1: Track Extrusions',
        accessories: '4x Motors, 2x Remotes, 16x Fixing Screws & Anchors',
        challan: `DC-2026-${100 + idx}`,
        roomWiseScope: 'Living Room (2 sets), Master Bedroom (2 sets)',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'final-payment':
      return {
        ...baseItem,
        dueDate: futureDate,
        invoicePaymentSummary: `INV-2026-${100 + idx} (Total: ₹${quoteVal}, Paid: ₹${quoteVal})`,
        paymentStatus: 'Cleared',
        paymentClearanceDate: baseDate,
        outstandingAmount: '₹0 (100% Cleared)',
        clientStatus: 'Payment Settled',
        dispatchReadiness: 'Ready & Approved for Dispatch',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'installation-scheduling':
      return {
        ...baseItem,
        dueDate: futureDate,
        confirmedInstallationDateTime: `${futureDate} at 10:00 AM`,
        assignedInstallerTeam: 'Team A (Master Fitters - Lead: Ramesh Kumar)',
        clientConfirmationStatus: 'Confirmed by Client',
        finalPaymentStatus: 'Cleared',
        qcStatus: 'Passed',
        packingStatus: 'Completed',
        siteReadiness: 'Ready & Verified',
        challan: `DC-2026-${100 + idx}`,
        roomWiseScope: 'Living Room (2 sets), Master Bed (2 sets)',
        installerAvailability: 'Confirmed Available',
        status: idx === 0 ? 'Completed' : 'Scheduled',
      };

    case 'installation-brief-dispatch':
      return {
        ...baseItem,
        dueDate: futureDate,
        dispatchDateTime: `${futureDate} 08:30 AM`,
        materialHandedOverToReceivedByInstaller: 'Handed Over to Ramesh Kumar (Lead Installer)',
        installationBriefAcknowledged: 'Acknowledged & Signed',
        packingList: '4 Drapery Bundles + 2 Track Crates + Hardware Kit',
        challan: `DC-2026-${100 + idx}`,
        roomScopeList: 'Living Room: 2 Motorized Tracks; Master Suite: 2 Motorized Tracks',
        clientSiteContact: 'Mr. Rajiv Singhania (+91 98100 XXXXX)',
        motorWiringInfo: 'AC 230V sockets located in top left pocket of pelmet',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'installation-execution-updates':
      return {
        ...baseItem,
        dueDate: futureDate,
        installationStartDate: baseDate,
        siteIssueBlocker: 'None - Smooth installation',
        installationPhotosProof: 'All 4 tracks leveled and drapes hung, photos uploaded to project drive',
        installationBrief: 'Brief v2 followed; limits set via Somfy Telis remote',
        siteReadiness: 'Site 100% ready, power active',
        material: 'All draperies, tracks, and motors received intact',
        tools: 'Laser level, hammer drill, Somfy limit setting tool',
        siteAccess: 'Service elevator access approved by building estate',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'client-execution-updates':
      return {
        ...baseItem,
        dueDate: futureDate,
        lastClientUpdateDate: baseDate,
        updatedBy: owner,
        nextUpdateDueDate: futureDate,
        projectStage: 'Installation & Handover',
        productionStatus: 'Completed',
        expectedDates: `Handover on ${futureDate}`,
        delays: 'No delays reported',
        installationStatus: 'Completed & Signed',
        clientQueries: 'Client asked about Somfy remote battery change procedure; explained & demonstrated',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'snag-rework':
      return {
        ...baseItem,
        dueDate: futureDate,
        snagId: `SNAG-2026-${100 + idx}`,
        snagOwner: 'Ramesh Kumar',
        targetClosureDate: futureDate,
        snagStatus: 'Closed',
        issueReport: 'Slight wave ripple spacing variance on far right edge',
        closureDate: baseDate,
        closureProof: 'Carrier adjusted to exact 60mm wave pitch, photo approved',
        siteItem: 'Living Room Wave Sheer - Right Edge',
        photosVideo: 'Proof photo uploaded',
        clientComplaint: 'Minor wave alignment observation during handover walkthrough',
        returnedMaterial: 'None required',
        requiredCorrection: 'Adjust end carrier stop position',
        status: idx === 0 ? 'Completed' : 'In Progress',
      };

    case 'maintenance':
      return {
        ...baseItem,
        dueDate: futureDate,
        ticketId: `TKT-2026-${100 + idx}`,
        requestDate: baseDate,
        warrantyStatus: 'Active (5-Year Somfy & Fabric Warranty)',
        owner: 'Support Desk Lead',
        targetResolutionDate: futureDate,
        status: 'Active / Handover Complete',
        closureDate: baseDate,
        clientComplaint: 'No complaints; regular 6-month preventive AMC scheduled',
        issuePhotos: 'None',
        warrantyMaintenanceContext: 'Standard 5-year mechanical & 2-year stitching coverage',
        priorInstallationRecord: 'Installed & commissioned flawlessly on site',
      };

    case 'project-closure':
      return {
        ...baseItem,
        dueDate: futureDate,
        projectClosureDate: baseDate,
        approvedBy: clientName,
        installationCompletion: 'Completed',
        clientSignOff: 'Signed',
        snagStatus: 'Closed',
        paymentClosure: 'Closed',
        challans: `DC-2026-${100 + idx} Signed`,
        finalPhotos: 'Full site walkthrough photos and 4K video archived in cloud',
        status: 'Closed',
      };

    default:
      return {
        ...baseItem,
        dueDate: futureDate,
        status: idx === 0 ? 'Completed' : 'In Progress',
      };
  }
};

const seedFromLeads = async (stageSlug) => {
  if (stageStore.has(stageSlug)) {
    return stageStore.get(stageSlug);
  }

  try {
    const leads = await findApprovedLeads();
    const items = (leads && leads.length > 0 ? leads : [{ _id: 'sample-1', clientName: 'Villa Vista (Rajiv Singhania)', code: 'PRJ-101' }])
      .map((lead, idx) => seedStageData(stageSlug, lead, idx));

    stageStore.set(stageSlug, items);
    return items;
  } catch (err) {
    const fallbackItems = [{ _id: 'sample-1', clientName: 'Villa Vista (Rajiv Singhania)', code: 'PRJ-101' }]
      .map((lead, idx) => seedStageData(stageSlug, lead, idx));
    stageStore.set(stageSlug, fallbackItems);
    return fallbackItems;
  }
};

router.use(authMiddleware);

// List stage items
router.get('/:stage', async (req, res, next) => {
  try {
    const { stage } = req.params;
    let items = stageStore.get(stage);
    if (!items) {
      items = await seedFromLeads(stage);
    }
    return sendSuccess(res, `${stage} items fetched successfully`, items);
  } catch (error) {
    next(error);
  }
});

// Get single stage item
router.get('/:stage/:id', async (req, res, next) => {
  try {
    const { stage, id } = req.params;
    const items = stageStore.get(stage) || [];
    const item = items.find((i) => i.id === id || i._id === id);
    return sendSuccess(res, `${stage} item fetched successfully`, item || null);
  } catch (error) {
    next(error);
  }
});

// Create new stage item
router.post('/:stage', async (req, res, next) => {
  try {
    const { stage } = req.params;
    const payload = req.body;
    const items = stageStore.get(stage) || [];
    const newItem = {
      id: `pms-${stage}-${Date.now()}`,
      _id: `pms-${stage}-${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString(),
    };
    items.unshift(newItem);
    stageStore.set(stage, items);
    return sendSuccess(res, `${stage} item created successfully`, newItem, 201);
  } catch (error) {
    next(error);
  }
});

// Update stage item
router.put('/:stage/:id', async (req, res, next) => {
  try {
    const { stage, id } = req.params;
    const payload = req.body;
    const items = stageStore.get(stage) || [];
    const idx = items.findIndex((i) => i.id === id || i._id === id);
    let updated;
    if (idx !== -1) {
      updated = { ...items[idx], ...payload, updatedAt: new Date().toISOString() };
      items[idx] = updated;
    } else {
      updated = { id, _id: id, ...payload, updatedAt: new Date().toISOString() };
      items.push(updated);
    }
    stageStore.set(stage, items);
    return sendSuccess(res, `${stage} item updated successfully`, updated);
  } catch (error) {
    next(error);
  }
});

// Delete stage item
router.delete('/:stage/:id', async (req, res, next) => {
  try {
    const { stage, id } = req.params;
    const items = stageStore.get(stage) || [];
    const filtered = items.filter((i) => i.id !== id && i._id !== id);
    stageStore.set(stage, filtered);
    return sendSuccess(res, `${stage} item deleted successfully`, { id });
  } catch (error) {
    next(error);
  }
});

export default router;
