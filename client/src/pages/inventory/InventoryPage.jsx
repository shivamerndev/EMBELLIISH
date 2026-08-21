import React, { useState, useEffect } from 'react';
import { Package, Layers, Cpu, Wrench, Truck, ArrowDownUp, AlertTriangle, Plus } from 'lucide-react';
import { fabricsApi, motorsApi, accessoriesApi, vendorsApi, stockApi, purchaseApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { currency, number, date, humanise } from '../../utils/format';
import {
  PageHeader, Panel, PanelHeader, Table, Tabs, Badge, StatusBadge, StatTile,
  Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Checkbox,
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

const AddItemModal = ({ open, onClose, onSuccess, activeTab }) => {
  const [type, setType] = useState('fabric');

  useEffect(() => {
    if (open) {
      if (activeTab === 'fabrics') setType('fabric');
      else if (activeTab === 'motors') setType('motor');
      else if (activeTab === 'accessories') setType('accessory');
      else if (activeTab === 'vendors') setType('vendor');
      else if (activeTab === 'purchase') setType('purchase');
      else setType('stock');
    }
  }, [open, activeTab]);

  const { data: vendors } = useAsync(() => vendorsApi.list({ limit: 200 }).then((r) => r.data.items), [open]);
  const { data: fabrics } = useAsync(() => fabricsApi.list({ limit: 200 }).then((r) => r.data.items), [open]);
  const { data: motors } = useAsync(() => motorsApi.list({ limit: 200 }).then((r) => r.data.items), [open]);
  const { data: accessories } = useAsync(() => accessoriesApi.list({ limit: 200 }).then((r) => r.data.items), [open]);

  const [form, setForm] = useState({
    name: '',
    brand: '',
    collectionName: '',
    colour: '',
    composition: '',
    fabricType: 'MAIN',
    widthInch: 54,
    usableWidthInch: 50,
    patternRepeatInch: 0,
    recommendedFullness: 2.5,
    unit: 'meter',
    purchaseRate: '',
    sellingRate: '',
    vendor: '',
    reorderLevel: 0,
    notes: '',

    model: '',
    motorType: 'CURTAIN_TRACK',
    powerType: 'AC',
    maxWidthInch: '',
    maxLoadKg: '',
    warrantyMonths: 12,

    category: 'OTHER',
    finish: '',

    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    leadTimeDays: 7,
    rating: 3,
    supplies: [],

    stockItemType: 'Fabric',
    selectedItem: '',
    quantity: '',
    warehouse: 'MAIN',
    batchNo: '',
    reason: 'Stock addition',

    rate: '',
    expectedDate: getLocalDate(),
  });

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const toggleSupply = (supplyKey) => {
    setForm((prev) => {
      const current = prev.supplies || [];
      const updated = current.includes(supplyKey)
        ? current.filter((s) => s !== supplyKey)
        : [...current, supplyKey];
      return { ...prev, supplies: updated };
    });
  };

  const { execute, pending, error } = useAction(
    async (payload) => {
      if (type === 'fabric') return fabricsApi.create(payload);
      if (type === 'motor') return motorsApi.create(payload);
      if (type === 'accessory') return accessoriesApi.create(payload);
      if (type === 'vendor') return vendorsApi.create(payload);
      if (type === 'stock') return stockApi.receive(payload);
      if (type === 'purchase') return purchaseApi.create(payload);
    },
    {
      onSuccess: () => {
        onSuccess?.();
        onClose();
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    if (type === 'fabric') {
      execute({
        name: form.name,
        brand: form.brand || undefined,
        collectionName: form.collectionName || undefined,
        colour: form.colour || undefined,
        composition: form.composition || undefined,
        type: form.fabricType,
        widthInch: Number(form.widthInch) || 54,
        usableWidthInch: Number(form.usableWidthInch) || 50,
        patternRepeatInch: Number(form.patternRepeatInch) || 0,
        recommendedFullness: Number(form.recommendedFullness) || 2.5,
        unit: form.unit || 'meter',
        purchaseRate: form.purchaseRate ? Number(form.purchaseRate) : 0,
        sellingRate: form.sellingRate ? Number(form.sellingRate) : 0,
        vendor: form.vendor || undefined,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : 0,
        notes: form.notes || undefined,
      });
    } else if (type === 'motor') {
      execute({
        name: form.name,
        brand: form.brand || undefined,
        model: form.model || undefined,
        type: form.motorType,
        powerType: form.powerType,
        maxWidthInch: form.maxWidthInch ? Number(form.maxWidthInch) : undefined,
        maxLoadKg: form.maxLoadKg ? Number(form.maxLoadKg) : undefined,
        warrantyMonths: form.warrantyMonths ? Number(form.warrantyMonths) : 12,
        purchaseRate: form.purchaseRate ? Number(form.purchaseRate) : 0,
        sellingRate: form.sellingRate ? Number(form.sellingRate) : 0,
        vendor: form.vendor || undefined,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : 0,
        notes: form.notes || undefined,
      });
    } else if (type === 'accessory') {
      execute({
        name: form.name,
        category: form.category,
        brand: form.brand || undefined,
        finish: form.finish || undefined,
        unit: form.unit || 'piece',
        purchaseRate: form.purchaseRate ? Number(form.purchaseRate) : 0,
        sellingRate: form.sellingRate ? Number(form.sellingRate) : 0,
        vendor: form.vendor || undefined,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : 0,
        notes: form.notes || undefined,
      });
    } else if (type === 'vendor') {
      execute({
        name: form.name,
        contactPerson: form.contactPerson || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        gstin: form.gstin || undefined,
        leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : 7,
        rating: form.rating ? Number(form.rating) : 3,
        supplies: form.supplies?.length ? form.supplies : undefined,
        notes: form.notes || undefined,
      });
    } else if (type === 'stock') {
      let itemsList = [];
      if (form.stockItemType === 'Fabric') itemsList = fabrics || [];
      else if (form.stockItemType === 'Motor') itemsList = motors || [];
      else if (form.stockItemType === 'Accessory') itemsList = accessories || [];

      const selected = itemsList.find((i) => (i.id || i._id) === form.selectedItem);

      execute({
        itemType: form.stockItemType,
        item: form.selectedItem,
        itemName: selected?.name || form.name || 'Inventory Item',
        quantity: Number(form.quantity),
        unit: selected?.unit || form.unit || 'meter',
        warehouse: form.warehouse || 'MAIN',
        batchNo: form.batchNo || undefined,
        reason: form.reason || 'Stock addition',
      });
    } else if (type === 'purchase') {
      let itemsList = [];
      if (form.stockItemType === 'Fabric') itemsList = fabrics || [];
      else if (form.stockItemType === 'Motor') itemsList = motors || [];
      else if (form.stockItemType === 'Accessory') itemsList = accessories || [];

      const selected = itemsList.find((i) => (i.id || i._id) === form.selectedItem);

      execute({
        vendor: form.vendor,
        lines: [
          {
            itemType: form.stockItemType,
            item: form.selectedItem || undefined,
            itemName: selected?.name || form.name || 'Purchase Item',
            quantity: Number(form.quantity),
            rate: Number(form.rate),
            unit: selected?.unit || form.unit || 'meter',
          },
        ],
        expectedDate: form.expectedDate || undefined,
        notes: form.notes || undefined,
      });
    }
  };

  const currentItems =
    form.stockItemType === 'Fabric'
      ? fabrics
      : form.stockItemType === 'Motor'
      ? motors
      : accessories;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add item to inventory"
      subtitle="Select item category and fill details to save to catalogue or stock"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={pending}>
            Save Item
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        <Field label="Category / Type" required>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: 'stock', label: 'Receive Stock' },
              { value: 'fabric', label: 'Fabric' },
              { value: 'motor', label: 'Motor' },
              { value: 'accessory', label: 'Accessory' },
              { value: 'vendor', label: 'Vendor' },
              { value: 'purchase', label: 'Purchase Order' },
            ]}
          />
        </Field>

        {/* Fabric Form */}
        {type === 'fabric' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fabric Name" required>
                <Input value={form.name} onChange={setField('name')} placeholder="e.g. Royal Silk Velvet" required />
              </Field>
              <Field label="Fabric Type">
                <Select
                  value={form.fabricType}
                  onChange={setField('fabricType')}
                  options={[
                    { value: 'MAIN', label: 'Main' },
                    { value: 'SHEER', label: 'Sheer' },
                    { value: 'BLACKOUT', label: 'Blackout' },
                    { value: 'ROMAN', label: 'Roman' },
                    { value: 'UPHOLSTERY', label: 'Upholstery' },
                  ]}
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Brand">
                <Input value={form.brand} onChange={setField('brand')} placeholder="Brand name" />
              </Field>
              <Field label="Collection">
                <Input value={form.collectionName} onChange={setField('collectionName')} placeholder="Collection name" />
              </Field>
              <Field label="Colour">
                <Input value={form.colour} onChange={setField('colour')} placeholder="Colour" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Bolt Width (Inches)">
                <Input type="number" value={form.widthInch} onChange={setField('widthInch')} />
              </Field>
              <Field label="Usable Width (Inches)">
                <Input type="number" value={form.usableWidthInch} onChange={setField('usableWidthInch')} />
              </Field>
              <Field label="Recommended Fullness">
                <Input type="number" step="0.1" value={form.recommendedFullness} onChange={setField('recommendedFullness')} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Purchase Cost (₹)">
                <Input type="number" value={form.purchaseRate} onChange={setField('purchaseRate')} placeholder="0" />
              </Field>
              <Field label="Selling Rate (₹)">
                <Input type="number" value={form.sellingRate} onChange={setField('sellingRate')} placeholder="0" />
              </Field>
              <Field label="Vendor">
                <Select
                  value={form.vendor}
                  onChange={setField('vendor')}
                  placeholder="Select Vendor"
                  options={(vendors || []).map((v) => ({ value: v.id || v._id, label: v.name }))}
                />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea value={form.notes} onChange={setField('notes')} placeholder="Optional description or details" />
            </Field>
          </>
        )}

        {/* Motor Form */}
        {type === 'motor' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Motor Name" required>
                <Input value={form.name} onChange={setField('name')} placeholder="e.g. Somfy Glydea Ultra" required />
              </Field>
              <Field label="Motor Type">
                <Select
                  value={form.motorType}
                  onChange={setField('motorType')}
                  options={[
                    { value: 'CURTAIN_TRACK', label: 'Curtain Track' },
                    { value: 'ROMAN_BLIND', label: 'Roman Blind' },
                    { value: 'ROLLER_BLIND', label: 'Roller Blind' },
                    { value: 'HUB', label: 'Hub' },
                    { value: 'REMOTE', label: 'Remote' },
                  ]}
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Brand">
                <Input value={form.brand} onChange={setField('brand')} placeholder="e.g. Somfy" />
              </Field>
              <Field label="Model">
                <Input value={form.model} onChange={setField('model')} placeholder="Model number" />
              </Field>
              <Field label="Power Type">
                <Select
                  value={form.powerType}
                  onChange={setField('powerType')}
                  options={[
                    { value: 'AC', label: 'AC' },
                    { value: 'DC', label: 'DC' },
                    { value: 'BATTERY', label: 'Battery' },
                    { value: 'SOLAR', label: 'Solar' },
                  ]}
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Max Width (Inches)">
                <Input type="number" value={form.maxWidthInch} onChange={setField('maxWidthInch')} placeholder="Optional" />
              </Field>
              <Field label="Purchase Cost (₹)">
                <Input type="number" value={form.purchaseRate} onChange={setField('purchaseRate')} placeholder="0" />
              </Field>
              <Field label="Selling Rate (₹)">
                <Input type="number" value={form.sellingRate} onChange={setField('sellingRate')} placeholder="0" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Vendor">
                <Select
                  value={form.vendor}
                  onChange={setField('vendor')}
                  placeholder="Select Vendor"
                  options={(vendors || []).map((v) => ({ value: v.id || v._id, label: v.name }))}
                />
              </Field>
              <Field label="Warranty (Months)">
                <Input type="number" value={form.warrantyMonths} onChange={setField('warrantyMonths')} />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea value={form.notes} onChange={setField('notes')} placeholder="Optional notes" />
            </Field>
          </>
        )}

        {/* Accessory Form */}
        {type === 'accessory' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Accessory Name" required>
                <Input value={form.name} onChange={setField('name')} placeholder="e.g. Heavy Duty Track" required />
              </Field>
              <Field label="Category">
                <Select
                  value={form.category}
                  onChange={setField('category')}
                  options={[
                    { value: 'TRACK', label: 'Track' },
                    { value: 'BRACKET', label: 'Bracket' },
                    { value: 'TIEBACK', label: 'Tieback' },
                    { value: 'LEAD_BAND', label: 'Lead Band' },
                    { value: 'HOOK', label: 'Hook' },
                    { value: 'RING', label: 'Ring' },
                    { value: 'ROD', label: 'Rod' },
                    { value: 'TAPE', label: 'Tape' },
                    { value: 'CHAIN', label: 'Chain' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Brand">
                <Input value={form.brand} onChange={setField('brand')} placeholder="Brand" />
              </Field>
              <Field label="Finish">
                <Input value={form.finish} onChange={setField('finish')} placeholder="e.g. Matte Black" />
              </Field>
              <Field label="Unit">
                <Input value={form.unit} onChange={setField('unit')} placeholder="e.g. meter / piece" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Purchase Cost (₹)">
                <Input type="number" value={form.purchaseRate} onChange={setField('purchaseRate')} placeholder="0" />
              </Field>
              <Field label="Selling Rate (₹)">
                <Input type="number" value={form.sellingRate} onChange={setField('sellingRate')} placeholder="0" />
              </Field>
              <Field label="Vendor">
                <Select
                  value={form.vendor}
                  onChange={setField('vendor')}
                  placeholder="Select Vendor"
                  options={(vendors || []).map((v) => ({ value: v.id || v._id, label: v.name }))}
                />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea value={form.notes} onChange={setField('notes')} placeholder="Optional notes" />
            </Field>
          </>
        )}

        {/* Vendor Form */}
        {type === 'vendor' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Vendor Name" required>
                <Input value={form.name} onChange={setField('name')} placeholder="e.g. D Decor Fabrics" required />
              </Field>
              <Field label="Contact Person">
                <Input value={form.contactPerson} onChange={setField('contactPerson')} placeholder="Contact name" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Phone">
                <Input value={form.phone} onChange={setField('phone')} placeholder="Phone number" />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={setField('email')} placeholder="Email address" />
              </Field>
              <Field label="GSTIN">
                <Input value={form.gstin} onChange={setField('gstin')} placeholder="GST Number" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Lead Time (Days)">
                <Input type="number" value={form.leadTimeDays} onChange={setField('leadTimeDays')} />
              </Field>
              <Field label="Rating (0 - 5)">
                <Input type="number" min="0" max="5" value={form.rating} onChange={setField('rating')} />
              </Field>
            </div>
            <Field label="Supplies Offered">
              <div className="flex flex-wrap gap-4 mt-1">
                {['FABRIC', 'BLACKOUT', 'MOTOR', 'TRACK', 'ACCESSORY', 'LEAD_BAND'].map((sup) => (
                  <Checkbox
                    key={sup}
                    label={humanise(sup)}
                    checked={form.supplies.includes(sup)}
                    onChange={() => toggleSupply(sup)}
                  />
                ))}
              </div>
            </Field>
            <Field label="Notes">
              <Textarea value={form.notes} onChange={setField('notes')} placeholder="Notes" />
            </Field>
          </>
        )}

        {/* Stock Receive Form */}
        {type === 'stock' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Item Type" required>
                <Select
                  value={form.stockItemType}
                  onChange={setField('stockItemType')}
                  options={[
                    { value: 'Fabric', label: 'Fabric' },
                    { value: 'Motor', label: 'Motor' },
                    { value: 'Accessory', label: 'Accessory' },
                  ]}
                />
              </Field>
              <Field label="Select Item" required>
                <Select
                  value={form.selectedItem}
                  onChange={setField('selectedItem')}
                  placeholder="Select item from catalogue"
                  options={(currentItems || []).map((i) => ({
                    value: i.id || i._id,
                    label: `${i.name}${i.brand ? ` (${i.brand})` : ''}`,
                  }))}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Quantity" required>
                <Input type="number" value={form.quantity} onChange={setField('quantity')} placeholder="Quantity" required />
              </Field>
              <Field label="Warehouse / Location">
                <Input value={form.warehouse} onChange={setField('warehouse')} placeholder="MAIN" />
              </Field>
              <Field label="Batch / Roll No">
                <Input value={form.batchNo} onChange={setField('batchNo')} placeholder="Optional batch no" />
              </Field>
            </div>
            <Field label="Reason / Notes">
              <Input value={form.reason} onChange={setField('reason')} placeholder="e.g. Stock shipment received" />
            </Field>
          </>
        )}

        {/* Purchase Order Form */}
        {type === 'purchase' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Vendor" required>
                <Select
                  value={form.vendor}
                  onChange={setField('vendor')}
                  placeholder="Select Vendor"
                  options={(vendors || []).map((v) => ({ value: v.id || v._id, label: v.name }))}
                  required
                />
              </Field>
              <Field label="Item Category" required>
                <Select
                  value={form.stockItemType}
                  onChange={setField('stockItemType')}
                  options={[
                    { value: 'Fabric', label: 'Fabric' },
                    { value: 'Motor', label: 'Motor' },
                    { value: 'Accessory', label: 'Accessory' },
                  ]}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Select Item from Catalogue">
                <Select
                  value={form.selectedItem}
                  onChange={setField('selectedItem')}
                  placeholder="Choose item"
                  options={(currentItems || []).map((i) => ({
                    value: i.id || i._id,
                    label: `${i.name}${i.brand ? ` (${i.brand})` : ''}`,
                  }))}
                />
              </Field>
              <Field label="Or Custom Item Name">
                <Input value={form.name} onChange={setField('name')} placeholder="If not in catalogue" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Quantity" required>
                <Input type="number" value={form.quantity} onChange={setField('quantity')} required />
              </Field>
              <Field label="Rate (₹)" required>
                <Input type="number" value={form.rate} onChange={setField('rate')} required />
              </Field>
              <Field label="Expected Date">
                <Input type="date" value={form.expectedDate} onChange={setField('expectedDate')} />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea value={form.notes} onChange={setField('notes')} placeholder="Optional PO notes" />
            </Field>
          </>
        )}
      </form>
    </Modal>
  );
};

