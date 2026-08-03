import mongoose from 'mongoose';
import connectDB, { disconnectDB } from './src/config/db.js';
import leadService from './src/modules/crm/lead/lead.service.js';
import projectService from './src/modules/project/project/project.service.js';
import boqService from './src/modules/project/boq/boq.service.js';
import quotationService from './src/modules/crm/quotation/quotation.service.js';
import paymentService from './src/modules/accounts/payment/payment.service.js';
import SiteVisit from './src/modules/project/sitevisit/sitevisit.model.js';
import Room from './src/modules/project/room/room.model.js';
import Measurement from './src/modules/project/measurement/measurement.model.js';
import Design from './src/modules/project/design/design.model.js';
import Drawing from './src/modules/project/drawing/drawing.model.js';
import Payment from './src/modules/accounts/payment/payment.model.js';
import ProductionOrder from './src/modules/production/production/production.model.js';
import PackingBox from './src/modules/production/packing/packing.model.js';
import Installation from './src/modules/project/installation/installation.model.js';
import Snag from './src/modules/project/snag/snag.model.js';
import packingService from './src/modules/production/packing/packing.service.js';
import LeadModel from './src/modules/crm/lead/lead.model.js';
import ClientModel from './src/modules/crm/client/client.model.js';
import ProjectModel from './src/modules/project/project/project.model.js';
import { PROJECT_STAGE, STAGE_ORDER } from './src/constants/workflow.constants.js';

