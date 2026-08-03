import React, { useState, useEffect } from 'react';
import { Plus, Ruler, DoorOpen, Trash2, Pencil } from 'lucide-react';
import { roomsApi, measurementsApi, fabricsApi } from '../../../api';
import { useAsync, useAction } from '../../../hooks/useAsync';
import { number, humanise } from '../../../utils/format';
import {
  Panel, PanelHeader, Table, Button, Badge, Modal, Field, Input, Select, Checkbox,
  Loading, ErrorState, EmptyState,
} from '../../../components/ui';

const PARTICULARS = [
  'MAIN_CURTAIN', 'SHEER_CURTAIN', 'MOTORISED_CURTAIN', 'ROMAN_BLIND', 'WOODEN_BLIND',
];

/* ---------------------------------------------------------------- rooms */

const AddRoomModal = ({ open, onClose, projectId, onDone }) => {
  const [form, setForm] = useState({ name: '', floor: 'Ground Floor', ceilingHeightInch: '', pelmetPresent: false, wiringAvailable: false });

  const { execute, pending, error } = useAction((payload) => roomsApi.create(payload), {
    onSuccess: () => { onDone(); onClose(); setForm({ name: '', floor: 'Ground Floor', ceilingHeightInch: '', pelmetPresent: false, wiringAvailable: false }); },
  });

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a room"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={pending}
            onClick={() =>
              execute({
                project: projectId,
                name: form.name,
                floor: form.floor,
                ceilingHeightInch: form.ceilingHeightInch ? Number(form.ceilingHeightInch) : undefined,
                pelmetPresent: form.pelmetPresent,
                wiringAvailable: form.wiringAvailable,
              })
            }
          >
            Add room
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}
        <Field label="Room name" required>
          <Input value={form.name} onChange={set('name')} placeholder="Master Bedroom" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Floor">
            <Input value={form.floor} onChange={set('floor')} placeholder="2nd Floor" />
          </Field>
          <Field label="Ceiling height (in)">
            <Input type="number" value={form.ceilingHeightInch} onChange={set('ceilingHeightInch')} placeholder="132" />
          </Field>
        </div>
        <div className="flex gap-6">
          <Checkbox
            label="Pelmet present"
            checked={form.pelmetPresent}
            onChange={(e) => setForm((p) => ({ ...p, pelmetPresent: e.target.checked }))}
          />
          <Checkbox
            label="Wiring available"
            checked={form.wiringAvailable}
            onChange={(e) => setForm((p) => ({ ...p, wiringAvailable: e.target.checked }))}
          />
        </div>
      </div>
    </Modal>
  );
};

/* -------------------------------------------------------------- windows */

const EMPTY_WINDOW = {
  label: 'W1',
  particular: 'MAIN_CURTAIN',
  o2oWidth: '', o2oHeight: '', f2fWidth: '', f2fHeight: '',
  pelmetWidth: '', pelmetDrop: '',
  wireLeft: false, wireRight: false,
  motorRequired: false,
  fabric: '',
  fullness: '', fabricWidthInch: '', partsOverride: '',
};

/**
 * Window entry with live consumption. Every change re-asks the server for the
 * calculated row, so the coordinator sees the panel count and fabric metres the
 * BOQ will actually use — not an approximation the UI invented.
 */
