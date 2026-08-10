import mongoose from 'mongoose';
import Lead from '../modules/crm/lead/lead.model.js';
import Client from '../modules/crm/client/client.model.js';
import Project from '../modules/project/project/project.model.js';
import Room from '../modules/project/room/room.model.js';
import Measurement from '../modules/project/measurement/measurement.model.js';
import Vendor from '../modules/inventory/vendor/vendor.model.js';
import Fabric from '../modules/inventory/fabric/fabric.model.js';
import Accessory from '../modules/inventory/accessory/accessory.model.js';
import Stock from '../modules/inventory/stock/stock.model.js';
import dns from 'dns';
import dotenv from 'dotenv';

dns.setServers(['8.8.8.8']);
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Real data derived from client consumption sheet (Mr. Hiral - Buglow - 1, 09.04.2026)
const TEST_DATA = {
  lead: {
    code: 'LEAD-MHB-001',
    clientName: 'Mr. Hiral',
    companyName: 'Hiral Enterprises',
    phone: '+91-9876543210',
    email: 'hiral@example.com',
    source: 'DCM',
    location: 'Delhi',
    priority: 'HOT',
    projectType: 'BUNGALOW',
    budget: 749650,
    roomCount: 7,
    requirement: 'Full bungalow luxury drapery, blackout lining, Roman blinds & wooden blinds',
    status: 'CONVERTED',
    address: { line1: 'Bungalow 1, Civil Lines', city: 'Delhi', state: 'Delhi', pincode: '110054' },
  },
  client: {
    code: 'CLI-MHB-001',
    name: 'Mr. Hiral',
    company: 'Hiral Enterprises',
    phone: '+91-9876543210',
    email: 'hiral@example.com',
    gstin: '07AAAAA0000A1Z5',
    billingAddress: { line1: 'Bungalow 1, Civil Lines', city: 'Delhi', state: 'Delhi', pincode: '110054' },
    siteAddress: { line1: 'Bungalow 1, Civil Lines', city: 'Delhi', state: 'Delhi', pincode: '110054' },
  },
  project: {
    name: 'Mr. Hiral - Buglow - 1',
    code: 'MHB001',
    projectType: 'BUNGALOW',
    stage: 'BOQ',
    siteAddress: { line1: 'Bungalow 1, Civil Lines', city: 'Delhi', state: 'Delhi', pincode: '110054' },
    estimatedValue: 749650,
    contractValue: 749650,
    consumptionConfig: {
      readyWidthAllowanceInch: 0,
      readyDropAllowanceInch: 0,
      fullness: 2.5,
      sheerFullness: 2.5,
      romanFullness: 1,
      fabricWidthInch: 50,
      romanFabricWidthInch: 45,
      heightAllowanceInch: 12,
      romanHeightAllowanceInch: 10,
      patternRepeatAllowanceM: 0,
      wastagePercent: 0,
    },
    rateCard: {
      blackoutFabricRate: 395,
      curtainStitchingRate: 1350,
      leadBandRate: 125,
      romanStitchingRate: 500,
      gstPercent: 0,
    },
  },
  vendors: [
    {
      code: 'VND-FAB-001',
      name: "D'Decor Fabrics Ltd",
      contactPerson: 'Rajesh Kumar',
      phone: '+91-9811122233',
      email: 'orders@ddecor.com',
      supplies: ['FABRIC', 'BLACKOUT'],
      address: { line1: 'Okhla Industrial Area', city: 'Delhi', state: 'Delhi', pincode: '110020' },
      leadTimeDays: 5,
      rating: 5,
    },
    {
      code: 'VND-ACC-001',
      name: 'Supreme Hardware & Accessories',
      contactPerson: 'Amit Sharma',
      phone: '+91-9822233344',
      email: 'info@supremehardware.com',
      supplies: ['LEAD_BAND', 'TRACK', 'ACCESSORY'],
      address: { line1: 'Kirti Nagar Furniture Market', city: 'Delhi', state: 'Delhi', pincode: '110015' },
      leadTimeDays: 3,
      rating: 4,
    },
  ],
  fabrics: [
    {
      code: 'FAB-MAIN-001',
      name: 'Royal Velvet Drapes (Main Curtain)',
      brand: "D'Decor",
      colour: 'Beige',
      type: 'MAIN',
      widthInch: 54,
      usableWidthInch: 50,
      purchaseRate: 850,
      sellingRate: 1350,
    },
    {
      code: 'FAB-SHEER-001',
      name: 'Italian Organza (Sheer Curtain)',
      brand: "D'Decor",
      colour: 'Off-White',
      type: 'SHEER',
      widthInch: 54,
      usableWidthInch: 50,
      purchaseRate: 750,
      sellingRate: 1200,
    },
    {
      code: 'FAB-BLK-001',
      name: 'Heavy 3-Pass Blackout Lining',
      brand: "D'Decor",
      colour: 'Grey',
      type: 'BLACKOUT',
      widthInch: 54,
      usableWidthInch: 50,
      purchaseRate: 250,
      sellingRate: 395,
    },
    {
      code: 'FAB-ROMAN-001',
      name: 'Textured Linen Blend (Roman)',
      brand: "D'Decor",
      colour: 'Warm Cream',
      type: 'ROMAN',
      widthInch: 48,
      usableWidthInch: 45,
      purchaseRate: 600,
      sellingRate: 950,
    },
  ],
  accessories: [
    {
      code: 'ACC-LB-001',
      name: 'Heavy Zinc Lead Weight Band',
      category: 'LEAD_BAND',
      unit: 'rnft',
      purchaseRate: 80,
      sellingRate: 125,
    },
    {
      code: 'ACC-TRK-001',
      name: 'Aluminum Powder Coated Track',
      category: 'TRACK',
      unit: 'rnft',
      purchaseRate: 200,
      sellingRate: 350,
    },
    {
      code: 'ACC-RMN-001',
      name: 'Roman Blind Chain & Headrail Kit',
      category: 'CHAIN',
      unit: 'pcs',
      purchaseRate: 320,
      sellingRate: 500,
    },
  ],
  rooms: [
    { name: 'Children Room', floor: '02nd Floor', sequence: 1 },
    { name: 'Walking Area', floor: '02nd Floor', sequence: 2 },
    { name: 'Bathroom', floor: '02nd Floor', sequence: 3 },
    { name: 'T.V. Room', floor: '02nd Floor', sequence: 4 },
    { name: 'Master Room - 2', floor: '02nd Floor', sequence: 5 },
    { name: 'Dressing Area', floor: '02nd Floor', sequence: 6 },
    { name: 'Lounge Area', floor: '03rd Floor', sequence: 7 },
  ],
  windows: [
    { roomIndex: 0, particular: 'MAIN_CURTAIN', label: 'Main Curtain', o2o: { width: 236.2, height: 121.9 }, pelmet: { o2oWidth: 10, o2oDrop: 6 }, fabricWidthInch: 50, fullness: 2.5, sequence: 1 },
    { roomIndex: 0, particular: 'SHEER_CURTAIN', label: 'Sheer Curtain', o2o: { width: 236.2, height: 121.9 }, fabricWidthInch: 50, fullness: 2.5, sequence: 2 },
    { roomIndex: 1, particular: 'ROMAN_BLIND', label: 'Main Roman', o2o: { width: 52.75, height: 119.1 }, pelmet: { o2oWidth: 5, o2oDrop: 6 }, fabricWidthInch: 45, fullness: 1, sequence: 3 },
    { roomIndex: 2, particular: 'WOODEN_BLIND', label: 'wooden blind', o2o: { width: 48, height: 120 }, sequence: 4 },
    { roomIndex: 3, particular: 'MAIN_CURTAIN', label: 'W1 Main Curtain', o2o: { width: 143.6, height: 121.8 }, pelmet: { o2oWidth: 9, o2oDrop: 6 }, partsOverride: 10, fabricWidthInch: 50, fullness: 2.5, sequence: 5 },
    { roomIndex: 4, particular: 'MAIN_CURTAIN', label: 'Main Curtain', o2o: { width: 157.5, height: 122.4 }, pelmet: { o2oWidth: 6.5, o2oDrop: 6 }, partsOverride: 8, fabricWidthInch: 50, fullness: 2.5, sequence: 6 },
    { roomIndex: 4, particular: 'SHEER_CURTAIN', label: 'Sheer Curtain', f2f: { width: 135.5, height: 120.5 }, pelmet: { f2fWidth: 5 }, partsOverride: 8, fabricWidthInch: 50, fullness: 2.5, sequence: 7 },
    { roomIndex: 5, particular: 'ROMAN_BLIND', label: 'Main Roman', o2o: { width: 48.8, height: 121.3 }, pelmet: { o2oWidth: 3.5, o2oDrop: 6 }, fabricWidthInch: 45, fullness: 1, sequence: 8 },
    { roomIndex: 2, particular: 'WOODEN_BLIND', label: 'wooden blind', o2o: { width: 32.8, height: 114.5 }, pelmet: { o2oWidth: 8, o2oDrop: 1 }, sequence: 9 },
    { roomIndex: 2, particular: 'WOODEN_BLIND', label: 'wooden blind', o2o: { width: 26.3, height: 114.2 }, pelmet: { o2oWidth: 11, o2oDrop: 1 }, sequence: 10 },
    { roomIndex: 6, particular: 'SHEER_CURTAIN', label: 'W1 Sheer Curtain', o2o: { width: 179.8, height: 121.7 }, fabricWidthInch: 50, fullness: 2.5, sequence: 11 },
    { roomIndex: 6, particular: 'SHEER_CURTAIN', label: 'W2 Sheer Curtain', o2o: { width: 283.9, height: 116.4 }, fabricWidthInch: 50, fullness: 2.5, sequence: 12 },
    { roomIndex: 6, particular: 'MAIN_CURTAIN', label: 'W2 Main Curtain', o2o: { width: 300, height: 103.3 }, wire: { right: false }, fabricWidthInch: 50, fullness: 2.5, sequence: 13 },
    { roomIndex: 6, particular: 'ROMAN_BLIND', label: 'Main Roman Pc 8', o2o: { width: 33.4, height: 103.3 }, wire: { left: true }, fabricWidthInch: 45, fullness: 1, sequence: 14 },
    { roomIndex: 6, particular: 'ROMAN_BLIND', label: 'Main Roman Pc 9', o2o: { width: 35.6, height: 103.3 }, wire: { left: true }, fabricWidthInch: 45, fullness: 1, sequence: 15 },
  ],
};

