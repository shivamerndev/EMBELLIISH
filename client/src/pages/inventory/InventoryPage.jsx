import React, { useState } from 'react';
import { Package, Layers, Cpu, Wrench, Truck, ArrowDownUp, AlertTriangle } from 'lucide-react';
import { fabricsApi, motorsApi, accessoriesApi, vendorsApi, stockApi, purchaseApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { currency, number, date, humanise } from '../../utils/format';
import {
  PageHeader, Panel, PanelHeader, Table, Tabs, Badge, StatusBadge, StatTile,
  Loading, ErrorState, EmptyState,
} from '../../components/ui';

const TABS = [
  { key: 'stock', label: 'Stock' },
  { key: 'fabrics', label: 'Fabrics' },
  { key: 'motors', label: 'Motors' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'purchase', label: 'Purchase orders' },
  { key: 'ledger', label: 'Stock ledger' },
];

const StockTab = () => {
  const { data, loading, error, reload } = useAsync(() => stockApi.list({ limit: 200 }).then((r) => r.data.items), []);
  const { data: low } = useAsync(() => stockApi.lowStock().then((r) => r.data), []);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      {low?.length > 0 && (
        <Panel className="p-4 border-amber-500/20 bg-amber-500/[0.03]">
          <p className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-2">
            <AlertTriangle className="w-4 h-4" /> {low.length} item(s) at or below reorder level
          </p>
          <p className="text-xs text-slate-400">
            {low.map((row) => `${row.itemName} (${number(row.available)} free)`).join(' · ')}
          </p>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Stock on hand" subtitle="Free stock nets off what other projects have reserved" icon={Package} />
        <Table
          columns={[
            { key: 'itemName', header: 'Item', render: (s) => s.itemName || '—' },
            { key: 'itemType', header: 'Type', render: (s) => <Badge tone="slate">{s.itemType}</Badge> },
            { key: 'quantity', header: 'On shelf', align: 'right', render: (s) => `${number(s.quantity)} ${s.unit}` },
            { key: 'reserved', header: 'Reserved', align: 'right', render: (s) => number(s.reserved) },
            {
              key: 'available',
              header: 'Free',
              align: 'right',
              render: (s) => {
                const free = s.quantity - s.reserved;
                return (
                  <span className={free <= s.reorderLevel && s.reorderLevel > 0 ? 'text-amber-400 font-semibold' : ''}>
                    {number(free)}
                  </span>
                );
              },
            },
            { key: 'reorder', header: 'Reorder at', align: 'right', render: (s) => number(s.reorderLevel) },
            { key: 'warehouse', header: 'Location', render: (s) => s.warehouse },
          ]}
          rows={data || []}
          empty={<EmptyState title="No stock recorded" icon={Package} />}
        />
      </Panel>
    </div>
  );
};

const CatalogueTab = ({ loader, columns, title, subtitle, icon }) => {
  const { data, loading, error, reload } = useAsync(loader, []);
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <Panel>
      <PanelHeader title={title} subtitle={subtitle} icon={icon} />
      <Table columns={columns} rows={data || []} empty={<EmptyState title={`No ${title.toLowerCase()} yet`} />} />
    </Panel>
  );
};

export const InventoryPage = () => {
  const [tab, setTab] = useState('stock');

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Steps 13 & 14 — what we hold, what we owe, and what arrived" />

      <Panel className="mb-4">
        <div className="px-4 pt-1">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </Panel>

      {tab === 'stock' && <StockTab />}

      {tab === 'fabrics' && (
        <CatalogueTab
          title="Fabrics"
          subtitle="Usable width and fullness here drive the consumption engine"
          icon={Layers}
          loader={() => fabricsApi.list({ limit: 200 }).then((r) => r.data.items)}
          columns={[
            { key: 'name', header: 'Fabric', render: (f) => (
              <div>
                <p className="text-slate-200">{f.name}</p>
                <p className="text-xs text-slate-500">{f.code} · {f.brand}</p>
              </div>
            ) },
            { key: 'type', header: 'Type', render: (f) => <Badge tone="slate">{f.type}</Badge> },
            { key: 'colour', header: 'Colour', render: (f) => f.colour || '—' },
            { key: 'width', header: 'Bolt / usable', align: 'right', render: (f) => `${f.widthInch}" / ${f.usableWidthInch}"` },
            { key: 'fullness', header: 'Fullness', align: 'right', render: (f) => `${f.recommendedFullness}×` },
            { key: 'purchase', header: 'Cost', align: 'right', render: (f) => currency(f.purchaseRate) },
            { key: 'selling', header: 'Rate', align: 'right', render: (f) => currency(f.sellingRate) },
          ]}
        />
      )}

      {tab === 'motors' && (
        <CatalogueTab
          title="Motors"
          subtitle="Track drives, hubs and remotes"
          icon={Cpu}
          loader={() => motorsApi.list({ limit: 200 }).then((r) => r.data.items)}
          columns={[
            { key: 'name', header: 'Motor', render: (m) => (
              <div>
                <p className="text-slate-200">{m.name}</p>
                <p className="text-xs text-slate-500">{m.code} · {m.brand}</p>
              </div>
            ) },
            { key: 'type', header: 'Type', render: (m) => humanise(m.type) },
            { key: 'power', header: 'Power', render: (m) => m.powerType },
            { key: 'maxWidth', header: 'Max width', align: 'right', render: (m) => (m.maxWidthInch ? `${m.maxWidthInch}"` : '—') },
            { key: 'warranty', header: 'Warranty', align: 'right', render: (m) => `${m.warrantyMonths} mo` },
            { key: 'selling', header: 'Rate', align: 'right', render: (m) => currency(m.sellingRate) },
          ]}
        />
      )}

      {tab === 'accessories' && (
        <CatalogueTab
          title="Accessories"
          subtitle="Tracks, brackets, lead band and trimmings"
          icon={Wrench}
          loader={() => accessoriesApi.list({ limit: 200 }).then((r) => r.data.items)}
          columns={[
            { key: 'name', header: 'Accessory', render: (a) => a.name },
            { key: 'category', header: 'Category', render: (a) => <Badge tone="slate">{humanise(a.category)}</Badge> },
            { key: 'finish', header: 'Finish', render: (a) => a.finish || '—' },
            { key: 'unit', header: 'Unit', render: (a) => a.unit },
            { key: 'purchase', header: 'Cost', align: 'right', render: (a) => currency(a.purchaseRate) },
            { key: 'selling', header: 'Rate', align: 'right', render: (a) => currency(a.sellingRate) },
          ]}
        />
      )}

      {tab === 'vendors' && (
        <CatalogueTab
          title="Vendors"
          subtitle="Who receives the purchase order"
          icon={Truck}
          loader={() => vendorsApi.list({ limit: 200 }).then((r) => r.data.items)}
          columns={[
            { key: 'name', header: 'Vendor', render: (v) => (
              <div>
                <p className="text-slate-200">{v.name}</p>
                <p className="text-xs text-slate-500">{v.contactPerson} · {v.phone}</p>
              </div>
            ) },
            { key: 'supplies', header: 'Supplies', render: (v) => (v.supplies || []).map(humanise).join(', ') || '—' },
            { key: 'lead', header: 'Lead time', align: 'right', render: (v) => `${v.leadTimeDays} days` },
            { key: 'rating', header: 'Rating', align: 'right', render: (v) => `${v.rating} / 5` },
            { key: 'city', header: 'City', render: (v) => v.address?.city || '—' },
          ]}
        />
      )}

      {tab === 'purchase' && (
        <CatalogueTab
          title="Purchase orders"
          subtitle="Raised only for what stock could not cover"
          icon={Truck}
          loader={() => purchaseApi.list({ limit: 100 }).then((r) => r.data.items)}
          columns={[
            { key: 'code', header: 'PO', render: (p) => p.code },
            { key: 'vendor', header: 'Vendor', render: (p) => p.vendor?.name || '—' },
            { key: 'project', header: 'Project', render: (p) => p.project?.code || '—' },
            { key: 'lines', header: 'Items', align: 'right', render: (p) => p.lines?.length || 0 },
            { key: 'total', header: 'Value', align: 'right', render: (p) => currency(p.grandTotal) },
            { key: 'expected', header: 'Expected', render: (p) => date(p.expectedDate) },
            { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
          ]}
        />
      )}

      {tab === 'ledger' && (
        <CatalogueTab
          title="Stock ledger"
          subtitle="Every movement, with the balance it produced"
          icon={ArrowDownUp}
          loader={() => stockApi.movements({ limit: 100 }).then((r) => r.data.items)}
          columns={[
            { key: 'date', header: 'When', render: (m) => date(m.createdAt) },
            { key: 'item', header: 'Item', render: (m) => m.itemName || '—' },
            { key: 'type', header: 'Movement', render: (m) => <StatusBadge status={m.type} /> },
            { key: 'quantity', header: 'Quantity', align: 'right', render: (m) => `${number(m.quantity)} ${m.unit}` },
            { key: 'balance', header: 'Balance after', align: 'right', render: (m) => number(m.balanceAfter) },
            { key: 'reason', header: 'Reason', render: (m) => m.reason || '—' },
          ]}
        />
      )}
    </div>
  );
};

export default InventoryPage;
