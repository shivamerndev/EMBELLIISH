/**
 * Regression check for the consumption engine against the signed reference sheet
 * (docs/Cunsumption_Sheet.jpeg — Mr. Hiral, Bunglow 1, 2nd & 3rd floor).
 *
 * Run with:  npm run verify:consumption
 */
import { calculateWindow, buildConsumptionSheet } from '../src/services/consumption.service.js';
import { PARTICULAR } from '../src/constants/product.constants.js';

let failures = 0;

const check = (label, actual, expected, tolerance = 0.011) => {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (!ok) failures += 1;
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${label.padEnd(46)} got ${String(actual).padStart(8)}  want ${expected}`);
};

console.log('\nConsumption engine vs. signed reference sheet\n');

/* -- Running feet: ceil(width / 12) ------------------------------------------ */
console.log('Rnft = ceil(width / 12)');
[
  [236.2, 20], [143.6, 12], [157.5, 14], [135.5, 12],
  [179.8, 15], [283.9, 24], [300, 25],
].forEach(([width, expected]) => {
  const line = calculateWindow({ particular: PARTICULAR.MAIN_CURTAIN, o2o: { width, height: 120 } });
  check(`width ${width}"`, line.rnft, expected, 0);
});

/* -- Height per part: (height + 12") in metres -------------------------------- */
console.log('\nHt. Per Part (m) = (height + 12") x 0.0254');
[
  [121.9, 3.40], [121.8, 3.40], [122.4, 3.41],
  [121.3, 3.39], [121.7, 3.40], [116.4, 3.26], [103.3, 2.93],
].forEach(([height, expected]) => {
  const line = calculateWindow({ particular: PARTICULAR.MAIN_CURTAIN, o2o: { width: 100, height } });
  check(`height ${height}"`, line.heightPerPartM, expected);
});

/* -- Panel count: width x fullness / usable bolt width ------------------------ */
console.log('\nTotal Parts = width x 2.5 / bolt width');
[
  [236.2, 49, 12.05], [143.6, 48, 7.48], [300, 50, 15.0], [283.9, 49.8, 14.25],
].forEach(([width, fabricWidthInch, expected]) => {
  const line = calculateWindow({
    particular: PARTICULAR.MAIN_CURTAIN,
    o2o: { width, height: 120 },
    fabricWidthInch,
  });
  check(`width ${width}" on ${fabricWidthInch}" bolt`, line.totalParts, expected);
});

/* -- Drape metres: rounded parts x height per part ---------------------------- */
console.log('\nMtrs Drapes = Rd off parts x Ht. Per Part');
[
  [121.9, 12, 40.81], [121.8, 10, 33.99], [122.4, 8, 27.31],
  [121.7, 9, 30.56], [116.4, 14, 45.66], [103.3, 15, 43.93],
].forEach(([height, parts, expected]) => {
  const line = calculateWindow({
    particular: PARTICULAR.MAIN_CURTAIN,
    o2o: { width: 200, height },
    partsOverride: parts,
  });
  check(`${parts} parts x ${height}"`, line.drapeMeters, expected);
});

/* -- Blind area: ceil(w x h / 144) -------------------------------------------- */
console.log('\nRoman Sqft = ceil(width x height / 144)');
[
  [48, 120, 40], [33.4, 103.3, 24], [35.6, 103.3, 26],
].forEach(([width, height, expected]) => {
  const line = calculateWindow({ particular: PARTICULAR.ROMAN_BLIND, o2o: { width, height } });
  check(`${width}" x ${height}"`, line.romanSqft, expected, 0);
});

/* -- Sheet totals ------------------------------------------------------------- */
console.log('\nSheet totals (2nd & 3rd floor)');

// The eight drape rows that carry a running-foot figure on the sheet.
const drapeRows = [
  { roomName: 'Children Room', particular: PARTICULAR.MAIN_CURTAIN, o2o: { width: 236.2, height: 121.9 } },
  { roomName: 'Children Room', particular: PARTICULAR.SHEER_CURTAIN, o2o: { width: 236.2, height: 121.9 } },
  { roomName: 'T.V. Room', particular: PARTICULAR.MAIN_CURTAIN, o2o: { width: 143.6, height: 121.8 } },
  { roomName: 'Master Room - 2', particular: PARTICULAR.MAIN_CURTAIN, o2o: { width: 157.5, height: 122.4 } },
  { roomName: 'Master Room - 2', particular: PARTICULAR.SHEER_CURTAIN, f2f: { width: 135.5, height: 120.5 } },
  { roomName: 'Lounge Area', particular: PARTICULAR.SHEER_CURTAIN, o2o: { width: 179.8, height: 121.7 } },
  { roomName: 'Lounge Area', particular: PARTICULAR.SHEER_CURTAIN, o2o: { width: 283.9, height: 116.4 } },
  { roomName: 'Lounge Area', particular: PARTICULAR.MAIN_CURTAIN, o2o: { width: 300, height: 103.3 } },
];

// The six blind rows that carry a Roman sq ft figure.
const blindRows = [
  { roomName: 'Walking Area', particular: PARTICULAR.ROMAN_BLIND, o2o: { width: 52.75, height: 119.1 }, romanSqftOverride: 40 },
  { roomName: 'Walking Area', particular: PARTICULAR.WOODEN_BLIND, o2o: { width: 48, height: 120 } },
  { roomName: 'Dressing Area', particular: PARTICULAR.ROMAN_BLIND, o2o: { width: 48.8, height: 121.3 }, romanSqftOverride: 30 },
  { roomName: 'Dressing Area', particular: PARTICULAR.WOODEN_BLIND, o2o: { width: 32.8, height: 114.5 }, romanSqftOverride: 30 },
  { roomName: 'Lounge Area', particular: PARTICULAR.ROMAN_BLIND, o2o: { width: 33.4, height: 103.3 } },
  { roomName: 'Lounge Area', particular: PARTICULAR.ROMAN_BLIND, o2o: { width: 35.6, height: 103.3 } },
];

const sheet = buildConsumptionSheet(drapeRows);
check('total running feet (8 drape rows)', sheet.totals.rnft, 142, 0);

// Blind rows: three of the six carry a hand-adjusted area on the paper sheet, so
// compare the computed figure only where the surveyor did not override it.
const computedBlindSqft = blindRows.reduce((sum, row) => {
  const line = calculateWindow(row);
  return sum + (row.romanSqftOverride ?? line.romanSqft);
}, 0);
check('total roman sq ft (6 blind rows)', computedBlindSqft, 190, 0);

console.log(
  failures === 0
    ? '\nAll consumption checks passed — engine matches the reference sheet.\n'
    : `\n${failures} check(s) failed.\n`
);

process.exit(failures === 0 ? 0 : 1);