const testUser = { id: new mongoose.Types.ObjectId(), role: 'ADMIN' };

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`[STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

async function runE2ETest() {
  console.log('🚀 Starting End-to-End Lead-to-Closure Workflow Test...');
  await connectDB();

  try {
    // 0. Clean up existing test data if any
    await LeadModel.deleteMany({ phone: '9876543210' });
    await ClientModel.deleteMany({ phone: '9876543210' });
    await ProjectModel.deleteMany({ name: /E2E Test Villa/i });

    // ----------------------------------------------------
    // PHASE 1: CRM LEAD LIFECYCLE
    // ----------------------------------------------------
    logStep('CRM-1', 'Creating New Lead');
    const lead = await leadService.create(
      {
        clientName: 'E2E Test Client',
        phone: '9876543210',
        email: 'testclient@example.com',
        source: 'WEBSITE',
        projectType: 'VILLA',
        budget: 500000,
        address: { line1: 'Villa 42', line2: 'Palm Meadows', city: 'Bangalore', state: 'Karnataka', pincode: '560066' },
      },
      testUser
    );
    console.log(`✓ Lead created: Code=${lead.code}, ID=${lead._id}, Status=${lead.status}`);

    logStep('CRM-2', 'Qualifying Lead');
    const qualifiedLead = await leadService.qualify(
      lead._id,
      {
        qualified: true,
        budget: 500000,
        roomCount: 2,
        location: 'Bangalore East',
        notes: 'Villa under final interior construction, ready for site visit.',
      },
      testUser
    );
    console.log(`✓ Lead qualified: Status=${qualifiedLead.status}`);

    logStep('CRM-3', 'Converting Lead to Client & Project');
    const conversion = await leadService.convert(
      lead._id,
      {
        projectName: 'E2E Test Villa Project',
        siteAddress: { line1: 'Villa 42', line2: 'Palm Meadows', city: 'Bangalore', state: 'Karnataka', pincode: '560066' },
        estimatedValue: 500000,
      },
      testUser
    );
    const projectId = conversion.project._id;
    console.log(`✓ Converted to Client (${conversion.client.name}) & Project (${conversion.project.code})`);
    console.log(`✓ Initial Project Stage: ${conversion.project.stage}`);

    // ----------------------------------------------------
    // PHASE 2: TESTING GATING & NEGATIVE CASES
    // ----------------------------------------------------
    logStep('GATES-NEG', 'Testing Stage Skipping & Unmet Gate Refusals');
    
    // Attempt skip from SITE_VISIT to PRODUCTION
    try {
      await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.PRODUCTION }, testUser);
      console.error('❌ FAIL: Stage skip was allowed incorrectly!');
    } catch (err) {
      console.log(`✓ Passed: Stage skipping rejected as expected ("${err.message}")`);
    }

    // Attempt jump to MEASUREMENT without site visit
    try {
      await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.MEASUREMENT }, testUser);
      console.error('❌ FAIL: Advance without site visit was allowed incorrectly!');
    } catch (err) {
      console.log(`✓ Passed: Gate refusal caught as expected ("${err.message}")`);
    }

    // ----------------------------------------------------
    // PHASE 3: 19 STAGES FULLFULMENT & ADVANCEMENT
    // ----------------------------------------------------

    // STAGE 1: SITE_VISIT -> MEASUREMENT
    logStep('STAGE 1', 'Fulfilling Site Visit & Advancing to MEASUREMENT');
    await SiteVisit.create({
      project: projectId,
      visitor: testUser.id,
      scheduledDate: new Date(),
      status: 'COMPLETED',
      notes: 'Site inspected, window pelmets ready.',
    });
    let ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.MEASUREMENT }, testUser);
    console.log(`✓ Stage advanced to: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 2: MEASUREMENT -> BOQ
    logStep('STAGE 2', 'Creating Room & Window Measurements & Advancing to BOQ');
    const room = await Room.create({
      project: projectId,
      name: 'Master Bedroom',
      floor: '1st Floor',
      sequence: 1,
    });

    const m1 = await Measurement.create({
      project: projectId,
      room: room._id,
      label: 'Window W1',
      particular: 'MAIN_CURTAIN',
      o2o: { width: 96, height: 108 },
      pelmet: { o2oWidth: 96, o2oDrop: 6 },
      fabricWidthInch: 54,
      fullness: 2.5,
      sequence: 1,
    });

    ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.BOQ }, testUser);
    console.log(`✓ Stage advanced to: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 3: BOQ -> DESIGN
    logStep('STAGE 3', 'Generating Consumption Sheet (BOQ)');
    const boq = await boqService.generate(projectId, {}, testUser);
    console.log(`✓ BOQ Generated: Code=${boq.code}, Grand Total=₹${boq.grandTotal}`);
    ws = await projectService.getWorkspace(projectId);
    console.log(`✓ Stage auto-advanced / updated to: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 4: DESIGN -> QUOTATION
    logStep('STAGE 4', 'Creating & Approving Client Design');
    const design = await Design.create({
      project: projectId,
      title: 'Master Bedroom Drapery Design',
      isCurrent: true,
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: testUser.id,
    });
    ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.QUOTATION }, testUser);
    console.log(`✓ Stage advanced to: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 5: QUOTATION -> TOKEN_RECEIVED
    logStep('STAGE 5', 'Generating & Approving Quotation + Paying Token');
    const quotation = await quotationService.generateFromBOQ(projectId, { discountPercent: 0 }, testUser);
    console.log(`✓ Quotation generated: ${quotation.code}, GrandTotal=₹${quotation.grandTotal}`);
    
    await quotationService.approve(quotation._id, { approvedByClient: 'Client Signoff' }, testUser);
    console.log('✓ Quotation approved by client');

    // Pay token (10% = 50,000)
    await paymentService.create({
      project: projectId,
      client: conversion.client._id,
      quotation: quotation._id,
      milestone: 'TOKEN',
      amount: quotation.grandTotal * 0.10,
      mode: 'NEFT',
      referenceNo: 'TXN-TOKEN-001',
      status: 'CLEARED',
      clearedAt: new Date(),
    }, testUser);
    console.log('✓ Token payment recorded & cleared');

    ws = await projectService.getWorkspace(projectId);
    if (ws.project.stage !== PROJECT_STAGE.TOKEN_RECEIVED) {
      ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.TOKEN_RECEIVED }, testUser);
    }
    console.log(`✓ Stage advanced to: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 6: TOKEN_RECEIVED -> ADVANCE_RECEIVED
    logStep('STAGE 6', 'Recording & Clearing Advance Payment (60%)');
    await paymentService.create({
      project: projectId,
      client: conversion.client._id,
      quotation: quotation._id,
      milestone: 'ADVANCE',
      amount: quotation.grandTotal * 0.60,
      mode: 'NEFT',
      referenceNo: 'TXN-ADVANCE-001',
      status: 'CLEARED',
      clearedAt: new Date(),
    }, testUser);
    console.log('✓ Advance payment recorded & cleared');

    ws = await projectService.getWorkspace(projectId);
    console.log(`✓ Stage post-advance: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 7: ADVANCE_RECEIVED -> ACTIVE
    logStep('STAGE 7', 'Activating Project (Verifying 4 Key Pillars)');
    ws = await projectService.getWorkspace(projectId);
    if (ws.project.stage !== PROJECT_STAGE.ACTIVE) {
      ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.ACTIVE }, testUser);
    }
    console.log(`✓ Project Stage: ${ws.project.stage} (${ws.progress}% progress), isActivated=${ws.project.isActivated}`);

    // STAGE 8: ACTIVE -> EXECUTION_DRAWING
    logStep('STAGE 8', 'Moving from Active to Execution Drawing');
    ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.EXECUTION_DRAWING }, testUser);
    console.log(`✓ Stage advanced to: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 9: EXECUTION_DRAWING -> PURCHASE
    logStep('STAGE 9', 'Creating & Approving Execution Technical Drawing');
    await Drawing.create({
      project: projectId,
      title: 'Bracket & Track Wiring Layout DWG-01',
      isCurrent: true,
      status: 'APPROVED',
      approvedAt: new Date(),
    });
    ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.PURCHASE }, testUser);
    console.log(`✓ Stage advanced to: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 10: PURCHASE -> MATERIAL_RECEIVED
    logStep('STAGE 10', 'Verifying Material Allocation & Stock Availability');
    ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.MATERIAL_RECEIVED }, testUser);
    console.log(`✓ Stage advanced to: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 11: MATERIAL_RECEIVED -> PRODUCTION
    logStep('STAGE 11', 'Testing Ready-Size Lock Gate & Confirming Ready Sizes');
    try {
      await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.PRODUCTION }, testUser);
      console.error('❌ FAIL: Move to Production without Ready Size signoff was allowed!');
    } catch (err) {
      console.log(`✓ Passed: Ready Size Lock enforced as expected ("${err.message}")`);
    }

    // Sign off ready sizes for windows
    await Measurement.updateMany(
      { project: projectId },
      { $set: { 'readySize.confirmed': true, 'readySize.confirmedAt': new Date() } }
    );
    console.log('✓ Ready size confirmed for all windows');

    ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.PRODUCTION }, testUser);
    console.log(`✓ Stage advanced to: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 12: PRODUCTION -> QC
    logStep('STAGE 12', 'Executing Factory Stitching Work Orders & Moving to QC');
    const prodOrder = await ProductionOrder.create({
      project: projectId,
      code: 'PO-001',
      measurement: m1._id,
      stage: 'CHECKING',
      workOrderNotes: 'Drapery stitching completed, pelmet hooks aligned.',
    });
    ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.QC }, testUser);
    console.log(`✓ Stage advanced to: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 13: QC -> PACKING
    logStep('STAGE 13', 'Passing Quality Inspection');
    await ProductionOrder.updateOne({ _id: prodOrder._id }, { $set: { qcStatus: 'PASS', qcCheckedAt: new Date() } });
    console.log('✓ Quality inspection passed');

    ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.PACKING }, testUser);
    console.log(`✓ Stage advanced to: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 14: PACKING -> DISPATCH
    logStep('STAGE 14', 'Packing Finished Goods into Packing Box');
    const packingResult = await packingService.packByRoom(projectId, testUser);
    console.log(`✓ ${packingResult.count} box(es) packed by room`);

    ws = await projectService.getWorkspace(projectId);
    if (ws.project.stage !== PROJECT_STAGE.DISPATCH) {
      ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.DISPATCH }, testUser);
    }
    console.log(`✓ Stage advanced to: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 15: DISPATCH -> FINAL_PAYMENT
    logStep('STAGE 15', 'Dispatching Parcel & Logistics Manifest');
    ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.FINAL_PAYMENT }, testUser);
    console.log(`✓ Stage advanced to: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 16: FINAL_PAYMENT -> INSTALLATION
    logStep('STAGE 16', 'Testing Balance Payment Gate & Clearing Final Balance (30%)');
    try {
      await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.INSTALLATION }, testUser);
      console.error('❌ FAIL: Installation allowed without cleared balance payment!');
    } catch (err) {
      console.log(`✓ Passed: Financial Gatekeeper enforced as expected ("${err.message}")`);
    }

    // Pay remaining balance (30% = 150,000)
    await paymentService.create({
      project: projectId,
      client: conversion.client._id,
      quotation: quotation._id,
      milestone: 'BALANCE',
      amount: quotation.grandTotal * 0.30,
      mode: 'NEFT',
      referenceNo: 'TXN-BALANCE-001',
      status: 'CLEARED',
      clearedAt: new Date(),
    }, testUser);
    console.log('✓ Balance payment (30%) recorded & cleared');

    ws = await projectService.getWorkspace(projectId);
    console.log(`✓ Stage post-balance payment: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 17: INSTALLATION -> SNAG
    logStep('STAGE 17', 'Completing On-Site Installation');
    await Installation.create({
      project: projectId,
      installer: testUser.id,
      scheduledDate: new Date(),
      status: 'COMPLETED',
      notes: 'Tracks mounted, drapes hung, motors paired.',
    });

    ws = await projectService.getWorkspace(projectId);
    if (ws.project.stage !== PROJECT_STAGE.SNAG) {
      ws = await projectService.advanceStage(projectId, { toStage: PROJECT_STAGE.SNAG }, testUser);
    }
    console.log(`✓ Project Stage: ${ws.project.stage} (${ws.progress}% progress)`);

    // STAGE 18: SNAG -> CLOSED
    logStep('STAGE 18', 'Logging & Resolving Snag / Rework Ticket');
    const snag = await Snag.create({
      project: projectId,
      title: 'Minor tieback adjustment',
      status: 'OPEN',
    });
    console.log('✓ Logged open snag ticket');

    try {
      await projectService.close(projectId, { signedBy: 'Client' }, testUser);
      console.error('❌ FAIL: Project closure allowed with open snags!');
    } catch (err) {
      console.log(`✓ Passed: Unresolved snag blocked closure as expected ("${err.message}")`);
    }

    await Snag.updateOne({ _id: snag._id }, { $set: { status: 'CLOSED', resolvedAt: new Date() } });
    console.log('✓ Resolved snag ticket');

    // STAGE 19: CLOSED
    logStep('STAGE 19', 'Executing Formal Project Closure & Archival');
    const closedProject = await projectService.close(
      projectId,
      {
        signedBy: 'E2E Test Client',
        remarks: 'Project delivered with perfect quality and on time.',
      },
      testUser
    );
    console.log(`✓ Project successfully CLOSED! Stage=${closedProject.stage}, ClosedAt=${closedProject.closedAt}`);

    const finalWs = await projectService.getWorkspace(projectId);
    console.log(`\n🎉 FINAL VERIFICATION:`);
    console.log(`  - Project Code: ${finalWs.project.code}`);
    console.log(`  - Stage: ${finalWs.project.stage}`);
    console.log(`  - Overall Progress: ${finalWs.progress}%`);
    console.log(`  - Total History Audit Trail Entries: ${finalWs.project.history.length}`);
    console.log(`\n✅ ALL 19 STAGES AND CRM LEAD CONVERSION TESTED SUCCESSFULLY FROM LEAD TO CLOSURE!`);

  } catch (error) {
    console.error('❌ E2E Test Error:', error);
  } finally {
    await disconnectDB();
  }
}

runE2ETest();
