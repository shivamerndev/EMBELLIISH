/**
 * Seeds the ERP with the story from the README: the architect's call, Mr. Hiral's
 * villa in Delhi, and the rooms and windows from the signed consumption sheet in
 * `docs/Cunsumption_Sheet.jpeg`.
 *
 * The project is left standing at the Consumption Sheet stage, so the workflow can
 * be driven forward by hand — quote it, take the token, take the advance, watch it
 * activate — which is the part worth seeing.
 *
 * Run with:  npm run seed
 */
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { nextCode, Counter } from '../src/core/sequence.js';

import User from '../src/modules/user/user.model.js';
import Architect from '../src/modules/crm/architect/architect.model.js';
import Client from '../src/modules/crm/client/client.model.js';
import Lead from '../src/modules/crm/lead/lead.model.js';
import FollowUp from '../src/modules/crm/followup/followup.model.js';
import Quotation from '../src/modules/crm/quotation/quotation.model.js';
import Project from '../src/modules/project/project/project.model.js';
import Room from '../src/modules/project/room/room.model.js';
import Measurement from '../src/modules/project/measurement/measurement.model.js';
import SiteVisit from '../src/modules/project/sitevisit/sitevisit.model.js';
import BOQ from '../src/modules/project/boq/boq.model.js';
import Design from '../src/modules/project/design/design.model.js';
import Drawing from '../src/modules/project/drawing/drawing.model.js';
import Installation from '../src/modules/project/installation/installation.model.js';
import Snag from '../src/modules/project/snag/snag.model.js';
import Vendor from '../src/modules/inventory/vendor/vendor.model.js';
import Fabric from '../src/modules/inventory/fabric/fabric.model.js';
import Motor from '../src/modules/inventory/motor/motor.model.js';
import Accessory from '../src/modules/inventory/accessory/accessory.model.js';
import Stock from '../src/modules/inventory/stock/stock.model.js';
import StockMovement from '../src/modules/inventory/stock/stockMovement.model.js';
import PurchaseOrder from '../src/modules/inventory/purchase/purchase.model.js';
import ProductionOrder from '../src/modules/production/production/production.model.js';
import QCCheck from '../src/modules/production/qc/qc.model.js';
import PackingBox from '../src/modules/production/packing/packing.model.js';
import Dispatch from '../src/modules/production/dispatch/dispatch.model.js';
import Invoice from '../src/modules/accounts/invoice/invoice.model.js';
import Payment from '../src/modules/accounts/payment/payment.model.js';
import Transaction from '../src/modules/accounts/transaction/transaction.model.js';
import Notification from '../src/modules/notification/notification.model.js';
import PriceItem from '../src/modules/pricing/pricing.model.js';
import Settings from '../src/modules/settings/settings.model.js';

import boqService from '../src/modules/project/boq/boq.service.js';
import settingsService from '../src/modules/settings/settings.service.js';
import { ROLES } from '../src/constants/roles.constants.js';
import { PROJECT_STAGE, LEAD_STATUS } from '../src/constants/workflow.constants.js';
import { PARTICULAR, CURTAIN_STYLE } from '../src/constants/product.constants.js';

const MODELS = [
  User, Architect, Client, Lead, FollowUp, Quotation, Project, Room, Measurement,
  SiteVisit, BOQ, Design, Drawing, Installation, Snag, Vendor, Fabric, Motor,
  Accessory, Stock, StockMovement, PurchaseOrder, ProductionOrder, QCCheck,
  PackingBox, Dispatch, Invoice, Payment, Transaction, Counter,
  Notification, PriceItem, Settings,
];

const PASSWORD = 'Embellish@2026';

const log = (message) => console.log(`  ${message}`);

