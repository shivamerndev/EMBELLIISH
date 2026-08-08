import React from 'react';
import { FileText, X, Printer } from 'lucide-react';
import { number } from '../../../utils/format';
import { Button } from '../../../components/ui';

/**
 * Step 6 — Consumption Sheet Preview Modal
 * Displays the official client paper-formatted Excel sheet matching the paper template design.
 */

const fmtVal = (val) => {
    if (val === undefined || val === null || val === '' || val === false) {
        return '';
    }
    if (val === true) return '✓';
    if (typeof val === 'number') {
        return val === 0 ? '0' : val;
    }
    return val;
};

const formatDateDot = (dateVal) => {
    if (!dateVal) return '09.04.2026';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '09.04.2026';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
};

const PreviewModal = ({ boq, project, preview, previewing = false, onClose }) => {
    const handleClose = onClose || (() => { });

    const handlePrint = () => {
        window.print();
    };

    const sheet = previewing && preview ? preview : boq;

    const rawRooms = (previewing && preview ? preview.rooms : boq?.roomTotals
        ? boq.roomTotals.map((room) => ({
            ...room,
            lines: boq.lines ? boq.lines.filter((line) => String(line.room) === String(room.room)) : [],
        }))
        : (boq?.rooms || []));

    const totals = sheet?.totals || boq?.totals || {};

    const costing = previewing && preview ? preview.costing : (
        boq?.costing ? boq.costing : (
            boq?.costLines ? {
                lines: boq.costLines,
                subtotal: boq.subtotal,
                gstPercent: boq.gstPercent,
                gstAmount: boq.gstAmount,
                grandTotal: boq.grandTotal
            } : null
        )
    );

    const costingLines = costing?.lines || boq?.costLines || [];
    const grandTotal = costing?.grandTotal || boq?.grandTotal || costing?.subtotal || 0;

    // Group rooms and lines by Floor matching the paper sheet
    let globalSr = 1;
    const floorGroups = [];
    const floorMap = new Map();

    (rawRooms || []).forEach((room) => {
        const floorName = room.floor || 'Main';
        if (!floorMap.has(floorName)) {
            const group = { floor: floorName, rooms: [] };
            floorMap.set(floorName, group);
            floorGroups.push(group);
        }
        const currentFloor = floorMap.get(floorName);
        currentFloor.rooms.push({
            ...room,
            lines: (room.lines || []).map((line) => ({
                ...line,
                sr: line.sr || globalSr++,
            })),
        });
    });

    const floorsList = floorGroups.map(g => g.floor).filter(Boolean);
    const floorsSummaryText = floorsList.length > 0
        ? (floorsList.length === 1 ? `${floorsList[0]} Floor` : `${floorsList.join(' and ')} Floor`)
        : 'Second and Third Floor';

    const clientName = project?.client?.name || project?.name || boq?.project?.name || 'Mr. Hiral - Buglow - 1';
    const architectName = project?.architect?.name || '';
    const siteAddress = typeof project?.siteAddress === 'object'
        ? [project.siteAddress.line1, project.siteAddress.line2, project.siteAddress.city, project.siteAddress.state, project.siteAddress.pincode].filter(Boolean).join(', ') || 'Delhi'
        : project?.siteAddress || project?.client?.city || 'Delhi';
    const dcmName = project?.assignedDCM?.name || project?.projectCoordinator?.name || 'hasan';
    const dateFormatted = formatDateDot(boq?.createdAt);

    return (
        <div className="fixed h-[100vh] top-0 inset-0 z-50 flex items-center justify-center overflow-y-auto backdrop-blur-md bg-slate-950/85 animate-in fade-in duration-200 print:p-0 print:bg-white">
            <div className="relative w-full max-w-7xl max-h-[94vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden print:max-h-none print:border-none print:shadow-none print:bg-white">
                {/* Modal Header — Top Bar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900 text-slate-100 shrink-0 print:hidden">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-300" />
                        <div>
                            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                Consumption_Sheet_{boq?.code || 'Doc'}.pdf
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded">
                                    Official Table Sheet
                                </span>
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                {previewing ? 'Unsaved Live Preview' : `Revision ${boq?.revision ?? 1}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            icon={Printer}
                            onClick={handlePrint}
                            className="text-xs font-medium"
                        >
                            Print / Export
                        </Button>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                            title="Close Preview"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Body — Paper Sheet Viewer */}
                <div className="p-4 sm:p-8 overflow-y-auto flex-1 flex justify-center print:p-0 print:overflow-visible bg-slate-950/40">
                    
                    {/* Excel Table Paper Container */}
                    <div id="consumption-pdf-sheet" className="w-full max-w-[1100px] bg-white text-black p-6 sm:p-8 shadow-2xl rounded-sm font-sans print:shadow-none print:p-0 print:max-w-none">

                        {/* Top Document Header Table */}
                        <table className="w-full border-collapse border border-black text-xs text-black font-sans bg-white mb-4">
                            <tbody>
                                {/* Title Banner Row */}
                                <tr className="border-b border-black text-center">
                                    <td colSpan={6} className="py-2 px-4">
                                        <div className="font-bold text-2xl tracking-wide text-black lowercase font-serif">
                                            embellish
                                        </div>
                                        <div className="text-[11px] italic font-serif text-black tracking-widest">
                                            Punctuating Spaces
                                        </div>
                                    </td>
                                </tr>
                                {/* Meta Row 1 */}
                                <tr className="border-b border-black">
                                    <td className="font-bold px-2 py-1 border-r border-black w-24">Client-</td>
                                    <td className="px-2 py-1 border-r border-black font-normal min-w-[200px]" colSpan={2}>{clientName}</td>
                                    <td className="font-bold px-2 py-1 border-r border-black w-28">Date-</td>
                                    <td className="px-2 py-1 font-normal" colSpan={2}>{dateFormatted}</td>
                                </tr>
                                {/* Meta Row 2 */}
                                <tr className="border-b border-black">
                                    <td className="font-bold px-2 py-1 border-r border-black">Architect-</td>
                                    <td className="px-2 py-1 border-r border-black font-normal" colSpan={2}>{architectName}</td>
                                    <td className="font-bold px-2 py-1 border-r border-black">Site visited by-</td>
                                    <td className="px-2 py-1 font-normal" colSpan={2}>{dcmName}</td>
                                </tr>
                                {/* Meta Row 3 */}
                                <tr>
                                    <td className="font-bold px-2 py-1 border-r border-black">Site Address-</td>
                                    <td className="px-2 py-1 border-r border-black font-normal" colSpan={2}>{siteAddress}</td>
                                    <td className="px-2 py-1 text-center font-normal" colSpan={3}>
                                        <div className="font-bold text-black text-xs">{floorsSummaryText}</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Main Consumption Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-black text-black font-sans text-[10px]">
                                <thead>
                                    {/* Row 1 Headers */}
                                    <tr className="border-b border-black font-bold text-center">
                                        <th rowSpan={3} className="border-r border-black px-1 py-1.5 w-7 bg-[#d9d9d9]">SR</th>
                                        <th rowSpan={3} className="border-r border-black px-2 py-1.5 min-w-[100px] bg-[#d9d9d9]">Area</th>
                                        <th rowSpan={3} className="border-r border-black px-2 py-1.5 min-w-[110px] bg-[#d9d9d9]">Particular</th>
                                        <th colSpan={4} className="border-r border-black px-1 py-1 bg-white">Window size (In inches)</th>
                                        <th colSpan={4} className="border-r border-black px-1 py-1 bg-white">Pelmet Size</th>
                                        <th colSpan={2} className="border-r border-black px-1 py-1 bg-white">Wire</th>
                                        <th rowSpan={3} className="border-r border-black px-1 py-1.5 w-10 bg-white">Rnft</th>
                                        <th rowSpan={3} className="border-r border-black px-1 py-1.5 w-12 bg-white">Roman Sqft</th>
                                        <th colSpan={6} className="px-1 py-1 bg-white">Fabric requirement for curtain</th>
                                    </tr>

                                    {/* Row 2 Sub-Headers */}
                                    <tr className="border-b border-black font-bold text-center bg-white">
                                        {/* Window size */}
                                        <th colSpan={2} className="border-r border-black px-1 py-0.5">O2O</th>
                                        <th colSpan={2} className="border-r border-black px-1 py-0.5">F2F</th>

                                        {/* Pelmet size */}
                                        <th colSpan={2} className="border-r border-black px-1 py-0.5">O2O</th>
                                        <th colSpan={2} className="border-r border-black px-1 py-0.5">F2F</th>

                                        {/* Wire */}
                                        <th rowSpan={2} className="border-r border-black px-1 py-0.5 w-8">Right</th>
                                        <th rowSpan={2} className="border-r border-black px-1 py-0.5 w-8">Left</th>

                                        {/* Fabric Requirement */}
                                        <th rowSpan={2} className="border-r border-black px-1 py-0.5 w-11">Total parts</th>
                                        <th rowSpan={2} className="border-r border-black px-1 py-0.5 w-12">Rd off / PARTS</th>
                                        <th rowSpan={2} className="border-r border-black px-1 py-0.5 w-11">Ht. Per Part</th>
                                        <th rowSpan={2} className="border-r border-black px-1 py-0.5 w-12">Mtrs Drapes</th>
                                        <th rowSpan={2} className="border-r border-black px-1 py-0.5 w-12">blackout</th>
                                        <th rowSpan={2} className="px-1 py-0.5 w-14">Mtrs Drapes / round off</th>
                                    </tr>

                                    {/* Row 3 Sub-Headers */}
                                    <tr className="border-b border-black font-bold text-center bg-white">
                                        {/* Window size O2O & F2F */}
                                        <th className="border-r border-black px-1 py-0.5 w-10">width</th>
                                        <th className="border-r border-black px-1 py-0.5 w-10">height</th>
                                        <th className="border-r border-black px-1 py-0.5 w-10">width</th>
                                        <th className="border-r border-black px-1 py-0.5 w-10">height</th>

                                        {/* Pelmet O2O & F2F */}
                                        <th className="border-r border-black px-1 py-0.5 w-10">width</th>
                                        <th className="border-r border-black px-1 py-0.5 w-10">Drop</th>
                                        <th className="border-r border-black px-1 py-0.5 w-10">width</th>
                                        <th className="border-r border-black px-1 py-0.5 w-10">Drop</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {floorGroups.map((floorGroup) => (
                                        <React.Fragment key={floorGroup.floor}>
                                            {/* Floor Section Header Banner */}
                                            {floorGroup.floor && (
                                                <tr className="bg-[#d9d9d9] border-b border-black">
                                                    <td colSpan={21} className="py-1 px-2 font-bold italic text-center text-black text-[11px]">
                                                        {floorGroup.floor}
                                                    </td>
                                                </tr>
                                            )}

                                            {floorGroup.rooms.map((room) => {
                                                const roomLines = room.lines || [];
                                                return roomLines.map((line, lIdx) => {
                                                    const isFirstInRoom = lIdx === 0;

                                                    const o2oW = line.o2o?.width || (line.basis === 'O2O' ? line.width || line.windowWidthInch : null);
                                                    const o2oH = line.o2o?.height || (line.basis === 'O2O' ? line.height || line.windowHeightInch : null);
                                                    const f2fW = line.f2f?.width || (line.basis === 'F2F' ? line.width || line.windowWidthInch : null);
                                                    const f2fH = line.f2f?.height || (line.basis === 'F2F' ? line.height || line.windowHeightInch : null);

                                                    const pelO2oW = line.pelmet?.o2oWidth;
                                                    const pelO2oD = line.pelmet?.o2oDrop;
                                                    const pelF2fW = line.pelmet?.f2fWidth;
                                                    const pelF2fD = line.pelmet?.f2fDrop;

                                                    const wireRight = line.wireRight || line.wire?.right || line.wireRightVal;
                                                    const wireLeft = line.wireLeft || line.wire?.left || line.wireLeftVal;

                                                    return (
                                                        <tr
                                                            key={line.window || `${room.room}-${lIdx}`}
                                                            className="border-b border-black text-black text-[10px] bg-white"
                                                        >
                                                            {/* SR — rowSpan for room */}
                                                            {isFirstInRoom ? (
                                                                <td
                                                                    rowSpan={roomLines.length}
                                                                    className="px-1 py-1 border-r border-black text-center font-normal text-black bg-white align-middle"
                                                                >
                                                                    {line.sr}
                                                                </td>
                                                            ) : null}

                                                            {/* Area — rowSpan for room, shaded gray */}
                                                            {isFirstInRoom ? (
                                                                <td
                                                                    rowSpan={roomLines.length}
                                                                    className="px-2 py-1 border-r border-black font-normal text-black bg-[#d9d9d9] align-middle"
                                                                >
                                                                    {room.roomName}
                                                                </td>
                                                            ) : null}

                                                            {/* Particular */}
                                                            <td className="px-2 py-1 border-r border-black font-normal bg-white">
                                                                {line.particularLabel || line.particular}
                                                            </td>

                                                            {/* O2O width & height */}
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(o2oW)}</td>
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(o2oH)}</td>

                                                            {/* F2F width & height */}
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(f2fW)}</td>
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(f2fH)}</td>

                                                            {/* Pelmet O2O width & drop */}
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(pelO2oW)}</td>
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(pelO2oD)}</td>

                                                            {/* Pelmet F2F width & drop */}
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(pelF2fW)}</td>
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(pelF2fD)}</td>

                                                            {/* Wire Right & Left */}
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(wireRight)}</td>
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(wireLeft)}</td>

                                                            {/* Rnft */}
                                                            <td className="px-1 py-1 border-r border-black text-center font-normal">{fmtVal(line.rnft)}</td>

                                                            {/* Roman Sqft */}
                                                            <td className="px-1 py-1 border-r border-black text-center font-normal">{fmtVal(line.romanSqft)}</td>

                                                            {/* Total Parts */}
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(line.totalParts)}</td>

                                                            {/* Rd off / PARTS */}
                                                            <td className="px-1 py-1 border-r border-black text-center font-normal">
                                                                {fmtVal(line.roundedParts)}
                                                            </td>

                                                            {/* Ht. Per Part */}
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(line.heightPerPartM)}</td>

                                                            {/* Mtrs Drapes */}
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(line.drapeMeters)}</td>

                                                            {/* Blackout */}
                                                            <td className="px-1 py-1 border-r border-black text-center">{fmtVal(line.blackoutMeters)}</td>

                                                            {/* Mtrs Drapes / round off */}
                                                            <td className="px-1 py-1 text-center font-normal text-black">{fmtVal(line.fabricMeters)}</td>
                                                        </tr>
                                                    );
                                                });
                                            })}
                                        </React.Fragment>
                                    ))}

                                    {/* Empty grid rows matching Excel template */}
                                    {[1, 2, 3, 4, 5].map((idx) => (
                                        <tr key={`empty-${idx}`} className="border-b border-black bg-white">
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="border-r border-black py-2.5"></td>
                                            <td className="py-2.5"></td>
                                        </tr>
                                    ))}
                                </tbody>

                                {/* Bottom Summary Total Row */}
                                <tfoot>
                                    <tr className="border-t border-b border-black bg-white font-bold text-black text-[10px]">
                                        <td colSpan={13} className="px-3 py-1.5 border-r border-black text-left font-bold uppercase">
                                            {floorsSummaryText} Total
                                        </td>
                                        <td className="px-1 py-1.5 border-r border-black text-center font-bold">
                                            {fmtVal(totals.rnft)}
                                        </td>
                                        <td className="px-1 py-1.5 border-r border-black text-center font-bold">
                                            {fmtVal(totals.romanSqft)}
                                        </td>
                                        <td className="border-r border-black px-1 py-1.5"></td>
                                        <td className="border-r border-black px-1 py-1.5"></td>
                                        <td className="border-r border-black px-1 py-1.5"></td>
                                        <td className="border-r border-black px-1 py-1.5"></td>
                                        <td className="px-1 py-1.5 border-r border-black text-center font-bold">
                                            {fmtVal(totals.blackoutMeters)}
                                        </td>
                                        <td className="px-1 py-1.5 text-center font-bold text-black">
                                            {fmtVal(totals.fabricMeters)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* FIXED COST Section (Bottom Left) */}
                        {costingLines.length > 0 && (
                            <div className="mt-6 max-w-xl">
                                <div className="border border-black bg-[#d9d9d9] py-1 px-2 text-center font-bold italic text-xs text-black border-b-0">
                                    FIXED COST
                                </div>
                                <table className="w-full border-collapse border border-black text-xs text-black font-sans bg-white">
                                    <thead>
                                        <tr className="border-b border-black bg-[#d9d9d9] font-bold text-[10px] uppercase text-black">
                                            <th className="border-r border-black px-2 py-1 text-left min-w-[130px]">PARTICULAR</th>
                                            <th className="border-r border-black px-2 py-1 text-center w-20">PRICE</th>
                                            <th className="border-r border-black px-2 py-1 text-center w-24">QUANTITY</th>
                                            <th className="border-r border-black px-2 py-1 text-center w-14">UNIT</th>
                                            <th className="px-2 py-1 text-right min-w-[110px]">AMOUNT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {costingLines.map((line) => (
                                            <tr key={line.key || line.particular} className="border-b border-black text-[11px]">
                                                <td className="border-r border-black px-2 py-1 font-medium text-black">{line.particular}</td>
                                                <td className="border-r border-black px-2 py-1 text-center text-black">{line.rate ? number(line.rate, 0) : ''}</td>
                                                <td className="border-r border-black px-2 py-1 text-center text-black">{line.quantity ? number(line.quantity, 2) : ''}</td>
                                                <td className="border-r border-black px-2 py-1 text-center text-black">{line.unit}</td>
                                                <td className="px-2 py-1 text-right font-normal text-black">{line.amount ? Number(line.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                            </tr>
                                        ))}
                                        <tr className="font-bold text-[11px] bg-white">
                                            <td colSpan={4} className="border-r border-black px-2 py-1 text-left font-bold uppercase text-black">
                                                TOTAL
                                            </td>
                                            <td className="px-2 py-1 text-right font-bold text-black">
                                                {grandTotal ? Number(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </div>
                </div>

                {/* Modal Footer Bar */}
                <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0 print:hidden">
                    <span className="text-xs text-slate-400">
                        Consumption Sheet Table Format
                    </span>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={handleClose} className="text-slate-400 hover:text-slate-100">
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;