const AddWindowModal = ({ open, onClose, projectId, room, windowToEdit, fabrics, onDone }) => {
  const [form, setForm] = useState(EMPTY_WINDOW);
  const [preview, setPreview] = useState(null);

  const isEditing = Boolean(windowToEdit);

  const payload = () => ({
    project: projectId,
    room: room?.id || room?._id,
    label: form.label,
    particular: form.particular,
    o2o: { width: Number(form.o2oWidth) || undefined, height: Number(form.o2oHeight) || undefined },
    f2f: { width: Number(form.f2fWidth) || undefined, height: Number(form.f2fHeight) || undefined },
    pelmet: { o2oWidth: Number(form.pelmetWidth) || undefined, o2oDrop: Number(form.pelmetDrop) || undefined },
    wire: { left: form.wireLeft, right: form.wireRight },
    motorRequired: form.motorRequired,
    motorQty: form.motorRequired ? 1 : 0,
    fabric: form.fabric || undefined,
    fullness: form.fullness ? Number(form.fullness) : undefined,
    fabricWidthInch: form.fabricWidthInch ? Number(form.fabricWidthInch) : undefined,
    partsOverride: form.partsOverride ? Number(form.partsOverride) : undefined,
  });

  const recalc = async (next) => {
    const width = Number(next.o2oWidth) || Number(next.f2fWidth);
    const height = Number(next.o2oHeight) || Number(next.f2fHeight);
    if (!width || !height) return setPreview(null);

    try {
      const chosen = fabrics?.find((f) => f.id === next.fabric || f._id === next.fabric);
      const response = await measurementsApi.calculate({
        particular: next.particular,
        o2o: { width: Number(next.o2oWidth) || undefined, height: Number(next.o2oHeight) || undefined },
        f2f: { width: Number(next.f2fWidth) || undefined, height: Number(next.f2fHeight) || undefined },
        fullness: next.fullness ? Number(next.fullness) : chosen?.recommendedFullness,
        fabricWidthInch: next.fabricWidthInch ? Number(next.fabricWidthInch) : chosen?.usableWidthInch,
        partsOverride: next.partsOverride ? Number(next.partsOverride) : undefined,
        motorRequired: next.motorRequired,
      });
      setPreview(response.data);
    } catch {
      setPreview(null);
    }
    return undefined;
  };

  useEffect(() => {
    if (open) {
      if (windowToEdit) {
        const fabricId = typeof windowToEdit.fabric === 'object'
          ? windowToEdit.fabric?._id || windowToEdit.fabric?.id
          : windowToEdit.fabric;
        const initial = {
          label: windowToEdit.label || 'W1',
          particular: windowToEdit.particular || 'MAIN_CURTAIN',
          o2oWidth: windowToEdit.o2o?.width ?? '',
          o2oHeight: windowToEdit.o2o?.height ?? '',
          f2fWidth: windowToEdit.f2f?.width ?? '',
          f2fHeight: windowToEdit.f2f?.height ?? '',
          pelmetWidth: windowToEdit.pelmet?.o2oWidth ?? windowToEdit.pelmet?.f2fWidth ?? '',
          pelmetDrop: windowToEdit.pelmet?.o2oDrop ?? windowToEdit.pelmet?.f2fDrop ?? '',
          wireLeft: Boolean(windowToEdit.wire?.left),
          wireRight: Boolean(windowToEdit.wire?.right),
          motorRequired: Boolean(windowToEdit.motorRequired),
          fabric: fabricId || '',
          fullness: windowToEdit.fullness ?? '',
          fabricWidthInch: windowToEdit.fabricWidthInch ?? '',
          partsOverride: windowToEdit.partsOverride ?? '',
        };
        setForm(initial);
        recalc(initial);
      } else {
        setForm(EMPTY_WINDOW);
        setPreview(null);
      }
    }
  }, [open, windowToEdit]);

  const set = (key, isCheckbox = false) => (event) => {
    const value = isCheckbox ? event.target.checked : event.target.value;
    const next = { ...form, [key]: value };
    setForm(next);
    recalc(next);
  };

  const { execute, pending, error } = useAction(
    () => {
      const windowId = windowToEdit?._id || windowToEdit?.id;
      if (windowId) {
        return measurementsApi.update(windowId, payload());
      }
      return measurementsApi.create(payload());
    },
    {
      onSuccess: () => { onDone(); onClose(); setForm(EMPTY_WINDOW); setPreview(null); },
    }
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit window ${form.label} — ${room?.name || ''}` : `Add a window — ${room?.name || ''}`}
      subtitle="Step 5 — one row of the measurement sheet"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={pending} onClick={() => execute()}>
            {isEditing ? 'Save changes' : 'Save window'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        <div className="grid grid-cols-3 gap-4">
          <Field label="Label"><Input value={form.label} onChange={set('label')} placeholder="W1" /></Field>
          <Field label="Particular" required>
            <Select
              value={form.particular}
              onChange={set('particular')}
              options={PARTICULARS.map((p) => ({ value: p, label: humanise(p) }))}
            />
          </Field>
          <Field label="Fabric">
            <Select
              value={form.fabric}
              onChange={set('fabric')}
              placeholder="—"
              options={(fabrics || []).map((f) => ({ value: f.id || f._id, label: `${f.name} (${f.usableWidthInch}")` }))}
            />
          </Field>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            O2O — outside to outside (inches)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Width"><Input type="number" step="0.1" value={form.o2oWidth} onChange={set('o2oWidth')} placeholder="236.2" /></Field>
            <Field label="Height"><Input type="number" step="0.1" value={form.o2oHeight} onChange={set('o2oHeight')} placeholder="121.9" /></Field>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            F2F — face to face, for recessed windows (inches)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Width"><Input type="number" step="0.1" value={form.f2fWidth} onChange={set('f2fWidth')} /></Field>
            <Field label="Height"><Input type="number" step="0.1" value={form.f2fHeight} onChange={set('f2fHeight')} /></Field>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Field label="Pelmet width"><Input type="number" step="0.1" value={form.pelmetWidth} onChange={set('pelmetWidth')} /></Field>
          <Field label="Pelmet drop"><Input type="number" step="0.1" value={form.pelmetDrop} onChange={set('pelmetDrop')} /></Field>
          <Field label="Fullness" hint="blank = fabric default">
            <Input type="number" step="0.1" value={form.fullness} onChange={set('fullness')} placeholder="2.5" />
          </Field>
          <Field label="Panels override" hint="e.g. to match a sheer">
            <Input type="number" value={form.partsOverride} onChange={set('partsOverride')} />
          </Field>
        </div>

        <div className="flex gap-6">
          <Checkbox label="Wire on left" checked={form.wireLeft} onChange={set('wireLeft', true)} />
          <Checkbox label="Wire on right" checked={form.wireRight} onChange={set('wireRight', true)} />
          <Checkbox label="Motor required" checked={form.motorRequired} onChange={set('motorRequired', true)} />
        </div>

        {/* Live consumption, straight from the server's engine. */}
        <div className="rounded-lg border border-brand-500/30 bg-brand-500/[0.05] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-300 mb-3">
            Consumption for this window
          </p>
          {preview ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                ['Running ft', preview.rnft],
                ['Panels', `${preview.roundedParts}${preview.partsOverridden ? '*' : ''}`],
                ['Ht/part (m)', preview.heightPerPartM],
                ['Fabric (m)', preview.fabricMeters],
                ['Blackout (m)', preview.blackoutMeters || '—'],
                ['Roman (sqft)', preview.romanSqft || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-slate-100 numeric">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Enter a width and height to see the calculation.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};

/* ----------------------------------------------------------------- tab */

export const MeasurementsTab = ({ projectId, onChange }) => {
  const [addingRoom, setAddingRoom] = useState(false);
  const [addingWindowTo, setAddingWindowTo] = useState(null);
  const [editingWindowInfo, setEditingWindowInfo] = useState(null);

  const { data: rooms, loading, error, reload } = useAsync(
    () => roomsApi.byProject(projectId).then((r) => r.data),
    [projectId]
  );
  const { data: fabrics } = useAsync(() => fabricsApi.list({ limit: 100 }).then((r) => r.data.items), []);

  const remove = useAction((id) => measurementsApi.remove(id), { onSuccess: () => { reload(); onChange?.(); } });

  const refresh = () => { reload(); onChange?.(); };

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const totalWindows = (rooms || []).reduce((sum, room) => sum + room.windows.length, 0);

  const getWindowColumns = (room) => [
    { key: 'label', header: 'Window', render: (w) => w.label },
    { key: 'particular', header: 'Particular', render: (w) => humanise(w.particular) },
    {
      key: 'size',
      header: 'Size (in)',
      align: 'right',
      render: (w) => {
        const width = w.o2o?.width || w.f2f?.width;
        const height = w.o2o?.height || w.f2f?.height;
        return width && height ? `${width} × ${height}` : '—';
      },
    },
    {
      key: 'basis',
      header: 'Basis',
      render: (w) => <Badge tone="slate">{w.o2o?.width ? 'O2O' : 'F2F'}</Badge>,
    },
    {
      key: 'motor',
      header: 'Motor',
      render: (w) => (w.motorRequired ? <Badge tone="violet">Motorised</Badge> : <span className="text-slate-600">—</span>),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (w) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setEditingWindowInfo({ window: w, room })}
            className="p-1.5 text-stone-500 hover:text-brand-400 rounded transition"
            title="Edit window"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => remove.execute(w._id || w.id)}
            className="p-1.5 text-slate-600 hover:text-rose-400 rounded transition"
            title="Delete window"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Rooms and windows"
          subtitle={`Step 4 & 5 — ${rooms?.length || 0} rooms, ${totalWindows} windows measured`}
          icon={Ruler}
          actions={<Button size="sm" icon={Plus} onClick={() => setAddingRoom(true)}>Add room</Button>}
        />
        {!rooms?.length && (
          <EmptyState
            title="No rooms yet"
            hint="Add the rooms surveyed on site, then enter each window against them."
            icon={DoorOpen}
            action={<Button size="sm" icon={Plus} onClick={() => setAddingRoom(true)}>Add the first room</Button>}
          />
        )}
      </Panel>

      {(rooms || []).map((room) => (
        <Panel key={room._id}>
          <PanelHeader
            title={room.name}
            subtitle={`${room.floor}${room.ceilingHeightInch ? ` · ceiling ${room.ceilingHeightInch}"` : ''} · ${room.windows.length} window(s)`}
            actions={
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAddingWindowTo(room)}>
                Add window
              </Button>
            }
          />
          <Table
            keyField="_id"
            columns={getWindowColumns(room)}
            rows={room.windows}
            empty={<EmptyState title="No windows in this room yet" icon={Ruler} />}
          />
        </Panel>
      ))}

      <AddRoomModal open={addingRoom} onClose={() => setAddingRoom(false)} projectId={projectId} onDone={refresh} />
      <AddWindowModal
        open={Boolean(addingWindowTo)}
        onClose={() => setAddingWindowTo(null)}
        projectId={projectId}
        room={addingWindowTo ? { ...addingWindowTo, id: addingWindowTo._id } : null}
        fabrics={fabrics}
        onDone={refresh}
      />
      <AddWindowModal
        open={Boolean(editingWindowInfo)}
        onClose={() => setEditingWindowInfo(null)}
        projectId={projectId}
        room={editingWindowInfo?.room ? { ...editingWindowInfo.room, id: editingWindowInfo.room._id } : null}
        windowToEdit={editingWindowInfo?.window}
        fabrics={fabrics}
        onDone={refresh}
      />
    </div>
  );
};

export default MeasurementsTab;

