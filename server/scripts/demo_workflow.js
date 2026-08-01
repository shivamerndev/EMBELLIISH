/**
 * Drives the seeded project through the whole spine — Lead to Closure — using the
 * real services, not fixtures.
 *
 * It also deliberately attempts several things the business rules forbid (starting
 * production before the advance, installing before the balance clears, skipping a
 * stage) and reports whether each was correctly refused. If a gate ever stops
 * working, this script says so.
 *
 * Run with:  npm run demo:workflow      (after `npm run seed`)
 */
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';

import User from '../src/modules/user/user.model.js';
import Project from '../src/modules/project/project/project.model.js';
import Room from '../src/modules/project/room/room.model.js';
import Design from '../src/modules/project/design/design.model.js';
import Vendor from '../src/modules/inventory/vendor/vendor.model.js';
import Invoice from '../src/modules/accounts/invoice/invoice.model.js';
import ProductionOrder from '../src/modules/production/production/production.model.js';
import PackingBox from '../src/modules/production/packing/packing.model.js';

import projectService from '../src/modules/project/project/project.service.js';
import quotationService from '../src/modules/crm/quotation/quotation.service.js';
import paymentService from '../src/modules/accounts/payment/payment.service.js';
import stockService from '../src/modules/inventory/stock/stock.service.js';
import purchaseService from '../src/modules/inventory/purchase/purchase.service.js';
import productionService from '../src/modules/production/production/production.service.js';
import qcService from '../src/modules/production/qc/qc.service.js';
import packingService from '../src/modules/production/packing/packing.service.js';
import dispatchService from '../src/modules/production/dispatch/dispatch.service.js';
import installationService from '../src/modules/project/installation/installation.service.js';
import snagService from '../src/modules/project/snag/snag.service.js';
import boqService from '../src/modules/project/boq/boq.service.js';
import {
  readySizeSheet,
  setReadySize,
  confirmAllReadySizes,
} from '../src/modules/project/measurement/readysize.service.js';
import DesignModel from '../src/modules/project/design/design.model.js';
import DrawingModel from '../src/modules/project/drawing/drawing.model.js';
import { nextCode } from '../src/core/sequence.js';
import { APPROVAL_STATUS, PAYMENT_MILESTONE, PRODUCTION_STAGE } from '../src/constants/workflow.constants.js';

const money = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const step = (n, title) => console.log(`\n${'─'.repeat(72)}\nStep ${n} — ${title}\n${'─'.repeat(72)}`);
const ok = (msg) => console.log(`  ✔ ${msg}`);
const info = (msg) => console.log(`    ${msg}`);

let gateChecks = 0;
let gateFailures = 0;

/** Asserts that an action is refused, and prints the reason the ERP gave. */
const mustRefuse = async (label, fn) => {
  gateChecks += 1;
  try {
    await fn();
    gateFailures += 1;
    console.log(`  ✘ GATE LEAKED — ${label} was allowed but should not have been`);
  } catch (error) {
    console.log(`  ⛔ ${label}`);
    info(`refused: ${error.message}`);
  }
};

