import React, { useState } from 'react';
import { Package, Truck, Wrench, AlertTriangle, Plus, Check, PackageCheck } from 'lucide-react';
import { packingApi, dispatchApi, installationsApi, snagsApi, roomsApi, productionApi } from '../../../api';
import { useAsync, useAction } from '../../../hooks/useAsync';
import { date, humanise } from '../../../utils/format';
import {
  Panel, PanelHeader, Table, Button, Badge, StatusBadge, Modal, Field, Input,
  Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Progress,
} from '../../../components/ui';

/* ------------------------------------------------------------- snags */

const RaiseSnagModal = ({ open, onClose, projectId, rooms, orders, onDone }) => {
  const [form, setForm] = useState({
    room: '', productionOrder: '', type: 'SIZE', severity: 'MINOR', title: '', deviation: '', description: '',
  });

  const { execute, pending, error } = useAction((payload) => snagsApi.create(payload), {
    onSuccess: () => { onDone(); onClose(); },
  });

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Raise a snag"
      subtitle='Step 20 — "This curtain is 2 inches longer."'
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={pending}
            onClick={() =>
              execute({
                project: projectId,
                room: form.room || undefined,
                roomName: rooms?.find((r) => r._id === form.room)?.name,
                productionOrder: form.productionOrder || undefined,
                type: form.type,
                severity: form.severity,
                title: form.title,
                deviation: form.deviation || undefined,
                description: form.description || undefined,
              })
            }
          >
            Raise ticket
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        <Field label="What is wrong?" required>
          <Input value={form.title} onChange={set('title')} placeholder="Lounge main curtain is 2 inches longer" />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Room">
            <Select
              value={form.room}
              onChange={set('room')}
              placeholder="—"
              options={(rooms || []).map((r) => ({ value: r._id, label: r.name }))}
            />
          </Field>
          <Field label="Type">
            <Select
              value={form.type}
              onChange={set('type')}
              options={['SIZE', 'COLOUR', 'STITCH', 'DAMAGE', 'MOTOR_FAULT', 'MISSING_ITEM', 'FINISH', 'OTHER'].map((v) => ({ value: v, label: humanise(v) }))}
            />
          </Field>
          <Field label="Severity">
            <Select
              value={form.severity}
              onChange={set('severity')}
              options={['MINOR', 'MAJOR', 'CRITICAL'].map((v) => ({ value: v, label: humanise(v) }))}
            />
          </Field>
        </div>

        <Field label="Which piece?" hint="Linking a work order raises the alteration order automatically">
          <Select
            value={form.productionOrder}
            onChange={set('productionOrder')}
            placeholder="—"
            options={(orders || []).map((o) => ({ value: o._id, label: `${o.roomName} · ${o.windowLabel} · ${humanise(o.particular)}` }))}
          />
        </Field>

        <Field label="Deviation">
          <Input value={form.deviation} onChange={set('deviation')} placeholder="2 inches over the finished drop" />
        </Field>
        <Field label="Details">
          <Textarea value={form.description} onChange={set('description')} />
        </Field>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------- installation */

const ScheduleInstallModal = ({ open, onClose, projectId, rooms, onDone }) => {
  const [form, setForm] = useState({ room: '', scheduledDate: new Date().toISOString().slice(0, 10) });

  const { execute, pending, error } = useAction((payload) => installationsApi.create(payload), {
    onSuccess: () => { onDone(); onClose(); },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule an installation"
      subtitle="Step 19 — allowed only once the balance has cleared"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={pending}
            onClick={() =>
              execute({
                project: projectId,
                room: form.room || undefined,
                scheduledDate: form.scheduledDate,
              })
            }
          >
            Schedule
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs text-amber-200">{error.message}</p>
          </div>
        )}
        <Field label="Room">
          <Select
            value={form.room}
            onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))}
            placeholder="Whole project"
            options={(rooms || []).map((r) => ({ value: r._id, label: r.name }))}
          />
        </Field>
        <Field label="Date" required>
          <Input
            type="date"
            value={form.scheduledDate}
            onChange={(e) => setForm((p) => ({ ...p, scheduledDate: e.target.value }))}
          />
        </Field>
        <p className="text-xs text-slate-500">
          The checklist is seeded from what was packed for that room, so the team ticks off the same
          items the box says are inside.
        </p>
      </div>
    </Modal>
  );
};

