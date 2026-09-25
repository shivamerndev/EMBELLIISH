/**
 * consumptionPrintService.js
 * Generates and prints the Physical Consumption Sheet replicating the authentic
 * layout, typography, columns, and fixed-cost summary depicted in docs/Cunsumption_Sheet.jpeg
 * for Embellish ("Punctuating Spaces •").
 */

import { calculateRowConsumption } from '../utils/consumptionCalc.js';

const escapeHtml = (unsafe) => {
    if (unsafe == null) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Format date string to DD.MM.YYYY matching reference sheet
 */
export const formatDate = (raw) => {
    if (!raw) {
        const now = new Date();
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        return `${d}.${m}.${y}`;
    }
    if (raw instanceof Date) {
        const d = String(raw.getDate()).padStart(2, '0');
        const m = String(raw.getMonth() + 1).padStart(2, '0');
        const y = raw.getFullYear();
        return `${d}.${m}.${y}`;
    }
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
        const [y, m, d] = raw.split('T')[0].split('-');
        return `${d}.${m}.${y}`;
    }
    return String(raw);
};

/**
 * Format numbers with fixed decimals or dash if zero/empty
 */
const formatNum = (val, decimals = 2, showZeroAsDash = true) => {
    if (val === null || val === undefined || val === '') {
        return showZeroAsDash ? '—' : '';
    }
    const n = Number(val);
    if (!Number.isFinite(n)) return showZeroAsDash ? '—' : '';
    if (n === 0 && showZeroAsDash) return '—';
    return n.toFixed(decimals);
};

/**
 * Format currency with Indian grouping
 */
const formatIndianCurrency = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return '0.00';
    return n.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const PARTICULAR_MAP = {
    MAIN_CURTAIN: 'Main Curtain',
    SHEER_CURTAIN: 'Sheer Curtain',
    MOTORISED_CURTAIN: 'Motorised Curtain',
    ROMAN_BLIND: 'Roman Blind',
    WOODEN_BLIND: 'Wooden Blind',
    ROLLER_BLIND: 'Roller Blind',
    WALLPAPER: 'Wallpaper',
};

/**
 * Convert mm/cm to inches if dimension is > 400 (assumed mm) or explicitly marked mm/cm
 */
const toInches = (val, isMm = false) => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) return null;
    if ((isMm && n > 25) || n > 400) {
        return Math.round((n / 25.4) * 10) / 10;
    }
    return Math.round(n * 10) / 10;
};

/**
 * Extract clean display values for an individual row
 */
