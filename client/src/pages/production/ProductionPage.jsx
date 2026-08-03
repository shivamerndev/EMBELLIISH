import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Factory, Scissors, ShieldCheck, Truck } from 'lucide-react';
import { productionApi, qcApi, dispatchApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { number, humanise, date } from '../../utils/format';
import {
  PageHeader, Panel, PanelHeader, Table, Tabs, Badge, StatusBadge, Button,
  Loading, ErrorState, EmptyState, StatTile,
} from '../../components/ui';

const TABS = [
  { key: 'orders', label: 'Work orders' },
  { key: 'stitching', label: 'Stitching floor' },
  { key: 'qc', label: 'Quality checks' },
  { key: 'dispatch', label: 'Dispatches' },
];

const orderColumns = [
  {
    key: 'code',
    header: 'Work order',
    render: (o) => (
      <div>
        <p className="text-slate-200">{o.code}</p>
        <p className="text-xs text-slate-500">{o.project?.code}</p>
      </div>
    ),
  },
  {
    key: 'what',
    header: 'Piece',
    render: (o) => (
      <div>
        <p className="text-slate-300">{o.roomName} · {o.windowLabel}</p>
        <p className="text-xs text-slate-500">{humanise(o.particular)}</p>
      </div>
    ),
  },
  { key: 'parts', header: 'Panels', align: 'right', render: (o) => o.parts },
  { key: 'fabric', header: 'Fabric', align: 'right', render: (o) => `${number(o.fabricMeters)} m` },
  { key: 'stage', header: 'Stage', render: (o) => <StatusBadge status={o.stage} /> },
  {
    key: 'qc',
    header: 'QC',
    render: (o) => (o.qcStatus === 'PENDING' ? <span className="text-slate-600 text-xs">—</span> : <StatusBadge status={o.qcStatus} />),
  },
  {
    key: 'rework',
    header: '',
    render: (o) => (o.isRework ? <Badge tone="amber">Rework</Badge> : null),
  },
  {
    key: 'open',
    header: '',
    align: 'right',
    render: (o) =>
      o.project?.id || o.project?._id ? (
        <Link to={`/projects/${o.project.id || o.project._id}`} className="text-xs text-brand-400 hover:text-brand-300">
          Open project
        </Link>
      ) : null,
  },
];

export const ProductionPage = () => {
  const [tab, setTab] = useState('orders');

  const { data: orders, loading, error, reload } = useAsync(
    () => productionApi.list({ limit: 200 }).then((r) => r.data.items),
    []
  );

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const all = orders || [];
  const onFloor = all.filter((o) => !['PENDING', 'COMPLETED'].includes(o.stage));
  const awaitingQc = all.filter((o) => o.stage === 'CHECKING' && o.qcStatus === 'PENDING');
  const reworks = all.filter((o) => o.isRework);

  return (
    <div>
      <PageHeader title="Production" subtitle="Steps 15–17 — the factory floor across every live project" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatTile label="Work orders" value={all.length} icon={Factory} />
        <StatTile label="On the floor" value={onFloor.length} tone="violet" icon={Scissors} />
        <StatTile label="Awaiting QC" value={awaitingQc.length} tone="amber" icon={ShieldCheck} />
        <StatTile label="Reworks" value={reworks.length} tone={reworks.length ? 'rose' : 'green'} icon={Factory} />
      </div>

      <Panel className="mb-4">
        <div className="px-4 pt-1">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </Panel>

      {tab === 'orders' && (
        <Panel>
          <PanelHeader title="All work orders" subtitle="One per window, across every project" icon={Factory} />
          <Table
            keyField="_id"
            columns={orderColumns}
            rows={all}
            empty={<EmptyState title="Nothing in production" hint="Work orders appear once a project is activated and released to the factory." icon={Factory} />}
          />
        </Panel>
      )}

      {tab === 'stitching' && <StitchingTab onChange={reload} />}
      {tab === 'qc' && <QCTab />}
      {tab === 'dispatch' && <DispatchTab />}
    </div>
  );
};

const StitchingTab = ({ onChange }) => {
  const { data, loading, error, reload } = useAsync(
    () => productionApi.list({ stage: 'HAND_WORK,STITCHING', limit: 100 }).then((r) => r.data.items),
    []
  );

  const advance = useAction((id, toStage) => productionApi.advance(id, { toStage }), {
    onSuccess: () => { reload(); onChange?.(); },
  });

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const totalRnft = (data || []).reduce((sum, o) => sum + (o.stitchingRnft || 0), 0);

  return (
    <Panel>
      <PanelHeader
        title="Stitching floor"
        subtitle={`${data?.length || 0} pieces in hand · ${number(totalRnft)} running feet to stitch`}
        icon={Scissors}
      />
      {advance.error && <p className="px-5 pt-3 text-xs text-rose-400">{advance.error.message}</p>}
      <Table
        keyField="_id"
        columns={[
          ...orderColumns.slice(0, 5),
          { key: 'rnft', header: 'Rnft', align: 'right', render: (o) => number(o.stitchingRnft) },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (o) => (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => advance.execute(o._id, o.stage === 'HAND_WORK' ? 'STITCHING' : 'CHECKING')}
              >
                {o.stage === 'HAND_WORK' ? 'Start stitching' : 'Send to checking'}
              </Button>
            ),
          },
        ]}
        rows={data || []}
        empty={<EmptyState title="Stitching queue is empty" icon={Scissors} />}
      />
    </Panel>
  );
};