/* ---------------------------------------------------------------- tab */

export const DeliveryTab = ({ projectId, onChange }) => {
  const [raisingSnag, setRaisingSnag] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const { data: packingList, loading, error, reload } = useAsync(
    () => packingApi.packingList(projectId).then((r) => r.data),
    [projectId]
  );
  const { data: installations, reload: reloadInstalls } = useAsync(
    () => installationsApi.list({ project: projectId, limit: 50 }).then((r) => r.data.items),
    [projectId]
  );
  const { data: installSummary, reload: reloadSummary } = useAsync(
    () => installationsApi.summary(projectId).then((r) => r.data),
    [projectId]
  );
  const { data: snags, reload: reloadSnags } = useAsync(
    () => snagsApi.list({ project: projectId, limit: 50 }).then((r) => r.data.items),
    [projectId]
  );
  const { data: rooms } = useAsync(() => roomsApi.byProject(projectId).then((r) => r.data), [projectId]);
  const { data: orders } = useAsync(
    () => productionApi.list({ project: projectId, limit: 100 }).then((r) => r.data.items),
    [projectId]
  );

  const refresh = () => { reload(); reloadInstalls(); reloadSummary(); reloadSnags(); onChange?.(); };

  const pack = useAction(() => packingApi.pack(projectId), { onSuccess: refresh });
  const startInstall = useAction((id) => installationsApi.start(id), { onSuccess: refresh });
  const completeInstall = useAction(
    (installation) =>
      installationsApi.complete(installation.id, {
        clientPresent: true,
        checklist: (installation.checklist || []).map((item) => ({ ...item, installed: true })),
      }),
    { onSuccess: refresh }
  );
  const closeSnag = useAction((id) => snagsApi.close(id, { resolution: 'Altered and refitted' }), { onSuccess: refresh });
  const readySnag = useAction((id) => snagsApi.ready(id, {}), { onSuccess: refresh });

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const openSnags = (snags || []).filter((s) => s.status !== 'CLOSED');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Boxes packed" value={packingList?.totalBoxes ?? 0} sub={`${packingList?.totalItems ?? 0} items`} icon={Package} />
        <StatTile label="Install visits" value={`${installSummary?.completed ?? 0}/${installSummary?.visits ?? 0}`} tone="violet" icon={Wrench} />
        <StatTile label="Items installed" value={`${installSummary?.percent ?? 0}%`} sub={`${installSummary?.installedItems ?? 0} of ${installSummary?.totalItems ?? 0}`} tone="green" icon={PackageCheck} />
        <StatTile label="Open snags" value={openSnags.length} tone={openSnags.length ? 'rose' : 'green'} icon={AlertTriangle} />
      </div>

      <Panel>
        <PanelHeader
          title="Packing"
          subtitle="Step 17 — packed room-wise, so the ERP knows what is in each box"
          icon={Package}
          actions={<Button size="sm" icon={Package} loading={pack.pending} onClick={() => pack.execute()}>Pack QC-passed pieces</Button>}
        />

        {pack.error && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs text-amber-200">{pack.error.message}</p>
          </div>
        )}

        {packingList?.boxes?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-[#2e251e]">
            {packingList.boxes.map((box) => (
              <div key={box.code} className="bg-[#1a1512] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-100">Box {box.boxNumber}</span>
                  <StatusBadge status={box.status} />
                </div>
                <p className="text-xs text-slate-500 mb-2.5">{box.room}</p>
                <ul className="space-y-1">
                  {box.items.map((item, index) => (
                    <li key={index} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                      <span className={item.verified ? 'text-emerald-400' : 'text-slate-700'}>•</span>
                      <span>{item.description || humanise(item.type)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing packed yet" hint="Only QC-passed pieces can go into a box." icon={Package} />
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Installation"
          subtitle="Step 19 — the team reaches the villa"
          icon={Wrench}
          actions={<Button size="sm" icon={Plus} onClick={() => setScheduling(true)}>Schedule visit</Button>}
        />

        {(startInstall.error || completeInstall.error) && (
          <p className="px-5 pt-3 text-xs text-rose-400">{(startInstall.error || completeInstall.error).message}</p>
        )}

        <Table
          columns={[
            { key: 'code', header: 'Visit', render: (i) => i.code },
            { key: 'room', header: 'Room', render: (i) => i.roomName || 'Whole project' },
            { key: 'scheduled', header: 'Scheduled', render: (i) => date(i.scheduledDate) },
            {
              key: 'checklist',
              header: 'Checklist',
              render: (i) => {
                const total = i.checklist?.length || 0;
                const done = i.checklist?.filter((c) => c.installed).length || 0;
                return total ? (
                  <div className="w-28">
                    <p className="text-[11px] text-slate-400 numeric mb-1">{done}/{total} items</p>
                    <Progress value={(done / total) * 100} tone={done === total ? 'green' : 'amber'} />
                  </div>
                ) : '—';
              },
            },
            { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (i) => (
                <div className="flex justify-end gap-1">
                  {i.status === 'SCHEDULED' && (
                    <Button size="sm" variant="ghost" onClick={() => startInstall.execute(i.id)}>Start</Button>
                  )}
                  {['SCHEDULED', 'IN_PROGRESS', 'PARTIAL'].includes(i.status) && (
                    <Button size="sm" variant="secondary" icon={Check} onClick={() => completeInstall.execute(i)}>
                      Complete
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={installations || []}
          empty={
            <EmptyState
              title="No installation scheduled"
              hint="Installation is blocked until the 30% balance clears — that is Step 18 doing its job."
              icon={Wrench}
            />
          }
        />
      </Panel>

      <Panel>
        <PanelHeader
          title="Snags"
          subtitle="Step 20 — installer reports, factory alters, ticket closes"
          icon={AlertTriangle}
          actions={<Button size="sm" variant="secondary" icon={Plus} onClick={() => setRaisingSnag(true)}>Raise snag</Button>}
        />

        <Table
          columns={[
            { key: 'code', header: 'Ticket', render: (s) => s.code },
            {
              key: 'title', header: 'Issue', render: (s) => (
                <div>
                  <p className="text-slate-200">{s.title}</p>
                  {s.deviation && <p className="text-[11px] text-slate-500">{s.deviation}</p>}
                </div>
              )
            },
            { key: 'room', header: 'Room', render: (s) => s.roomName || '—' },
            { key: 'type', header: 'Type', render: (s) => humanise(s.type) },
            { key: 'severity', header: 'Severity', render: (s) => <StatusBadge status={s.severity} /> },
            { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (s) => (
                <div className="flex justify-end gap-1">
                  {s.status === 'IN_REWORK' && (
                    <Button size="sm" variant="ghost" loading={readySnag.pending} onClick={() => readySnag.execute(s.id)}>
                      Mark ready
                    </Button>
                  )}
                  {s.status !== 'CLOSED' && (
                    <Button size="sm" variant="secondary" icon={Check} loading={closeSnag.pending} onClick={() => closeSnag.execute(s.id)}>
                      Close
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={snags || []}
          empty={<EmptyState title="No snags raised" hint="Nothing has come back from site." icon={AlertTriangle} />}
        />
      </Panel>

      <RaiseSnagModal
        open={raisingSnag}
        onClose={() => setRaisingSnag(false)}
        projectId={projectId}
        rooms={rooms}
        orders={orders}
        onDone={refresh}
      />
      <ScheduleInstallModal
        open={scheduling}
        onClose={() => setScheduling(false)}
        projectId={projectId}
        rooms={rooms}
        onDone={refresh}
      />
    </div>
  );
};

export default DeliveryTab;
