import { useEffect, useState } from 'react';
import { CheckCircle, Pencil, AlertTriangle } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'approvals';

const ApprovalsEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: item?.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : '',
    approvedBy: item?.approvedBy || '',
    approvalDate: item?.approvalDate ? new Date(item.approvalDate).toISOString().slice(0, 10) : '',
    status: item?.status || 'Pending',
    revisionReason: item?.revisionReason || '',
    approvedDesign: item?.approvedDesign || '',
    executionDrawingStatus: item?.executionDrawingStatus || 'Pending',
    orderSheet: item?.orderSheet || '',
    siteDetails: item?.siteDetails || '',
    measurementStatus: item?.measurementStatus || 'Pending',
    customSamplingNeeds: item?.customSamplingNeeds || '',
    currentOwner: item?.currentOwner || '',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.approvals.update(item._id || item.id, payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Approvals: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs"><AlertTriangle className="w-4 h-4" /><span>{error}</span></div>}

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
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Owner name" />
          </Field>
          <Field label="Approved Design">
            <Input value={form.approvedDesign} onChange={(e) => setForm({...form, approvedDesign: e.target.value})} placeholder="Design reference" />
          </Field>
          <Field label="Order Sheet">
            <Input value={form.orderSheet} onChange={(e) => setForm({...form, orderSheet: e.target.value})} placeholder="Order sheet reference" />
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const stageItems = pmsState?.items?.[STAGE] || [];

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
        <StatTile label="Approved" value={approvedCount} sub="Successfully approved" icon={CheckCircle} tone="green" />
        <StatTile label="Rejected" value={rejectedCount} sub="Rejected items" icon={CheckCircle} tone="rose" />
        <StatTile label="In Review" value={stageItems.filter(i => i.status === 'In Review').length} sub="Being reviewed" icon={CheckCircle} tone="amber" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={CheckCircle} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Approved By</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Approval Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stageItems.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-medium">{item.code || `Approval ${idx + 1}`}</td>
                    <td className="px-4 py-3 text-xs">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-xs">{item.approvedBy || '—'}</td>
                    <td className="px-4 py-3 text-xs">{item.approvalDate ? new Date(item.approvalDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3"><Badge tone={item.status === 'Approved' ? 'green' : item.status === 'Rejected' ? 'rose' : 'slate'}>{item.status || 'Pending'}</Badge></td>
                    <td className="px-4 py-3 text-center"><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingItem(item)} title="Edit" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {editingItem && <ApprovalsEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default ApprovalsPage;
