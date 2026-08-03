import React, { useState } from 'react';
import { Calculator, RefreshCw, FileSpreadsheet, CheckCircle2, Eye, FileText, Sparkles } from 'lucide-react';
import { boqApi } from '../../../api';
import { useAsync, useAction } from '../../../hooks/useAsync';
import { currency, number, date } from '../../../utils/format';
import {
  Panel, PanelHeader, Button, Badge, StatusBadge, Loading, ErrorState, EmptyState, StatTile,
} from '../../../components/ui';

/**
 * Step 6 — the consumption sheet, laid out the way the paper one is: rows grouped
 * by area, with a subtotal per room and a grand total at the bottom.
 */

const SHEET_COLUMNS = [
  { key: 'windowLabel', header: 'Window', align: 'left' },
  { key: 'particularLabel', header: 'Particular', align: 'left' },
  { key: 'width', header: 'Width', align: 'right' },
  { key: 'height', header: 'Height', align: 'right' },
  { key: 'rnft', header: 'Rnft', align: 'right' },
  { key: 'totalParts', header: 'Parts', align: 'right' },
  { key: 'roundedParts', header: 'Rd off', align: 'right' },
  { key: 'heightPerPartM', header: 'Ht/part', align: 'right' },
  { key: 'fabricMeters', header: 'Fabric (m)', align: 'right' },
  { key: 'blackoutMeters', header: 'Blackout', align: 'right' },
  { key: 'romanSqft', header: 'Roman ft²', align: 'right' },
];

const cellValue = (line, key) => {
  const value = line[key];
  if (value === undefined || value === null || value === '' || value === 0) {
    return ['fabricMeters', 'rnft'].includes(key) ? '—' : <span className="text-slate-700">—</span>;
  }
  return typeof value === 'number' ? number(value) : value;
};

