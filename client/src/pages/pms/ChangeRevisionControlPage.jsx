import { useEffect, useState } from 'react';
import { GitBranch, Pencil, AlertTriangle, CheckCircle, CheckSquare, Clock } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'changeRevisionControl';

const ChangeRevisionEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    changeRequested: item?.changeRequested || '',
    changeDetails: item?.changeDetails || '',
    costImpact: item?.costImpact || '',
    timelineImpact: item?.timelineImpact || '',
    approvalStatus: item?.approvalStatus || 'Pending',
    revisedVersion: item?.revisedVersion || 'v1',
    status: item?.status || 'Pending',
    currentOwner: item?.currentOwner || '',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.changeRevisionControl.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update revision control'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Change / Revision Control: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Change Requested">
            <Input value={form.changeRequested} onChange={(e) => setForm({...form, changeRequested: e.target.value})} placeholder="Type of change" />
          </Field>
          <Field label="Revised Version">
            <Input value={form.revisedVersion} onChange={(e) => setForm({...form, revisedVersion: e.target.value})} placeholder="e.g. v2, v3" />
          </Field>
          <Field label="Approval Status">
            <Select value={form.approvalStatus} onChange={(e) => setForm({...form, approvalStatus: e.target.value})} options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'In Review', label: 'In Review' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Rejected', label: 'Rejected' },
              { value: 'On Hold', label: 'On Hold' },
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
              { value: 'Cancelled', label: 'Cancelled' },
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

        <Field label="Change Details">
          <Textarea rows={3} value={form.changeDetails} onChange={(e) => setForm({...form, changeDetails: e.target.value})} placeholder="Detailed description of the change..." />
        </Field>

        <Field label="Cost Impact">
          <Textarea rows={2} value={form.costImpact} onChange={(e) => setForm({...form, costImpact: e.target.value})} placeholder="Cost analysis and impact..." />
        </Field>

        <Field label="Timeline Impact">
          <Textarea rows={2} value={form.timelineImpact} onChange={(e) => setForm({...form, timelineImpact: e.target.value})} placeholder="Schedule impact and delays..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Change</Button>
        </div>
      </form>
    </Modal>
  );
};

const ChangeRevisionControlPage = () => {
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

  const approvedCount = stageItems.filter(i => i.approvalStatus === 'Approved').length;
  const completedCount = stageItems.filter(i => i.status === 'Completed').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Change / Revision Control" subtitle="Track design changes, revisions, and version control" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Changes" value={stageItems.length} sub="Change requests" icon={GitBranch} tone="blue" />
        <StatTile label="Approved" value={approvedCount} sub="Approved changes" icon={CheckCircle} tone="green" />
        <StatTile label="Completed" value={completedCount} sub="Implemented changes" icon={CheckSquare} tone="amber" />
        <StatTile label="In Review" value={stageItems.filter(i => i.approvalStatus === 'In Review').length} sub="Being reviewed" icon={Clock} tone="orange" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={GitBranch} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <Table
            items={stageItems}
            columns={[
              { key: 'changeRequested', label: 'Change Requested', className: 'font-semibold text-slate-800 dark:text-slate-200' },
              {
                key: 'changeDetails',
                label: 'Change Details',
                render: (val) => (
                  <span className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate block" title={val}>
                    {val || '—'}
                  </span>
                ),
              },
              { key: 'costImpact', label: 'Cost Impact' },
              { key: 'timelineImpact', label: 'Timeline Impact' },
              {
                key: 'approvalStatus',
                label: 'Approval Status',
                render: (val) => (
                  <Badge tone={val === 'Approved' ? 'green' : val === 'Rejected' ? 'rose' : 'slate'}>
                    {val || 'Pending'}
                  </Badge>
                ),
              },
              { key: 'revisedVersion', label: 'Revised Version', className: 'font-mono' },
              { key: 'currentOwner', label: 'Current Owner' },
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
            idColumnRender={(item, idx) => item.code || `Change ${idx + 1}`}
            onEdit={setEditingItem}
            theme="slate"
          />
        </Panel>
      )}

      {editingItem && <ChangeRevisionEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default ChangeRevisionControlPage;
