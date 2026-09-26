import { useEffect, useState } from 'react';
import { FileText, Pencil, AlertTriangle } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'executionDrawingRequest';

const EditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: item?.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : '',
    requestDate: item?.requestDate ? new Date(item.requestDate).toISOString().slice(0, 10) : '',
    requestedBy: item?.requestedBy || '',
    drawingRequiredByDate: item?.drawingRequiredByDate ? new Date(item.drawingRequiredByDate).toISOString().slice(0, 10) : '',
    inputCompletenessStatus: item?.inputCompletenessStatus || 'Pending',
    drawingVersion: item?.drawingVersion || 'v1',
    preparedBy: item?.preparedBy || '',
    checkedBy: item?.checkedBy || '',
    siteDetailSheet: item?.siteDetailSheet || '',
    roomWindowReference: item?.roomWindowReference || '',
    measurements: item?.measurements || '',
    readyHeightStatus: item?.readyHeightStatus || 'Pending',
    pelmetMotorChannelDetails: item?.pelmetMotorChannelDetails || '',
    currentOwner: item?.currentOwner || '',
    status: item?.status || 'Pending',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.executionDrawingRequest.update(item._id || item.id, payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Execution Drawing Request: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs"><AlertTriangle className="w-4 h-4" /><span>{error}</span></div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Execution Drawing Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Request Date">
            <Input type="date" value={form.requestDate} onChange={(e) => setForm({...form, requestDate: e.target.value})} />
          </Field>
          <Field label="Requested By">
            <Input value={form.requestedBy} onChange={(e) => setForm({...form, requestedBy: e.target.value})} placeholder="Name/Department" />
          </Field>
          <Field label="Drawing Required By Date">
            <Input type="date" value={form.drawingRequiredByDate} onChange={(e) => setForm({...form, drawingRequiredByDate: e.target.value})} />
          </Field>
          <Field label="Input Completeness Status">
            <Select value={form.inputCompletenessStatus} onChange={(e) => setForm({...form, inputCompletenessStatus: e.target.value})} options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Complete', label: 'Complete' },
              { value: 'Incomplete', label: 'Incomplete' },
            ]} />
          </Field>
          <Field label="Drawing Version">
            <Input value={form.drawingVersion} onChange={(e) => setForm({...form, drawingVersion: e.target.value})} placeholder="v1, v2, etc." />
          </Field>
          <Field label="Prepared By">
            <Input value={form.preparedBy} onChange={(e) => setForm({...form, preparedBy: e.target.value})} placeholder="Designer name" />
          </Field>
          <Field label="Checked By">
            <Input value={form.checkedBy} onChange={(e) => setForm({...form, checkedBy: e.target.value})} placeholder="Checker name" />
          </Field>
          <Field label="Ready Height Status">
            <Select value={form.readyHeightStatus} onChange={(e) => setForm({...form, readyHeightStatus: e.target.value})} options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'Ready', label: 'Ready' },
              { value: 'Needs Revision', label: 'Needs Revision' },
            ]} />
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

        <Field label="Site Detail Sheet">
          <Textarea rows={2} value={form.siteDetailSheet} onChange={(e) => setForm({...form, siteDetailSheet: e.target.value})} placeholder="Site details..." />
        </Field>

        <Field label="Room / Window Reference">
          <Textarea rows={2} value={form.roomWindowReference} onChange={(e) => setForm({...form, roomWindowReference: e.target.value})} placeholder="List of rooms/windows..." />
        </Field>

        <Field label="Measurements">
          <Textarea rows={2} value={form.measurements} onChange={(e) => setForm({...form, measurements: e.target.value})} placeholder="Key measurements..." />
        </Field>

        <Field label="Pelmet / Motor / Channel Details">
          <Textarea rows={2} value={form.pelmetMotorChannelDetails} onChange={(e) => setForm({...form, pelmetMotorChannelDetails: e.target.value})} placeholder="Technical details..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save</Button>
        </div>
      </form>
    </Modal>
  );
};

const ExecutionDrawingRequestPage = () => {
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
      <PageHeader title="Execution Drawing Request Raise" subtitle="Manage drawing requests, request tracking, and drawing specifications" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Requests" value={stageItems.length} sub="Drawing requests" icon={FileText} tone="blue" />
        <StatTile label="Completed" value={completedCount} sub="Drawings delivered" icon={FileText} tone="green" />
        <StatTile label="In Progress" value={stageItems.filter(i => i.status === 'In Progress').length} sub="Being processed" icon={FileText} tone="amber" />
        <StatTile label="Pending" value={stageItems.filter(i => i.status === 'Pending').length} sub="Awaiting action" icon={FileText} tone="orange" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={FileText} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Request Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Requested By</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Input Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stageItems.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-medium">{item.code || `Request ${idx + 1}`}</td>
                    <td className="px-4 py-3 text-xs">{item.requestDate ? new Date(item.requestDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-xs">{item.requestedBy || '—'}</td>
                    <td className="px-4 py-3"><Badge tone={item.inputCompletenessStatus === 'Complete' ? 'green' : 'slate'}>{item.inputCompletenessStatus || 'Pending'}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={item.status === 'Completed' ? 'green' : 'slate'}>{item.status || 'Pending'}</Badge></td>
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

export default ExecutionDrawingRequestPage;
