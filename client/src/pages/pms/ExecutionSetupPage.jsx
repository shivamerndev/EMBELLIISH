import { useEffect, useState } from 'react';
import { Settings, Pencil, AlertTriangle } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'executionSetup';

const ExecutionSetupEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: item?.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : '',
    approvedDesign: item?.approvedDesign || '',
    approvedQuote: item?.approvedQuote || '',
    clientContext: item?.clientContext || '',
    paymentStatus: item?.paymentStatus || 'Pending',
    openActions: item?.openActions || '',
    executionOwnerPc: item?.executionOwnerPc || '',
    siteDetails: item?.siteDetails || '',
    openRisks: item?.openRisks || '',
    currentOwner: item?.currentOwner || '',
    status: item?.status || 'Pending',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.executionSetup.update(item._id || item.id, payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.dueDate) {
      setError('Due Date is required');
      return;
    }
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Execution Setup: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs"><AlertTriangle className="w-4 h-4" /><span>{error}</span></div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Execution Setup Due Date *">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} required />
          </Field>
          <Field label="Approved Design">
            <Input value={form.approvedDesign} onChange={(e) => setForm({...form, approvedDesign: e.target.value})} placeholder="Design version/reference" />
          </Field>
          <Field label="Approved Quote">
            <Input value={form.approvedQuote} onChange={(e) => setForm({...form, approvedQuote: e.target.value})} placeholder="Quote reference" />
          </Field>
          <Field label="Payment Status">
            <Select value={form.paymentStatus} onChange={(e) => setForm({...form, paymentStatus: e.target.value})} options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'Partial', label: 'Partial' },
              { value: 'Complete', label: 'Complete' },
              { value: 'On Hold', label: 'On Hold' },
            ]} />
          </Field>
          <Field label="Execution Owner / PC">
            <Input value={form.executionOwnerPc} onChange={(e) => setForm({...form, executionOwnerPc: e.target.value})} placeholder="Team member name" />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Current project owner" />
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

        <Field label="Client Context">
          <Textarea rows={3} value={form.clientContext} onChange={(e) => setForm({...form, clientContext: e.target.value})} placeholder="Client requirements, preferences, constraints..." />
        </Field>

        <Field label="Open Actions / Pending Decisions">
          <Textarea rows={3} value={form.openActions} onChange={(e) => setForm({...form, openActions: e.target.value})} placeholder="List pending decisions and open action items..." />
        </Field>

        <Field label="Open Risks">
          <Textarea rows={3} value={form.openRisks} onChange={(e) => setForm({...form, openRisks: e.target.value})} placeholder="Identify and describe project risks..." />
        </Field>

        <Field label="Site Details">
          <Textarea rows={2} value={form.siteDetails} onChange={(e) => setForm({...form, siteDetails: e.target.value})} placeholder="Site address, access, constraints..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Execution Setup</Button>
        </div>
      </form>
    </Modal>
  );
};

const ExecutionSetupPage = () => {
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

  const completedCount = stageItems.filter(i => i.status === 'Completed').length;
  const delayedCount = stageItems.filter(i => i.delay === 'Yes').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Execution Setup / Project Context" subtitle="Configure project context, team setup, execution parameters, and resource allocation" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Projects" value={stageItems.length} sub="In execution setup" icon={Settings} tone="blue" />
        <StatTile label="Completed" value={completedCount} sub="Setup completed" icon={Settings} tone="green" />
        <StatTile label="Delayed" value={delayedCount} sub="Behind schedule" icon={Settings} tone="rose" />
        <StatTile label="Payment Complete" value={stageItems.filter(i => i.paymentStatus === 'Complete').length} sub="Full payment received" icon={Settings} tone="amber" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={Settings} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Payment Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Owner</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Delay</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stageItems.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-medium">{item.code || `Project ${idx + 1}`}</td>
                    <td className="px-4 py-3 text-xs">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3"><Badge tone={item.paymentStatus === 'Complete' ? 'green' : 'slate'}>{item.paymentStatus || 'Pending'}</Badge></td>
                    <td className="px-4 py-3 text-xs">{item.executionOwnerPc || '—'}</td>
                    <td className="px-4 py-3"><Badge tone={item.status === 'Completed' ? 'green' : 'slate'}>{item.status || 'Pending'}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={item.delay === 'Yes' ? 'rose' : 'green'}>{item.delay === 'Yes' ? 'Delayed' : 'On Time'}</Badge></td>
                    <td className="px-4 py-3 text-center"><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingItem(item)} title="Edit" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {editingItem && <ExecutionSetupEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default ExecutionSetupPage;