const resolveRowValues = (row = {}, index = 0) => {
    // If not already computed, run through consumption calculation engine
    const calc = calculateRowConsumption(row);

    const sr = row.sr ?? row.srNo ?? (index + 1);
    const area = row.room ?? row.area ?? row.roomName ?? '';
    const rawParticular = row.particularLabel ?? row.particular ?? row.windowType ?? 'Main Curtain';
    const mappedParticular = PARTICULAR_MAP[rawParticular] || rawParticular;
    const particular = row.windowId && !mappedParticular.includes(row.windowId)
        ? `${row.windowId} ${mappedParticular}`
        : mappedParticular;

    const isMm = String(row.unit || 'mm').toLowerCase() === 'mm';

    // Window Dimensions
    const o2oW = toInches(row.o2oWidth ?? row.outToOutWidth ?? row.o2o?.width, isMm);
    const o2oH = toInches(row.o2oHeight ?? row.outToOutHeight ?? row.o2o?.height, isMm);
    const f2fW = toInches(row.f2fWidth ?? row.frameToFrameWidth ?? row.f2f?.width ?? (!o2oW ? row.confirmedWidth ?? row.width : null), isMm);
    const f2fH = toInches(row.f2fHeight ?? row.frameToFrameHeight ?? row.f2f?.height ?? (!o2oH ? row.confirmedHeight ?? row.height : null), isMm);

    // Pelmet Dimensions
    const pO2oW = toInches(row.pelmetO2oWidth ?? row.pelmetOutOutWidth ?? row.pelmet?.o2oWidth ?? row.pelmet?.width, isMm);
    const pO2oDrop = toInches(row.pelmetO2oDrop ?? row.pelmetOutOutDrop ?? row.pelmet?.o2oDrop ?? row.pelmet?.drop, isMm);
    const pF2fW = toInches(row.pelmetF2fWidth ?? row.pelmetFrameFrameWidth ?? row.pelmet?.f2fWidth, isMm);
    const pF2fDrop = toInches(row.pelmetF2fDrop ?? row.pelmetFrameFrameDrop ?? row.pelmet?.f2fDrop, isMm);

    // Wire
    const wireRight = Boolean(row.wireRight ?? row.wire?.right ?? (row.wire === true && !row.wireLeft));
    const wireLeft = Boolean(row.wireLeft ?? row.wire?.left);

    // Calculated quantities
    const widthInches = o2oW || f2fW || 0;
    const heightInches = o2oH || f2fH || 0;
    const isRomanOrBlind = String(particular).toLowerCase().includes('roman') || String(particular).toLowerCase().includes('blind');

    let rnft = Number(row.rnft ?? calc.rnft ?? 0);
    if (!rnft && !isRomanOrBlind && widthInches > 0) {
        rnft = Math.round((widthInches / 12) * 10) / 10;
    }

    let romanSqft = Number(row.romanSqft ?? calc.romanSqft ?? 0);
    if (!romanSqft && isRomanOrBlind && widthInches > 0 && heightInches > 0) {
        romanSqft = Math.round(((widthInches * heightInches) / 144) * 10) / 10;
    }

    const totalParts = Number(row.totalParts ?? calc.totalParts ?? calc.numWidths ?? 0);
    const roundedParts = Number(row.roundedParts ?? row.numWidths ?? calc.roundedParts ?? calc.numWidths ?? (totalParts > 0 ? Math.round(totalParts) : 0));
    const htPerPart = Number(row.heightPerPartM ?? calc.heightPerPartM ?? calc.repeatCutDrop ?? 0);
    const mtrsDrapes = Number(row.drapeMeters ?? row.fabricMeters ?? calc.rawMetres ?? calc.fabricMeters ?? (roundedParts > 0 && htPerPart > 0 ? roundedParts * htPerPart : 0));

    const blackout = Number(row.blackoutMeters ?? row.blackout ?? calc.blackoutMeters ?? 0);
    const mtrsDrapesRoundOff = Number(row.orderMetres ?? row.finalOrderMetres ?? calc.orderMetres ?? calc.finalOrderMetres ?? (mtrsDrapes > 0 ? Math.ceil(mtrsDrapes * 2) / 2 : 0));

    return {
        sr,
        floor: row.floor || '',
        area,
        particular,
        o2oW,
        o2oH,
        f2fW,
        f2fH,
        pO2oW,
        pO2oDrop,
        pF2fW,
        pF2fDrop,
        wireRight,
        wireLeft,
        rnft,
        romanSqft,
        totalParts,
        roundedParts,
        htPerPart,
        mtrsDrapes,
        blackout,
        mtrsDrapesRoundOff,
    };
};

/**
 * Calculate fixed cost lines based on the sheet totals or overrides
 */
export const calculateFixedCosts = (totals = {}, customFixedCosts = null) => {
    if (Array.isArray(customFixedCosts) && customFixedCosts.length > 0) {
        return customFixedCosts;
    }

    const blackoutMtr = Number(totals.blackout || totals.blackoutMeters || 0);
    const stitchingRnft = Number(totals.rnft || 0);
    const leadBandRnft = Number(totals.leadBandRnft ?? totals.rnft ?? 0);
    const romanSqft = Number(totals.romanSqft || 0);

    const lines = [
        {
            particular: 'Blackout fabric',
            price: 395,
            quantity: blackoutMtr,
            unit: 'mtr',
            amount: blackoutMtr * 395,
        },
        {
            particular: 'Curtain stitching',
            price: 1350,
            quantity: stitchingRnft,
            unit: 'rnft',
            amount: stitchingRnft * 1350,
        },
        {
            particular: 'Lead Band',
            price: 125,
            quantity: leadBandRnft,
            unit: 'rnft',
            amount: leadBandRnft * 125,
        },
        {
            particular: 'Roman Stitching',
            price: 500,
            quantity: romanSqft,
            unit: 'rnft', // Or sqft as shown in paper sheet
            amount: romanSqft * 500,
        },
    ];

    const grandTotal = lines.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return {
        lines,
        grandTotal,
    };
};