const QCTab = () => {
  const { data, loading, error, reload } = useAsync(() => qcApi.list({ limit: 100 }).then((r) => r.data.items), []);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <Panel>
      <PanelHeader title="Quality checks" subtitle="Step 16 — every inspection, with its defects" icon={ShieldCheck} />
      <Table
        columns={[
          { key: 'code', header: 'Check', render: (c) => c.code },
          { key: 'piece', header: 'Piece', render: (c) => `${c.roomName || '—'} · ${c.windowLabel || ''}` },
          { key: 'project', header: 'Project', render: (c) => c.project?.code || '—' },
          { key: 'result', header: 'Result', render: (c) => <StatusBadge status={c.result} /> },
          {
            key: 'defects',
            header: 'Defects',
            render: (c) => (c.defects?.length ? c.defects.map((d) => humanise(d.type)).join(', ') : '—'),
          },
          { key: 'inspector', header: 'Inspector', render: (c) => c.inspectedBy?.name || '—' },
          { key: 'when', header: 'When', render: (c) => date(c.inspectedAt) },
        ]}
        rows={data || []}
        empty={<EmptyState title="No inspections recorded" icon={ShieldCheck} />}
      />
    </Panel>
  );
};

const DispatchTab = () => {
  const { data, loading, error, reload } = useAsync(() => dispatchApi.list({ limit: 100 }).then((r) => r.data.items), []);
  const deliver = useAction((id) => dispatchApi.deliver(id, { receivedBy: 'Client' }), { onSuccess: reload });

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <Panel>
      <PanelHeader title="Dispatches" subtitle="Boxes leaving the factory for site" icon={Truck} />
      <Table
        columns={[
          { key: 'code', header: 'Dispatch', render: (d) => d.code },
          { key: 'project', header: 'Project', render: (d) => d.project?.code || '—' },
          { key: 'boxes', header: 'Boxes', align: 'right', render: (d) => d.boxCount },
          { key: 'vehicle', header: 'Vehicle', render: (d) => d.vehicleNo || '—' },
          { key: 'driver', header: 'Driver', render: (d) => d.driverName || '—' },
          { key: 'sent', header: 'Dispatched', render: (d) => date(d.dispatchedAt) },
          { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (d) =>
              d.status !== 'DELIVERED' ? (
                <Button size="sm" variant="secondary" loading={deliver.pending} onClick={() => deliver.execute(d.id)}>
                  Mark delivered
                </Button>
              ) : null,
          },
        ]}
        rows={data || []}
        empty={<EmptyState title="Nothing dispatched yet" icon={Truck} />}
      />
    </Panel>
  );
};

export default ProductionPage;
