import { useEffect, useState } from 'react';
import { Package, Pencil, AlertTriangle, CheckCircle, Clock, Truck, ShieldCheck } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

import { useSearchParams } from 'react-router-dom';
import PmsDetailedDrawer from '../../components/pms/PmsDetailedDrawer';

const STAGE = 'procurementRequest';

const formatDateInput = (val) => {
  if (!val) return '';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

const ProcurementRequestEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    approvedOrderSheet: item?.approvedOrderSheet || '',
    procurementStatus: item?.procurementStatus || 'Draft',
    materialReadiness: item?.materialReadiness || 'Pending',
    expectedMaterialDate: formatDateInput(item?.expectedMaterialDate),
    procurementDelayException: item?.procurementDelayException || 'None',
    paymentApprovalIfNeeded: item?.paymentApprovalIfNeeded || 'Pending',
    currentOwner: item?.currentOwner || '',
    fabricMaterialList: item?.fabricMaterialList || item?.notes || '',
    status: item?.status || 'Pending',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.procurementRequest.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update procurement request'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal
      open={Boolean(item)}
      footer={
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" onClick={handleSubmit} loading={pending}>Save Procurement Request</Button>
        </div>
      }
      onClose={onClose}
      title={`Procurement Request: ${item?.code || 'New'}`}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Procurement Request Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Approved Order Sheet">
            <Input value={form.approvedOrderSheet} onChange={(e) => setForm({...form, approvedOrderSheet: e.target.value})} placeholder="e.g. OS/FMS-2026-088" />
          </Field>
          <Field label="Procurement Status">
            <Select value={form.procurementStatus} onChange={(e) => setForm({...form, procurementStatus: e.target.value})} options={[
              { value: 'Draft', label: 'Draft' },
              { value: 'Requested', label: 'Requested' },
              { value: 'PO Raised', label: 'PO Raised' },
              { value: 'Ordered', label: 'Ordered' },
              { value: 'In Transit', label: 'In Transit' },
              { value: 'Received in Warehouse', label: 'Received in Warehouse' },
            ]} />
          </Field>
          <Field label="Material Readiness">
            <Select value={form.materialReadiness} onChange={(e) => setForm({...form, materialReadiness: e.target.value})} options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'Partial', label: 'Partial Readiness' },
              { value: 'Ready in Warehouse', label: 'Ready in Warehouse' },
              { value: 'Dispatched to Workshop', label: 'Dispatched to Workshop' },
            ]} />
          </Field>
          <Field label="Expected Material Date">
            <Input type="date" value={form.expectedMaterialDate} onChange={(e) => setForm({...form, expectedMaterialDate: e.target.value})} />
          </Field>
          <Field label="Payment Approval If Needed">
            <Select value={form.paymentApprovalIfNeeded} onChange={(e) => setForm({...form, paymentApprovalIfNeeded: e.target.value})} options={[
              { value: 'Not Required', label: 'Not Required (Credit)' },
              { value: 'Pending Finance Approval', label: 'Pending Finance Approval' },
              { value: 'Approved by Finance', label: 'Approved by Finance' },
              { value: 'Advance Transferred', label: 'Advance Transferred' },
            ]} />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Buyer / Procurement Lead" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
              { value: 'On Hold', label: 'On Hold' },
            ]} />
          </Field>
          <Field label="Delay Status">
            <Select value={form.delay} onChange={(e) => setForm({...form, delay: e.target.value})} options={[
              { value: 'No', label: 'No Delay' },
              { value: 'Yes', label: 'Delayed' },
              { value: 'At Risk', label: 'At Risk' },
            ]} />
          </Field>
        </div>

        <Field label="Fabric / Material List">
          <Textarea rows={3} value={form.fabricMaterialList} onChange={(e) => setForm({...form, fabricMaterialList: e.target.value})} placeholder="List of fabrics, motors, tracks, hardware quantities and codes..." />
        </Field>

        <Field label="Procurement Delay / Exception">
          <Textarea rows={2} value={form.procurementDelayException} onChange={(e) => setForm({...form, procurementDelayException: e.target.value})} placeholder="Log any stock-out, import custom clearance, or mill delays..." />
        </Field>

      </form>
    </Modal>
  );
};

