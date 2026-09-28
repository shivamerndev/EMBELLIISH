import { useEffect, useState } from 'react';
import { CheckCircle, Pencil, AlertTriangle, CheckSquare, XCircle, Clock } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

import { useSearchParams } from 'react-router-dom';
import PmsDetailedDrawer from '../../components/pms/PmsDetailedDrawer';

const STAGE = 'approvals';

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

const ApprovalsEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    approvedBy: item?.approvedBy || '',
    approvalDate: formatDateInput(item?.approvalDate),
    status: item?.status || 'Pending',
    revisionReason: item?.revisionReason || '',
    approvedDesign: item?.approvedDesign || '',
    executionDrawingStatus: item?.executionDrawingStatus || 'Pending',
    orderSheet: item?.orderSheet || '',
    siteDetails: item?.siteDetails || '',
    measurementStatus: item?.measurementStatus || 'Pending',
    customSamplingNeeds: item?.customSamplingNeeds || '',
    currentOwner: item?.currentOwner || '',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.approvals.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update approval'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Approvals: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Approvals Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Approved By">
            <Input value={form.approvedBy} onChange={(e) => setForm({...form, approvedBy: e.target.value})} placeholder="Approver name" />
          </Field>
          <Field label="Approval Date">
            <Input type="date" value={form.approvalDate} onChange={(e) => setForm({...form, approvalDate: e.target.value})} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'In Review', label: 'In Review' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Rejected', label: 'Rejected' },
              { value: 'Revision Required', label: 'Revision Required' },
            ]} />
          </Field>
          <Field label="Execution Drawing Status">
            <Select value={form.executionDrawingStatus} onChange={(e) => setForm({...form, executionDrawingStatus: e.target.value})} options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Needs Revision', label: 'Needs Revision' },
            ]} />
          </Field>
          <Field label="Measurement Status">
            <Select value={form.measurementStatus} onChange={(e) => setForm({...form, measurementStatus: e.target.value})} options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'Complete', label: 'Complete' },
              { value: 'Incomplete', label: 'Incomplete' },
              { value: 'Approved', label: 'Approved' },
            ]} />
          </Field>
          <Field label="Approved Design">
            <Input value={form.approvedDesign} onChange={(e) => setForm({...form, approvedDesign: e.target.value})} placeholder="Design reference" />
          </Field>
          <Field label="Order Sheet">
            <Input value={form.orderSheet} onChange={(e) => setForm({...form, orderSheet: e.target.value})} placeholder="Order sheet reference" />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Owner name" />
          </Field>
          <Field label="Delay Status">
            <Select value={form.delay} onChange={(e) => setForm({...form, delay: e.target.value})} options={[
              { value: 'No', label: 'No Delay' },
              { value: 'Yes', label: 'Delayed' },
              { value: 'At Risk', label: 'At Risk' },
            ]} />
          </Field>
        </div>

        <Field label="Revision Reason">
          <Textarea rows={2} value={form.revisionReason} onChange={(e) => setForm({...form, revisionReason: e.target.value})} placeholder="If revision required, explain why..." />
        </Field>

        <Field label="Site Details">
          <Textarea rows={2} value={form.siteDetails} onChange={(e) => setForm({...form, siteDetails: e.target.value})} placeholder="Site information..." />
        </Field>

        <Field label="Custom / Sampling Needs">
          <Textarea rows={2} value={form.customSamplingNeeds} onChange={(e) => setForm({...form, customSamplingNeeds: e.target.value})} placeholder="Any custom or sampling requirements..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Approvals</Button>
        </div>
      </form>
    </Modal>
  );
};

const ApprovalsPage = () => {
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
        (i.approvedBy || '').toLowerCase().includes(search) ||
        (i.orderSheet || '').toLowerCase().includes(search)
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

  const approvedCount = stageItems.filter(i => i.status === 'Approved').length;
  const rejectedCount = stageItems.filter(i => i.status === 'Rejected').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Approvals" subtitle="Manage approvals, sign-offs, and authorization workflows" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Approvals" value={stageItems.length} sub="Awaiting/completed approvals" icon={CheckCircle} tone="blue" />
        <StatTile label="Approved" value={approvedCount} sub="Successfully approved" icon={CheckSquare} tone="green" />
        <StatTile label="Rejected" value={rejectedCount} sub="Rejected items" icon={XCircle} tone="rose" />
        <StatTile label="In Review" value={stageItems.filter(i => i.status === 'In Review').length} sub="Being reviewed" icon={Clock} tone="amber" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={CheckCircle} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <Table
            items={stageItems}
            columns={[
              { key: 'dueDate', label: 'Due Date', render: (val) => formatDate(val) },
              { key: 'approvedBy', label: 'Approved By' },
              { key: 'approvalDate', label: 'Approval Date', render: (val) => formatDate(val) },
              {
                key: 'status',
                label: 'Status',
                render: (val) => (
                  <Badge tone={val === 'Approved' ? 'green' : val === 'Rejected' ? 'rose' : val === 'In Review' ? 'amber' : 'slate'}>
                    {val || 'Pending'}
                  </Badge>
                ),
              },
              { key: 'approvedDesign', label: 'Approved Design' },
              {
                key: 'executionDrawingStatus',
                label: 'Drawing Status',
                render: (val) => <Badge tone={val === 'Approved' ? 'green' : 'slate'}>{val || 'Pending'}</Badge>,
              },
              { key: 'orderSheet', label: 'Order Sheet', className: 'font-mono' },
              {
                key: 'measurementStatus',
                label: 'Measurements',
                render: (val) => <Badge tone={val === 'Approved' || val === 'Complete' ? 'green' : 'amber'}>{val || 'Pending'}</Badge>,
              },
              { key: 'currentOwner', label: 'Owner' },
              {
                key: 'delay',
                label: 'Delay',
                render: (val) => <Badge tone={val === 'Yes' ? 'rose' : 'green'}>{val === 'Yes' ? 'Delayed' : 'No Delay'}</Badge>,
              },
            ]}
            idColumnKey="code"
            idColumnLabel="Code / Client"
            idColumnRender={(item, idx) => item.code || `Approval ${idx + 1}`}
            onRowClick={setDrawerItem}
            onView={setDrawerItem}
            onEdit={setEditingItem}
          />
        </Panel>
      )}

      {editingItem && <ApprovalsEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}

      <PmsDetailedDrawer
        open={Boolean(drawerItem)}
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
        onEdit={(item) => {
          setDrawerItem(null);
          setEditingItem(item);
        }}
        pageName="Approvals"
        currentStageKey={STAGE}
      />
    </div>
  );
};

export default ApprovalsPage;
