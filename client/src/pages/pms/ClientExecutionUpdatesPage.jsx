import { useEffect, useState } from 'react';
import { MessageSquare, Pencil, AlertTriangle, CheckCircle, Clock, Send, Sparkles } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'clientExecutionUpdates';

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

const ClientExecutionUpdatesEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    lastClientUpdateDate: formatDateInput(item?.lastClientUpdateDate || item?.updateDate),
    updatedBy: item?.updatedBy || item?.sharedBy || '',
    nextUpdateDueDate: formatDateInput(item?.nextUpdateDueDate),
    projectStage: item?.projectStage || 'Installation & Commissioning',
    productionStatus: item?.productionStatus || 'Completed',
    expectedDates: item?.expectedDates || '',
    delays: item?.delays || 'No delays reported',
    installationStatus: item?.installationStatus || 'In Progress',
    clientQueries: item?.clientQueries || item?.summaryText || '',
    currentOwner: item?.currentOwner || item?.sharedBy || '',
    status: item?.status || 'Sent',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.clientExecutionUpdates.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update client execution update'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Client Execution Update: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
          <Sparkles className="w-4 h-4 shrink-0 text-blue-500" />
          <span><strong>Auto-fetched Statuses:</strong> Project Stage, Production Status, and Installation Status auto-fetch from active PMS modules rather than re-typing.</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Client Execution Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Last Client Update Date">
            <Input type="date" value={form.lastClientUpdateDate} onChange={(e) => setForm({...form, lastClientUpdateDate: e.target.value})} />
          </Field>
          <Field label="Updated By">
            <Input value={form.updatedBy} onChange={(e) => setForm({...form, updatedBy: e.target.value})} placeholder="DCM / Coordinator name" />
          </Field>
          <Field label="Next Update Due Date">
            <Input type="date" value={form.nextUpdateDueDate} onChange={(e) => setForm({...form, nextUpdateDueDate: e.target.value})} />
          </Field>
          <Field label="Project Stage (Auto-fetched)">
            <Input value={form.projectStage} onChange={(e) => setForm({...form, projectStage: e.target.value})} placeholder="Current pipeline stage" />
          </Field>
          <Field label="Production Status (Auto-fetched)">
            <Input value={form.productionStatus} onChange={(e) => setForm({...form, productionStatus: e.target.value})} placeholder="Auto-fetched from Production" />
          </Field>
          <Field label="Installation Status (Auto-fetched)">
            <Input value={form.installationStatus} onChange={(e) => setForm({...form, installationStatus: e.target.value})} placeholder="Auto-fetched from Installation" />
          </Field>
          <Field label="Expected Dates">
            <Input value={form.expectedDates} onChange={(e) => setForm({...form, expectedDates: e.target.value})} placeholder="e.g. Delivery: 2026-10-02, Handover: 2026-10-03" />
          </Field>
          <Field label="Delays">
            <Input value={form.delays} onChange={(e) => setForm({...form, delays: e.target.value})} placeholder="e.g. None or Civil delay 2 days" />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Current Owner name" />
          </Field>
          <Field label="Communication Status">
            <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={[
              { value: 'Draft', label: 'Draft' },
              { value: 'Sent', label: 'Sent / Delivered' },
              { value: 'Acknowledged', label: 'Acknowledged by Client' },
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

        <Field label="Client Queries & Notes">
          <Textarea rows={3} value={form.clientQueries} onChange={(e) => setForm({...form, clientQueries: e.target.value})} placeholder="Queries raised by client, answers provided, satisfaction feedback..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Client Update</Button>
        </div>
      </form>
    </Modal>
  );
};

const ClientExecutionUpdatesPage = () => {
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

  const acknowledgedCount = stageItems.filter(i => i.status === 'Acknowledged').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Client Execution Updates" subtitle="Track scheduled client communication, auto-fetched project/production/installation status, and query resolutions" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Updates" value={stageItems.length} sub="Client communications" icon={MessageSquare} tone="blue" />
        <StatTile label="Acknowledged" value={acknowledgedCount} sub="Read & confirmed" icon={CheckCircle} tone="green" />
        <StatTile label="Next Updates Due" value={stageItems.filter(i => i.nextUpdateDueDate).length} sub="Upcoming scheduled" icon={Clock} tone="amber" />
        <StatTile label="Client Queries" value={stageItems.filter(i => i.clientQueries && i.clientQueries !== '').length} sub="Open questions" icon={Send} tone="orange" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={MessageSquare} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code / Client</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Last Update Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Updated By</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Next Update Due</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Auto Statuses (Stage / Prod / Install)</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Expected Dates</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Client Queries</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Owner</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Delay</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stageItems.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{item.code || `Client ${idx + 1}`}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(item.dueDate)}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(item.lastClientUpdateDate || item.updateDate)}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.updatedBy || item.sharedBy || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(item.nextUpdateDueDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5 text-[10px]">
                        <span className="text-brand-600 dark:text-brand-400 font-semibold">{item.projectStage || 'In Progress'}</span>
                        <span className="text-slate-500">Prod: {item.productionStatus || 'Complete'} | Inst: {item.installationStatus || 'In Progress'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.expectedDates || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.clientQueries}>{item.clientQueries || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.currentOwner || item.sharedBy || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.status === 'Acknowledged' ? 'green' : item.status === 'Sent' ? 'blue' : 'slate'}>{item.status || 'Draft'}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.delay === 'Yes' ? 'rose' : 'green'}>{item.delay === 'Yes' ? 'Delayed' : 'No Delay'}</Badge></td>
                    <td className="px-4 py-3 text-center"><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingItem(item)} title="Edit" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {editingItem && <ClientExecutionUpdatesEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default ClientExecutionUpdatesPage;