const StockTab = ({ refreshKey }) => {
  const { data, loading, error, reload } = useAsync(() => stockApi.list({ limit: 200 }).then((r) => r.data.items), [refreshKey]);
  const { data: low } = useAsync(() => stockApi.lowStock().then((r) => r.data), [refreshKey]);

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

const CatalogueTab = ({ loader, columns, title, subtitle, icon, refreshKey }) => {
  const { data, loading, error, reload } = useAsync(loader, [refreshKey]);
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
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Steps 13 & 14 — what we hold, what we owe, and what arrived"
        actions={
          <Button icon={Plus} onClick={() => setModalOpen(true)}>
            Add Item
          </Button>
        }
      />

      <Panel className="mb-4">
        <div className="px-4 pt-1">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </Panel>

      {tab === 'stock' && <StockTab refreshKey={refreshKey} />}

      {tab === 'fabrics' && (
        <CatalogueTab
          title="Fabrics"
          subtitle="Usable width and fullness here drive the consumption engine"
          icon={Layers}
          loader={() => fabricsApi.list({ limit: 200 }).then((r) => r.data.items)}
          refreshKey={refreshKey}
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
          refreshKey={refreshKey}
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
          refreshKey={refreshKey}
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
          refreshKey={refreshKey}
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
          refreshKey={refreshKey}
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
          refreshKey={refreshKey}
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

      <AddItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
        activeTab={tab}
      />
    </div>
  );
};

export default InventoryPage;

