import React, { useState } from 'react';
import { Calculator, RefreshCw, FileSpreadsheet, CheckCircle2, Eye, FileText, Sparkles, X } from 'lucide-react';
import { boqApi } from '../../../api';
import { useAsync, useAction } from '../../../hooks/useAsync';
import { currency, number, date } from '../../../utils/format';
import {
  Panel, PanelHeader, Button, Badge, StatusBadge, Loading, ErrorState, StatTile, Modal,
} from '../../../components/ui';

/**
 * Step 6 — Consumption Sheet
 * Displays high-level stats and an action banner.
 * Clicking "Preview Consumption Sheet" opens a popup modal displaying the official client paper-formatted sheet.
 */

const fmtVal = (val, isCheck = false) => {
  if (isCheck) {
    return val ? <span className="font-bold text-emerald-500 dark:text-emerald-400">✓</span> : <span className="text-slate-300 dark:text-slate-700">—</span>;
  }
  if (val === undefined || val === null || val === '' || val === 0) {
    return <span className="text-slate-300 dark:text-slate-700">—</span>;
  }
  return typeof val === 'number' ? number(val) : val;
};

export const ConsumptionTab = ({ projectId, project, onChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const { data: boq, loading, error, reload } = useAsync(
    () => boqApi.current(projectId).then((r) => r.data).catch(() => null),
    [projectId]
  );

  const { data: preview, reload: loadPreview } = useAsync(
    () => (previewing ? boqApi.preview(projectId, {}).then((r) => r.data) : Promise.resolve(null)),
    [projectId, previewing]
  );

  const generate = useAction(() => boqApi.generate(projectId, {}), {
    onSuccess: () => { reload(); onChange?.(); setPreviewing(false); },
  });

  const approve = useAction(() => boqApi.approve(boq.id ?? boq._id), { onSuccess: () => { reload(); onChange?.(); } });

  const handleOpenPreview = () => {
    setShowModal(true);
    if (!boq) {
      setPreviewing(true);
      loadPreview();
    }
  };

  const handleClosePreview = () => {
    setShowModal(false);
  };

  if (loading) return <Loading label="Loading consumption sheet…" />;

  const sheet = previewing && preview ? preview : boq;
  const rawRooms = previewing && preview ? preview.rooms : boq?.roomTotals
    ? boq.roomTotals.map((room) => ({
      ...room,
      lines: boq.lines ? boq.lines.filter((line) => String(line.room) === String(room.room)) : [],
    }))
    : [];

  const totals = sheet?.totals || {};
  const costing = previewing && preview ? preview.costing : boq
    ? { lines: boq.costLines, subtotal: boq.subtotal, gstPercent: boq.gstPercent, gstAmount: boq.gstAmount, grandTotal: boq.grandTotal }
    : null;

  // Group rooms and lines by Floor matching the paper sheet
  let globalSr = 1;
  const floorGroups = [];
  const floorMap = new Map();

  rawRooms.forEach((room) => {
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

  return (
    <div className="space-y-4">
      {/* Top Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatTile label="Running feet" value={number(totals.rnft)} sub="stitching & track" />
        <StatTile label="Curtain fabric" value={`${number(totals.fabricMeters)} m`} tone="violet" />
        <StatTile label="Blackout" value={`${number(totals.blackoutMeters)} m`} tone="violet" />
        <StatTile label="Roman" value={`${number(totals.romanSqft)} ft²`} tone="violet" />
        <StatTile label="Panels" value={number(totals.parts, 0)} sub="fabric drops" />
        <StatTile label="Estimated Cost" value={costing?.grandTotal ? currency(costing.grandTotal, { compact: true }) : '—'} tone="amber" />
      </div>

      {/* Main Action Banner Panel */}
      <Panel>
        <PanelHeader
          title={boq ? `Consumption Sheet (${boq.code || 'Current'})` : 'Consumption Sheet'}
          subtitle={
            boq
              ? `Revision ${boq.revision ?? 1} · Generated ${date(boq.createdAt)}`
              : 'Calculate material, stitching, and fabric requirements from room measurements'
          }
          icon={Calculator}
          actions={
            <div className="flex items-center gap-2">
              {boq ? (
                <StatusBadge status={boq.status} />
              ) : previewing ? (
                <Badge tone="amber">Unsaved Live Preview</Badge>
              ) : (
                <Badge tone="slate">Not Generated</Badge>
              )}

              {boq && boq.status !== 'APPROVED' && !previewing && (
                <Button size="sm" variant="secondary" icon={CheckCircle2} loading={approve.pending} onClick={() => approve.execute()}>
                  Approve
                </Button>
              )}

              <Button size="sm" icon={RefreshCw} loading={generate.pending} onClick={() => generate.execute()}>
                {boq ? 'Regenerate Sheet' : 'Generate Sheet'}
              </Button>
            </div>
          }
        />

        <div className="p-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
              Original Client Consumption Sheet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Click the button to open a popup preview of the official paper-formatted consumption sheet with O2O/F2F window dimensions, pelmet sizes, wire status, curtain fabric requirements, and fixed cost calculations.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              size="md"
              variant="primary"
              icon={Eye}
              onClick={handleOpenPreview}
              className="shadow-md"
            >
              Preview Consumption Sheet
            </Button>
          </div>
        </div>

        {generate.error && <p className="px-5 pb-3 text-xs text-rose-400">{generate.error.message}</p>}
      </Panel>

      {/* POPUP MODAL PREVIEW — B&W PDF PAPER DOCUMENT SHEET STYLE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto backdrop-blur-md bg-slate-950/85 animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl max-h-[94vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
            {/* Modal Header — PDF Viewer Top Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900 text-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-300" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Consumption_Sheet_{boq?.code || 'Doc'}.pdf
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded">
                      B&amp;W PDF Sheet
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {previewing ? 'Unsaved Live Preview' : `Revision ${boq?.revision ?? 1} · ${date(boq?.createdAt)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                  title="Close PDF Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body — PDF Paper Viewer Canvas */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 flex justify-center">
              {/* Paper Document Container (Pure B&W PDF Page) */}
              <div
                id="consumption-pdf-sheet"
                className="w-full max-w-5xl bg-white text-slate-950 p-6 sm:p-10 shadow-2xl rounded-sm border border-slate-400 font-sans print:shadow-none print:p-0 print:border-none print:max-w-none space-y-6"
              >
                {/* Print-specific CSS */}
                <style>{`
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    #consumption-pdf-sheet, #consumption-pdf-sheet * {
                      visibility: visible !important;
                    }
                    #consumption-pdf-sheet {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      box-shadow: none !important;
                      border: none !important;
                      background: #ffffff !important;
                      color: #000000 !important;
                    }
                  }
                `}</style>

                {/* Document Header Block matching B&W official sheet */}
                <div className="border-2 border-slate-950 p-4 bg-white text-slate-950">
                  <div className="text-center pb-2 mb-3 border-b-2 border-slate-950">
                    <h2 className="text-2xl font-serif tracking-widest font-bold text-slate-950 uppercase">
                      embellish
                    </h2>
                    <p className="text-[10px] tracking-[0.25em] text-slate-800 uppercase font-semibold">
                      Punctuating Spaces ●
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-950">
                    <div className="space-y-1">
                      <div className="flex">
                        <span className="w-28 text-slate-800 font-bold">Client-</span>
                        <span className="font-bold text-slate-950">{project?.client?.name || project?.name || boq?.project?.name || 'Mr. Hiral - Buglow - 1'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-28 text-slate-800 font-bold">Architect-</span>
                        <span className="font-semibold">{project?.architect?.name || '—'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-28 text-slate-800 font-bold">Site Address-</span>
                        <span className="font-semibold">{project?.siteAddress || project?.client?.city || 'Delhi'}</span>
                      </div>
                    </div>

                    <div className="space-y-1 md:text-right">
                      <div className="flex md:justify-end">
                        <span className="w-28 md:w-auto md:mr-2 text-slate-800 font-bold">Date-</span>
                        <span className="font-bold text-slate-950">{date(boq?.createdAt || new Date())}</span>
                      </div>
                      <div className="flex md:justify-end">
                        <span className="w-28 md:w-auto md:mr-2 text-slate-800 font-bold">Site visited by-</span>
                        <span className="font-semibold">{project?.assignedDCM?.name || project?.projectCoordinator?.name || 'hasan'}</span>
                      </div>
                      <div className="flex md:justify-end pt-1">
                        <span className="font-bold text-slate-950 border border-slate-950 px-2 py-0.5 rounded-none text-[11px] uppercase bg-slate-100">
                          {floorsSummaryText}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Consumption Table Container */}
                <div className="overflow-x-auto border-2 border-slate-950">
                  <table className="w-full text-[11px] border-collapse bg-white text-slate-950 font-sans">
                    <thead>
                      {/* Row 1 Headers */}
                      <tr className="border-b-2 border-slate-950 bg-slate-100 text-slate-950 font-bold text-center uppercase tracking-wider text-[10px]">
                        <th rowSpan={2} className="px-2 py-2 border-r border-slate-950 w-8">SR</th>
                        <th rowSpan={2} className="px-3 py-2 border-r border-slate-950 text-left min-w-[110px]">Area</th>
                        <th rowSpan={2} className="px-3 py-2 border-r border-slate-950 text-left min-w-[130px]">Particular</th>
                        <th colSpan={4} className="px-2 py-1 border-r border-slate-950 border-b border-slate-950">Window size (In inches)</th>
                        <th colSpan={4} className="px-2 py-1 border-r border-slate-950 border-b border-slate-950">Pelmet Size</th>
                        <th colSpan={2} className="px-2 py-1 border-r border-slate-950 border-b border-slate-950">Wire</th>
                        <th rowSpan={2} className="px-2 py-2 border-r border-slate-950 text-right w-14">Rnft</th>
                        <th rowSpan={2} className="px-2 py-2 border-r border-slate-950 text-right w-16">Roman Sqft</th>
                        <th colSpan={6} className="px-2 py-1 text-center border-b border-slate-950">Fabric requirement for curtain</th>
                      </tr>
                      {/* Row 2 Sub-Headers */}
                      <tr className="border-b-2 border-slate-950 bg-slate-50 text-slate-950 text-[9px] font-semibold text-center uppercase tracking-wider">
                        {/* Window size */}
                        <th colSpan={2} className="px-1 py-1 border-r border-slate-400">O2O <span className="font-normal text-[8px] block">width / height</span></th>
                        <th colSpan={2} className="px-1 py-1 border-r border-slate-950">F2F <span className="font-normal text-[8px] block">width / height</span></th>

                        {/* Pelmet size */}
                        <th colSpan={2} className="px-1 py-1 border-r border-slate-400">O2O <span className="font-normal text-[8px] block">width / drop</span></th>
                        <th colSpan={2} className="px-1 py-1 border-r border-slate-950">F2F <span className="font-normal text-[8px] block">width / drop</span></th>

                        {/* Wire */}
                        <th className="px-1 py-1 border-r border-slate-400 w-8">Right</th>
                        <th className="px-1 py-1 border-r border-slate-950 w-8">Left</th>

                        {/* Fabric Requirement */}
                        <th className="px-2 py-1 border-r border-slate-400 text-right w-14">Total parts</th>
                        <th className="px-2 py-1 border-r border-slate-400 text-right w-16">Rd off / PARTS</th>
                        <th className="px-2 py-1 border-r border-slate-400 text-right w-14">Ht. Per Part</th>
                        <th className="px-2 py-1 border-r border-slate-400 text-right w-16">Mtrs Drapes</th>
                        <th className="px-2 py-1 border-r border-slate-400 text-right w-14">blackout</th>
                        <th className="px-2 py-1 text-right w-20">Mtrs Drapes / round off</th>
                      </tr>
                    </thead>

                    <tbody>
                      {floorGroups.map((floorGroup) => (
                        <React.Fragment key={floorGroup.floor}>
                          {/* Floor Header Banner */}
                          {floorGroup.floor && floorGroup.floor !== 'Main' && (
                            <tr className="bg-slate-200 border-y-2 border-slate-950">
                              <td colSpan={19} className="px-4 py-1.5 font-bold text-center text-slate-950 tracking-wider text-xs uppercase">
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

                              const wireRight = line.wire?.right;
                              const wireLeft = line.wire?.left;

                              return (
                                <tr
                                  key={line.window || `${room.room}-${lIdx}`}
                                  className="border-b border-slate-400 text-slate-950 text-[11px] hover:bg-slate-50"
                                >
                                  {/* SR */}
                                  <td className="px-2 py-1.5 border-r border-slate-400 text-center font-bold text-slate-950 numeric">
                                    {line.sr}
                                  </td>

                                  {/* Area */}
                                  {isFirstInRoom ? (
                                    <td
                                      rowSpan={roomLines.length}
                                      className="px-3 py-1.5 border-r border-slate-950 border-b border-slate-950 font-bold align-top bg-white text-slate-950"
                                    >
                                      {room.roomName}
                                    </td>
                                  ) : null}

                                  {/* Particular */}
                                  <td className="px-3 py-1.5 border-r border-slate-400 font-medium">
                                    {line.particularLabel || line.particular}
                                  </td>

                                  {/* O2O width & height */}
                                  <td className="px-1.5 py-1.5 border-r border-slate-300 text-right numeric">{fmtVal(o2oW)}</td>
                                  <td className="px-1.5 py-1.5 border-r border-slate-400 text-right numeric">{fmtVal(o2oH)}</td>

                                  {/* F2F width & height */}
                                  <td className="px-1.5 py-1.5 border-r border-slate-300 text-right numeric">{fmtVal(f2fW)}</td>
                                  <td className="px-1.5 py-1.5 border-r border-slate-950 text-right numeric">{fmtVal(f2fH)}</td>

                                  {/* Pelmet O2O width & drop */}
                                  <td className="px-1.5 py-1.5 border-r border-slate-300 text-right numeric">{fmtVal(pelO2oW)}</td>
                                  <td className="px-1.5 py-1.5 border-r border-slate-400 text-right numeric">{fmtVal(pelO2oD)}</td>

                                  {/* Pelmet F2F width & drop */}
                                  <td className="px-1.5 py-1.5 border-r border-slate-300 text-right numeric">{fmtVal(pelF2fW)}</td>
                                  <td className="px-1.5 py-1.5 border-r border-slate-950 text-right numeric">{fmtVal(pelF2fD)}</td>

                                  {/* Wire Right & Left */}
                                  <td className="px-1 py-1.5 border-r border-slate-300 text-center font-bold">{wireRight ? '✓' : '—'}</td>
                                  <td className="px-1 py-1.5 border-r border-slate-950 text-center font-bold">{wireLeft ? '✓' : '—'}</td>

                                  {/* Rnft */}
                                  <td className="px-2 py-1.5 border-r border-slate-400 text-right font-semibold numeric">{fmtVal(line.rnft)}</td>

                                  {/* Roman Sqft */}
                                  <td className="px-2 py-1.5 border-r border-slate-950 text-right font-semibold numeric">{fmtVal(line.romanSqft)}</td>

                                  {/* Total Parts */}
                                  <td className="px-2 py-1.5 border-r border-slate-300 text-right numeric text-slate-800">{fmtVal(line.totalParts)}</td>

                                  {/* Rd off / PARTS */}
                                  <td className="px-2 py-1.5 border-r border-slate-300 text-right font-bold numeric">
                                    {line.partsOverridden ? (
                                      <span className="text-slate-950 font-extrabold" title="Panel count overridden">
                                        {line.roundedParts}*
                                      </span>
                                    ) : (
                                      fmtVal(line.roundedParts)
                                    )}
                                  </td>

                                  {/* Ht. Per Part */}
                                  <td className="px-2 py-1.5 border-r border-slate-300 text-right numeric">{fmtVal(line.heightPerPartM)}</td>

                                  {/* Mtrs Drapes */}
                                  <td className="px-2 py-1.5 border-r border-slate-300 text-right numeric text-slate-800">{fmtVal(line.drapeMeters)}</td>

                                  {/* Blackout */}
                                  <td className="px-2 py-1.5 border-r border-slate-300 text-right numeric">{fmtVal(line.blackoutMeters)}</td>

                                  {/* Mtrs Drapes / round off */}
                                  <td className="px-2 py-1.5 text-right font-extrabold numeric text-slate-950">{fmtVal(line.fabricMeters)}</td>
                                </tr>
                              );
                            });
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>

                    {/* Bottom Summary Row */}
                    <tfoot>
                      <tr className="border-t-2 border-slate-950 bg-slate-100 font-bold text-slate-950 text-xs">
                        <td colSpan={12} className="px-4 py-2.5 text-left border-r border-slate-950 uppercase tracking-wider font-extrabold">
                          {floorsSummaryText} Total
                        </td>
                        <td className="px-2 py-2.5 border-r border-slate-950 text-right numeric font-extrabold">
                          {number(totals.rnft)}
                        </td>
                        <td className="px-2 py-2.5 border-r border-slate-950 text-right numeric font-extrabold">
                          {number(totals.romanSqft)}
                        </td>
                        <td colSpan={3} className="border-r border-slate-950"></td>
                        <td className="px-2 py-2.5 border-r border-slate-950 text-right numeric font-extrabold">
                          {number(totals.blackoutMeters)}
                        </td>
                        <td className="px-2 py-2.5 text-right numeric text-slate-950 font-black text-sm">
                          {number(totals.fabricMeters)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="text-[11px] text-slate-800 italic">
                  * Panel count overridden manually by coordinator
                </p>

                {/* FIXED COST Table */}
                {costing?.lines?.length > 0 && (
                  <div className="pt-4 border-t-2 border-slate-950 max-w-xl">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-950 mb-2 border-b border-slate-950 pb-1">
                      FIXED COST
                    </h3>
                    <div className="border-2 border-slate-950 rounded-none overflow-hidden">
                      <table className="w-full text-xs text-slate-950">
                        <thead>
                          <tr className="border-b-2 border-slate-950 bg-slate-100 text-slate-950 font-bold uppercase">
                            <th className="px-3 py-2 text-left border-r border-slate-950">PARTICULAR</th>
                            <th className="px-3 py-2 text-right border-r border-slate-950">PRICE</th>
                            <th className="px-3 py-2 text-right border-r border-slate-950">QUANTITY</th>
                            <th className="px-2 py-2 text-center border-r border-slate-950">UNIT</th>
                            <th className="px-3 py-2 text-right">AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-400 bg-white">
                          {costing.lines.map((line) => (
                            <tr key={line.key} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium text-slate-950 border-r border-slate-400">
                                {line.particular}
                              </td>
                              <td className="px-3 py-2 text-right numeric border-r border-slate-400">
                                {currency(line.rate, { decimals: 0 })}
                              </td>
                              <td className="px-3 py-2 text-right numeric border-r border-slate-400">
                                {number(line.quantity)}
                              </td>
                              <td className="px-2 py-2 text-center text-slate-800 border-r border-slate-400 text-[11px]">
                                {line.unit}
                              </td>
                              <td className="px-3 py-2 text-right numeric font-bold text-slate-950">
                                {currency(line.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-950">
                          <tr>
                            <td colSpan={4} className="px-3 py-1.5 text-right text-[11px] text-slate-800">Subtotal</td>
                            <td className="px-3 py-1.5 text-right numeric text-slate-950 font-bold">{currency(costing.subtotal)}</td>
                          </tr>
                          <tr>
                            <td colSpan={4} className="px-3 py-1.5 text-right text-[11px] text-slate-800">GST @ {costing.gstPercent}%</td>
                            <td className="px-3 py-1.5 text-right numeric text-slate-950 font-bold">{currency(costing.gstAmount)}</td>
                          </tr>
                          <tr className="border-t-2 border-slate-950 text-sm">
                            <td colSpan={4} className="px-3 py-2 text-[11px] uppercase tracking-wider text-slate-950 font-extrabold">TOTAL</td>
                            <td className="px-3 py-2 text-right numeric font-black text-slate-950 text-base">
                              {currency(costing.grandTotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* B&W PDF Sheet Footer watermark / branding */}
                <div className="border-t border-slate-400 pt-3 mt-8 flex justify-between items-center text-[10px] text-slate-700 font-mono">
                  <span>EMBELLISH — Official Consumption Sheet Document</span>
                  <span>Page 1 of 1</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Bar */}
            <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400">
                Monochrome B&amp;W PDF Sheet Paper Format
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={handleClosePreview} className="text-slate-400 hover:text-slate-100">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <ErrorState error={error} onRetry={reload} />}
    </div>
  );
};

export default ConsumptionTab;
