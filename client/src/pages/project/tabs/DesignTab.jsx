import React, { useState } from 'react';
import { Palette, Plus, Check, Send, PencilRuler, FileDown } from 'lucide-react';
import { designsApi, drawingsApi, roomsApi, fabricsApi, motorsApi, documentsApi } from '../../../api';
import { useAsync, useAction } from '../../../hooks/useAsync';
import { date } from '../../../utils/format';
import {
  Panel, PanelHeader, Table, Button, Badge, StatusBadge, Modal, Field, Input,
  Select, Textarea, Checkbox, Loading, ErrorState, EmptyState,
} from '../../../components/ui';

/** Steps 7, 11 and 12 — the designs the client signs off, and the drawing the factory builds from. */

const NewDesignModal = ({ open, onClose, projectId, rooms, fabrics, motors, onDone }) => {
  const [form, setForm] = useState({
    room: '', title: '', fabric: '', sheerFabric: '', trackType: '',
    motorised: false, motor: '', tieback: '', colourScheme: '', description: '',
  });

  const { execute, pending, error } = useAction((payload) => designsApi.create(payload), {
    onSuccess: () => { onDone(); onClose(); },
  });

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New design"
      subtitle="Step 11 — a room's fabric, track, motor and trimmings"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={pending}
            onClick={() =>
              execute({
                project: projectId,
                room: form.room || undefined,
                title: form.title || undefined,
                fabric: form.fabric || undefined,
                fabricName: fabrics?.find((f) => f.id === form.fabric)?.name,
                sheerFabric: form.sheerFabric || undefined,
                trackType: form.trackType || undefined,
                motorised: form.motorised,
                motor: form.motor || undefined,
                tieback: form.tieback || undefined,
                colourScheme: form.colourScheme || undefined,
                description: form.description || undefined,
              })
            }
          >
            Create design
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Room" required>
            <Select
              value={form.room}
              onChange={set('room')}
              placeholder="Select a room"
              options={(rooms || []).map((r) => ({ value: r._id, label: `${r.name} · ${r.floor}` }))}
            />
          </Field>
          <Field label="Title">
            <Input value={form.title} onChange={set('title')} placeholder="Master Bedroom — Champagne Silk" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Main fabric">
            <Select
              value={form.fabric}
              onChange={set('fabric')}
              placeholder="—"
              options={(fabrics || []).filter((f) => f.type !== 'BLACKOUT').map((f) => ({ value: f.id, label: `${f.name} · ${f.colour || ''}` }))}
            />
          </Field>
          <Field label="Sheer fabric">
            <Select
              value={form.sheerFabric}
              onChange={set('sheerFabric')}
              placeholder="—"
              options={(fabrics || []).filter((f) => f.type === 'SHEER').map((f) => ({ value: f.id, label: f.name }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Track type">
            <Input value={form.trackType} onChange={set('trackType')} placeholder="Motorised aluminium track" />
          </Field>
          <Field label="Tieback">
            <Input value={form.tieback} onChange={set('tieback')} placeholder="Golden Tieback" />
          </Field>
        </div>

        <div className="flex items-center gap-6">
          <Checkbox
            label="Motorised"
            checked={form.motorised}
            onChange={(e) => setForm((p) => ({ ...p, motorised: e.target.checked }))}
          />
          {form.motorised && (
            <div className="flex-1">
              <Select
                value={form.motor}
                onChange={set('motor')}
                placeholder="Select a motor"
                options={(motors || []).map((m) => ({ value: m.id, label: `${m.name} · ${m.brand || ''}` }))}
              />
            </div>
          )}
        </div>

        <Field label="Colour scheme">
          <Input value={form.colourScheme} onChange={set('colourScheme')} placeholder="Royal blue with ivory sheer" />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={set('description')} />
        </Field>
      </div>
    </Modal>
  );
};

const NewDrawingModal = ({ open, onClose, projectId, rooms, onDone }) => {
  const [form, setForm] = useState({
    room: '', title: '', trackType: '', trackLengthInch: '', bracketType: '', bracketCount: '',
    pelmetDepthInch: '', pelmetDropInch: '', finishedHeightInch: '', floorClearanceInch: '',
    motorPosition: 'NONE', powerPointPosition: '', openingType: 'CENTRE_OPEN', notes: '',
  });

  const { execute, pending, error } = useAction((payload) => drawingsApi.create(payload), {
    onSuccess: () => { onDone(); onClose(); },
  });

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const num = (value) => (value ? Number(value) : undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Execution drawing"
      subtitle="Step 12 — what the factory cannot work without"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={pending}
            onClick={() =>
              execute({
                project: projectId,
                room: form.room || undefined,
                title: form.title,
                trackType: form.trackType || undefined,
                trackLengthInch: num(form.trackLengthInch),
                bracketType: form.bracketType || undefined,
                bracketCount: num(form.bracketCount),
                pelmetDepthInch: num(form.pelmetDepthInch),
                pelmetDropInch: num(form.pelmetDropInch),
                finishedHeightInch: num(form.finishedHeightInch),
                floorClearanceInch: num(form.floorClearanceInch),
                motorPosition: form.motorPosition,
                powerPointPosition: form.powerPointPosition || undefined,
                openingType: form.openingType,
                notes: form.notes || undefined,
              })
            }
          >
            Create drawing
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Room">
            <Select
              value={form.room}
              onChange={set('room')}
              placeholder="—"
              options={(rooms || []).map((r) => ({ value: r._id, label: r.name }))}
            />
          </Field>
          <Field label="Title" required>
            <Input value={form.title} onChange={set('title')} placeholder="Lounge — motorised track detail" />
          </Field>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Field label="Track type"><Input value={form.trackType} onChange={set('trackType')} /></Field>
          <Field label="Track length (in)"><Input type="number" value={form.trackLengthInch} onChange={set('trackLengthInch')} /></Field>
          <Field label="Bracket type"><Input value={form.bracketType} onChange={set('bracketType')} /></Field>
          <Field label="Brackets"><Input type="number" value={form.bracketCount} onChange={set('bracketCount')} /></Field>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Field label="Pelmet depth"><Input type="number" value={form.pelmetDepthInch} onChange={set('pelmetDepthInch')} /></Field>
          <Field label="Pelmet drop"><Input type="number" value={form.pelmetDropInch} onChange={set('pelmetDropInch')} /></Field>
          <Field label="Finished height"><Input type="number" value={form.finishedHeightInch} onChange={set('finishedHeightInch')} /></Field>
          <Field label="Floor clearance"><Input type="number" value={form.floorClearanceInch} onChange={set('floorClearanceInch')} /></Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Motor position">
            <Select
              value={form.motorPosition}
              onChange={set('motorPosition')}
              options={['NONE', 'LEFT', 'RIGHT', 'CENTRE'].map((v) => ({ value: v, label: v }))}
            />
          </Field>
          <Field label="Power point">
            <Input value={form.powerPointPosition} onChange={set('powerPointPosition')} placeholder="Right end, above pelmet" />
          </Field>
          <Field label="Opening">
            <Select
              value={form.openingType}
              onChange={set('openingType')}
              options={['CENTRE_OPEN', 'LEFT_DRAW', 'RIGHT_DRAW', 'FIXED'].map((v) => ({ value: v, label: v.replace(/_/g, ' ') }))}
            />
          </Field>
        </div>

        <Field label="Notes"><Textarea value={form.notes} onChange={set('notes')} /></Field>
      </div>
    </Modal>
  );
};

export const DesignTab = ({ projectId, onChange }) => {
  const [addingDesign, setAddingDesign] = useState(false);
  const [addingDrawing, setAddingDrawing] = useState(false);

  const { data: designs, loading, error, reload } = useAsync(
    () => designsApi.list({ project: projectId, isCurrent: true, limit: 50 }).then((r) => r.data.items),
    [projectId]
  );
  const { data: drawings, reload: reloadDrawings } = useAsync(
    () => drawingsApi.list({ project: projectId, limit: 50 }).then((r) => r.data.items),
    [projectId]
  );
  const { data: rooms } = useAsync(() => roomsApi.byProject(projectId).then((r) => r.data), [projectId]);
  const { data: fabrics } = useAsync(() => fabricsApi.list({ limit: 100 }).then((r) => r.data.items), []);
  const { data: motors } = useAsync(() => motorsApi.list({ limit: 50 }).then((r) => r.data.items), []);

  const refresh = () => { reload(); reloadDrawings(); onChange?.(); };

  const present = useAction((id) => designsApi.present(id), { onSuccess: refresh });
  const approveDesign = useAction((id) => designsApi.approve(id, {}), { onSuccess: refresh });
  const approveDrawing = useAction((id) => drawingsApi.approve(id), { onSuccess: refresh });
  // Step 6 — the proposal PDF, built from these designs and the current sheet.
  const proposal = useAction(() => documentsApi.proposal(projectId));

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Room designs"
          subtitle="Step 11 — the client approves, and the ERP stores the version"
          icon={Palette}
          actions={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={FileDown}
                loading={proposal.pending}
                onClick={() => proposal.execute()}
                title="Step 6 — the proposal PDF the client receives"
              >
                Proposal PDF
              </Button>
              <Button size="sm" icon={Plus} onClick={() => setAddingDesign(true)}>New design</Button>
            </div>
          }
        />

        {(present.error || approveDesign.error || proposal.error) && (
          <p className="px-5 pt-3 text-xs text-rose-400">
            {(present.error || approveDesign.error || proposal.error).message}
          </p>
        )}

        <Table
          columns={[
            {
              key: 'room',
              header: 'Room',
              render: (d) => (
                <div>
                  <p className="text-slate-900 dark:text-slate-200">{d.roomName || '—'}</p>
                  <p className="text-xs text-slate-500">{d.title}</p>
                </div>
              ),
            },
            { key: 'fabric', header: 'Fabric', render: (d) => d.fabricName || d.fabric?.name || '—' },
            { key: 'track', header: 'Track', render: (d) => d.trackType || '—' },
            {
              key: 'motorised',
              header: 'Motor',
              render: (d) => (d.motorised ? <Badge tone="violet">Motorised</Badge> : <span className="text-slate-600">—</span>),
            },
            { key: 'version', header: 'Version', align: 'right', render: (d) => `v${d.version}` },
            { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (d) => (
                <div className="flex justify-end gap-1">
                  {d.status === 'DRAFT' && (
                    <Button size="sm" variant="ghost" icon={Send} onClick={() => present.execute(d.id)}>Present</Button>
                  )}
                  {d.status !== 'APPROVED' && (
                    <Button size="sm" variant="secondary" icon={Check} onClick={() => approveDesign.execute(d.id)}>
                      Client approved
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={designs || []}
          empty={
            <EmptyState
              title="No designs yet"
              hint="Blue velvet, motorised track, golden tieback — one design per room, versioned."
              icon={Palette}
              action={<Button size="sm" icon={Plus} onClick={() => setAddingDesign(true)}>Create the first design</Button>}
            />
          }
        />
      </Panel>

      <Panel>
        <PanelHeader
          title="Execution drawings"
          subtitle="Step 12 — track, bracket, pelmet, heights, motor position"
          icon={PencilRuler}
          actions={<Button size="sm" variant="secondary" icon={Plus} onClick={() => setAddingDrawing(true)}>New drawing</Button>}
        />

        {approveDrawing.error && <p className="px-5 pt-3 text-xs text-rose-400">{approveDrawing.error.message}</p>}

        <Table
          columns={[
            { key: 'code', header: 'Drawing', render: (d) => d.code || '—' },
            { key: 'title', header: 'Title', render: (d) => d.title },
            { key: 'track', header: 'Track', render: (d) => (d.trackLengthInch ? `${d.trackType || 'Track'} · ${d.trackLengthInch}"` : d.trackType || '—') },
            { key: 'motor', header: 'Motor', render: (d) => (d.motorPosition === 'NONE' ? '—' : d.motorPosition) },
            { key: 'created', header: 'Prepared', render: (d) => date(d.createdAt) },
            { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (d) =>
                d.status !== 'APPROVED' ? (
                  <Button size="sm" variant="secondary" icon={Check} onClick={() => approveDrawing.execute(d.id)}>
                    Approve
                  </Button>
                ) : null,
            },
          ]}
          rows={drawings || []}
          empty={
            <EmptyState
              title="No execution drawings yet"
              hint="These are only prepared once the project is active — they gate the purchase stage."
              icon={PencilRuler}
            />
          }
        />
      </Panel>

      <NewDesignModal
        open={addingDesign}
        onClose={() => setAddingDesign(false)}
        projectId={projectId}
        rooms={rooms}
        fabrics={fabrics}
        motors={motors}
        onDone={refresh}
      />
      <NewDrawingModal
        open={addingDrawing}
        onClose={() => setAddingDrawing(false)}
        projectId={projectId}
        rooms={rooms}
        onDone={refresh}
      />
    </div>
  );
};

export default DesignTab;
