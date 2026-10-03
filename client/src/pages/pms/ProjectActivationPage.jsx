import { useEffect, useState } from 'react';
import { Briefcase, Pencil, AlertTriangle, CheckCircle, Clock, ShieldAlert } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

import { useSearchParams } from 'react-router-dom';
import PmsDetailedDrawer from '../../components/pms/PmsDetailedDrawer';

const STAGE = 'projectActivation';

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

const ProjectActivationEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    approvedQuote: item?.approvedQuote || '',
    paymentReceipt: item?.paymentReceipt || '',
    projectActivationDate: formatDateInput(item?.projectActivationDate),
    clientApproval: item?.clientApproval || 'Pending',
    assignedPcExecutionOwner: item?.assignedPcExecutionOwner || '',
    kycBillingStatus: item?.kycBillingStatus || 'Pending',
    siteDetails: item?.siteDetails || '',
    status: item?.status || 'Pending',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.projectActivation.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update project activation'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.projectActivationDate) {
      setError('Project Activation Date is required');
      return;
    }
    execute(form);
  };

  return (
    <Modal
      open={Boolean(item)}
      footer={
        <div className="flex justify-between items-center w-full pt-4 border-t">
          <Button
            type="button"
            loading={pending}
            onClick={() => {
              if (!form.projectActivationDate) {
                setError('Project Activation Date is required');
                return;
              }
              execute({ ...form, status: 'Completed' });
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
          >
            Complete & Advance →
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" onClick={handleSubmit} loading={pending}>Save Project Activation</Button>
          </div>
        </div>
      }
      onClose={onClose}
      title={`Project Activation: ${item?.code || 'New'}`}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Approved Quote">
            <Input value={form.approvedQuote} onChange={(e) => setForm({...form, approvedQuote: e.target.value})} placeholder="Quote reference or amount" />
          </Field>
          <Field label="Payment Receipt">
            <Input value={form.paymentReceipt} onChange={(e) => setForm({...form, paymentReceipt: e.target.value})} placeholder="Receipt number or reference" />
          </Field>
          <Field label="Project Activation Date *">
            <Input type="date" value={form.projectActivationDate} onChange={(e) => setForm({...form, projectActivationDate: e.target.value})} required />
          </Field>
          <Field label="Client Approval">
            <Select value={form.clientApproval} onChange={(e) => setForm({...form, clientApproval: e.target.value})} options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Rejected', label: 'Rejected' },
              { value: 'On Hold', label: 'On Hold' },
            ]} />
          </Field>
          <Field label="Assigned PC / Execution Owner">
            <Input value={form.assignedPcExecutionOwner} onChange={(e) => setForm({...form, assignedPcExecutionOwner: e.target.value})} placeholder="Team member name" />
          </Field>
          <Field label="KYC / Billing Status">
            <Select value={form.kycBillingStatus} onChange={(e) => setForm({...form, kycBillingStatus: e.target.value})} options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Verified', label: 'Verified' },
              { value: 'On Hold', label: 'On Hold' },
            ]} />
          </Field>
        </div>

        <Field label="Site Details">
          <Textarea rows={3} value={form.siteDetails} onChange={(e) => setForm({...form, siteDetails: e.target.value})} placeholder="Site address, contact, access details..." />
        </Field>

        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={[
            { value: 'Pending', label: 'Pending' },
            { value: 'In Progress', label: 'In Progress' },
            { value: 'Completed', label: 'Completed' },
            { value: 'On Hold', label: 'On Hold' },
          ]} />
        </Field>

      </form>
    </Modal>
  );
};

const ProjectActivationPage = () => {
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
        (i.siteDetails || '').toLowerCase().includes(search) ||
        (i.assignedPcExecutionOwner || '').toLowerCase().includes(search)
      )
    : rawStageItems;

  const handleLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      await handleFetchStage(STAGE);
    } catch (err) {
      setError(err?.message || 'Failed to load project activation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleLoad();
  }, []);

  const completedCount = stageItems.filter(i => i.status === 'Completed').length;
  const approvedCount = stageItems.filter(i => i.clientApproval === 'Approved').length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Project Activation / Advance"
        subtitle="Manage project advancement, client approval, payment receipt, KYC status, and team activation"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Projects" value={stageItems.length} sub="In activation pipeline" icon={Briefcase} tone="blue" />
        <StatTile label="Completed" value={completedCount} sub="Activated projects" icon={CheckCircle} tone="green" />
        <StatTile label="Client Approved" value={approvedCount} sub="Approved by client" icon={Clock} tone="amber" />
        <StatTile label="Pending KYC" value={stageItems.filter(i => i.kycBillingStatus === 'Pending').length} sub="Awaiting verification" icon={ShieldAlert} tone="orange" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading project activation data..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center">
          <EmptyState icon={Briefcase} title="No Projects Found" hint="Projects will appear here once activated." />
        </Panel>
      ) : (
        <Panel>
          <Table
            items={stageItems}
            noHorizontalScroll={true}
            columns={[
              {
                key: 'projectActivationDate',
                label: 'Activation Date',
                render: (val) => formatDate(val),
              },
              {
                key: 'approvedQuote',
                label: 'Approved Quote',
                className: 'text-emerald-600 dark:text-emerald-400 font-semibold',
                render: (val) => val || '—',
              },
              {
                key: 'assignedPcExecutionOwner',
                label: 'Assigned PC / Owner',
                render: (val, item) => val || item.currentOwner || '—',
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
                <span className="font-semibold text-slate-800 dark:text-slate-100 block truncate">{item.code || `PRJ-${idx + 1}`}</span>
                {item.clientName && <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{item.clientName}</span>}
              </div>
            )}
            onRowClick={setDrawerItem}
            onView={setDrawerItem}
            onEdit={setEditingItem}
          />
        </Panel>
      )}

      {editingItem && <ProjectActivationEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}

      <PmsDetailedDrawer
        open={Boolean(drawerItem)}
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
        onEdit={(item) => {
          setDrawerItem(null);
          setEditingItem(item);
        }}
        pageName="Project Activation / Advance"
        currentStageKey={STAGE}
      />
    </div>
  );
};

export default ProjectActivationPage;
