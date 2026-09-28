import { useEffect, useState } from 'react';
import { Pencil, AlertTriangle, CheckCircle, Clock, PenTool } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'executionDrawingPreparation';

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

const EditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
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
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update drawing preparation'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Execution Drawing Preparation: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

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

  const completedCount = stageItems.filter(i => i.status === 'Completed').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Execution Drawing Preparation" subtitle="Prepare detailed execution drawings, technical sheets, and production specifications" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Drawings" value={stageItems.length} sub="In preparation" icon={PenTool} tone="blue" />
        <StatTile label="Completed" value={completedCount} sub="Drawings ready" icon={CheckCircle} tone="green" />
        <StatTile label="In Progress" value={stageItems.filter(i => i.status === 'In Progress').length} sub="Being worked on" icon={Clock} tone="amber" />
        <StatTile label="On Hold" value={stageItems.filter(i => i.status === 'On Hold').length} sub="Waiting for input" icon={AlertTriangle} tone="orange" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={Pencil} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <Table
            items={stageItems}
            columns={[
              { key: 'dueDate', label: 'Due Date', render: (val) => formatDate(val) },
              {
                key: 'structuredRequest',
                label: 'Structured Request',
                render: (val) => (
                  <span className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate block" title={val}>
                    {val || '—'}
                  </span>
                ),
              },
              { key: 'sizes', label: 'Sizes' },
              {
                key: 'pelmetChannelMotorDetails',
                label: 'Pelmet / Channel / Motor',
                render: (val) => (
                  <span className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate block" title={val}>
                    {val || '—'}
                  </span>
                ),
              },
              {
                key: 'technicalFeasibilityInput',
                label: 'Feasibility Input',
                render: (val) => (
                  <span className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate block" title={val}>
                    {val || '—'}
                  </span>
                ),
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
            idColumnRender={(item, idx) => item.code || `Drawing ${idx + 1}`}
            onEdit={setEditingItem}
          />
        </Panel>
      )}

      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default ExecutionDrawingPreparationPage;