const ProcurementRequestPage = () => {
  const { handleFetchStage, pmsState } = usePms();
  const [searchParams] = useSearchParams();
  const search = (searchParams.get('search') || '').toLowerCase().trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [drawerItem, setDrawerItem] = useState(null);

  const rawStageItems = Array.isArray(pmsState?.items?.[STAGE]) ? pmsState.items[STAGE] : [];
  const stageItems = search
    ? rawStageItems.filter((i) =>
        (i.code || '').toLowerCase().includes(search) ||
        (i.clientName || '').toLowerCase().includes(search) ||
        (i.procurementStatus || '').toLowerCase().includes(search) ||
        (i.fabricMaterialList || '').toLowerCase().includes(search)
      )
    : rawStageItems;

  const handleLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      await handleFetchStage(STAGE);
    } catch (err) {
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleLoad();
  }, []);

  const completedCount = stageItems.filter(i => i.status === 'Completed' || i.procurementStatus === 'Received in Warehouse').length;
  const delayedCount = stageItems.filter(i => i.delay === 'Yes').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Procurement Request" subtitle="Manage material purchase requests, supplier orders, readiness tracking, and exception management" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Requests" value={stageItems.length} sub="Procurement requisitions" icon={Package} tone="blue" />
        <StatTile label="Materials Ready" value={completedCount} sub="In warehouse" icon={CheckCircle} tone="green" />
        <StatTile label="Delayed / Exception" value={delayedCount} sub="Supply issues" icon={AlertTriangle} tone="rose" />
        <StatTile label="In Progress" value={stageItems.filter(i => i.status === 'In Progress').length} sub="Ordered / in-transit" icon={Truck} tone="amber" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={Package} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <Table
            items={stageItems}
            noHorizontalScroll={true}
            columns={[
              {
                key: 'dueDate',
                label: 'Due Date',
                render: (val) => formatDate(val),
              },
              {
                key: 'procurementStatus',
                label: 'Procurement Status',
                render: (val) => (
                  <Badge tone={val === 'Ordered' || val === 'Received in Warehouse' ? 'green' : 'amber'}>
                    {val || 'Draft'}
                  </Badge>
                ),
              },
              {
                key: 'materialReadiness',
                label: 'Material Readiness',
                render: (val) => <Badge tone={val === 'Ready in Warehouse' ? 'green' : 'slate'}>{val || 'Pending'}</Badge>,
              },
              {
                key: 'currentOwner',
                label: 'Owner',
                render: (val) => val || '—',
              },
              {
                key: 'status',
                label: 'Status',
                render: (val) => (
                  <Badge tone={val === 'Completed' ? 'green' : val === 'In Progress' ? 'blue' : 'slate'}>
                    {val || 'Pending'}
                  </Badge>
                ),
              },
            ]}
            idColumnKey="code"
            idColumnLabel="Code / Client"
            idColumnRender={(item, idx) => (
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-100 block truncate">{item.code || `PRC-${idx + 1}`}</span>
                {item.clientName && <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{item.clientName}</span>}
              </div>
            )}
            onRowClick={setDrawerItem}
            onView={setDrawerItem}
            onEdit={setEditingItem}
          />
        </Panel>
      )}

      {editingItem && <ProcurementRequestEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}

      <PmsDetailedDrawer
        open={Boolean(drawerItem)}
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
        onEdit={(item) => {
          setDrawerItem(null);
          setEditingItem(item);
        }}
        pageName="Procurement Request"
        currentStageKey={STAGE}
      />
    </div>
  );
};

export default ProcurementRequestPage;
