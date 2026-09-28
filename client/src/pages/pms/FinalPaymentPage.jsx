import { useEffect, useState } from 'react';
import { DollarSign, Pencil, AlertTriangle, CheckCircle, Clock, CreditCard, Sparkles } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'finalPayment';

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

const FinalPaymentEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    invoicePaymentSummary: item?.invoicePaymentSummary || item?.invoiceNumber ? `INV: ${item?.invoiceNumber} (Total: ₹${item?.totalAmount || '4,50,000'})` : '',
    paymentStatus: item?.paymentStatus || 'Cleared',
    paymentClearanceDate: formatDateInput(item?.paymentClearanceDate || item?.paymentReceivedDate),
    outstandingAmount: item?.outstandingAmount || (item?.balanceDue ? `₹${item.balanceDue}` : '₹0 (Auto-fetched from Finance)'),
    clientStatus: item?.clientStatus || 'Payment Settled',
    dispatchReadiness: item?.dispatchReadiness || 'Ready & Approved for Dispatch',
    currentOwner: item?.currentOwner || 'Finance Team',
    status: item?.status || 'Completed',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.finalPayment.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update final payment details'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Final Payment: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
          <Sparkles className="w-4 h-4 shrink-0 text-emerald-500" />
          <span><strong>Finance Sync:</strong> Outstanding Amount is automatically fetched from the Finance billing ledger.</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Payment Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Payment Clearance Date">
            <Input type="date" value={form.paymentClearanceDate} onChange={(e) => setForm({...form, paymentClearanceDate: e.target.value})} />
          </Field>
          <Field label="Outstanding Amount (Auto-fetched from Finance)">
            <Input value={form.outstandingAmount} onChange={(e) => setForm({...form, outstandingAmount: e.target.value})} placeholder="₹0 (Cleared)" />
          </Field>
          <Field label="Payment Status">
            <Select value={form.paymentStatus} onChange={(e) => setForm({...form, paymentStatus: e.target.value})} options={[
              { value: 'Pending', label: 'Pending Payment' },
              { value: 'Partial', label: 'Partially Received' },
              { value: 'Cleared', label: 'Cleared (Full Payment)' },
              { value: 'Overdue', label: 'Overdue' },
            ]} />
          </Field>
          <Field label="Client Status">
            <Select value={form.clientStatus} onChange={(e) => setForm({...form, clientStatus: e.target.value})} options={[
              { value: 'Payment Settled', label: 'Payment Settled' },
              { value: 'Advance Cleared', label: 'Advance Cleared' },
              { value: 'Awaiting Final Balance', label: 'Awaiting Final Balance' },
              { value: 'Payment Dispute', label: 'Payment Dispute' },
            ]} />
          </Field>
          <Field label="Dispatch Readiness">
            <Select value={form.dispatchReadiness} onChange={(e) => setForm({...form, dispatchReadiness: e.target.value})} options={[
              { value: 'Ready & Approved for Dispatch', label: 'Ready & Approved for Dispatch' },
              { value: 'Hold on Payment', label: 'Hold on Payment' },
              { value: 'Conditional Dispatch', label: 'Conditional Dispatch' },
            ]} />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Finance / Accounts Lead" />
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

        <Field label="Invoice / Payment Summary">
          <Textarea rows={2} value={form.invoicePaymentSummary} onChange={(e) => setForm({...form, invoicePaymentSummary: e.target.value})} placeholder="Invoice numbers, paid breakdown, and bank reference..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Payment Details</Button>
        </div>
      </form>
    </Modal>
  );
};

const FinalPaymentPage = () => {
  const { handleFetchStage, pmsState } = usePms();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const stageItems = Array.isArray(pmsState?.items?.[STAGE]) ? pmsState.items[STAGE] : [];

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

  const clearedCount = stageItems.filter(i => i.paymentStatus === 'Cleared' || i.paymentStatus === 'Received' || i.status === 'Completed').length;
  const pendingCount = stageItems.filter(i => i.paymentStatus === 'Pending' || i.paymentStatus === 'Partial').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Final Payment" subtitle="Track final billing clearance, auto-fetched outstanding balances from finance, and dispatch approvals" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Accounts" value={stageItems.length} sub="Payment tracking" icon={DollarSign} tone="blue" />
        <StatTile label="100% Cleared" value={clearedCount} sub="Full settlement" icon={CheckCircle} tone="green" />
        <StatTile label="Pending / Partial" value={pendingCount} sub="Awaiting collection" icon={CreditCard} tone="amber" />
        <StatTile label="Payment Delay" value={stageItems.filter(i => i.delay === 'Yes' || i.paymentStatus === 'Overdue').length} sub="Follow-up needed" icon={AlertTriangle} tone="rose" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={DollarSign} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <Table
            items={stageItems}
            columns={[
              { key: 'dueDate', label: 'Payment Due Date', render: (val) => formatDate(val) },
              {
                key: 'invoicePaymentSummary',
                label: 'Invoice / Payment Summary',
                render: (val) => (
                  <span className="text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate block" title={val}>
                    {val || '—'}
                  </span>
                ),
              },
              {
                key: 'paymentStatus',
                label: 'Payment Status',
                render: (val) => (
                  <Badge tone={val === 'Cleared' || val === 'Received' ? 'green' : val === 'Partial' ? 'amber' : 'rose'}>
                    {val || 'Pending'}
                  </Badge>
                ),
              },
              { key: 'paymentClearanceDate', label: 'Clearance Date', render: (val, item) => formatDate(val || item.paymentReceivedDate) },
              { key: 'outstandingAmount', label: 'Outstanding (Finance)', className: 'font-semibold text-emerald-600 dark:text-emerald-400', render: (val) => val || '₹0' },
              {
                key: 'clientStatus',
                label: 'Client Status',
                render: (val) => <Badge tone={val === 'Payment Settled' ? 'green' : 'slate'}>{val || 'Pending'}</Badge>,
              },
              {
                key: 'dispatchReadiness',
                label: 'Dispatch Readiness',
                render: (val) => <Badge tone={val?.includes('Approved') || val === 'Ready' ? 'green' : 'amber'}>{val || 'Hold'}</Badge>,
              },
              { key: 'currentOwner', label: 'Owner' },
              {
                key: 'status',
                label: 'Status',
                render: (val) => (
                  <Badge tone={val === 'Completed' ? 'green' : val === 'In Progress' ? 'blue' : 'slate'}>
                    {val || 'Pending'}
                  </Badge>
                ),
              },
              {
                key: 'delay',
                label: 'Delay',
                render: (val) => <Badge tone={val === 'Yes' ? 'rose' : 'green'}>{val === 'Yes' ? 'Delayed' : 'No Delay'}</Badge>,
              },
            ]}
            idColumnKey="code"
            idColumnLabel="Code / Client"
            idColumnRender={(item, idx) => item.code || `Project ${idx + 1}`}
            onEdit={setEditingItem}
            theme="slate"
          />
        </Panel>
      )}

      {editingItem && <FinalPaymentEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default FinalPaymentPage;
