import React, { useState } from 'react';
import { Factory, Play, ShieldCheck, PackageSearch, ShoppingCart } from 'lucide-react';
import { productionApi, qcApi, stockApi, purchaseApi, vendorsApi } from '../../../api';
import { useAsync, useAction } from '../../../hooks/useAsync';
import { number, humanise, currency } from '../../../utils/format';
import {
  Panel, PanelHeader, Table, Button, Badge, StatusBadge, Modal, Field, Select, Input,
  Checkbox, Textarea, Loading, ErrorState, EmptyState, StatTile, Progress,
} from '../../../components/ui';

const STAGE_FLOW = ['PENDING', 'FABRIC_CUTTING', 'EMBROIDERY', 'HAND_WORK', 'STITCHING', 'CHECKING', 'PACKING', 'COMPLETED'];

/* ------------------------------------------------------ material check */

const MaterialPanel = ({ projectId, onChange }) => {
  const { data, loading, reload } = useAsync(() => stockApi.availability(projectId).then((r) => r.data), [projectId]);
  const { data: vendors } = useAsync(() => vendorsApi.list({ limit: 50 }).then((r) => r.data.items), []);
  const [vendor, setVendor] = useState('');

  const raise = useAction(() => purchaseApi.generate(projectId, { vendor }), {
    onSuccess: () => { reload(); onChange?.(); },
  });

  if (loading) return <Panel className="p-5"><Loading /></Panel>;
  if (!data?.required?.length) {
    return (
      <Panel>
        <PanelHeader title="Material" subtitle="Step 13 — do we already have it?" icon={PackageSearch} />
        <EmptyState title="Nothing to check yet" hint="Generate the consumption sheet first." icon={PackageSearch} />
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader
        title="Material availability"
        subtitle={
          data.shortages.length
            ? `${data.shortages.length} item(s) short — a purchase order is needed`
            : 'Everything the project needs is already in stock'
        }
        icon={PackageSearch}
        actions={
          data.shortages.length > 0 && (
            <div className="flex items-center gap-2">
              <Select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Choose a vendor"
                className="w-52"
                options={(vendors || []).map((v) => ({ value: v.id, label: v.name }))}
              />
              <Button size="sm" icon={ShoppingCart} disabled={!vendor} loading={raise.pending} onClick={() => raise.execute()}>
                Raise PO
              </Button>
            </div>
          )
        }
      />

      {raise.error && <p className="px-5 pt-3 text-xs text-rose-400">{raise.error.message}</p>}

      <Table
        keyField="item"
        columns={[
          { key: 'itemName', header: 'Item', render: (row) => row.itemName },
          { key: 'required', header: 'Required', align: 'right', render: (row) => `${number(row.required)} ${row.unit}` },
          { key: 'inStock', header: 'In stock', align: 'right', render: (row) => number(row.inStock) },
          { key: 'reserved', header: 'Reserved', align: 'right', render: (row) => number(row.reserved) },
          { key: 'available', header: 'Free', align: 'right', render: (row) => number(row.available) },
          {
            key: 'shortfall',
            header: 'Short',
            align: 'right',
            render: (row) =>
              row.shortfall > 0 ? (
                <span className="text-rose-400 font-semibold">{number(row.shortfall)}</span>
              ) : (
                <Badge tone="green">In stock</Badge>
              ),
          },
        ]}
        rows={data.required}
      />
    </Panel>
  );
};

/* ---------------------------------------------------------------- QC */

const InspectModal = ({ order, onClose, onDone }) => {
  const [checks, setChecks] = useState({ stitchingOk: true, sizeOk: true, colourOk: true, undamaged: true, finishingOk: true });
  const [remarks, setRemarks] = useState('');
  const [measured, setMeasured] = useState({ width: '', height: '' });

  const { execute, pending, error } = useAction(
    () =>
      qcApi.inspect(order.id ?? order._id, {
        checks,
        remarks,
        measuredWidthInch: measured.width ? Number(measured.width) : undefined,
        measuredHeightInch: measured.height ? Number(measured.height) : undefined,
      }),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const allOk = Object.values(checks).every(Boolean);

  return (
    <Modal
      open={Boolean(order)}
      onClose={onClose}
      title={`Quality check — ${order?.roomName} ${order?.windowLabel}`}
      subtitle="Step 16 — pass goes to packing, fail goes to alteration"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={allOk ? 'success' : 'danger'} loading={pending} onClick={() => execute()}>
            {allOk ? 'Record pass' : 'Record fail & raise rework'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        <p className="text-xs text-slate-500">Untick anything that is wrong. Any unticked box fails the piece.</p>

        {/* Step 4: what the piece is supposed to measure, so the inspector is not
            checking against memory. */}
        {order?.readyWidthInch > 0 && (
          <div className="rounded-lg border border-slate-800 bg-[ #836444] 900/40 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Signed ready size</p>
            <p className="text-sm text-slate-200 numeric mt-0.5">
              {order.readyWidthInch}&quot; × {order.readyHeightInch}&quot;
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              Enter the measured figures below; anything more than half an inch out fails the size check
              automatically.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Measured width (in)">
            <Input
              type="number"
              step="0.1"
              value={measured.width}
              onChange={(e) => setMeasured((p) => ({ ...p, width: e.target.value }))}
            />
          </Field>
          <Field label="Measured height (in)">
            <Input
              type="number"
              step="0.1"
              value={measured.height}
              onChange={(e) => setMeasured((p) => ({ ...p, height: e.target.value }))}
            />
          </Field>
        </div>

        <div className="space-y-2.5">
          {[
            ['stitchingOk', 'Stitching is correct'],
            ['sizeOk', 'Size matches the drawing'],
            ['colourOk', 'Colour is correct'],
            ['undamaged', 'No damage'],
            ['finishingOk', 'Finishing is clean'],
          ].map(([key, label]) => (
            <Checkbox
              key={key}
              label={label}
              checked={checks[key]}
              onChange={(e) => setChecks((prev) => ({ ...prev, [key]: e.target.checked }))}
            />
          ))}
        </div>

        <Field label="Remarks">
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Drop is 2 inches long" />
        </Field>

        {!allOk && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs text-amber-200">
              A fail automatically raises an alteration work order carrying these defects, so the factory
              does not have to be told separately.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

/* -------------------------------------------------------------- tab */

export const ProductionTab = ({ projectId, project, onChange }) => {
  const [inspecting, setInspecting] = useState(null);

  const { data: board, loading, error, reload } = useAsync(
    () => productionApi.board(projectId).then((r) => r.data),
    [projectId]
  );
  const { data: qcSummary, reload: reloadQc } = useAsync(
    () => qcApi.summary(projectId).then((r) => r.data),
    [projectId]
  );

  const refresh = () => { reload(); reloadQc(); onChange?.(); };

  const generate = useAction(() => productionApi.generate(projectId, {}), { onSuccess: refresh });
  const advance = useAction((id, toStage) => productionApi.advance(id, { toStage }), { onSuccess: refresh });
  const bulkAdvance = useAction((ids, toStage) => productionApi.bulkAdvance({ ids, toStage }), { onSuccess: refresh });

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const orders = (board || []).flatMap((column) => column.orders);
  const nextStageOf = (stage) => STAGE_FLOW[STAGE_FLOW.indexOf(stage) + 1];

  if (!orders.length) {
    return (
      <div className="space-y-4">
        <MaterialPanel projectId={projectId} onChange={onChange} />

        <Panel>
          <PanelHeader title="Factory" subtitle="Step 15 — one work order per window" icon={Factory} />
          <EmptyState
            title="No work orders yet"
            hint={
              project.isActivated
                ? 'Release the consumption sheet to the factory to create one work order per window.'
                : 'Production cannot start until the project is active — token, advance, design and measurements must all be in.'
            }
            icon={Factory}
            action={
              <Button
                size="sm"
                icon={Play}
                disabled={!project.isActivated}
                title={!project.isActivated ? 'Production cannot start before the project is activated' : ''}
                loading={generate.pending}
                onClick={() => generate.execute()}
              >
                Release to factory
              </Button>
            }
          />
          {generate.error && (
            <div className="mx-5 mb-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs text-amber-200">{generate.error.message}</p>
            </div>
          )}
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Work orders" value={orders.length} icon={Factory} />
        <StatTile label="QC passed" value={qcSummary?.passed ?? 0} sub={`${qcSummary?.passRate ?? 0}% pass rate`} tone="green" icon={ShieldCheck} />
        <StatTile label="QC failed" value={qcSummary?.failed ?? 0} tone={qcSummary?.failed ? 'rose' : 'green'} icon={ShieldCheck} />
        <StatTile label="Awaiting QC" value={qcSummary?.pending ?? 0} tone="amber" icon={ShieldCheck} />
      </div>

      <MaterialPanel projectId={projectId} onChange={onChange} />

      {/* Kanban across the six factory stages from the story. */}
      <Panel>
        <PanelHeader
          title="Factory floor"
          subtitle="Cutting → Embroidery → Hand work → Stitching → Checking → Packing"
          icon={Factory}
        />
        <div className="overflow-x-auto">
          <div className="flex gap-px bg-[ #836444] 800 min-w-max">
            {(board || []).map((column) => (
              <div key={column.stage} className="bg-[ #836444] 900 w-52 shrink-0">
                <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {column.stage.replace(/_/g, ' ')}
                  </span>
                  <Badge tone="slate">{column.orders.length}</Badge>
                </div>

                <div className="p-2 space-y-2 min-h-[6rem] max-h-96 overflow-y-auto">
                  {column.orders.map((order) => (
                    <div key={order._id} className="p-2.5 rounded-lg bg-[ #836444] 800/60 border border-slate-700/60">
                      <p className="text-xs font-medium text-slate-200 truncate">{order.roomName}</p>
                      <p className="text-[11px] text-slate-500">
                        {order.windowLabel} · {humanise(order.particular)}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-1 numeric">
                        {order.parts} panels · {number(order.fabricMeters)} m
                      </p>
                      {/* Step 4: the size on the card is the one the floor cuts to. */}
                      {order.readyWidthInch > 0 && (
                        <p className="text-[10px] text-amber-300/80 mt-0.5 numeric" title="Ready size — the finished size, not the window opening">
                          ready {order.readyWidthInch}&quot; × {order.readyHeightInch}&quot;
                        </p>
                      )}

                      {order.isRework && <Badge tone="amber" className="mt-1.5">Rework</Badge>}

                      <div className="mt-2 flex gap-1">
                        {nextStageOf(order.stage) && order.stage !== 'CHECKING' && (
                          <button
                            type="button"
                            onClick={() => advance.execute(order._id, nextStageOf(order.stage))}
                            className="text-[10px] px-2 py-1 rounded bg-[ #836444] 700 hover:bg-[ #836444] 600 text-slate-200 transition"
                          >
                            → {nextStageOf(order.stage).replace(/_/g, ' ')}
                          </button>
                        )}
                        {order.stage === 'CHECKING' && order.qcStatus === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => setInspecting({ ...order, id: order._id })}
                            className="text-[10px] px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition"
                          >
                            Inspect
                          </button>
                        )}
                        {order.qcStatus === 'PASS' && <Badge tone="green">QC pass</Badge>}
                        {order.qcStatus === 'FAIL' && <Badge tone="rose">QC fail</Badge>}
                      </div>
                    </div>
                  ))}

                  {column.orders.length > 0 && column.stage !== 'CHECKING' && nextStageOf(column.stage) && (
                    <button
                      type="button"
                      onClick={() => bulkAdvance.execute(column.orders.map((o) => o._id), nextStageOf(column.stage))}
                      className="w-full text-[10px] py-1.5 rounded border border-dashed border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition"
                    >
                      Move all {column.orders.length} on
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {(advance.error || bulkAdvance.error) && (
          <p className="px-5 py-3 text-xs text-rose-400">{(advance.error || bulkAdvance.error).message}</p>
        )}
      </Panel>

      {qcSummary?.defectsByType?.length > 0 && (
        <Panel>
          <PanelHeader title="Defects by type" subtitle="What the factory keeps getting wrong" icon={ShieldCheck} />
          <div className="p-5 space-y-2">
            {qcSummary.defectsByType.map((defect) => (
              <div key={defect.type} className="flex items-center gap-3">
                <span className="w-28 text-xs text-slate-400">{humanise(defect.type)}</span>
                <Progress value={(defect.count / qcSummary.total) * 100} tone="rose" className="flex-1" />
                <span className="w-8 text-right text-xs numeric text-slate-300">{defect.count}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {inspecting && <InspectModal order={inspecting} onClose={() => setInspecting(null)} onDone={refresh} />}
    </div>
  );
};

export default ProductionTab;
