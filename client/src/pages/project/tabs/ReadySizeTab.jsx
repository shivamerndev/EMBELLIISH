import React, { useState } from 'react';
import { Ruler, CheckCircle2, AlertTriangle, RotateCcw, PencilLine } from 'lucide-react';
import { measurementsApi } from '../../../api';
import { useAsync, useAction } from '../../../hooks/useAsync';
import { humanise } from '../../../utils/format';
import {
  Panel, PanelHeader, Table, Button, Badge, Modal, Field, Input, StatTile,
  Loading, ErrorState, EmptyState,
} from '../../../components/ui';

/**
 * Step 4 — Ready Size.
 *
 * "Window Height 10 Feet. Lekin curtain floor touch karega. To Ready Size 10.5
 * Feet ho sakti hai." This screen is where the two numbers are put side by side
 * and signed off, and nothing reaches the cutting table until every row here is
 * green.
 */

const feet = (inches) => (inches > 0 ? `${(inches / 12).toFixed(2)} ft` : '—');

/** Sets a finished size by hand, for the windows the arithmetic cannot know about. */
const ReadySizeModal = ({ open, onClose, line, onDone }) => {
  const [form, setForm] = useState({ widthInch: '', heightInch: '', note: '' });

  React.useEffect(() => {
    if (!line) return;
    setForm({
      widthInch: line.source === 'MANUAL' ? String(line.readyWidthInch ?? '') : '',
      heightInch: line.source === 'MANUAL' ? String(line.readyHeightInch ?? '') : '',
      note: line.note || '',
    });
  }, [line]);

  const { execute, pending, error } = useAction(
    (payload) => measurementsApi.setReadySize(line.id, payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  if (!line) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Ready size — ${line.roomName} ${line.label}`}
      subtitle="The finished size the factory stitches to. Leave a field blank to use the derived figure."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={pending}
            onClick={() =>
              execute({
                widthInch: form.widthInch ? Number(form.widthInch) : undefined,
                heightInch: form.heightInch ? Number(form.heightInch) : undefined,
                note: form.note || undefined,
                confirm: true,
              })
            }
          >
            Save & sign off
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
          <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Measured at site</p>
          <p className="text-sm text-slate-200 numeric mt-1">
            {line.windowWidthInch}&quot; × {line.windowHeightInch}&quot;
            <span className="text-slate-500 ml-2">({feet(line.windowHeightInch)} drop)</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Ready width (in)" hint={`derived ${line.derivedWidthInch}"`}>
            <Input
              type="number"
              step="0.1"
              value={form.widthInch}
              onChange={(e) => setForm((p) => ({ ...p, widthInch: e.target.value }))}
              placeholder={String(line.derivedWidthInch)}
            />
          </Field>
          <Field label="Ready height (in)" hint={`derived ${line.derivedHeightInch}"`}>
            <Input
              type="number"
              step="0.1"
              value={form.heightInch}
              onChange={(e) => setForm((p) => ({ ...p, heightInch: e.target.value }))}
              placeholder={String(line.derivedHeightInch)}
            />
          </Field>
        </div>

        <Field label="Note" hint="Why this differs — floor touch, sill stop, bay return">
          <Input
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            placeholder="Floor touch"
          />
        </Field>
      </div>
    </Modal>
  );
};

export const ReadySizeTab = ({ projectId, onChange }) => {
  const [editing, setEditing] = useState(null);

  const { data, loading, error, reload } = useAsync(
    () => measurementsApi.readySize(projectId).then((r) => r.data),
    [projectId]
  );

  const refresh = () => { reload(); onChange?.(); };

  const confirmOne = useAction(
    (id) => measurementsApi.setReadySize(id, { confirm: true }),
    { onSuccess: refresh }
  );
  const withdrawOne = useAction(
    (id) => measurementsApi.setReadySize(id, { confirm: false }),
    { onSuccess: refresh }
  );
  const confirmAll = useAction(
    () => measurementsApi.confirmAllReadySizes(projectId, {}),
    { onSuccess: refresh }
  );

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { lines = [], summary = {}, allowances = {} } = data || {};
  const actionError = confirmOne.error || withdrawOne.error || confirmAll.error;

  const columns = [
    { key: 'room', header: 'Room', render: (l) => l.roomName },
    { key: 'label', header: 'Window', render: (l) => l.label },
    { key: 'particular', header: 'Particular', render: (l) => humanise(l.particular) },
    {
      key: 'window',
      header: 'Window size (in)',
      align: 'right',
      render: (l) =>
        l.windowWidthInch ? `${l.windowWidthInch} × ${l.windowHeightInch}` : <span className="text-rose-400">not measured</span>,
    },
    {
      key: 'ready',
      header: 'Ready size (in)',
      align: 'right',
      render: (l) => (
        <span className={l.readyHeightInch !== l.windowHeightInch || l.readyWidthInch !== l.windowWidthInch ? 'text-amber-300 font-semibold' : ''}>
          {l.readyWidthInch ? `${l.readyWidthInch} × ${l.readyHeightInch}` : '—'}
        </span>
      ),
    },
    {
      key: 'drop',
      header: 'Finished drop',
      align: 'right',
      render: (l) => feet(l.readyHeightInch),
    },
    {
      key: 'source',
      header: 'Set by',
      render: (l) =>
        l.source === 'MANUAL' ? <Badge tone="violet">Typed in</Badge> : <Badge tone="slate">Derived</Badge>,
    },
    {
      key: 'status',
      header: 'Sign-off',
      render: (l) =>
        l.confirmed ? <Badge tone="green">Confirmed</Badge> : <Badge tone="amber">Pending</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (l) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setEditing(l)}
            className="p-1.5 text-stone-500 hover:text-brand-400 rounded transition"
            title="Set the finished size by hand"
          >
            <PencilLine className="w-3.5 h-3.5" />
          </button>
          {l.confirmed ? (
            <button
              type="button"
              onClick={() => withdrawOne.execute(l.id)}
              className="p-1.5 text-slate-500 hover:text-amber-400 rounded transition"
              title="Withdraw the sign-off"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              disabled={!l.measurable}
              loading={confirmOne.pending}
              onClick={() => confirmOne.execute(l.id)}
            >
              Sign off
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Windows" value={summary.total || 0} icon={Ruler} />
        <StatTile
          label="Signed off"
          value={`${summary.confirmed || 0}/${summary.total || 0}`}
          icon={CheckCircle2}
          tone={summary.allConfirmed ? 'green' : 'amber'}
          sub={summary.allConfirmed ? 'Cleared for cutting' : 'Stitching is blocked'}
        />
        <StatTile label="Typed in by hand" value={summary.overridden || 0} tone="violet" sub="Not the derived size" />
        <StatTile
          label="Not measurable"
          value={summary.unmeasurable || 0}
          tone={summary.unmeasurable ? 'rose' : 'blue'}
          sub={summary.unmeasurable ? 'Missing a window measurement' : 'All rows have a size'}
        />
      </div>

      {!summary.allConfirmed && summary.total > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-200/90">
            <p className="font-semibold text-amber-300">Ready size confirm bina stitching nahi.</p>
            <p className="mt-1">
              {summary.pending} window(s) still need a sign-off. The window is what was measured; the
              ready size is what the curtain is actually made to — a floor-touch drape is taller than
              its opening. Work orders cannot be released until every row here is confirmed.
            </p>
          </div>
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.06] p-3">
          <p className="text-xs text-rose-300">{actionError.message}</p>
        </div>
      )}

      <Panel>
        <PanelHeader
          title="Window size vs ready size"
          subtitle={
            allowances.dropInch || allowances.widthInch
              ? `Step 4 — project allowances: +${allowances.widthInch}" width, +${allowances.dropInch}" drop`
              : 'Step 4 — the finished size the factory stitches to'
          }
          icon={Ruler}
          actions={
            <Button
              size="sm"
              icon={CheckCircle2}
              disabled={summary.allConfirmed || !summary.total}
              loading={confirmAll.pending}
              onClick={() => confirmAll.execute()}
            >
              Sign off all
            </Button>
          }
        />
        <Table
          columns={columns}
          rows={lines}
          empty={
            <EmptyState
              title="No windows measured yet"
              hint="Enter the rooms and windows first; their ready sizes appear here for sign-off."
              icon={Ruler}
            />
          }
        />
      </Panel>

      <ReadySizeModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        line={editing}
        onDone={refresh}
      />
    </div>
  );
};

export default ReadySizeTab;
