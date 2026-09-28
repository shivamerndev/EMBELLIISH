import { useEffect, useState } from 'react';
import { FileText, Pencil, AlertTriangle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'executionDrawingRequest';

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
    requestDate: formatDateInput(item?.requestDate),
    requestedBy: item?.requestedBy || '',
    drawingRequiredByDate: formatDateInput(item?.drawingRequiredByDate),
    inputCompletenessStatus: item?.inputCompletenessStatus || 'Pending',
    drawingVersion: item?.drawingVersion || 'v1.0',
    preparedBy: item?.preparedBy || '',
    checkedBy: item?.checkedBy || '',
    drawingDueDate: formatDateInput(item?.drawingDueDate || item?.dueDate),
    siteDetailSheet: item?.siteDetailSheet || '',
    pptDesignBrief: item?.pptDesignBrief || '',
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
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update drawing request'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Execution Drawing Request: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

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
          <Field label="Drawing Due Date">
            <Input type="date" value={form.drawingDueDate} onChange={(e) => setForm({...form, drawingDueDate: e.target.value})} />
          </Field>
          <Field label="Drawing Version / Revision No.">
            <Input value={form.drawingVersion} onChange={(e) => setForm({...form, drawingVersion: e.target.value})} placeholder="e.g. v1.0, Rev 2" />
          </Field>
          <Field label="Prepared By">
            <Input value={form.preparedBy} onChange={(e) => setForm({...form, preparedBy: e.target.value})} placeholder="Designer/CAD drafter" />
          </Field>
          <Field label="Checked By">
            <Input value={form.checkedBy} onChange={(e) => setForm({...form, checkedBy: e.target.value})} placeholder="Checker/Lead engineer" />
          </Field>
          <Field label="Input Completeness Status">
            <Select value={form.inputCompletenessStatus} onChange={(e) => setForm({...form, inputCompletenessStatus: e.target.value})} options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Complete', label: 'Complete' },
              { value: 'Incomplete', label: 'Incomplete' },
            ]} />
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

        <Field label="PPT / Design Brief">
          <Input value={form.pptDesignBrief} onChange={(e) => setForm({...form, pptDesignBrief: e.target.value})} placeholder="PPT link, presentation file or brief document" />
        </Field>

        <Field label="Site Detail Sheet">
          <Textarea rows={2} value={form.siteDetailSheet} onChange={(e) => setForm({...form, siteDetailSheet: e.target.value})} placeholder="Site details and measurement sheet notes..." />
        </Field>

        <Field label="Room / Window Reference">
          <Textarea rows={2} value={form.roomWindowReference} onChange={(e) => setForm({...form, roomWindowReference: e.target.value})} placeholder="List of rooms/windows and elevations..." />
        </Field>

        <Field label="Measurements">
          <Textarea rows={2} value={form.measurements} onChange={(e) => setForm({...form, measurements: e.target.value})} placeholder="Key measurements, laser span, drop heights..." />
        </Field>

        <Field label="Pelmet / Motor / Channel Details">
          <Textarea rows={2} value={form.pelmetMotorChannelDetails} onChange={(e) => setForm({...form, pelmetMotorChannelDetails: e.target.value})} placeholder="Technical details, pocket size, motor side..." />
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
      <PageHeader title="Execution Drawing Request" subtitle="Manage drawing requests, request tracking, input completeness, and technical specifications" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Requests" value={stageItems.length} sub="Drawing requests" icon={FileText} tone="blue" />
        <StatTile label="Completed" value={completedCount} sub="Drawings delivered" icon={CheckCircle} tone="green" />
        <StatTile label="In Progress" value={stageItems.filter(i => i.status === 'In Progress').length} sub="Being processed" icon={Clock} tone="amber" />
        <StatTile label="Pending" value={stageItems.filter(i => i.status === 'Pending').length} sub="Awaiting action" icon={AlertCircle} tone="orange" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={FileText} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <Table
            items={stageItems}
            columns={[
              { key: 'drawingDueDate', label: 'Drawing Due Date', render: (val, item) => formatDate(val || item.dueDate) },
              { key: 'requestDate', label: 'Request Date', render: (val) => formatDate(val) },
              { key: 'requestedBy', label: 'Requested By' },
              {
                key: 'drawingVersion',
                label: 'Version / Drafter',
                render: (val, item) => `${val || 'v1.0'}${item.preparedBy ? ` (${item.preparedBy})` : ''}`,
              },
              {
                key: 'inputCompletenessStatus',
                label: 'Input Status',
                render: (val) => (
                  <Badge tone={val === 'Complete' ? 'green' : val === 'In Progress' ? 'amber' : 'slate'}>
                    {val || 'Pending'}
                  </Badge>
                ),
              },
              {
                key: 'readyHeightStatus',
                label: 'Ready Height',
                render: (val) => <Badge tone={val === 'Ready' ? 'green' : 'amber'}>{val || 'Pending'}</Badge>,
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
            idColumnRender={(item, idx) => item.code || `Request ${idx + 1}`}
            onEdit={setEditingItem}
          />
        </Panel>
      )}

      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default ExecutionDrawingRequestPage;
