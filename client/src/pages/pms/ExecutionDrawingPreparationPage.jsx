import { useEffect, useState } from 'react';
import { Pencil, AlertTriangle } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'executionDrawingPreparation';

const EditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: item?.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : '',
    structuredRequest: item?.structuredRequest || '',
    designBrief: item?.designBrief || '',
    siteDetail: item?.siteDetail || '',
    sizes: item?.sizes || '',
    pelmetChannelMotorDetails: item?.pelmetChannelMotorDetails || '',
    technicalFeasibilityInput: item?.technicalFeasibilityInput || '',
    currentOwner: item?.currentOwner || '',
    status: item?.status || 'Pending',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.executionDrawingPreparation.update(item._id || item.id, payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Execution Drawing Preparation: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs"><AlertTriangle className="w-4 h-4" /><span>{error}</span></div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Execution Drawing Preparation Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Owner name" />
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

        <Field label="Structured Request">
          <Textarea rows={2} value={form.structuredRequest} onChange={(e) => setForm({...form, structuredRequest: e.target.value})} placeholder="Structured requirements..." />
        </Field>

        <Field label="Design Brief">
          <Textarea rows={2} value={form.designBrief} onChange={(e) => setForm({...form, designBrief: e.target.value})} placeholder="Design brief details..." />
        </Field>

        <Field label="Site Detail">
          <Textarea rows={2} value={form.siteDetail} onChange={(e) => setForm({...form, siteDetail: e.target.value})} placeholder="Site details..." />
        </Field>

        <Field label="Sizes">
          <Textarea rows={2} value={form.sizes} onChange={(e) => setForm({...form, sizes: e.target.value})} placeholder="Dimensions and measurements..." />
        </Field>

        <Field label="Pelmet / Channel / Motor Details">
          <Textarea rows={2} value={form.pelmetChannelMotorDetails} onChange={(e) => setForm({...form, pelmetChannelMotorDetails: e.target.value})} placeholder="Technical specifications..." />
        </Field>

        <Field label="Technical Feasibility Input">
          <Textarea rows={2} value={form.technicalFeasibilityInput} onChange={(e) => setForm({...form, technicalFeasibilityInput: e.target.value})} placeholder="Feasibility assessment..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save</Button>
        </div>
      </form>
    </Modal>
  );
};

const ExecutionDrawingPreparationPage = () => {
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

  return (
    <div className="space-y-4">
      <PageHeader title="Execution Drawing Preparation" subtitle="Prepare and finalize execution drawings for production" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Drawings" value={stageItems.length} sub="Being prepared" icon={Pencil} tone="blue" />
        <StatTile label="Completed" value={completedCount} sub="Drawings ready" icon={Pencil} tone="green" />
        <StatTile label="In Progress" value={stageItems.filter(i => i.status === 'In Progress').length} sub="Being worked on" icon={Pencil} tone="amber" />
        <StatTile label="On Hold" value={stageItems.filter(i => i.status === 'On Hold').length} sub="Waiting for input" icon={Pencil} tone="orange" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={Pencil} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Owner</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Delay</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stageItems.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-medium">{item.code || `Drawing ${idx + 1}`}</td>
                    <td className="px-4 py-3 text-xs">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-xs">{item.currentOwner || '—'}</td>
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

      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default ExecutionDrawingPreparationPage;