const seed = async () => {
  await connectDB();

  console.log('\nClearing existing data...');
  await Promise.all(MODELS.map((model) => model.deleteMany({})));
  settingsService.invalidate();

  /* ------------------------------------------------- house rules (module 20) */
  console.log('\nWriting the house rules and the pricing master...');

  await Settings.create({
    key: 'GLOBAL',
    company: {
      name: 'Embelliish',
      legalName: 'Embelliish Interiors LLP',
      gstin: '24ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      phone: '+91 98250 00000',
      email: 'hello@embelliish.in',
      website: 'embelliish.in',
      address: { line1: '12 Design Street', line2: 'Prahlad Nagar', city: 'Ahmedabad', state: 'Gujarat', pincode: '380015' },
      bankName: 'HDFC Bank',
      bankAccount: '50200012345678',
      bankIfsc: 'HDFC0001234',
      quotationValidityDays: 15,
      termsAndConditions:
        'Prices are valid for 15 days from the date of this quotation. Fabric, once cut, is non-returnable. '
        + 'Production begins after the token and advance are received and the ready size is confirmed. '
        + 'Installation is scheduled within 7 working days of the balance clearing.',
    },
    // Step 7 — a DCM may discount up to 10% alone.
    discount: { approvalThresholdPercent: 10, maximumPercent: 25 },
    payment: { tokenPercent: 10, advancePercent: 60, balancePercent: 30, invoiceDueDays: 7 },
    tax: { gstPercent: 18 },
    notifications: {
      emailEnabled: false,
      notifyOnStageAdvance: true,
      notifyOnPayment: true,
      notifyOnQcFailure: true,
      notifyOnSnag: true,
      notifyOnLowStock: true,
    },
  });

  // Module 7 — the published rates, matching the FIXED COST block of the sheet.
  await PriceItem.insertMany(
    [
      ['FABRIC', 'Curtain fabric', 'MATERIAL', 'mtr', 2950, 2100],
      ['BLACKOUT', 'Blackout fabric', 'MATERIAL', 'mtr', 395, 240],
      ['CURTAIN_STITCHING', 'Curtain stitching', 'LABOUR', 'rnft', 1350, 800],
      ['LEAD_BAND', 'Lead band', 'MATERIAL', 'rnft', 125, 70],
      ['ROMAN_STITCHING', 'Roman stitching', 'LABOUR', 'sqft', 500, 300],
      ['TRACK', 'Track & brackets', 'HARDWARE', 'rnft', 380, 230],
      ['MOTOR', 'Motor & remote', 'HARDWARE', 'pcs', 41000, 29000],
      ['INSTALLATION', 'Installation', 'SERVICE', 'rnft', 250, 140],
    ].map(([key, particular, category, unit, rate, costRate]) => ({
      key,
      particular,
      category,
      unit,
      rate,
      costRate,
      gstPercent: 18,
      effectiveFrom: new Date(Date.now() - 30 * 86400000),
      isActive: true,
    }))
  );
  log('8 rates published, 10% discount threshold set');

  /* ---------------------------------------------------------------- people */
  console.log('\nCreating the Embellish team...');

  const team = {};
  const staff = [
    ['admin@embellish.com', 'Hitesh Sharma', ROLES.ADMIN, 'Management', 'admin'],
    ['senior.dcm@embellish.com', 'Priya Malhotra', ROLES.SENIOR_DCM, 'Sales', 'seniorDcm'],
    ['rahul@embellish.com', 'Rahul Verma', ROLES.DCM, 'Sales', 'rahul'],
    ['coordinator@embellish.com', 'Ankit Gupta', ROLES.PROJECT_COORDINATOR, 'Projects', 'coordinator'],
    ['designer@embellish.com', 'Sneha Rao', ROLES.DESIGNER, 'Design', 'designer'],
    ['execution@embellish.com', 'Imran Qureshi', ROLES.EXECUTION_ENGINEER, 'Execution', 'execution'],
    ['purchase@embellish.com', 'Deepak Jain', ROLES.PURCHASE_MANAGER, 'Purchase', 'purchase'],
    ['stores@embellish.com', 'Ravi Kumar', ROLES.STORE_KEEPER, 'Stores', 'stores'],
    ['factory@embellish.com', 'Suresh Patil', ROLES.FACTORY_MANAGER, 'Factory', 'factory'],
    ['qc@embellish.com', 'Meena Iyer', ROLES.QC_INSPECTOR, 'Quality', 'qc'],
    ['installer@embellish.com', 'Hasan Ali', ROLES.INSTALLER, 'Installation', 'installer'],
    ['accounts@embellish.com', 'Neha Bansal', ROLES.ACCOUNTANT, 'Accounts', 'accounts'],
  ];

  for (const [email, name, role, department, key] of staff) {
    // Sequential so the pre-save password hash runs per document.
    // eslint-disable-next-line no-await-in-loop
    team[key] = await User.create({ name, email, password: PASSWORD, role, department, isActive: true });
    log(`${name.padEnd(18)} ${role}`);
  }

  /* ------------------------------------------------------------- suppliers */
  console.log('\nCreating vendors and the fabric catalogue...');

  const vendors = await Vendor.insertMany([
    { code: 'VEN-0001', name: 'Milano Textiles', contactPerson: 'Aditya Shah', phone: '9820011223', supplies: ['FABRIC', 'BLACKOUT'], leadTimeDays: 12, rating: 4.5, address: { city: 'Mumbai', state: 'Maharashtra' } },
    { code: 'VEN-0002', name: 'Somfy India Distributors', contactPerson: 'Karan Mehta', phone: '9811044556', supplies: ['MOTOR', 'TRACK'], leadTimeDays: 15, rating: 4.2, address: { city: 'Gurugram', state: 'Haryana' } },
    { code: 'VEN-0003', name: 'Delhi Curtain Hardware', contactPerson: 'Vinod Arora', phone: '9891077889', supplies: ['ACCESSORY', 'TRACK', 'LEAD_BAND'], leadTimeDays: 5, rating: 4.0, address: { city: 'New Delhi', state: 'Delhi' } },
  ]);
  const [milano, somfy, hardware] = vendors;

  const fabrics = await Fabric.insertMany([
    { code: 'FAB-00001', name: 'Blue Velvet', brand: 'Milano', collectionName: 'Regale', colour: 'Royal Blue', composition: '100% Cotton Velvet', type: 'MAIN', widthInch: 54, usableWidthInch: 49, recommendedFullness: 2.5, purchaseRate: 1850, sellingRate: 2950, vendor: milano._id, reorderLevel: 50 },
    { code: 'FAB-00002', name: 'Italian Silk Drape', brand: 'Milano', collectionName: 'Toscana', colour: 'Champagne', composition: 'Silk Blend', type: 'MAIN', widthInch: 54, usableWidthInch: 50, recommendedFullness: 2.5, purchaseRate: 2400, sellingRate: 3800, vendor: milano._id, reorderLevel: 40 },
    { code: 'FAB-00003', name: 'Whisper Sheer', brand: 'Milano', collectionName: 'Aria', colour: 'Ivory', composition: 'Polyester Voile', type: 'SHEER', widthInch: 118, usableWidthInch: 48, recommendedFullness: 2.5, purchaseRate: 620, sellingRate: 1150, vendor: milano._id, reorderLevel: 80 },
    { code: 'FAB-00004', name: 'Blackout Lining', brand: 'Milano', colour: 'White', composition: '3-Pass Coated', type: 'BLACKOUT', widthInch: 54, usableWidthInch: 50, recommendedFullness: 2.5, purchaseRate: 260, sellingRate: 395, vendor: milano._id, reorderLevel: 100 },
    { code: 'FAB-00005', name: 'Textura Roman', brand: 'Milano', colour: 'Sand', composition: 'Linen Blend', type: 'ROMAN', widthInch: 54, usableWidthInch: 45, recommendedFullness: 1, purchaseRate: 980, sellingRate: 1650, vendor: milano._id, reorderLevel: 30 },
  ]);
  const [blueVelvet, italianSilk, sheer, blackout, romanFabric] = fabrics;

  const motors = await Motor.insertMany([
    { code: 'MOT-0001', name: 'Glydea 35e Curtain Motor', brand: 'Somfy', model: 'Glydea 35e', type: 'CURTAIN_TRACK', powerType: 'AC', control: ['REMOTE', 'APP'], maxWidthInch: 400, warrantyMonths: 60, purchaseRate: 26000, sellingRate: 41000, vendor: somfy._id, reorderLevel: 4 },
    { code: 'MOT-0002', name: 'Sonesse 30 Roman Motor', brand: 'Somfy', model: 'Sonesse 30', type: 'ROMAN_BLIND', powerType: 'DC', control: ['REMOTE'], maxWidthInch: 120, warrantyMonths: 36, purchaseRate: 18500, sellingRate: 29500, vendor: somfy._id, reorderLevel: 3 },
  ]);

  const accessories = await Accessory.insertMany([
    { code: 'ACC-0001', name: 'Aluminium Curtain Track', category: 'TRACK', finish: 'Anodised', unit: 'rnft', purchaseRate: 210, sellingRate: 380, vendor: hardware._id, reorderLevel: 200 },
    { code: 'ACC-0002', name: 'Lead Band 40g', category: 'LEAD_BAND', unit: 'rnft', purchaseRate: 72, sellingRate: 125, vendor: hardware._id, reorderLevel: 300 },
    { code: 'ACC-0003', name: 'Golden Tieback', category: 'TIEBACK', finish: 'Antique Gold', unit: 'pcs', purchaseRate: 850, sellingRate: 1600, vendor: hardware._id, reorderLevel: 20 },
    { code: 'ACC-0004', name: 'Heavy Duty Bracket', category: 'BRACKET', unit: 'pcs', purchaseRate: 95, sellingRate: 180, vendor: hardware._id, reorderLevel: 100 },
  ]);

  /* ------------------------------------------------------ opening stock */
  console.log('\nSetting opening stock...');

  // Deliberately short of Blue Velvet so the Step 13 purchase branch has to fire.
  const openingStock = [
    { itemType: 'Fabric', item: blueVelvet._id, itemName: blueVelvet.name, quantity: 120, unit: 'mtr', reorderLevel: 50 },
    { itemType: 'Fabric', item: italianSilk._id, itemName: italianSilk.name, quantity: 260, unit: 'mtr', reorderLevel: 40 },
    { itemType: 'Fabric', item: sheer._id, itemName: sheer.name, quantity: 340, unit: 'mtr', reorderLevel: 80 },
    { itemType: 'Fabric', item: blackout._id, itemName: blackout.name, quantity: 420, unit: 'mtr', reorderLevel: 100 },
    { itemType: 'Fabric', item: romanFabric._id, itemName: romanFabric.name, quantity: 95, unit: 'mtr', reorderLevel: 30 },
    { itemType: 'Motor', item: motors[0]._id, itemName: motors[0].name, quantity: 6, unit: 'pcs', reorderLevel: 4 },
    { itemType: 'Motor', item: motors[1]._id, itemName: motors[1].name, quantity: 2, unit: 'pcs', reorderLevel: 3 },
    { itemType: 'Accessory', item: accessories[0]._id, itemName: accessories[0].name, quantity: 480, unit: 'rnft', reorderLevel: 200 },
    { itemType: 'Accessory', item: accessories[1]._id, itemName: accessories[1].name, quantity: 610, unit: 'rnft', reorderLevel: 300 },
    { itemType: 'Accessory', item: accessories[2]._id, itemName: accessories[2].name, quantity: 34, unit: 'pcs', reorderLevel: 20 },
    { itemType: 'Accessory', item: accessories[3]._id, itemName: accessories[3].name, quantity: 210, unit: 'pcs', reorderLevel: 100 },
  ];

  const stocks = await Stock.insertMany(openingStock.map((row) => ({ ...row, warehouse: 'MAIN', reserved: 0 })));
  await StockMovement.insertMany(
    stocks.map((stock) => ({
      stock: stock._id,
      itemType: stock.itemType,
      item: stock.item,
      itemName: stock.itemName,
      type: 'IN',
      quantity: stock.quantity,
      unit: stock.unit,
      balanceAfter: stock.quantity,
      reservedAfter: 0,
      reason: 'Opening balance',
      performedBy: team.stores._id,
    }))
  );
  log(`${stocks.length} stock rows opened`);

  /* ------------------------------------------------------- Step 1: the call */
  console.log('\nStep 1-3 — the architect calls, the lead is qualified and assigned...');

  const architect = await Architect.create({
    name: 'Ar. Nikhil Sethi',
    firm: 'Sethi & Associates',
    phone: '9810022334',
    email: 'nikhil@sethiassociates.in',
    commissionPercent: 5,
    relationshipOwner: team.admin._id,
    address: { city: 'New Delhi', state: 'Delhi' },
  });

  const lead = await Lead.create({
    code: await nextCode('LEAD'),
    clientName: 'Mr. Hiral',
    phone: '9899001122',
    email: 'hiral@example.com',
    architect: architect._id,
    source: 'ARCHITECT',
    location: 'Delhi',
    address: { line1: 'Nikvo Villa, Plot 42', city: 'New Delhi', state: 'Delhi', pincode: '110057' },
    projectType: 'BUNGALOW',
    budget: 3500000,
    roomCount: 12,
    requirement: 'Luxury curtains throughout — motorised where possible, roman blinds in dressing areas.',
    status: LEAD_STATUS.QUALIFIED,
    qualifiedBy: team.seniorDcm._id,
    qualifiedAt: new Date(),
    qualificationNotes: 'Delhi. 12 rooms. Budget around ₹35 lakhs. Serious buyer, architect-led.',
    assignedDCM: team.rahul._id,
    assignedAt: new Date(),
    createdBy: team.admin._id,
    history: [
      { action: 'CREATED', to: LEAD_STATUS.NEW, note: 'Call received from Ar. Nikhil Sethi', by: team.admin._id },
      { action: 'QUALIFIED', from: LEAD_STATUS.NEW, to: LEAD_STATUS.QUALIFIED, note: '12 rooms, ₹35L budget', by: team.seniorDcm._id },
      { action: 'ASSIGNED', note: 'Rahul tum ye project handle karo', by: team.admin._id },
    ],
  });

  await FollowUp.insertMany([
    { lead: lead._id, type: 'CALL', subject: 'Qualification call', notes: 'Delhi site, 12 rooms, ₹35L budget.', outcome: 'INTERESTED', status: 'COMPLETED', completedAt: new Date(), owner: team.seniorDcm._id },
    { lead: lead._id, type: 'MEETING', subject: 'Present fabric options at the studio', scheduledAt: new Date(Date.now() + 3 * 86400000), status: 'PENDING', owner: team.rahul._id },
  ]);

  const client = await Client.create({
    code: await nextCode('CL'),
    name: 'Mr. Hiral',
    phone: '9899001122',
    email: 'hiral@example.com',
    architect: architect._id,
    sourceLead: lead._id,
    accountOwner: team.rahul._id,
    siteAddress: { line1: 'Nikvo Villa, Plot 42', city: 'New Delhi', state: 'Delhi', pincode: '110057' },
    billingAddress: { line1: 'Nikvo Villa, Plot 42', city: 'New Delhi', state: 'Delhi', pincode: '110057' },
  });

  const project = await Project.create({
    code: await nextCode('PRJ'),
    name: 'Nikvo Villa — Bunglow 1',
    client: client._id,
    architect: architect._id,
    lead: lead._id,
    siteAddress: client.siteAddress,
    projectType: 'BUNGALOW',
    assignedDCM: team.rahul._id,
    projectCoordinator: team.coordinator._id,
    designer: team.designer._id,
    executionEngineer: team.execution._id,
    installer: team.installer._id,
    estimatedValue: 3500000,
    stage: PROJECT_STAGE.SITE_VISIT,
    expectedDeliveryDate: new Date(Date.now() + 60 * 86400000),
    // Rates reproduce the FIXED COST block of the reference sheet.
    rateCard: {
      blackoutFabricRate: 395,
      curtainStitchingRate: 1350,
      leadBandRate: 125,
      romanStitchingRate: 500,
      defaultFabricRate: 2950,
      motorRate: 41000,
      trackRate: 380,
      installationRate: 250,
      gstPercent: 18,
    },
    createdBy: team.admin._id,
    history: [{ action: 'CREATED', to: PROJECT_STAGE.SITE_VISIT, by: team.admin._id }],
  });

  await Lead.updateOne(
    { _id: lead._id },
    { $set: { status: LEAD_STATUS.CONVERTED, convertedClient: client._id, convertedProject: project._id, convertedAt: new Date() } }
  );

  log(`Lead ${lead.code} → Client ${client.code} → Project ${project.code}`);

  /* ------------------------------------------------- Step 4: the site visit */
  console.log('\nStep 4 — site visit at the villa...');

  await SiteVisit.create({
    project: project._id,
    visitDate: new Date('2026-04-09'),
    attendees: [team.rahul._id, team.coordinator._id, team.installer._id],
    externalAttendees: ['Mr. Hiral', 'Ar. Nikhil Sethi'],
    ceilingHeightInch: 132,
    pelmetAvailable: true,
    wiringAvailable: true,
    falseCeiling: true,
    curtainStylePreference: 'Pinch pleat with motorised tracks in the lounge',
    roomsSurveyed: 7,
    windowsSurveyed: 14,
    observations: 'Second and third floors surveyed. Pelmets already built. Power points available on the right in the lounge.',
    status: 'COMPLETED',
    completedAt: new Date('2026-04-09'),
    conductedBy: team.rahul._id,
  });

  /* --------------------------- Step 5: the measurement sheet, from the paper */
  console.log('\nStep 5 — entering the measurement sheet...');

  const roomSpecs = [
    { name: 'Children Room', floor: '2nd Floor', sequence: 1, pelmetPresent: true },
    { name: 'Walking Area', floor: '2nd Floor', sequence: 2, pelmetPresent: true },
    { name: 'Walking Area Bathroom', floor: '2nd Floor', sequence: 3 },
    { name: 'T.V. Room', floor: '2nd Floor', sequence: 4, pelmetPresent: true },
    { name: 'Master Room - 2', floor: '2nd Floor', sequence: 5, pelmetPresent: true },
    { name: 'Dressing Area', floor: '2nd Floor', sequence: 6, pelmetPresent: true },
    { name: 'Dressing Bathroom', floor: '2nd Floor', sequence: 7 },
    { name: 'Lounge Area', floor: '3rd Floor', sequence: 8, wiringAvailable: true },
  ];

  const rooms = await Room.insertMany(
    roomSpecs.map((room) => ({ ...room, project: project._id, ceilingHeightInch: 132 }))
  );
  const roomByName = Object.fromEntries(rooms.map((room) => [room.name, room]));

  /**
   * Every row below is transcribed from the signed sheet. Where the surveyor
   * hand-adjusted a panel count, `partsOverride` records that decision so the
   * regenerated sheet reproduces the paper one rather than arguing with it.
   */
  const windowSpecs = [
    { room: 'Children Room', label: 'W1', particular: PARTICULAR.MAIN_CURTAIN, o2o: { width: 236.2, height: 121.9 }, pelmet: { o2oWidth: 10, o2oDrop: 6 }, fabric: blueVelvet._id, fabricWidthInch: 49, partsOverride: 12, wire: { left: true, right: true } },
    { room: 'Children Room', label: 'W1', particular: PARTICULAR.SHEER_CURTAIN, o2o: { width: 236.2, height: 121.9 }, pelmet: { o2oWidth: 10, o2oDrop: 6 }, fabric: sheer._id, fabricWidthInch: 49, partsOverride: 12 },
    { room: 'Walking Area', label: 'W1', particular: PARTICULAR.ROMAN_BLIND, o2o: { width: 52.75, height: 119.1 }, pelmet: { o2oWidth: 5, o2oDrop: 6 }, fabric: romanFabric._id },
    { room: 'Walking Area Bathroom', label: 'W1', particular: PARTICULAR.WOODEN_BLIND, o2o: { width: 48, height: 120 } },
    { room: 'T.V. Room', label: 'W1', particular: PARTICULAR.MAIN_CURTAIN, o2o: { width: 143.6, height: 121.8 }, pelmet: { o2oWidth: 9, o2oDrop: 6 }, fabric: blueVelvet._id, fabricWidthInch: 48, partsOverride: 10 },
    { room: 'Master Room - 2', label: 'W1', particular: PARTICULAR.MAIN_CURTAIN, o2o: { width: 157.5, height: 122.4 }, pelmet: { o2oWidth: 6.5, o2oDrop: 6 }, fabric: italianSilk._id, partsOverride: 8, motorRequired: true, motorQty: 1 },
    { room: 'Master Room - 2', label: 'W1', particular: PARTICULAR.SHEER_CURTAIN, f2f: { width: 135.5, height: 120.5 }, pelmet: { f2fDrop: 5 }, fabric: sheer._id, partsOverride: 8 },
    { room: 'Dressing Area', label: 'W1', particular: PARTICULAR.ROMAN_BLIND, o2o: { width: 48.8, height: 121.3 }, pelmet: { o2oWidth: 3.5, o2oDrop: 6 }, fabric: romanFabric._id },
    { room: 'Dressing Bathroom', label: 'W1', particular: PARTICULAR.WOODEN_BLIND, o2o: { width: 32.8, height: 114.5 }, pelmet: { o2oWidth: 8, o2oDrop: 1 } },
    { room: 'Dressing Bathroom', label: 'W2', particular: PARTICULAR.WOODEN_BLIND, o2o: { width: 26.3, height: 114.2 }, pelmet: { o2oWidth: 11, o2oDrop: 1 } },
    { room: 'Lounge Area', label: 'W1', particular: PARTICULAR.SHEER_CURTAIN, o2o: { width: 179.8, height: 121.7 }, fabric: sheer._id, partsOverride: 9 },
    { room: 'Lounge Area', label: 'W2', particular: PARTICULAR.SHEER_CURTAIN, o2o: { width: 283.9, height: 116.4 }, fabric: sheer._id, partsOverride: 14 },
    { room: 'Lounge Area', label: 'W2', particular: PARTICULAR.MOTORISED_CURTAIN, o2o: { width: 300, height: 103.3 }, fabric: blueVelvet._id, fabricWidthInch: 50, partsOverride: 15, motorRequired: true, motorQty: 1, wire: { right: true } },
    { room: 'Lounge Area', label: 'Roman Pc 8', particular: PARTICULAR.ROMAN_BLIND, o2o: { width: 33.4, height: 103.3 }, fabric: romanFabric._id },
    { room: 'Lounge Area', label: 'Roman Pc 9', particular: PARTICULAR.ROMAN_BLIND, o2o: { width: 35.6, height: 103.3 }, fabric: romanFabric._id },
  ];

  await Measurement.insertMany(
    windowSpecs.map((spec, index) => ({
      ...spec,
      project: project._id,
      room: roomByName[spec.room]._id,
      sequence: index,
      curtainStyle: CURTAIN_STYLE.PINCH_PLEAT,
      measuredBy: team.coordinator._id,
      measuredAt: new Date('2026-04-10'),
    }))
  );

  log(`${rooms.length} rooms, ${windowSpecs.length} windows entered`);

  /* ---------------------------------------- Step 6: the consumption sheet */
  console.log('\nStep 6 — generating the consumption sheet...');

  const boq = await boqService.generate(project._id, {}, team.coordinator);

  log(`${boq.code} — ${boq.lines.length} lines`);
  log(`Running feet    ${boq.totals.rnft}`);
  log(`Curtain fabric  ${boq.totals.fabricMeters} m`);
  log(`Blackout        ${boq.totals.blackoutMeters} m`);
  log(`Roman           ${boq.totals.romanSqft} sq ft`);
  log(`Estimated value ₹${Math.round(boq.grandTotal).toLocaleString('en-IN')}`);

  await Project.updateOne({ _id: project._id }, { $set: { stage: PROJECT_STAGE.BOQ } });

  /* ---------------------------------------------- Step 7/11: the designs */
  console.log('\nStep 7 & 11 — room designs prepared for the client...');

  await Design.insertMany([
    { project: project._id, room: roomByName['Master Room - 2']._id, roomName: 'Master Room - 2', title: 'Master Bedroom — Champagne Silk', fabric: italianSilk._id, fabricName: italianSilk.name, sheerFabric: sheer._id, trackType: 'Motorised aluminium track', motorised: true, motor: motors[0]._id, tieback: 'Golden Tieback', colourScheme: 'Champagne and ivory', description: 'Italian silk main drape with a whisper sheer behind, motorised track, antique gold tiebacks.', designedBy: team.designer._id },
    { project: project._id, room: roomByName['Lounge Area']._id, roomName: 'Lounge Area', title: 'Lounge — Blue Velvet', fabric: blueVelvet._id, fabricName: blueVelvet.name, sheerFabric: sheer._id, trackType: 'Motorised aluminium track', motorised: true, motor: motors[0]._id, tieback: 'Golden Tieback', colourScheme: 'Royal blue with ivory sheer', description: 'Blue velvet motorised drape across the 300" opening, roman blinds on the flanking windows.', designedBy: team.designer._id },
    { project: project._id, room: roomByName['Children Room']._id, roomName: 'Children Room', title: 'Children Room — Blue Velvet', fabric: blueVelvet._id, fabricName: blueVelvet.name, sheerFabric: sheer._id, trackType: 'Manual track', colourScheme: 'Royal blue', description: 'Blue velvet with blackout lining and a matching sheer layer.', designedBy: team.designer._id },
  ]);

  log('3 room designs drafted (awaiting client approval)');

  /* ------------------------------------------------------------------ done */
  console.log('\n' + '─'.repeat(70));
  console.log('  Seed complete.');
  console.log('─'.repeat(70));
  console.log(`\n  Project ${project.code} "${project.name}" is parked at the BOQ stage.`);
  console.log('  Drive it forward from the UI, or with the workflow script:\n');
  console.log('      npm run demo:workflow\n');
  console.log('  Sign in with any of these (password for all: ' + PASSWORD + '):\n');
  staff.forEach(([email, name, role]) => console.log(`      ${email.padEnd(30)} ${name.padEnd(18)} ${role}`));
  console.log('');

  await disconnectDB();
};

seed()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('\nSeed failed:', error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
