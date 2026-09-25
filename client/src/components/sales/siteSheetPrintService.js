/**
 * siteSheetPrintService.js
 * High-fidelity, invoice-style printable document generator and print service for Site Detail Sheets.
 * Replicates the authentic Master Excel structure (Embellish Site Detail Sheet R5) in an elegant,
 * professional invoice/work-order layout rendered in an isolated sandbox iframe.
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
 * Format date string to DD/MM/YYYY for standard documentation
 */
const formatDate = (raw) => {
    if (!raw) {
        const now = new Date();
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        return `${d}/${m}/${y}`;
    }
    if (raw instanceof Date) {
        const d = String(raw.getDate()).padStart(2, '0');
        const m = String(raw.getMonth() + 1).padStart(2, '0');
        const y = raw.getFullYear();
        return `${d}/${m}/${y}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        const [y, m, d] = String(raw).split('T')[0].split('-');
        return `${d}/${m}/${y}`;
    }
    return String(raw);
};

/**
 * Renders the HTML for a single room site detail sheet
 */
export const buildSingleRoomPageHtml = ({
    room,
    clientName = '',
    address = '',
    architect = '',
    siteIncharge = '',
    sheetNo = 1,
    totalSheets = 1,
    leadCode = '',
    company = 'embellish',
    date = '',
    isLast = true,
}) => {
    if (!room) return '';

    const displayClient = escapeHtml(room.clientName || clientName || '—');
    const displayArch = escapeHtml(room.architect || architect || '—');
    const displayAddress = escapeHtml(address || '—');
    const displayIncharge = escapeHtml(room.siteIncharge || siteIncharge || '—');
    const displayRoomTitle = escapeHtml(room.roomTitle || room.sheetName || `Room ${sheetNo}`);
    const displayDate = escapeHtml(formatDate(date));
    const displayDocNo = escapeHtml(leadCode ? `SDS-${leadCode}-${sheetNo}` : `SDS-${sheetNo}`);

    const items = Array.isArray(room.items) ? room.items : [];
    const notes = Array.isArray(room.notes) ? room.notes : (room.notes ? [room.notes] : []);

    // Generate table rows
    const rowsHtml = items.length === 0 ? `
        <tr>
            <td colspan="28" style="padding: 24px; text-align: center; color: #888; font-style: italic;">
                No treatments or curtains configured for this room sheet yet.
            </td>
        </tr>
    ` : items.map((item, idx) => {
        const isPeachWidth = item.fabricWidth && (String(item.fabricWidth).includes('300') || String(item.fabricWidth).includes('54'));
        const isCustomTieback = item.tieback && (String(item.tieback).toLowerCase().includes('custom') || String(item.tieback).toLowerCase().includes('reg'));

        // Catalogue images
        let catalogueHtml = '<span style="color: #bbb; font-size: 8px;">—</span>';
        if (Array.isArray(item.catalogueImages) && item.catalogueImages.length > 0) {
            catalogueHtml = `
                <div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; align-items: center; max-width: 130px; margin: 0 auto;">
                    ${item.catalogueImages.slice(0, 3).map((imgUrl) => `
                        <img src="${escapeHtml(imgUrl)}" alt="Fabric" style="width: 34px; height: 34px; object-fit: cover; border: 1px solid #999; border-radius: 2px;" />
                    `).join('')}
                    ${item.catalogueImages.length > 3 ? `<span style="font-size: 8px; font-weight: bold; color: #555;">+${item.catalogueImages.length - 3}</span>` : ''}
                </div>
            `;
        }

        // Look thumbnail
        let lookHtml = '<span style="color: #bbb; font-size: 8px;">—</span>';
        if (item.look) {
            lookHtml = `<img src="${escapeHtml(item.look)}" alt="Look" style="width: 28px; height: 28px; object-fit: cover; border: 1px solid #ccc; border-radius: 2px; margin: 0 auto; display: block;" />`;
        }

        return `
            <tr style="page-break-inside: avoid; break-inside: avoid;">
                <!-- SR -->
                <td style="font-family: monospace; font-weight: bold; text-align: center; background: #f8f8f8;">
                    ${escapeHtml(item.srNo || idx + 1)}
                </td>

                <!-- Look -->
                <td style="text-align: center; padding: 2px;">
                    ${lookHtml}
                </td>

                <!-- Type -->
                <td style="font-weight: 700; text-align: left; padding: 3px 4px; white-space: pre-line; color: #111;">
                    ${escapeHtml(item.type || '—')}
                </td>

                <!-- Actual Window Width & Height -->
                <td style="font-family: monospace; font-weight: bold; text-align: center;">
                    ${escapeHtml(item.windowWidth || '—')}
                </td>
                <td style="font-family: monospace; font-weight: bold; text-align: center;">
                    ${escapeHtml(item.windowHeight || '—')}
                </td>

                <!-- Pelmet Width, Drop, Return -->
                <td style="font-family: monospace; text-align: center;">${escapeHtml(item.pelmetWidth || '—')}</td>
                <td style="font-family: monospace; text-align: center;">${escapeHtml(item.pelmetDrop || '—')}</td>
                <td style="font-family: monospace; text-align: center;">${escapeHtml(item.pelmetReturn || '—')}</td>

                <!-- Material details -->
                <td style="border-left: 2px solid #000; text-align: center; padding: 2px;">
                    ${catalogueHtml}
                </td>
                <td style="text-align: center; font-size: 8.5px;">${escapeHtml(item.design || '—')}</td>
                <td style="text-align: left; padding: 2px 4px; font-size: 8.5px; white-space: pre-line; line-height: 1.2;">
                    ${escapeHtml(item.brand || '—')}
                </td>
                <td style="text-align: left; padding: 2px 4px; font-size: 8.5px; white-space: pre-line; line-height: 1.2; font-weight: 500;">
                    ${escapeHtml(item.fabricName || '—')}
                </td>
                <td style="font-family: monospace; font-weight: bold; text-align: center; ${isPeachWidth ? 'background-color: #fed7aa !important; color: #7c2d12 !important;' : ''}">
                    ${escapeHtml(item.fabricWidth || '—')}
                </td>
                <td style="font-family: monospace; text-align: center; font-size: 8.5px;">${escapeHtml(item.repeatV || '—')}</td>
                <td style="font-family: monospace; text-align: center; font-size: 8.5px;">${escapeHtml(item.repeatH || '—')}</td>
                <td style="font-family: monospace; font-weight: bold; text-align: center;">${escapeHtml(item.fullness || '—')}</td>
                <td style="font-family: monospace; font-weight: bold; text-align: center; color: #000;">${escapeHtml(item.qtyMtrs || '—')}</td>

                <!-- Stitching Details -->
                <td style="border-left: 2px solid #000; font-weight: 600; text-align: center; font-size: 8.5px;">
                    ${escapeHtml(item.stitchingStyle || '—')}
                </td>
                <td style="font-family: monospace; text-align: center;">${escapeHtml(item.parts || '—')}</td>
                <td style="text-align: center; font-size: 8.5px;">${escapeHtml(item.opening || '—')}</td>
                <td style="font-family: monospace; text-align: center; font-size: 8.5px;">${escapeHtml(item.readyWidth || '—')}</td>
                <td style="font-family: monospace; text-align: center; font-size: 8.5px;">${escapeHtml(item.readyHeight || '—')}</td>

                <!-- Workshop Lining & Tieback -->
                <td style="border-left: 2px solid #000; text-align: left; padding: 2px 4px; font-size: 8.5px; line-height: 1.2;">
                    ${escapeHtml(item.liningType || '—')}
                </td>
                <td style="font-family: monospace; text-align: center;">${escapeHtml(item.liningQty || '—')}</td>
                <td style="font-weight: 600; text-align: center; font-size: 8.5px; ${isCustomTieback ? 'background-color: #bae6fd !important; color: #082f49 !important;' : ''}">
                    ${escapeHtml(item.tieback || '—')}
                </td>

                <!-- Installation Details -->
                <td style="border-left: 2px solid #000; text-align: center; font-size: 8.5px;">${escapeHtml(item.position || '—')}</td>
                <td style="text-align: center; font-size: 8.5px;">${escapeHtml(item.electricalPoint || '—')}</td>
                <td style="text-align: center; font-size: 8.5px;">${escapeHtml(item.installationType || '—')}</td>
            </tr>
        `;
    }).join('');

    return `
    <div class="sds-page" style="${!isLast ? 'page-break-after: always; break-after: page;' : ''}">
        <!-- TOP BRANDING & INVOICE HEADER -->
        <div class="sds-header">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 8px;">
                <div>
                    <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; letter-spacing: 3px; text-transform: lowercase; font-weight: 600; margin: 0; line-height: 1; color: #111;">
                        ${escapeHtml(company)}
                    </h1>
                    <div style="font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; color: #555; margin-top: 3px; font-weight: 500;">
                        Punctuating Spaces • Luxury Window Dressings &amp; Soft Furnishings
                    </div>
                </div>

                <div style="text-align: right;">
                    <div style="display: inline-block; background: #111; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 12px; text-transform: uppercase; border-radius: 2px;">
                        Site Detail Specification Sheet
                    </div>
                    <div style="font-size: 9.5px; color: #444; margin-top: 3px; font-weight: 600;">
                        Work Order &amp; Ready Size Document
                    </div>
                </div>
            </div>

            <!-- INVOICE META & CLIENT INFO BOXES -->
            <div style="display: grid; grid-template-columns: 12fr 10fr 8fr; gap: 8px; margin-bottom: 8px; font-size: 9.5px;">
                <!-- Client Box -->
                <div style="border: 1px solid #111; background: #fff; padding: 6px 8px;">
                    <div style="font-size: 8px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 4px;">
                        Client &amp; Site Address
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 54px; font-weight: 700; color: #222; padding: 1px 0;">Client:</td>
                            <td style="font-weight: 700; text-transform: uppercase; color: #000; font-size: 10.5px; padding: 1px 0;">
                                ${displayClient}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700; color: #222; padding: 1px 0;">Address:</td>
                            <td style="color: #333; padding: 1px 0; line-height: 1.25;">
                                ${displayAddress}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700; color: #222; padding: 1px 0;">Architect:</td>
                            <td style="color: #333; font-weight: 600; padding: 1px 0;">
                                ${displayArch}
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Room & Scope Box -->
                <div style="border: 1px solid #111; background: #fff; padding: 6px 8px;">
                    <div style="font-size: 8px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 4px;">
                        Room Scope &amp; Target Area
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 68px; font-weight: 700; color: #222; padding: 1px 0;">Room Name:</td>
                            <td style="padding: 1px 0;">
                                <span style="display: inline-block; background: #e0e7ff; color: #1e1b4b; font-weight: 800; font-size: 11px; padding: 1px 6px; border-radius: 2px; border: 1px solid #c7d2fe;">
                                    ${displayRoomTitle}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700; color: #222; padding: 1px 0;">Treatments:</td>
                            <td style="color: #222; font-weight: 600; padding: 1px 0;">
                                ${items.length} ${items.length === 1 ? 'Curtain / Treatment' : 'Curtains / Treatments'}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700; color: #222; padding: 1px 0;">Site Incharge:</td>
                            <td style="color: #222; font-size: 9px; padding: 1px 0; font-weight: 500;">
                                ${displayIncharge}
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Document Tracking Box -->
                <div style="border: 1px solid #111; background: #fafafa; padding: 6px 8px;">
                    <div style="font-size: 8px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 4px;">
                        Document Reference
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 58px; font-weight: 700; color: #222; padding: 1px 0;">Doc No:</td>
                            <td style="font-family: monospace; font-weight: 700; color: #000; padding: 1px 0; font-size: 10px;">
                                ${displayDocNo}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700; color: #222; padding: 1px 0;">Sheet No:</td>
                            <td style="font-family: monospace; font-weight: 700; color: #000; padding: 1px 0;">
                                ${sheetNo} of ${totalSheets}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700; color: #222; padding: 1px 0;">Date:</td>
                            <td style="color: #333; font-weight: 600; padding: 1px 0;">
                                ${displayDate}
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>

        <!-- MAIN HIGH-FIDELITY SPECIFICATION TABLE -->
        <div style="border: 1px solid #000; margin-bottom: 8px; overflow: hidden;">
            <table class="sds-table" style="width: 100%; border-collapse: collapse; text-align: center; font-size: 9px;">
                <thead>
                    <!-- LEVEL 1 HEADERS -->
                    <tr style="border-bottom: 1px solid #000; font-weight: bold; background: #eaeaea; color: #000;">
                        <th rowspan="3" style="width: 24px; vertical-align: middle; background: #e0e0e0; border-right: 1px solid #000; padding: 3px 2px;">SR</th>
                        <th rowspan="3" style="width: 32px; vertical-align: middle; background: #e0e0e0; border-right: 1px solid #000; padding: 3px 2px;">Look</th>
                        <th rowspan="3" style="width: 90px; vertical-align: middle; background: #e0e0e0; border-right: 1px solid #000; padding: 3px 4px; text-align: left;">Type</th>
                        <th colspan="2" style="background: #e5e5e5; border-right: 1px solid #000; padding: 3px 2px; text-transform: uppercase;">actual window</th>
                        <th colspan="3" style="background: #e5e5e5; border-right: 1px solid #000; padding: 3px 2px; text-transform: uppercase;">Pelmet</th>
                        <th colspan="8" style="background: #95c93d !important; color: #000; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-right: 2px solid #000; border-left: 2px solid #000; padding: 3px 2px;">
                            Material details
                        </th>
                        <th colspan="5" style="background: #ffe600 !important; color: #000; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-right: 2px solid #000; padding: 3px 2px;">
                            Stitching Details
                        </th>
                        <th colspan="3" style="background: #d9d9d9 !important; color: #000; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-right: 2px solid #000; padding: 3px 2px;">
                            by Workshop
                        </th>
                        <th colspan="3" style="background: #f0f0f0 !important; color: #000; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 2px;">
                            Installation Details
                        </th>
                    </tr>

                    <!-- LEVEL 2 SUB-HEADERS -->
                    <tr style="border-bottom: 1px solid #000; font-weight: bold; background: #ffffff; font-size: 8.5px;">
                        <!-- Actual Window -->
                        <th style="width: 38px; border-right: 1px solid #000; padding: 2px;">width</th>
                        <th style="width: 38px; border-right: 1px solid #000; padding: 2px;">height</th>

                        <!-- Pelmet -->
                        <th style="width: 36px; border-right: 1px solid #000; padding: 2px;">width</th>
                        <th style="width: 34px; border-right: 1px solid #000; padding: 2px;">drop</th>
                        <th style="width: 34px; border-right: 1px solid #000; padding: 2px;">Return</th>

                        <!-- Material Details -->
                        <th style="border-left: 2px solid #000; border-right: 1px solid #000; width: 120px; padding: 2px;">Catalogue image</th>
                        <th style="width: 44px; border-right: 1px solid #000; padding: 2px;">Design</th>
                        <th style="width: 68px; border-right: 1px solid #000; padding: 2px;">brand</th>
                        <th style="width: 100px; border-right: 1px solid #000; padding: 2px; text-align: left;">Name</th>
                        <th style="width: 40px; border-right: 1px solid #000; padding: 2px;">wdth</th>
                        <th colspan="2" style="width: 58px; border-right: 1px solid #000; padding: 2px;">repeat</th>
                        <th style="width: 34px; border-right: 1px solid #000; padding: 2px;">full</th>
                        <th style="width: 36px; border-right: 2px solid #000; padding: 2px;">qty</th>

                        <!-- Stitching Details -->
                        <th style="width: 48px; border-right: 1px solid #000; padding: 2px;">style</th>
                        <th style="width: 30px; border-right: 1px solid #000; padding: 2px;">parts</th>
                        <th style="width: 56px; border-right: 1px solid #000; padding: 2px;">opening</th>
                        <th colspan="2" style="width: 64px; border-right: 2px solid #000; padding: 2px;">ready size</th>

                        <!-- Workshop -->
                        <th colspan="2" style="width: 80px; border-right: 1px solid #000; padding: 2px;">lining</th>
                        <th style="width: 48px; border-right: 2px solid #000; padding: 2px;">Tieback</th>

                        <!-- Installation -->
                        <th style="width: 44px; border-right: 1px solid #000; padding: 2px;">position</th>
                        <th style="width: 76px; border-right: 1px solid #000; padding: 2px;">Electrical point / cord</th>
                        <th style="width: 44px; padding: 2px;">type</th>
                    </tr>

                    <!-- LEVEL 3 UNITS / SPECS -->
                    <tr style="border-bottom: 1px solid #000; background: #fafafa; font-size: 7.5px; color: #555; font-weight: normal;">
                        <!-- Actual Window -->
                        <th style="border-right: 1px solid #000;"></th>
                        <th style="border-right: 1px solid #000;"></th>

                        <!-- Pelmet -->
                        <th style="border-right: 1px solid #000;"></th>
                        <th style="border-right: 1px solid #000;"></th>
                        <th style="border-right: 1px solid #000;"></th>

                        <!-- Material Details -->
                        <th style="border-left: 2px solid #000; border-right: 1px solid #000;"></th>
                        <th style="border-right: 1px solid #000;"></th>
                        <th style="border-right: 1px solid #000;"></th>
                        <th style="border-right: 1px solid #000;"></th>
                        <th style="border-right: 1px solid #000; background: #fed7aa; color: #000; font-weight: bold;">(cms)</th>
                        <th style="border-right: 1px solid #000;">V(cm)</th>
                        <th style="border-right: 1px solid #000;">H(cm)</th>
                        <th style="border-right: 1px solid #000;"></th>
                        <th style="border-right: 2px solid #000; font-weight: bold; color: #000;">mtrs</th>

                        <!-- Stitching Details -->
                        <th style="border-right: 1px solid #000;"></th>
                        <th style="border-right: 1px solid #000;"></th>
                        <th style="border-right: 1px solid #000;"></th>
                        <th style="border-right: 1px solid #000;">wdth</th>
                        <th style="border-right: 2px solid #000;">hght</th>

                        <!-- Workshop -->
                        <th style="border-right: 1px solid #000;">type</th>
                        <th style="border-right: 1px solid #000;">qty</th>
                        <th style="border-right: 2px solid #000; background: #bae6fd;"></th>

                        <!-- Installation -->
                        <th style="border-right: 1px solid #000;"></th>
                        <th style="border-right: 1px solid #000;"></th>
                        <th></th>
                    </tr>
                </thead>
                <tbody class="sds-tbody">
                    ${rowsHtml}
                </tbody>
            </table>
        </div>

        <!-- FOOTER: ROOM NOTES & COLOR CODES LEGEND -->
        <div style="display: grid; grid-template-columns: 18fr 12fr; gap: 8px; margin-bottom: 12px; font-size: 9px;">
            <!-- Notes Box -->
            <div style="border: 1px solid #000; background: #fff; overflow: hidden;">
                <div style="background: #fed7aa; color: #7c2d12; font-weight: 800; padding: 3px 8px; border-bottom: 1px solid #000; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Room Specific Notes &amp; Instructions
                </div>
                <div style="padding: 6px 8px;">
                    ${notes.length > 0 ? `
                        <ul style="margin: 0; padding-left: 16px; line-height: 1.4; color: #222; font-weight: 500;">
                            ${notes.map((n) => `<li style="margin-bottom: 2px;">${escapeHtml(n)}</li>`).join('')}
                        </ul>
                    ` : `
                        <div style="color: #777; font-style: italic;">
                            No special room instructions. Standard workshop fabrication tolerances apply.
                        </div>
                    `}
                </div>
            </div>

            <!-- Color Codes Legend Box -->
            <div style="border: 1px solid #000; background: #fff; padding: 6px 8px;">
                <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #000; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 4px; text-align: center;">
                    Please Note : Color Codes Specification
                </div>
                <div style="display: flex; flex-direction: column; gap: 3px; font-size: 8px; color: #333;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 28px; height: 11px; background: #fed7aa; border: 1px solid #000; border-radius: 1px; flex-shrink: 0;"></span>
                        <span>Fabric width as height / adjustment in stitching</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 28px; height: 11px; background: #ffe600; border: 1px solid #000; border-radius: 1px; flex-shrink: 0;"></span>
                        <span>Stitching details &amp; pleating specifications</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 28px; height: 11px; background: #95c93d; border: 1px solid #000; border-radius: 1px; flex-shrink: 0;"></span>
                        <span>Material details &amp; fabric reference</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 28px; height: 11px; background: #bae6fd; border: 1px solid #000; border-radius: 1px; flex-shrink: 0;"></span>
                        <span>Workshop custom fabrication / Tieback</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- INVOICE-STYLE QUALITY ASSURANCE & SIGN-OFF BLOCK -->
        <div style="border: 1px solid #111; background: #fff; padding: 8px 10px; margin-bottom: 8px;">
            <div style="font-size: 8px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 8px; display: flex; justify-content: space-between;">
                <span>Quality Inspection &amp; Execution Authorization</span>
                <span>Standard Tolerances: ±0.25 inch</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                <!-- Signature 1 -->
                <div style="border-right: 1px dashed #ccc; padding-right: 8px;">
                    <div style="font-size: 8.5px; font-weight: 700; color: #222; margin-bottom: 22px;">1. Prepared By (Designer / Sales)</div>
                    <div style="border-top: 1px solid #111; padding-top: 3px; display: flex; justify-content: space-between; font-size: 7.5px; color: #666;">
                        <span>Signature:</span>
                        <span>Date:</span>
                    </div>
                </div>

                <!-- Signature 2 -->
                <div style="border-right: 1px dashed #ccc; padding-right: 8px;">
                    <div style="font-size: 8.5px; font-weight: 700; color: #222; margin-bottom: 22px;">2. Site Incharge (Verified)</div>
                    <div style="border-top: 1px solid #111; padding-top: 3px; display: flex; justify-content: space-between; font-size: 7.5px; color: #666;">
                        <span>Signature:</span>
                        <span>Date:</span>
                    </div>
                </div>

                <!-- Signature 3 -->
                <div style="border-right: 1px dashed #ccc; padding-right: 8px;">
                    <div style="font-size: 8.5px; font-weight: 700; color: #222; margin-bottom: 22px;">3. Workshop Supervisor</div>
                    <div style="border-top: 1px solid #111; padding-top: 3px; display: flex; justify-content: space-between; font-size: 7.5px; color: #666;">
                        <span>Signature:</span>
                        <span>Date:</span>
                    </div>
                </div>

                <!-- Signature 4 -->
                <div>
                    <div style="font-size: 8.5px; font-weight: 700; color: #222; margin-bottom: 22px;">4. Client / Architect Sign-off</div>
                    <div style="border-top: 1px solid #111; padding-top: 3px; display: flex; justify-content: space-between; font-size: 7.5px; color: #666;">
                        <span>Signature:</span>
                        <span>Date:</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- CORPORATE FOOTER -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #bbb; padding-top: 4px; font-size: 7.5px; color: #666;">
            <div>
                <strong>EMBELLISH LUXURY INTERIORS</strong> • Unit No: 1, 1st Floor, Raghuvanshi Mansion, Senapati Bapat Road, Lower Parel (W), Mumbai - 400013 • Email: hiteshembellish@gmail.com
            </div>
            <div style="text-align: right; font-family: monospace;">
                Sheet ${sheetNo} of ${totalSheets} • Printed on ${displayDate}
            </div>
        </div>
    </div>
    `;
};

/**
 * Builds the complete HTML document wrapping either a single room or multiple rooms.
 */
export const buildSiteDetailSheetHtml = ({
    rooms = [],
    room = null,
    clientName = '',
    address = '',
    architect = '',
    siteIncharge = '',
    leadCode = '',
    date = '',
    company = 'embellish',
}) => {
    const pagesList = room ? [room] : (Array.isArray(rooms) && rooms.length > 0 ? rooms : []);
    const totalSheets = pagesList.length;

    const pagesHtml = pagesList.map((r, idx) => {
        return buildSingleRoomPageHtml({
            room: r,
            clientName: r.clientName || clientName,
            address: address,
            architect: r.architect || architect,
            siteIncharge: r.siteIncharge || siteIncharge,
            sheetNo: r.sheetNo || idx + 1,
            totalSheets,
            leadCode,
            company,
            date,
            isLast: idx === pagesList.length - 1,
        });
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Site Detail Sheet - ${escapeHtml(clientName || 'Invoice')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4 landscape;
      margin: 6mm 8mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      background: #ffffff !important;
      color: #0f172a !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    .sds-page {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 auto !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }
    .sds-table {
      border-collapse: collapse !important;
    }
    .sds-table th, .sds-table td {
      border: 1px solid #111 !important;
      padding: 3px 2px !important;
      line-height: 1.2 !important;
    }
    .sds-tbody tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    @media print {
      body {
        margin: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
};

/**
 * Print a single room or all rooms in an isolated invisible iframe.
 * Avoids any modal backdrops, screen styles, scrollbars or unwanted elements.
 */
export const printSiteDetailSheet = (options = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const html = buildSiteDetailSheetHtml(options);

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
            iframe.style.zIndex = '-9999';
            iframe.setAttribute('title', 'Site Detail Sheet Print Document');

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

            // Cleanup helper
            const cleanup = () => {
                try {
                    if (iframe && iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                } catch {
                    // ignore
                }
            };

            iframe.contentWindow?.addEventListener('afterprint', cleanup);

            const triggerPrint = () => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    resolve(true);
                } catch (printErr) {
                    console.error('[SiteSheetPrint] Iframe print error:', printErr);
                    window.print();
                    resolve(false);
                } finally {
                    setTimeout(cleanup, 10000);
                }
            };

            // Wait for fonts and images to load cleanly
            if (doc.fonts?.ready) {
                doc.fonts.ready
                    .then(() => {
                        setTimeout(triggerPrint, 250);
                    })
                    .catch(() => {
                        setTimeout(triggerPrint, 350);
                    });
            } else {
                setTimeout(triggerPrint, 350);
            }
        } catch (err) {
            console.error('[SiteSheetPrint] Failed to print via iframe:', err);
            window.print();
            reject(err);
        }
    });
};

/**
 * Convenience method for printing all rooms in the site detail sheet
 */
export const printAllSiteDetailSheets = (options = {}) => {
    return printSiteDetailSheet({
        ...options,
        room: null, // Signals to print all rooms in options.rooms
    });
};

export default {
    buildSingleRoomPageHtml,
    buildSiteDetailSheetHtml,
    printSiteDetailSheet,
    printAllSiteDetailSheets,
};
