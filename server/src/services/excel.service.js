/**
 * CSV export. The consumption sheet started life as a spreadsheet and the office
 * still wants it in one, so this reproduces the paper layout — room-grouped rows,
 * a subtotal per area, and a project total — in a file Excel opens directly.
 *
 * Deliberately dependency-free: CSV is enough, and adding an xlsx library for
 * this would buy formatting nobody asked for.
 */

/** Quotes a field only when it needs it, and escapes embedded quotes. */
const cell = (value) => {
  if (value === undefined || value === null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const row = (values) => values.map(cell).join(',');

const toCsv = (rows) => rows.map(row).join('\r\n');

const SHEET_HEADERS = [
  'SR', 'Area', 'Floor', 'Window', 'Particular', 'Basis',
  'Width (in)', 'Height (in)', 'Rnft', 'Total parts', 'Rd off parts',
  'Ht per part (m)', 'Mtrs drapes', 'Fabric (m)', 'Blackout (m)', 'Roman sqft',
  'Stitching rnft', 'Lead band rnft', 'Motors', 'Fabric',
];

const sheetRow = (line, index) => [
  index + 1,
  line.roomName,
  line.floor,
  line.windowLabel,
  line.particularLabel,
  line.basis,
  line.width,
  line.height,
  line.rnft,
  line.totalParts,
  line.partsOverridden ? `${line.roundedParts} (set manually)` : line.roundedParts,
  line.heightPerPartM,
  line.drapeMeters,
  line.fabricMeters,
  line.blackoutMeters || '',
  line.romanSqft || '',
  line.stitchingRnft || '',
  line.leadBandRnft || '',
  line.motorQty || '',
  line.fabricName || '',
];

/**
 * @param {object} boq a saved BOQ document (or an equivalent preview payload)
 * @param {object} project the project it belongs to, for the header block
 * @returns {string} CSV text
 */
const consumptionSheetCsv = (boq, project = {}) => {
  const rows = [
    ['EMBELLISH — CONSUMPTION SHEET'],
    ['Project', project.name || '', 'Code', project.code || ''],
    ['Client', project.client?.name || '', 'Architect', project.architect?.name || ''],
    ['Sheet', boq.code || '', 'Revision', boq.revision ?? ''],
    ['Generated', new Date(boq.createdAt || Date.now()).toISOString().slice(0, 10)],
    [],
    SHEET_HEADERS,
  ];

  let sr = 0;
  const byRoom = new Map();
  (boq.lines || []).forEach((line) => {
    const key = line.roomName || 'Unassigned';
    if (!byRoom.has(key)) byRoom.set(key, []);
    byRoom.get(key).push(line);
  });

  for (const [roomName, lines] of byRoom) {
    lines.forEach((line) => {
      rows.push(sheetRow(line, sr));
      sr += 1;
    });

    const subtotal = (key) => lines.reduce((sum, line) => sum + (line[key] || 0), 0);
    rows.push([
      '', `${roomName} total`, '', '', '', '', '', '',
      subtotal('rnft'), '', subtotal('roundedParts'), '',
      Math.round(subtotal('drapeMeters') * 100) / 100,
      Math.round(subtotal('fabricMeters') * 100) / 100,
      Math.round(subtotal('blackoutMeters') * 100) / 100,
      subtotal('romanSqft'),
      subtotal('stitchingRnft'), subtotal('leadBandRnft'), subtotal('motorQty'), '',
    ]);
    rows.push([]);
  }

  const totals = boq.totals || {};
  rows.push([
    '', 'PROJECT TOTAL', '', '', '', '', '', '',
    totals.rnft, '', totals.parts, '', '',
    totals.fabricMeters, totals.blackoutMeters, totals.romanSqft,
    totals.stitchingRnft, totals.leadBandRnft, totals.motorQty, '',
  ]);

  if (boq.costLines?.length) {
    rows.push([], ['FIXED COST'], ['Particular', 'Quantity', 'Unit', 'Rate', 'Amount']);
    boq.costLines.forEach((line) =>
      rows.push([line.particular, line.quantity, line.unit, line.rate, line.amount])
    );
    rows.push(['Subtotal', '', '', '', boq.subtotal]);
    rows.push([`GST @ ${boq.gstPercent}%`, '', '', '', boq.gstAmount]);
    rows.push(['TOTAL', '', '', '', boq.grandTotal]);
  }

  return toCsv(rows);
};

export default { consumptionSheetCsv, toCsv };
export { consumptionSheetCsv, toCsv };