const RoomBlock = ({ room }) => (
  <div className="border-b border-slate-800 last:border-0">
    <div className="px-4 py-2 bg-[#251e18] flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-200">
        {room.roomName}
        {room.floor && <span className="text-slate-500 font-normal ml-2">{room.floor}</span>}
      </span>
      <span className="text-[11px] text-slate-500 numeric">
        {number(room.totals.rnft)} rnft · {number(room.totals.fabricMeters)} m fabric
        {room.totals.romanSqft > 0 && ` · ${number(room.totals.romanSqft)} ft² roman`}
      </span>
    </div>

    <table className="w-full text-xs">
      <tbody>
        {room.lines.map((line, index) => (
          <tr key={index} className="border-b border-slate-800/40 last:border-0">
            {SHEET_COLUMNS.map((column) => (
              <td
                key={column.key}
                className={`px-3 py-2 ${column.align === 'right' ? 'text-right numeric text-slate-300' : 'text-slate-300'}`}
              >
                {column.key === 'roundedParts' && line.partsOverridden ? (
                  <span className="text-amber-400" title="Panel count set by the coordinator">
                    {line.roundedParts}*
                  </span>
                ) : (
                  cellValue(line, column.key)
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const ConsumptionTab = ({ projectId, onChange }) => {
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

  if (loading) return <Loading />;

  const sheet = previewing && preview ? preview : boq;
  const rooms = previewing && preview ? preview.rooms : boq?.roomTotals
    // A saved BOQ stores flat lines plus room totals; regroup them for display.
    ? boq.roomTotals.map((room) => ({
      ...room,
      lines: boq.lines.filter((line) => String(line.room) === String(room.room)),
    }))
    : [];

  if (!boq && !previewing) {
    return (
      <Panel>
        <PanelHeader title="Consumption sheet" subtitle="Step 6 — where the ERP starts calculating" icon={Calculator} />
        <EmptyState
          title="No consumption sheet yet"
          hint="Once windows are measured, the ERP works out fabric, blackout, lead band, stitching and roman area for every room."
          icon={FileSpreadsheet}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={Calculator} onClick={() => { setPreviewing(true); loadPreview(); }}>
                Preview calculation
              </Button>
              <Button size="sm" icon={RefreshCw} loading={generate.pending} onClick={() => generate.execute()}>
                Generate sheet
              </Button>
            </div>
          }
        />
        {generate.error && <p className="px-5 pb-4 text-xs text-rose-400">{generate.error.message}</p>}
      </Panel>
    );
  }

  const totals = sheet?.totals || {};
  const costing = previewing && preview ? preview.costing : boq
    ? { lines: boq.costLines, subtotal: boq.subtotal, gstPercent: boq.gstPercent, gstAmount: boq.gstAmount, grandTotal: boq.grandTotal }
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatTile label="Running feet" value={number(totals.rnft)} sub="stitching & track" />
        <StatTile label="Curtain fabric" value={`${number(totals.fabricMeters)} m`} tone="violet" />
        <StatTile label="Blackout" value={`${number(totals.blackoutMeters)} m`} tone="violet" />
        <StatTile label="Roman" value={`${number(totals.romanSqft)} ft²`} tone="violet" />
        <StatTile label="Panels" value={number(totals.parts, 0)} sub="fabric drops" />
        <StatTile label="Motors" value={number(totals.motorQty, 0)} tone="amber" />
      </div>

      <Panel>
        <PanelHeader
          title={previewing ? 'Live Calculation (Unsaved)' : `Consumption sheet ${boq?.code ? `(${boq.code})` : ''}`}
          subtitle={
            previewing
              ? 'Recomputed dynamically from current window measurements'
              : `Revision ${boq?.revision ?? 1} · generated ${date(boq?.createdAt)}`
          }
          icon={Calculator}
          actions={
            <div className="flex items-center gap-2">
              {boq ? (
                <StatusBadge status={boq.status} />
              ) : previewing ? (
                <Badge tone="amber">Unsaved Live Preview</Badge>
              ) : null}

              {!boq && (
                <Button
                  size="sm"
                  variant={previewing ? 'outline' : 'secondary'}
                  icon={previewing ? FileText : Eye}
                  onClick={() => {
                    const next = !previewing;
                    setPreviewing(next);
                    if (next) loadPreview();
                  }}
                >
                  {previewing ? 'Exit preview' : 'Preview from measurements'}
                </Button>
              )}

              {boq && boq.status !== 'APPROVED' && !previewing && (
                <Button size="sm" variant="secondary" icon={CheckCircle2} loading={approve.pending} onClick={() => approve.execute()}>
                  Approve
                </Button>
              )}

              <Button size="sm" icon={RefreshCw} loading={generate.pending} onClick={() => generate.execute()}>
                {boq ? 'Regenerate' : 'Generate'}
              </Button>
            </div>
          }
        />

        {previewing && !boq && (
          <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <b>Live Preview Mode:</b> Viewing recomputed values from current measurements. Click{' '}
                <b>Generate</b> to save the official sheet.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewing(false)}
              className="text-amber-300 hover:text-amber-100 font-medium underline shrink-0 ml-4"
            >
              Exit Preview
            </button>
          </div>
        )}

        {generate.error && <p className="px-5 pt-3 text-xs text-rose-400">{generate.error.message}</p>}

        <div className="overflow-x-auto">
          <div className="min-w-[56rem]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {SHEET_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ${column.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>

            {rooms.map((room, index) => (
              <RoomBlock key={room.room || index} room={room} />
            ))}

            <div className="px-4 py-3 bg-[#251e18] border-t border-[#3d3026] flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">Project total</span>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs numeric">
                <span className="text-slate-400">Rnft <b className="text-slate-100">{number(totals.rnft)}</b></span>
                <span className="text-slate-400">Fabric <b className="text-slate-100">{number(totals.fabricMeters)} m</b></span>
                <span className="text-slate-400">Blackout <b className="text-slate-100">{number(totals.blackoutMeters)} m</b></span>
                <span className="text-slate-400">Roman <b className="text-slate-100">{number(totals.romanSqft)} ft²</b></span>
                <span className="text-slate-400">Lead band <b className="text-slate-100">{number(totals.leadBandRnft)} rnft</b></span>
              </div>
            </div>
          </div>
        </div>

        <p className="px-4 py-2 text-[11px] text-slate-600 border-t border-slate-800">
          * panel count set by the coordinator rather than the calculated figure
        </p>
      </Panel>

      {costing?.lines?.length > 0 && (
        <Panel>
          <PanelHeader title="Costing" subtitle="What the consumption sheet is worth — feeds straight into the quotation" />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Particular</th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Quantity</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Unit</th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rate</th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {costing.lines.map((line) => (
                <tr key={line.key} className="border-b border-slate-800/50">
                  <td className="px-4 py-2.5 text-slate-300">{line.particular}</td>
                  <td className="px-4 py-2.5 text-right numeric text-slate-300">{number(line.quantity)}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{line.unit}</td>
                  <td className="px-4 py-2.5 text-right numeric text-slate-400">{currency(line.rate)}</td>
                  <td className="px-4 py-2.5 text-right numeric text-slate-100 font-medium">{currency(line.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-xs text-slate-400">Subtotal</td>
                <td className="px-4 py-2 text-right numeric text-slate-200">{currency(costing.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-xs text-slate-400">GST @ {costing.gstPercent}%</td>
                <td className="px-4 py-2 text-right numeric text-slate-200">{currency(costing.gstAmount)}</td>
              </tr>
              <tr className="border-t border-slate-700">
                <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-slate-100">Grand total</td>
                <td className="px-4 py-3 text-right numeric text-base font-bold text-emerald-400">
                  {currency(costing.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </Panel>
      )}

      {error && <ErrorState error={error} onRetry={reload} />}
    </div>
  );
};

export default ConsumptionTab;