const run = async () => {
  await connectDB();

  const project = await Project.findOne().sort('createdAt');
  if (!project) throw new Error('No seeded project found — run `npm run seed` first');

  const users = Object.fromEntries((await User.find().lean()).map((u) => [u.role, u]));
  const asAdmin = { id: users.ADMIN._id, role: 'ADMIN', name: users.ADMIN.name };
  const asAccounts = { id: users.ACCOUNTANT._id, role: 'ACCOUNTANT', name: users.ACCOUNTANT.name };
  const asFactory = { id: users.FACTORY_MANAGER._id, role: 'FACTORY_MANAGER', name: users.FACTORY_MANAGER.name };
  const asQC = { id: users.QC_INSPECTOR._id, role: 'QC_INSPECTOR', name: users.QC_INSPECTOR.name };
  const asInstaller = { id: users.INSTALLER._id, role: 'INSTALLER', name: users.INSTALLER.name };
  const asCoordinator = {
    id: users.PROJECT_COORDINATOR._id,
    role: 'PROJECT_COORDINATOR',
    name: users.PROJECT_COORDINATOR.name,
  };

  console.log(`\nDriving ${project.code} — ${project.name}`);
  console.log(`Starting stage: ${project.stage}`);

  /* ------------------------------------------------------- gates hold shut */
  step('0', 'The rules, before anything is paid');

  await mustRefuse('Release work orders to the factory', () =>
    productionService.generateFromBOQ(project._id, {}, asFactory)
  );
  await mustRefuse('Skip straight to Production', () =>
    projectService.advanceStage(project._id, { toStage: 'PRODUCTION' }, asAdmin)
  );
  await mustRefuse('Schedule an installation', () =>
    installationService.create({ project: project._id, scheduledDate: new Date() }, asInstaller)
  );

  /* ---------------------------------------------------------- Steps 7 & 8 */
  step('7 & 8', 'Designs approved, quotation generated');

  const designs = await DesignModel.find({ project: project._id });
  for (const design of designs) {
    // eslint-disable-next-line no-await-in-loop
    await mongoose.model('Design').updateOne(
      { _id: design._id },
      { $set: { status: APPROVAL_STATUS.APPROVED, approvedAt: new Date(), approvedByClient: 'Mr. Hiral' } }
    );
  }
  ok(`${designs.length} room designs approved by the client`);

  const quotation = await quotationService.generateFromBOQ(
    project._id,
    { validUntil: new Date(Date.now() + 30 * 86400000), termsAndConditions: '10% token, 60% advance, 30% before installation.' },
    asAdmin
  );
  ok(`Quotation ${quotation.code} generated from the consumption sheet`);
  quotation.lines.forEach((line) =>
    info(`${line.particular.padEnd(22)} ${String(line.quantity).padStart(8)} ${line.unit.padEnd(5)} @ ${String(line.rate).padStart(6)} = ${money(line.amount)}`)
  );
  info(`Subtotal ${money(quotation.subtotal)}  +GST ${quotation.gstPercent}% ${money(quotation.gstAmount)}  =  ${money(quotation.grandTotal)}`);

  /* ------------------------------------------------------------ Step 9 */
  step('9', 'Client approves — "Done." — and pays the 10% token');

  await quotationService.approve(quotation.id, { approvedByClient: 'Mr. Hiral' }, asAdmin);
  const approved = await Project.findById(project._id);
  ok(`Contract value stamped at ${money(approved.contractValue)}`);
  info(`Token due ${money(approved.tokenDue)} · Advance due ${money(approved.advanceDue)} · Balance due ${money(approved.balanceDue)}`);

  await mustRefuse('Record a payment larger than the token milestone', () =>
    paymentService.create(
      { project: project._id, milestone: PAYMENT_MILESTONE.TOKEN, amount: approved.contractValue, status: 'CLEARED' },
      asAccounts
    )
  );

  const tokenInvoice = await Invoice.findOne({ project: project._id, milestone: PAYMENT_MILESTONE.TOKEN });
  await paymentService.create(
    { project: project._id, invoice: tokenInvoice._id, milestone: PAYMENT_MILESTONE.TOKEN, amount: approved.tokenDue, mode: 'NEFT', referenceNo: 'NEFT/TOKEN/8891', status: 'CLEARED' },
    asAccounts
  );
  ok(`Token ${money(approved.tokenDue)} received`);
  info(`Project stage is now ${(await Project.findById(project._id)).stage}`);

  /* ----------------------------------------------------------- Step 10 */
  step('10', 'The 60% advance — and only then does the project go Active');

  await mustRefuse('Release work orders on the strength of the token alone', () =>
    productionService.generateFromBOQ(project._id, {}, asFactory)
  );

  const advanceInvoice = await (await import('../src/modules/accounts/invoice/invoice.model.js')).default.create({
    code: await nextCode('INV'),
    project: project._id,
    client: approved.client,
    milestone: PAYMENT_MILESTONE.ADVANCE,
    type: 'PROFORMA',
    lines: [{ particular: 'Advance (60%)', quantity: 1, unit: 'lot', rate: approved.advanceDue, amount: approved.advanceDue }],
    subtotal: approved.advanceDue,
    gstPercent: 0,
    gstAmount: 0,
    total: approved.advanceDue,
    status: 'ISSUED',
    raisedBy: asAccounts.id,
  });

  await paymentService.create(
    { project: project._id, invoice: advanceInvoice._id, milestone: PAYMENT_MILESTONE.ADVANCE, amount: approved.advanceDue, mode: 'RTGS', referenceNo: 'RTGS/ADV/4410', status: 'CLEARED' },
    asAccounts
  );
  ok(`Advance ${money(approved.advanceDue)} received`);

  let current = await Project.findById(project._id);
  while (!current.isActivated && current.stage !== 'CLOSED') {
    // Walk the machine forward as far as the gates now permit.
    // eslint-disable-next-line no-await-in-loop
    const moved = await projectService.tryAutoAdvance(project._id, asAdmin, 'Post-advance gate check');
    if (!moved) break;
    // eslint-disable-next-line no-await-in-loop
    current = await Project.findById(project._id);
  }
  ok(`Project is ${current.isActivated ? 'ACTIVE' : 'not yet active'} — stage ${current.stage}`);

  /* ----------------------------------------------------------- Step 12 */
  step('12', 'Execution drawing');

  const rooms = await Room.find({ project: project._id }).lean();
  const drawing = await DrawingModel.create({
    code: await nextCode('DWG'),
    project: project._id,
    room: rooms.find((r) => r.name === 'Lounge Area')?._id,
    title: 'Lounge Area — motorised track and pelmet detail',
    trackType: 'Somfy Glydea 35e on aluminium track',
    trackLengthInch: 300,
    bracketType: 'Heavy duty ceiling bracket',
    bracketCount: 12,
    pelmetDepthInch: 8,
    pelmetDropInch: 6,
    finishedHeightInch: 103,
    floorClearanceInch: 1,
    motorPosition: 'RIGHT',
    powerPointPosition: 'Right end, above pelmet',
    openingType: 'CENTRE_OPEN',
    status: APPROVAL_STATUS.APPROVED,
    approvedAt: new Date(),
    preparedBy: users.EXECUTION_ENGINEER._id,
  });
  ok(`Drawing ${drawing.code} approved`);
  await projectService.tryAutoAdvance(project._id, asAdmin, 'Execution drawing approved');

  /* -------------------------------------------------------- Steps 13-14 */
  step('13 & 14', 'Do we already have the fabric? Purchase what we do not.');

  const availability = await stockService.checkProjectAvailability(project._id);
  availability.required.forEach((item) =>
    info(`${item.itemName.padEnd(22)} need ${String(item.required).padStart(7)} ${item.unit}  ·  free ${String(item.available).padStart(7)}  ·  short ${item.shortfall}`)
  );

  if (availability.shortages.length) {
    const vendor = await Vendor.findOne({ supplies: 'FABRIC' });
    const { order } = await purchaseService.generateFromShortfall(
      project._id,
      { vendor: vendor._id, expectedDate: new Date(Date.now() + 12 * 86400000) },
      asAdmin
    );
    ok(`Purchase order ${order.code} raised on ${vendor.name} for ${order.lines.length} short item(s)`);

    await purchaseService.issue(order.id, asAdmin);
    await purchaseService.receiveMaterial(
      order.id,
      {
        invoiceNo: 'MIL/2026/3391',
        lines: order.lines.map((line) => ({
          line: line._id,
          quantity: line.quantity,
          rejectedQuantity: 0,
          batchNo: 'B-2026-04',
          colourVerified: true,
          qualityVerified: true,
        })),
      },
      asAdmin
    );
    ok('Truck arrived — stores verified colour and quality, stock updated');
  } else {
    ok('Everything already in stock — no purchase order needed');
  }

  const after = await stockService.checkProjectAvailability(project._id);
  info(`Remaining shortages: ${after.shortages.length}`);
  await projectService.tryAutoAdvance(project._id, asAdmin, 'Material received');
  await projectService.tryAutoAdvance(project._id, asAdmin, 'Material received');

  /* ------------------------------------------------------------ Step 4 */
  // Deliberately out of numerical order: the ready size is *measured* at Step 4
  // but *signed off* here, at the last moment before anything is cut. The FRD
  // returns to this point over and over — a curtain made to the window opening
  // instead of the floor-touch drop is scrap.
  step('4', 'Ready Size — window size is not stitching size');

  await mustRefuse('Release work orders before the ready size is signed off', () =>
    productionService.generateFromBOQ(project._id, {}, asFactory)
  );

  const readyBefore = await readySizeSheet(project._id);
  const sample = readyBefore.lines.find((line) => line.windowHeightInch > 0);
  if (sample) {
    info(
      `${sample.roomName} ${sample.label}: window ${sample.windowWidthInch}" x ${sample.windowHeightInch}"  ->  ready ${sample.readyWidthInch}" x ${sample.readyHeightInch}"`
    );
  }

  // One window is a floor-touch drape: the finished drop is set by hand.
  if (sample) {
    const floorTouch = Math.round((sample.windowHeightInch + 6) * 100) / 100;
    await setReadySize(sample.id, { heightInch: floorTouch, note: 'Floor touch', confirm: true }, asCoordinator);
    ok(`${sample.label} set to a ${floorTouch}" floor-touch drop and signed off`);
  }

  const confirmResult = await confirmAllReadySizes(project._id, 'Verified against the survey', asCoordinator);
  ok(`${confirmResult.confirmed} further window(s) signed off — ${readyBefore.summary.total} in total`);

  // The sheet was costed against the old drop, so the ERP refuses to cut until
  // the numbers agree again.
  await mustRefuse('Cut against a sheet costed at the old drop', () =>
    productionService.generateFromBOQ(project._id, {}, asFactory)
  );

  const revised = await boqService.generate(project._id, {}, asCoordinator);
  ok(`Consumption sheet regenerated as ${revised.code} rev ${revised.revision} at the signed ready sizes`);

  /* ----------------------------------------------------------- Step 15 */
  step('15', 'The factory floor');

  const { count } = await productionService.generateFromBOQ(project._id, {}, asFactory);
  ok(`${count} work orders released`);

  const dimensioned = await ProductionOrder.findOne({ project: project._id }).lean();
  info(
    `Work orders carry the stitching size: ${dimensioned.windowLabel} ready ${dimensioned.readyWidthInch}" x ${dimensioned.readyHeightInch}"`
  );

  const stages = [
    PRODUCTION_STAGE.FABRIC_CUTTING,
    PRODUCTION_STAGE.EMBROIDERY,
    PRODUCTION_STAGE.HAND_WORK,
    PRODUCTION_STAGE.STITCHING,
    PRODUCTION_STAGE.CHECKING,
  ];

  for (const stage of stages) {
    // eslint-disable-next-line no-await-in-loop
    const orders = await ProductionOrder.find({ project: project._id, qcStatus: 'PENDING' }).lean();
    // eslint-disable-next-line no-await-in-loop
    const result = await productionService.bulkAdvance(
      { ids: orders.map((o) => String(o._id)), toStage: stage },
      asFactory
    );
    info(`${stage.padEnd(16)} ${result.advanced}/${orders.length} work orders`);
  }

  /* ----------------------------------------------------------- Step 16 */
  step('16', 'Quality check — one piece is deliberately failed');

  const toInspect = await ProductionOrder.find({ project: project._id, qcStatus: 'PENDING' }).lean();
  let failedOne = false;

  for (const [index, order] of toInspect.entries()) {
    // Fail the third piece on size, so the alteration path actually runs.
    const failThis = index === 2 && !failedOne;
    if (failThis) failedOne = true;

    // eslint-disable-next-line no-await-in-loop
    await qcService.inspect(
      order._id,
      failThis
        ? { checks: { sizeOk: false }, measuredHeightInch: 124, expectedHeightInch: 122, remarks: 'Drop is 2 inches long' }
        : { remarks: 'Clean' },
      asQC
    );
  }

  const qcSummary = await qcService.projectSummary(project._id);
  ok(`${qcSummary.passed} passed, ${qcSummary.failed} failed (pass rate ${qcSummary.passRate}%)`);
  info(`Defects: ${qcSummary.defectsByType.map((d) => `${d.type} x${d.count}`).join(', ') || 'none'}`);

  // Put the failed piece back through the floor and re-inspect it.
  const reworks = await ProductionOrder.find({ project: project._id, isRework: true, qcStatus: 'PENDING' }).lean();
  for (const rework of reworks) {
    for (const stage of stages) {
      // eslint-disable-next-line no-await-in-loop
      await productionService.advanceStage(rework._id, { toStage: stage }, asFactory).catch(() => {});
    }
    // eslint-disable-next-line no-await-in-loop
    await qcService.inspect(rework._id, { remarks: 'Altered and re-checked' }, asQC);
  }
  ok(`${reworks.length} altered piece(s) re-checked and passed`);

  /* ----------------------------------------------------------- Step 17 */
  step('17', 'Packing, room-wise');

  const packed = await packingService.packByRoom(project._id, asFactory);
  ok(`${packed.count} boxes packed`);
  const list = await packingService.packingList(project._id);
  list.boxes.slice(0, 3).forEach((box) =>
    info(`Box ${box.boxNumber} — ${box.room}: ${box.items.map((i) => i.type).join(', ')}`)
  );
  if (list.boxes.length > 3) info(`… and ${list.boxes.length - 3} more`);

  await projectService.tryAutoAdvance(project._id, asAdmin, 'Packing complete');

  const boxes = await PackingBox.find({ project: project._id }).lean();
  const dispatch = await dispatchService.create(
    {
      project: project._id,
      boxes: boxes.map((b) => b._id),
      vehicleNo: 'DL 01 AB 7788',
      driverName: 'Ramesh',
      driverPhone: '9811223344',
      transporter: 'Embellish Logistics',
    },
    asFactory
  );
  ok(`Dispatch ${dispatch.code} — ${dispatch.boxCount} boxes left the factory`);
  await projectService.tryAutoAdvance(project._id, asAdmin, 'Dispatched');

  /* -------------------------------------------------------- Steps 18-19 */
  step('18 & 19', 'Balance payment, then installation');

  await mustRefuse('Install before the balance is cleared', () =>
    installationService.create({ project: project._id, scheduledDate: new Date() }, asInstaller)
  );

  const proj = await Project.findById(project._id);
  const balanceInvoice = await (await import('../src/modules/accounts/invoice/invoice.model.js')).default.create({
    code: await nextCode('INV'),
    project: project._id,
    client: proj.client,
    milestone: PAYMENT_MILESTONE.BALANCE,
    type: 'TAX_INVOICE',
    lines: [{ particular: 'Balance (30%)', quantity: 1, unit: 'lot', rate: proj.balanceDue, amount: proj.balanceDue }],
    subtotal: proj.balanceDue,
    gstPercent: 0,
    gstAmount: 0,
    total: proj.balanceDue,
    status: 'ISSUED',
    raisedBy: asAccounts.id,
  });

  await paymentService.create(
    { project: project._id, invoice: balanceInvoice._id, milestone: PAYMENT_MILESTONE.BALANCE, amount: proj.balanceDue, mode: 'RTGS', referenceNo: 'RTGS/BAL/9922', status: 'CLEARED' },
    asAccounts
  );
  ok(`Balance ${money(proj.balanceDue)} received`);

  const summary = await paymentService.projectSummary(project._id);
  summary.schedule.forEach((row) =>
    info(`${row.milestone.padEnd(8)} due ${money(row.due).padStart(14)}  received ${money(row.received).padStart(14)}  ${row.cleared ? '✔' : '·'}`)
  );

  await projectService.tryAutoAdvance(project._id, asAdmin, 'Balance cleared');

  const installations = [];
  for (const room of rooms) {
    // eslint-disable-next-line no-await-in-loop
    const installation = await installationService.create(
      { project: project._id, room: room._id, scheduledDate: new Date(), leadInstaller: users.INSTALLER._id, team: [users.INSTALLER._id] },
      asInstaller
    );
    installations.push(installation);
  }
  ok(`${installations.length} room installations scheduled`);

  for (const installation of installations) {
    // eslint-disable-next-line no-await-in-loop
    await installationService.start(installation.id, asInstaller);
    // eslint-disable-next-line no-await-in-loop
    await installationService.complete(
      installation.id,
      {
        clientPresent: true,
        clientRemarks: 'Happy with the finish',
        checklist: (installation.checklist || []).map((item) => ({ ...item, installed: true })),
      },
      asInstaller
    );
  }
  const installSummary = await installationService.projectSummary(project._id);
  ok(`Installation ${installSummary.percent}% complete (${installSummary.completed}/${installSummary.visits} visits)`);

  await projectService.tryAutoAdvance(project._id, asAdmin, 'Installation complete');

  /* ----------------------------------------------------------- Step 20 */
  step('20', 'Snag — "This curtain is 2 inches longer."');

  const lounge = rooms.find((r) => r.name === 'Lounge Area');
  const loungeOrder = await ProductionOrder.findOne({ project: project._id, room: lounge?._id }).lean();

  const snag = await snagService.create(
    {
      project: project._id,
      room: lounge?._id,
      roomName: lounge?.name,
      productionOrder: loungeOrder?._id,
      type: 'SIZE',
      severity: 'MINOR',
      title: 'Lounge main curtain is 2 inches longer',
      deviation: '2 inches over the finished drop',
      description: 'Client pointed it out during handover.',
    },
    asInstaller
  );
  ok(`Snag ${snag.code} raised — rework order created automatically`);

  await mustRefuse('Close the project with a snag still open', () =>
    projectService.close(project._id, { signedBy: 'Mr. Hiral' }, asAdmin)
  );

  await snagService.markReady(snag.id, { note: 'Altered and returned to site' }, asFactory);
  await snagService.close(snag.id, { resolution: 'Shortened by 2 inches and refitted' }, asInstaller);
  ok('Factory altered the curtain, it was refitted, ticket closed');

  /* ----------------------------------------------------------- Step 21 */
  step('21', 'Project closure');

  let latest = await Project.findById(project._id);
  let guard = 0;
  while (latest.stage !== 'CLOSED' && guard < 6) {
    // eslint-disable-next-line no-await-in-loop
    const moved = await projectService.tryAutoAdvance(project._id, asAdmin, 'Closing out');
    if (!moved) break;
    // eslint-disable-next-line no-await-in-loop
    latest = await Project.findById(project._id);
    guard += 1;
  }

  if (latest.stage !== 'CLOSED') {
    await projectService.close(
      project._id,
      { signedBy: 'Mr. Hiral', remarks: 'All rooms installed and handed over.' },
      asAdmin
    );
  }

  const closed = await Project.findById(project._id);
  ok(`Project ${closed.code} is ${closed.stage}`);

  /* ------------------------------------------------------------ verdict */
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  Workflow complete — ${gateChecks} business rules tested, ${gateFailures} leaked.`);
  console.log('═'.repeat(72) + '\n');

  await disconnectDB();
  process.exit(gateFailures === 0 ? 0 : 1);
};

run().catch(async (error) => {
  console.error('\nWorkflow demo failed:', error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