/**
 * Builds the complete HTML string for the printable Physical Consumption Sheet
 */
export const buildConsumptionSheetHtml = ({
    header = {},
    rows = [],
    fixedCosts = null,
    floorSubtitle = '',
    remarks = '',
    preparedBy = '',
    checkedBy = '',
    isBlank = false,
}) => {
    const client = isBlank ? '' : (header.clientName || header.client || '');
    const architect = isBlank ? '' : (header.architect || '');
    const siteAddress = isBlank ? '' : (header.siteAddress || header.address || '');
    const date = isBlank ? '' : formatDate(header.date || header.boqPreparedDate || '');
    const siteVisitedBy = isBlank ? '' : (header.siteVisitedBy || header.boqPreparedBy || preparedBy || '');
    const floorHeader = floorSubtitle || header.floor || header.subtitle || (rows.length > 0 && rows[0]?.floor ? rows[0].floor : 'Ground & Upper Floors');

    // Parse rows
    const resolvedRows = isBlank ? [] : rows.map((r, i) => resolveRowValues(r, i));

    // Calculate totals
    const totals = resolvedRows.reduce(
        (acc, r) => ({
            rnft: acc.rnft + (r.rnft || 0),
            romanSqft: acc.romanSqft + (r.romanSqft || 0),
            totalParts: acc.totalParts + (r.totalParts || 0),
            roundedParts: acc.roundedParts + (r.roundedParts || 0),
            mtrsDrapes: acc.mtrsDrapes + (r.mtrsDrapes || 0),
            blackout: acc.blackout + (r.blackout || 0),
            mtrsDrapesRoundOff: acc.mtrsDrapesRoundOff + (r.mtrsDrapesRoundOff || 0),
        }),
        {
            rnft: 0,
            romanSqft: 0,
            totalParts: 0,
            roundedParts: 0,
            mtrsDrapes: 0,
            blackout: 0,
            mtrsDrapesRoundOff: 0,
        }
    );

    // Compute Fixed Cost table
    const fixedCostData = isBlank ? {
        lines: [
            { particular: 'Blackout fabric', price: 395, quantity: '', unit: 'mtr', amount: '' },
            { particular: 'Curtain stitching', price: 1350, quantity: '', unit: 'rnft', amount: '' },
            { particular: 'Lead Band', price: 125, quantity: '', unit: 'rnft', amount: '' },
            { particular: 'Roman Stitching', price: 500, quantity: '', unit: 'rnft', amount: '' },
        ],
        grandTotal: '',
    } : calculateFixedCosts(totals, fixedCosts);

    // Determine row count to fill sheet (min 13 rows for authentic look)
    const targetMinRows = 13;
    const emptyRowsCount = Math.max(0, targetMinRows - resolvedRows.length);

    // Grouping by floor if present
    let currentFloor = '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Consumption Sheet - ${escapeHtml(client || 'Embellish')}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 5mm 6mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #000;
      background: #fff;
      font-size: 10px;
      line-height: 1.2;
      padding: 0;
      margin: 0;
    }
    .sheet-wrapper {
      width: 100%;
      min-height: 195mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .sheet-frame {
      border: 1.5px solid #000;
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: #fff;
      box-sizing: border-box;
    }

    /* --- 1. HEADER SECTION --- */
    .header-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-bottom: 2px;
    }
    .brand-block {
      text-align: center;
      margin-bottom: 2px;
    }
    .brand-title {
      font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #3b2c20;
      line-height: 1;
    }
    .brand-tagline {
      font-size: 9px;
      letter-spacing: 0.22em;
      text-transform: none;
      color: #6a5342;
      margin-top: 1px;
    }

    .meta-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
      font-size: 11px;
    }
    .meta-left {
      width: 42%;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .meta-center {
      width: 25%;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      color: #222;
      padding-bottom: 2px;
    }
    .meta-right {
      width: 30%;
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: flex-end;
    }

    .meta-field {
      display: flex;
      align-items: baseline;
      width: 100%;
      gap: 4px;
    }
    .meta-label {
      font-weight: 600;
      white-space: nowrap;
      color: #000;
      font-size: 11px;
    }
    .meta-line {
      flex: 1;
      border-bottom: 1px solid #000;
      min-height: 14px;
      padding-left: 4px;
      font-weight: 500;
      font-size: 11.5px;
      color: #111;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* --- 2. MAIN CONSUMPTION TABLE --- */
    .table-container {
      width: 100%;
      box-sizing: border-box;
    }
    table.consumption-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000;
      table-layout: fixed;
    }
    table.consumption-table th,
    table.consumption-table td {
      border: 1px solid #000;
      padding: 0;
      box-sizing: border-box;
    }

    /* Table Headers */
    table.consumption-table thead th {
      background: #fff;
      color: #000;
      font-weight: 700;
      text-align: center;
      vertical-align: middle;
      line-height: 1.15;
    }
    .th-level-1 {
      height: 22px;
      font-size: 9px;
    }
    .th-level-2 {
      height: 18px;
      font-size: 8px;
      font-weight: 600;
    }

    /* Specific column widths */
    .col-sr { width: 3.5%; }
    .col-area { width: 12%; }
    .col-particular { width: 11%; }
    .col-w-sub { width: 4.5%; }
    .col-p-sub { width: 3.5%; }
    .col-wire-sub { width: 3%; }
    .col-rnft { width: 5%; }
    .col-roman { width: 5%; }
    .col-fab-sub { width: 4.25%; }

    /* Table Body */
    table.consumption-table tbody tr {
      height: 23px;
    }
    table.consumption-table tbody td {
      font-size: 10px;
      font-weight: 500;
      text-align: center;
      vertical-align: middle;
      padding: 1px 3px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: #000;
    }
    .td-left {
      text-align: left !important;
      padding-left: 5px !important;
    }
    .td-num {
      text-align: right !important;
      padding-right: 4px !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    .td-particular {
      text-align: left !important;
      padding-left: 4px !important;
      font-size: 9.5px !important;
    }

    /* Floor separator row */
    .floor-row td {
      background: #f0f0f0;
      font-weight: 700;
      text-align: center;
      font-size: 11px;
      letter-spacing: 0.05em;
      height: 21px;
    }

    /* Totals Row */
    table.consumption-table tfoot tr {
      height: 24px;
      background: #fafafa;
    }
    table.consumption-table tfoot td {
      font-weight: 700;
      font-size: 10px;
      border-top: 1.5px solid #000;
      text-align: center;
      vertical-align: middle;
      padding: 1px 3px;
    }
    .tfoot-label {
      text-align: center !important;
      font-weight: 800;
      font-size: 10px;
      letter-spacing: 0.04em;
    }

    /* --- 3. BOTTOM SECTION: FIXED COST + NOTES --- */
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-top: 4px;
    }

    /* Fixed Cost Table */
    .fixed-cost-container {
      width: 440px;
      border: 1.5px solid #000;
      box-sizing: border-box;
    }
    .fixed-cost-header {
      background: #d4d4d4;
      font-weight: 800;
      font-size: 10px;
      padding: 3px 6px;
      border-bottom: 1.5px solid #000;
      letter-spacing: 0.06em;
    }
    table.fixed-cost-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    table.fixed-cost-table th,
    table.fixed-cost-table td {
      border: 1px solid #000;
      padding: 3px 5px;
      box-sizing: border-box;
      font-size: 9.5px;
    }
    table.fixed-cost-table th {
      background: #f5f5f5;
      font-weight: 700;
      text-align: center;
    }
    .fc-th-part { width: 36%; text-align: left; }
    .fc-th-price { width: 15%; text-align: right; }
    .fc-th-qty { width: 17%; text-align: right; }
    .fc-th-unit { width: 12%; text-align: center; }
    .fc-th-amt { width: 20%; text-align: right; }

    .fc-td-num {
      text-align: right !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    .fc-total-row td {
      font-weight: 800;
      background: #fafafa;
      border-top: 1.5px solid #000;
    }

    /* Right Notes & Authorization Box */
    .notes-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1.5px solid #000;
      padding: 6px 10px;
      min-height: 122px;
      box-sizing: border-box;
    }
    .notes-title {
      font-weight: 700;
      font-size: 10px;
      margin-bottom: 4px;
      text-decoration: underline;
    }
    .notes-body {
      font-size: 9.5px;
      color: #333;
      min-height: 48px;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 10px;
      font-size: 9.5px;
      font-weight: 600;
    }
    .sig-line {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .sig-placeholder {
      width: 90px;
      border-bottom: 1px solid #000;
      height: 14px;
    }
  </style>
</head>
<body>
  <div class="sheet-wrapper">
    <div class="sheet-frame">

      <!-- 1. HEADER SECTION -->
      <div class="header-container">
        <!-- Brand Logo -->
        <div class="brand-block">
          <div class="brand-title">embellish</div>
          <div class="brand-tagline">Punctuating Spaces &bull;</div>
        </div>

        <!-- Metadata Row (Client / Subtitle / Date & Surveyor) -->
        <div class="meta-grid">
          <!-- Left: Client, Architect, Site Address -->
          <div class="meta-left">
            <div class="meta-field">
              <span class="meta-label">Client-</span>
              <span class="meta-line">${escapeHtml(client)}</span>
            </div>
            <div class="meta-field">
              <span class="meta-label">Architect-</span>
              <span class="meta-line">${escapeHtml(architect)}</span>
            </div>
            <div class="meta-field">
              <span class="meta-label">Site Address-</span>
              <span class="meta-line">${escapeHtml(siteAddress)}</span>
            </div>
          </div>

          <!-- Center: Floor / Section Subtitle -->
          <div class="meta-center">
            ${escapeHtml(floorHeader)}
          </div>

          <!-- Right: Date & Site Visited By -->
          <div class="meta-right">
            <div class="meta-field">
              <span class="meta-label">Date-</span>
              <span class="meta-line">${escapeHtml(date)}</span>
            </div>
            <div class="meta-field">
              <span class="meta-label">Site visited by-</span>
              <span class="meta-line">${escapeHtml(siteVisitedBy)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. MAIN CONSUMPTION TABLE -->
      <div class="table-container">
        <table class="consumption-table">
          <thead>
            <!-- Level 1 Headers -->
            <tr class="th-level-1">
              <th rowspan="2" class="col-sr">SR</th>
              <th rowspan="2" class="col-area">Area</th>
              <th rowspan="2" class="col-particular">Particular</th>
              <th colspan="4">Window size (In Inches)</th>
              <th colspan="4">Pelmet Size</th>
              <th colspan="2">Wire</th>
              <th rowspan="2" class="col-rnft">Rnft</th>
              <th rowspan="2" class="col-roman">Roman<br/>Sqft</th>
              <th colspan="6">Fabric requirement for curtain</th>
            </tr>
            <!-- Level 2 Sub-Headers -->
            <tr class="th-level-2">
              <!-- Window size O2O & F2F -->
              <th class="col-w-sub">O2O<br/>width</th>
              <th class="col-w-sub">O2O<br/>height</th>
              <th class="col-w-sub">F2F<br/>width</th>
              <th class="col-w-sub">F2F<br/>height</th>

              <!-- Pelmet Size O2O & F2F -->
              <th class="col-p-sub">O2O<br/>width</th>
              <th class="col-p-sub">O2O<br/>Drop</th>
              <th class="col-p-sub">F2F<br/>width</th>
              <th class="col-p-sub">F2F<br/>Drop</th>

              <!-- Wire Right & Left -->
              <th class="col-wire-sub">Right</th>
              <th class="col-wire-sub">Left</th>

              <!-- Fabric requirement -->
              <th class="col-fab-sub">Total<br/>parts</th>
              <th class="col-fab-sub">Rd off /<br/>PARTS</th>
              <th class="col-fab-sub">Ht. Per<br/>Part</th>
              <th class="col-fab-sub">Mtrs<br/>Drapes</th>
              <th class="col-fab-sub">blackout</th>
              <th class="col-fab-sub">Mtrs Drapes<br/>/ round off</th>
            </tr>
          </thead>
          <tbody>
            ${resolvedRows.map((r) => {
                let floorBanner = '';
                if (r.floor && r.floor !== currentFloor) {
                    currentFloor = r.floor;
                    floorBanner = `<tr class="floor-row"><td colspan="21">${escapeHtml(currentFloor)}</td></tr>`;
                }

                return `${floorBanner}
                <tr>
                  <td>${escapeHtml(r.sr)}</td>
                  <td class="td-left" title="${escapeHtml(r.area)}">${escapeHtml(r.area)}</td>
                  <td class="td-particular" title="${escapeHtml(r.particular)}">${escapeHtml(r.particular)}</td>
                  <td class="td-num">${r.o2oW ? r.o2oW : ''}</td>
                  <td class="td-num">${r.o2oH ? r.o2oH : ''}</td>
                  <td class="td-num">${r.f2fW ? r.f2fW : ''}</td>
                  <td class="td-num">${r.f2fH ? r.f2fH : ''}</td>
                  <td class="td-num">${r.pO2oW ? r.pO2oW : ''}</td>
                  <td class="td-num">${r.pO2oDrop ? r.pO2oDrop : ''}</td>
                  <td class="td-num">${r.pF2fW ? r.pF2fW : ''}</td>
                  <td class="td-num">${r.pF2fDrop ? r.pF2fDrop : ''}</td>
                  <td>${r.wireRight ? '✓' : ''}</td>
                  <td>${r.wireLeft ? '✓' : ''}</td>
                  <td class="td-num font-bold">${formatNum(r.rnft, 2)}</td>
                  <td class="td-num font-bold">${formatNum(r.romanSqft, 2)}</td>
                  <td class="td-num">${formatNum(r.totalParts, 2)}</td>
                  <td class="td-num font-bold">${r.roundedParts ? r.roundedParts : '—'}</td>
                  <td class="td-num">${formatNum(r.htPerPart, 2)}</td>
                  <td class="td-num font-bold">${formatNum(r.mtrsDrapes, 2)}</td>
                  <td class="td-num font-bold">${formatNum(r.blackout, 2)}</td>
                  <td class="td-num font-bold">${formatNum(r.mtrsDrapesRoundOff, 2)}</td>
                </tr>`;
            }).join('')}

            <!-- Blank filler rows matching physical paper sheet -->
            ${Array.from({ length: emptyRowsCount }).map((_, i) => `
              <tr>
                <td>${isBlank ? (i + 1) : ''}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="13" class="tfoot-label">${isBlank ? 'Total' : 'Grand Total'}</td>
              <td class="td-num">${isBlank ? '' : formatNum(totals.rnft, 2, false)}</td>
              <td class="td-num">${isBlank ? '' : formatNum(totals.romanSqft, 2, false)}</td>
              <td class="td-num"></td>
              <td class="td-num"></td>
              <td class="td-num"></td>
              <td class="td-num"></td>
              <td class="td-num">${isBlank ? '' : formatNum(totals.blackout, 2, false)}</td>
              <td class="td-num font-bold">${isBlank ? '' : formatNum(totals.mtrsDrapesRoundOff, 2, false)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- 3. BOTTOM SECTION: FIXED COST TABLE + SIGNATURES / NOTES -->
      <div class="bottom-section">
        <!-- Fixed Cost Block -->
        <div class="fixed-cost-container">
          <div class="fixed-cost-header">FIXED COST</div>
          <table class="fixed-cost-table">
            <thead>
              <tr>
                <th class="fc-th-part">PARTICULAR</th>
                <th class="fc-th-price">PRICE</th>
                <th class="fc-th-qty">QUANTITY</th>
                <th class="fc-th-unit">UNIT</th>
                <th class="fc-th-amt">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${fixedCostData.lines.map((line) => `
                <tr>
                  <td>${escapeHtml(line.particular)}</td>
                  <td class="fc-td-num">${line.price ? formatIndianCurrency(line.price) : ''}</td>
                  <td class="fc-td-num">${line.quantity !== '' && line.quantity !== null && line.quantity !== undefined ? formatNum(line.quantity, 2, false) : ''}</td>
                  <td style="text-align: center;">${escapeHtml(line.unit)}</td>
                  <td class="fc-td-num font-bold">${line.amount !== '' && line.amount !== null && line.amount !== undefined ? formatIndianCurrency(line.amount) : ''}</td>
                </tr>
              `).join('')}
              <tr class="fc-total-row">
                <td colspan="4" style="font-weight: 800; text-align: left;">TOTAL</td>
                <td class="fc-td-num font-bold">${fixedCostData.grandTotal !== '' && fixedCostData.grandTotal !== null && fixedCostData.grandTotal !== undefined ? formatIndianCurrency(fixedCostData.grandTotal) : ''}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Notes, Remarks & Signatures -->
        <div class="notes-box">
          <div>
            <div class="notes-title">Remarks &amp; Production Instructions:</div>
            <div class="notes-body">${escapeHtml(remarks || '')}</div>
          </div>
          <div class="signatures-row">
            <div class="sig-line">
              <div class="sig-placeholder"></div>
              <span>Prepared By</span>
            </div>
            <div class="sig-line">
              <div class="sig-placeholder"></div>
              <span>Checked By</span>
            </div>
            <div class="sig-line">
              <div class="sig-placeholder"></div>
              <span>Client / Approval Sign</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;
};

/**
 * Trigger print via hidden iframe to ensure 100% isolation from
 * screen styles, dark themes, and modal overflow constraints.
 */
export const consumptionPrintService = (data = {}, isBlank = false) => {
    return new Promise((resolve, reject) => {
        try {
            const html = buildConsumptionSheetHtml({ ...data, isBlank });

            // Create invisible iframe
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.style.opacity = '0';
            iframe.style.pointerEvents = 'none';
            iframe.setAttribute('title', 'Consumption Sheet Print Frame');

            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (!doc) {
                document.body.removeChild(iframe);
                window.print();
                return resolve(false);
            }

            doc.open();
            doc.write(html);
            doc.close();

            // Clean up when print dialog closes or after timeout
            const cleanup = () => {
                try {
                    if (iframe && iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                } catch {
                    // cleanup ignored
                }
            };

            iframe.contentWindow?.addEventListener('afterprint', cleanup);

            // Allow styles and DOM to render before calling print
            setTimeout(() => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    resolve(true);
                } catch (printErr) {
                    console.error('Iframe print error:', printErr);
                    window.print();
                    resolve(false);
                } finally {
                    // Fallback cleanup in case afterprint does not fire
                    setTimeout(cleanup, 5000);
                }
            }, 300);
        } catch (err) {
            console.error('consumptionPrintService failed, falling back to window.print():', err);
            window.print();
            reject(err);
        }
    });
};

export { consumptionPrintService as printConsumptionSheet };
export default consumptionPrintService;