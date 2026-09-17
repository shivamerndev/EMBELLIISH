/**
 * measurementPrintService.js
 * Generates and prints the Physical Measurement Sheet replicating the exact layout,
 * geometry, typography, and sections depicted in measurement_sheet_blank_layout.png.
 */

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
 * Format wire selection into readable text (R, L, R / L, or empty)
 */
const formatWire = (row) => {
    if (!row) return '';
    const r = Boolean(row.wireRight || (row.wire === true && !row.wireLeft));
    const l = Boolean(row.wireLeft);
    if (r && l) return 'R / L';
    if (r) return 'R';
    if (l) return 'L';
    if (typeof row.wire === 'string' && row.wire.trim()) return row.wire.trim();
    return '';
};

/**
 * Format date string to DD/MM/YYYY for standard site measurement documentation
 */
const formatDate = (raw) => {
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [y, m, d] = raw.split('-');
        return `${d}/${m}/${y}`;
    }
    return raw;
};

/**
 * Build the complete HTML document matching measurement_sheet_blank_layout.png
 */
export const buildMeasurementSheetHtml = ({
    header = {},
    rows = [],
    remarks = '',
    checklist = {},
    isBlank = false,
}) => {
    const company = isBlank ? (header.company || 'Embelliish') : (header.company || 'Embelliish');
    const client = isBlank ? '' : (header.client || '');
    const siteAddress = isBlank ? '' : (header.siteAddress || '');
    const date = isBlank ? '' : formatDate(header.date || '');
    const siteVisitedBy = isBlank ? '' : (header.siteVisitedBy || '');
    const srNo = isBlank ? '' : (header.srNo || '');

    // Split site address into 2 lines if possible
    let addressLine1 = '';
    let addressLine2 = '';
    if (siteAddress) {
        const lines = siteAddress.split('\n');
        addressLine1 = lines[0] || '';
        addressLine2 = lines.slice(1).join(' | ');
    }

    // Minimum 11 rows to match reference sheet blank layout
    const activeRows = isBlank ? [] : (rows || []);
    const totalDisplayRows = Math.max(activeRows.length, 11);

    const checklistItems = [
        { key: 'photo', label: 'Photo' },
        { key: 'video', label: 'Video' },
        { key: 'flooring', label: 'Flooring' },
        { key: 'sidewall', label: 'Sidewall' },
        { key: 'others', label: 'Others' },
    ];

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Measurement Sheet - ${escapeHtml(company)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 6mm 8mm;
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
      font-size: 11px;
      line-height: 1.25;
      padding: 0;
      margin: 0;
    }
    .page-container {
      width: 100%;
      box-sizing: border-box;
    }
    .sheet-frame {
      border: 1.5px solid #000;
      padding: 7px;
      display: flex;
      flex-direction: column;
      gap: 7px;
      background: #fff;
      box-sizing: border-box;
      min-height: 194mm;
    }

    /* --- 1. HEADER SECTION --- */
    .header-box {
      border: 1.5px solid #000;
      display: flex;
      height: 98px;
      box-sizing: border-box;
    }
    .header-left {
      width: 30%;
      border-right: 1.5px solid #000;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 10px 14px;
      box-sizing: border-box;
    }
    .brand-title {
      font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
      font-size: 30px;
      font-weight: 800;
      font-style: italic;
      letter-spacing: 0.05em;
      text-align: center;
      color: #574233;
      margin-top: 4px;
      line-height: 1.15;
    }
    .client-row {
      font-size: 12px;
      font-weight: 600;
      color: #000;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .client-val {
      font-weight: 500;
      font-size: 12px;
      border-bottom: 1px solid #000;
      flex: 1;
      padding-bottom: 1px;
      min-height: 14px;
    }

    .header-center {
      width: 46%;
      border-right: 1.5px solid #000;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
    .address-top {
      flex: 1;
      border-bottom: 1px solid #000;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
    }
    .address-label-row {
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .address-line-val {
      font-size: 11px;
      font-weight: 500;
      flex: 1;
      border-bottom: 1px solid #000;
      min-height: 14px;
      padding-bottom: 1px;
    }
    .address-bottom {
      flex: 1;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      font-size: 11px;
      font-weight: 500;
    }

    .header-right {
      width: 24%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 10px 14px;
      box-sizing: border-box;
    }
    .meta-row {
      display: flex;
      align-items: baseline;
      font-size: 11.5px;
      gap: 4px;
    }
    .meta-label {
      font-weight: 600;
      white-space: nowrap;
    }
    .meta-value {
      font-weight: 500;
      flex: 1;
      border-bottom: 1px solid #000;
      padding-bottom: 1px;
      min-height: 14px;
    }

    /* --- 2. MEASUREMENT TABLE --- */
    .table-container {
      width: 100%;
      box-sizing: border-box;
    }
    table.measurement-grid {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000;
      table-layout: fixed;
      box-sizing: border-box;
    }
    table.measurement-grid th,
    table.measurement-grid td {
      border: 1px solid #000;
      box-sizing: border-box;
      padding: 0;
    }

    /* Headers */
    table.measurement-grid thead th {
      background: #fff;
      color: #000;
      font-weight: 700;
      text-align: center;
      vertical-align: middle;
      line-height: 1.15;
    }
    .th-sr { width: 3.5%; font-size: 9px; }
    .th-area { width: 9.5%; font-size: 10.5px; }
    .th-lwin { width: 6.5%; font-size: 9px; }
    .th-win { width: 13%; font-size: 9px; }
    .th-subwin { width: 6.5%; font-size: 8.5px; height: 18px; font-weight: 600; }
    .th-pelmet { width: 13%; font-size: 9px; }
    .th-subpelmet { width: 6.5%; font-size: 8.5px; height: 18px; font-weight: 600; }
    .th-roman { width: 6.5%; font-size: 9px; }
    .th-ceiling { width: 6.5%; font-size: 9px; }
    .th-wire { width: 4.5%; font-size: 9px; }
    .th-sidewall { width: 4.5%; font-size: 8.5px; }
    .th-subsidewall { width: 4.5%; font-size: 8px; height: 18px; font-weight: 600; }
    .th-remarks { width: 12.5%; font-size: 10.5px; }

    /* Table Body */
    table.measurement-grid tbody tr {
      height: 25px;
    }
    table.measurement-grid tbody td {
      font-size: 10.5px;
      font-weight: 500;
      text-align: center;
      vertical-align: middle;
      padding: 1px 3px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: #000;
    }
    .td-area {
      text-align: left !important;
      padding-left: 5px !important;
    }
    .td-num {
      text-align: right !important;
      padding-right: 4px !important;
    }
    .td-remarks {
      text-align: left !important;
      padding-left: 4px !important;
      font-size: 9.5px !important;
    }

    /* --- 3. BOTTOM REMARKS & CHECKLIST --- */
    .footer-box {
      border: 1.5px solid #000;
      display: flex;
      height: 125px;
      box-sizing: border-box;
    }
    .remarks-col {
      width: 82%;
      border-right: 1.5px solid #000;
      padding: 6px 12px;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
    .remarks-title {
      font-size: 12.5px;
      font-weight: 700;
      text-align: center;
      color: #000;
      margin-bottom: 4px;
    }
    .remarks-body {
      font-size: 10.5px;
      font-weight: 500;
      color: #000;
      line-height: 1.35;
      white-space: pre-wrap;
      flex: 1;
    }

    .checklist-col {
      width: 18%;
      padding: 7px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
    }
    .checklist-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #000;
      margin-bottom: 3px;
    }
    .checklist-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1;
      justify-content: space-around;
    }
    .checklist-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10px;
      font-weight: 500;
    }
    .checkbox-box {
      width: 11px;
      height: 11px;
      border: 1.2px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      line-height: 1;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="sheet-frame">

      <!-- 1. Header Box -->
      <div class="header-box">
        <!-- Left: Brand & Client -->
        <div class="header-left">
          <div class="brand-title">${escapeHtml(company)}</div>
          <div class="client-row">
            <span>Client:</span>
            <span class="client-val">${escapeHtml(client)}</span>
          </div>
        </div>

        <!-- Center: Site Address -->
        <div class="header-center">
          <div class="address-top">
            <div class="address-label-row">
              <span>Site Address:</span>
              <span class="address-line-val">${escapeHtml(addressLine1)}</span>
            </div>
          </div>
          <div class="address-bottom">
            <span>${escapeHtml(addressLine2)}</span>
          </div>
        </div>

        <!-- Right: Date, Site Visited By, Sr. No -->
        <div class="header-right">
          <div class="meta-row">
            <span class="meta-label">Date:</span>
            <span class="meta-value">${escapeHtml(date)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Site Visited By:</span>
            <span class="meta-value">${escapeHtml(siteVisitedBy)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Sr. No:</span>
            <span class="meta-value">${escapeHtml(srNo)}</span>
          </div>
        </div>
      </div>

      <!-- 2. Main Measurement Grid Table (16 Columns, 3-Row Grouped Header) -->
      <div class="table-container">
        <table class="measurement-grid">
          <thead>
            <!-- Header Row 1 -->
            <tr style="height: 19px;">
              <th rowspan="3" class="th-sr">Sr.<br/>No.</th>
              <th rowspan="3" class="th-area">Area</th>
              <th rowspan="3" class="th-lwin">L Window<br/>Detail</th>
              <th colspan="2" class="th-win">Window Size (inches)</th>
              <th colspan="2" class="th-win">Window Size (inches)</th>
              <th colspan="2" class="th-pelmet">Pelmet Size</th>
              <th colspan="2" class="th-pelmet">Pelmet Size</th>
              <th rowspan="3" class="th-roman">Slides<br/>of Roman</th>
              <th rowspan="3" class="th-ceiling">Ceiling<br/>Support</th>
              <th rowspan="3" class="th-wire">Wire</th>
              <th rowspan="2" class="th-sidewall">Side<br/>Wall</th>
              <th rowspan="3" class="th-remarks">Remarks</th>
            </tr>

            <!-- Header Row 2 -->
            <tr style="height: 17px;">
              <th colspan="2" style="font-size: 8.5px; font-weight: 600;">Out to Out</th>
              <th colspan="2" style="font-size: 8.5px; font-weight: 600;">Frame to Frame</th>
              <th colspan="2" style="font-size: 8.5px; font-weight: 600;">Out/Out</th>
              <th colspan="2" style="font-size: 8.5px; font-weight: 600;">Frame/Frame</th>
            </tr>

            <!-- Header Row 3 -->
            <tr style="height: 17px;">
              <th class="th-subwin">Width</th>
              <th class="th-subwin">Height</th>
              <th class="th-subwin">Width</th>
              <th class="th-subwin">Height</th>
              <th class="th-subpelmet">Width</th>
              <th class="th-subpelmet">Drop</th>
              <th class="th-subpelmet">Width</th>
              <th class="th-subpelmet">Drop</th>
              <th class="th-subsidewall">L / R</th>
            </tr>
          </thead>

          <tbody>
            ${Array.from({ length: totalDisplayRows }).map((_, idx) => {
                const row = !isBlank && activeRows[idx] ? activeRows[idx] : null;
                const srDisplay = row ? (row.srNo ?? idx + 1) : '';
                const area = row ? (row.area || '') : '';
                const lwin = row ? (row.lWindowDetail || '') : '';
                const oWidth = row ? (row.outToOutWidth || '') : '';
                const oHeight = row ? (row.outToOutHeight || '') : '';
                const fWidth = row ? (row.frameToFrameWidth || '') : '';
                const fHeight = row ? (row.frameToFrameHeight || '') : '';
                const pOutW = row ? (row.pelmetOutOutWidth || '') : '';
                const pOutD = row ? (row.pelmetOutOutDrop || '') : '';
                const pFrW = row ? (row.pelmetFrameFrameWidth || '') : '';
                const pFrD = row ? (row.pelmetFrameFrameDrop || '') : '';
                const roman = row ? (row.sidesOfRoman || '') : '';
                const ceiling = row ? (row.ceilingSupport || '') : '';
                const wire = row ? formatWire(row) : '';
                const sidewall = row ? (row.sideWall || '') : '';
                const rmk = row ? (row.remarks || '') : '';

                return `<tr>
                  <td>${escapeHtml(srDisplay)}</td>
                  <td class="td-area">${escapeHtml(area)}</td>
                  <td>${escapeHtml(lwin)}</td>
                  <td class="td-num">${escapeHtml(oWidth)}</td>
                  <td class="td-num">${escapeHtml(oHeight)}</td>
                  <td class="td-num">${escapeHtml(fWidth)}</td>
                  <td class="td-num">${escapeHtml(fHeight)}</td>
                  <td class="td-num">${escapeHtml(pOutW)}</td>
                  <td class="td-num">${escapeHtml(pOutD)}</td>
                  <td class="td-num">${escapeHtml(pFrW)}</td>
                  <td class="td-num">${escapeHtml(pFrD)}</td>
                  <td>${escapeHtml(roman)}</td>
                  <td>${escapeHtml(ceiling)}</td>
                  <td>${escapeHtml(wire)}</td>
                  <td>${escapeHtml(sidewall)}</td>
                  <td class="td-remarks">${escapeHtml(rmk)}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- 3. Bottom Remarks & Checklist Box -->
      <div class="footer-box">
        <!-- Remarks -->
        <div class="remarks-col">
          <div class="remarks-title">Remarks:</div>
          <div class="remarks-body">${escapeHtml(isBlank ? '' : remarks)}</div>
        </div>

        <!-- Checklist -->
        <div class="checklist-col">
          <div class="checklist-title">Checklist:</div>
          <div class="checklist-list">
            ${checklistItems.map(item => {
                const isChecked = !isBlank && Boolean(checklist?.[item.key]);
                return `<div class="checklist-item">
                  <span>${escapeHtml(item.label)}</span>
                  <span class="checkbox-box">${isChecked ? '✓' : ''}</span>
                </div>`;
            }).join('')}
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
export const printMeasurementSheet = (data = {}, isBlank = false) => {
    return new Promise((resolve, reject) => {
        try {
            const html = buildMeasurementSheetHtml({ ...data, isBlank });

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
            iframe.setAttribute('title', 'Measurement Sheet Print Frame');

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
            console.error('printMeasurementSheet failed, falling back to window.print():', err);
            window.print();
            reject(err);
        }
    });
};
