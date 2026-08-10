import mongoose from 'mongoose';
import BOQ from '../modules/project/boq/boq.model.js';
import Project from '../modules/project/project/project.model.js';
import dns from 'dns';
import dotenv from 'dotenv';

dns.setServers(['8.8.8.8']);
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const REFERENCE_VALUES = {
  totalRnft: 142.00,
  totalFabricMeters: 304.50,
  totalBlackoutMeters: 159.50,
  totalRomanSqft: 224.00,
  subtotal: 384452.50,
  gstPercent: 18,
  grandTotal: 453653.95,
  costLines: [
    { particular: 'Blackout fabric', rate: 395, quantity: 159.50, amount: 63002.50 },
    { particular: 'Curtain stitching', rate: 1350, quantity: 142.00, amount: 191700.00 },
    { particular: 'Lead band', rate: 125, quantity: 142.00, amount: 17750.00 },
    { particular: 'Roman stitching', rate: 500, quantity: 224.00, amount: 112000.00 },
  ],
};

function assertEqual(actual, expected, label, tolerance = 0.05) {
  const diff = Math.abs(actual - expected);
  const percent = (diff / expected) * 100;
  const pass = diff <= tolerance;

  const status = pass ? '✓' : '✗';
  const msg = `${status} ${label}: ${actual} (expected: ${expected})`;

  if (!pass) {
    console.error(`  ${msg} [diff: ${diff}, ${percent.toFixed(2)}%]`);
  } else {
    console.log(`  ${msg}`);
  }

  return pass;
}

async function validate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected ✓\n');

    // Find the test project's BOQ
    console.log('Finding test consumption sheet...');
    const project = await Project.findOne({ code: 'MHB001' }).lean();
    let boq = null;
    if (project) {
      boq = await BOQ.findOne({ project: project._id, isCurrent: true }).lean();
    }

    if (!boq) {
      console.error('❌ No BOQ found for project MHB001');
      console.error('   Please run: node --loader dotenv/config src/seeds/consumption-test.seed.js');
      console.error('   Then generate the sheet in the UI or via API');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✓ Found BOQ: ${boq.code} (Rev ${boq.revision})\n`);

    // Validate totals
    console.log('=== TOTALS VALIDATION ===');
    let totalsPassed = true;
    totalsPassed &= assertEqual(boq.totals.rnft, REFERENCE_VALUES.totalRnft, 'Total Rnft');
    totalsPassed &=
      assertEqual(
        boq.totals.fabricMeters,
        REFERENCE_VALUES.totalFabricMeters,
        'Total Fabric Meters',
        0.5
      );
    totalsPassed &=
      assertEqual(
        boq.totals.blackoutMeters,
        REFERENCE_VALUES.totalBlackoutMeters,
        'Total Blackout Meters',
        0.5
      );
    totalsPassed &=
      assertEqual(boq.totals.romanSqft, REFERENCE_VALUES.totalRomanSqft, 'Total Roman Sqft', 5);

    // Validate cost
    console.log('\n=== COST VALIDATION ===');
    let costPassed = true;
    costPassed &= assertEqual(boq.subtotal, REFERENCE_VALUES.subtotal, 'Subtotal');
    costPassed &= assertEqual(boq.gstPercent, REFERENCE_VALUES.gstPercent, 'GST %');
    costPassed &= assertEqual(boq.grandTotal, REFERENCE_VALUES.grandTotal, 'Grand Total', 1000);

    // Validate line items
    console.log('\n=== COST LINE ITEMS ===');
    let linesPassed = true;
    if (boq.costLines && boq.costLines.length > 0) {
      for (const expectedLine of REFERENCE_VALUES.costLines) {
        const actual = boq.costLines.find((l) => l.particular === expectedLine.particular);
        if (!actual) {
          console.error(`✗ Missing line item: ${expectedLine.particular}`);
          linesPassed = false;
          continue;
        }
        console.log(`\n  ${expectedLine.particular}:`);
        linesPassed &= assertEqual(actual.rate, expectedLine.rate, '    Rate');
        linesPassed &= assertEqual(actual.quantity, expectedLine.quantity, '    Quantity', 5);
        linesPassed &= assertEqual(actual.amount, expectedLine.amount, '    Amount', 1000);
      }
    }

    // Summary
    console.log('\n=== VALIDATION SUMMARY ===');
    const allPassed = totalsPassed && costPassed && linesPassed;

    if (allPassed) {
      console.log('✅ ALL VALIDATIONS PASSED!');
      console.log('\nThe consumption sheet calculations match the reference sheet.');
      console.log('Ready for production use.');
    } else {
      console.log('❌ SOME VALIDATIONS FAILED');
      console.log('\nPlease review the calculation engine and measurements.');
      console.log('Reference values from: Mr. Hiral - Bunglow - 1 (09.04.2026)');
    }

    // Additional info
    console.log('\n=== BOQ DETAILS ===');
    console.log(`Code: ${boq.code}`);
    console.log(`Revision: ${boq.revision}`);
    console.log(`Status: ${boq.status}`);
    console.log(`Lines: ${boq.lines ? boq.lines.length : 0}`);
    console.log(`Rooms: ${boq.roomTotals ? boq.roomTotals.length : 0}`);
    console.log(`Generated: ${new Date(boq.createdAt).toLocaleString()}`);

    await mongoose.connection.close();
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

validate();