async function seed() {
  try {
    console.log(' Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected ✓\n');

    // 1. Create Vendors
    console.log('📦 [1/6] Seeding Vendors...');
    const vendorMap = {};
    for (const vData of TEST_DATA.vendors) {
      let vendor = await Vendor.findOne({ code: vData.code });
      if (!vendor) {
        vendor = await Vendor.create(vData);
        console.log(`  ✓ Created Vendor: ${vendor.name} (${vendor.code})`);
      } else {
        console.log(`  ✓ Vendor exists: ${vendor.name}`);
      }
      vendorMap[vData.code] = vendor;
    }

    // 2. Create Fabric & Accessory Inventory Catalogues
    console.log('\n🎨 [2/6] Seeding Fabric & Accessory Catalogues...');
    const fabricMap = {};
    for (const fData of TEST_DATA.fabrics) {
      let fabric = await Fabric.findOne({ code: fData.code });
      const vendor = vendorMap['VND-FAB-001'];
      if (!fabric) {
        fabric = await Fabric.create({ ...fData, vendor: vendor._id });
        console.log(`  ✓ Created Fabric: ${fabric.name} (${fabric.code})`);
      } else {
        console.log(`  ✓ Fabric exists: ${fabric.name}`);
      }
      fabricMap[fData.code] = fabric;
    }

    const accessoryMap = {};
    for (const aData of TEST_DATA.accessories) {
      let acc = await Accessory.findOne({ code: aData.code });
      const vendor = vendorMap['VND-ACC-001'];
      if (!acc) {
        acc = await Accessory.create({ ...aData, vendor: vendor._id });
        console.log(`  ✓ Created Accessory: ${acc.name} (${acc.code})`);
      } else {
        console.log(`  ✓ Accessory exists: ${acc.name}`);
      }
      accessoryMap[aData.code] = acc;
    }

    // 3. Create Stock Inventory Levels and Reservations
    console.log('\n🏬 [3/6] Seeding Stock & Stock Reservations...');
    const stockItems = [
      { itemType: 'Fabric', item: fabricMap['FAB-BLK-001']._id, itemName: fabricMap['FAB-BLK-001'].name, quantity: 500, reserved: 390, unit: 'mtr', warehouse: 'MAIN', batchNo: 'BLK-2026-04' },
      { itemType: 'Fabric', item: fabricMap['FAB-MAIN-001']._id, itemName: fabricMap['FAB-MAIN-001'].name, quantity: 450, reserved: 305, unit: 'mtr', warehouse: 'MAIN', batchNo: 'SAT-2026-04' },
      { itemType: 'Fabric', item: fabricMap['FAB-SHEER-001']._id, itemName: fabricMap['FAB-SHEER-001'].name, quantity: 400, reserved: 180, unit: 'mtr', warehouse: 'MAIN', batchNo: 'SHE-2026-04' },
      { itemType: 'Accessory', item: accessoryMap['ACC-LB-001']._id, itemName: accessoryMap['ACC-LB-001'].name, quantity: 600, reserved: 336, unit: 'rnft', warehouse: 'MAIN', batchNo: 'LDB-2026-04' },
    ];

    for (const stockData of stockItems) {
      let stock = await Stock.findOne({ itemType: stockData.itemType, item: stockData.item, warehouse: stockData.warehouse, batchNo: stockData.batchNo });
      if (!stock) {
        stock = await Stock.create(stockData);
        console.log(`  ✓ Stock Created: ${stock.itemName} | Total: ${stock.quantity} ${stock.unit} | Reserved: ${stock.reserved} ${stock.unit}`);
      } else {
        await Stock.updateOne({ _id: stock._id }, { $set: stockData });
        console.log(`  ✓ Stock Updated: ${stock.itemName} | Available: ${stockData.quantity - stockData.reserved} ${stockData.unit}`);
      }
    }

    // 4. Create Lead & Client
    console.log('\n👥 [4/6] Seeding Lead & Client...');
    let lead = await Lead.findOne({ phone: TEST_DATA.lead.phone });
    if (!lead) {
      lead = await Lead.create(TEST_DATA.lead);
      console.log(`  ✓ Lead Created: ${lead.clientName} (${lead.code})`);
    } else {
      console.log(`  ✓ Lead Exists: ${lead.clientName} (${lead.code})`);
    }

    let client = await Client.findOne({ phone: TEST_DATA.client.phone });
    if (!client) {
      client = await Client.create({ ...TEST_DATA.client, sourceLead: lead._id });
      console.log(`  ✓ Client Created: ${client.name} (${client.code})`);
    } else {
      console.log(`  ✓ Client Exists: ${client.name}`);
    }

    // Link client & lead
    if (!lead.convertedClient) {
      await Lead.updateOne({ _id: lead._id }, { $set: { convertedClient: client._id } });
    }

    // 5. Create Project & Rooms & Measurements
    console.log('\n🏗️ [5/6] Seeding Project, Rooms & Measurements...');
    let project = await Project.findOne({ code: TEST_DATA.project.code });
    if (!project) {
      project = await Project.create({
        ...TEST_DATA.project,
        client: client._id,
        lead: lead._id,
      });
      console.log(`  ✓ Project Created: ${project.name} (${project.code})`);
    } else {
      await Project.updateOne({ _id: project._id }, { $set: { ...TEST_DATA.project, client: client._id, lead: lead._id } });
      project = await Project.findById(project._id);
      console.log(`  ✓ Project Updated: ${project.name} (${project.code})`);
    }

    // Update lead with convertedProject
    await Lead.updateOne({ _id: lead._id }, { $set: { convertedProject: project._id } });

    // Seed Rooms
    const rooms = [];
    for (const roomData of TEST_DATA.rooms) {
      let room = await Room.findOne({ project: project._id, name: roomData.name });
      if (!room) {
        room = await Room.create({ ...roomData, project: project._id });
        console.log(`    ✓ Room Created: ${room.name} (${room.floor} Floor)`);
      } else {
        await Room.updateOne({ _id: room._id }, { $set: { floor: roomData.floor, sequence: roomData.sequence } });
        room = await Room.findById(room._id);
        console.log(`    ✓ Room Updated: ${room.name} (${room.floor})`);
      }
      rooms.push(room);
    }

    // Seed Measurements / Windows
    await Measurement.deleteMany({ project: project._id });
    for (const windowData of TEST_DATA.windows) {
      const room = rooms[windowData.roomIndex];
      const label = windowData.label || `Window ${windowData.sequence}`;

      const payload = {
        project: project._id,
        room: room._id,
        particular: windowData.particular,
        label,
        o2o: windowData.o2o || null,
        f2f: windowData.f2f || null,
        pelmet: windowData.pelmet || null,
        wire: windowData.wire || null,
        partsOverride: windowData.partsOverride || null,
        sequence: windowData.sequence,
        fabricWidthInch: windowData.fabricWidthInch || 50,
        fullness: windowData.fullness || 2.5,
      };

      await Measurement.create(payload);
    }
    console.log(`  ✓ Created 15 Measurement lines across ${rooms.length} rooms`);

    // 6. Generate Consumption Sheet (BOQ)
    console.log('\n📄 [6/6] Generating Consumption Sheet (BOQ)...');
    const boqServiceModule = await import('../modules/project/boq/boq.service.js');
    const boqService = boqServiceModule.default;
    const boq = await boqService.generate(project._id, { notes: 'Seeded from Mr. Hiral reference consumption sheet' });
    console.log(`  ✓ BOQ Generated: ${boq.code} | Grand Total: ₹${boq.grandTotal}`);

    console.log('\n==================================================');
    console.log('✅ ALL SEED DATA SUCCESSFULLY GENERATED & LINKED');
    console.log('==================================================');
    console.log(`  Lead ID      : ${lead._id}`);
    console.log(`  Client ID    : ${client._id}`);
    console.log(`  Project ID   : ${project._id} (${project.code})`);
    console.log(`  Vendors      : ${TEST_DATA.vendors.length}`);
    console.log(`  Fabrics      : ${TEST_DATA.fabrics.length}`);
    console.log(`  Accessories  : ${TEST_DATA.accessories.length}`);
    console.log(`  Stock Items  : ${stockItems.length}`);
    console.log(`  BOQ Grand Tot: ₹${boq.grandTotal}`);

    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed execution failed:', error);
    process.exit(1);
  }
}

seed();


