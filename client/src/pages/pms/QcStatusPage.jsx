import { useEffect, useState } from 'react';
import { ClipboardCheck, AlertTriangle, CheckCircle, Clock, ShieldCheck } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

import { useSearchParams } from 'react-router-dom';
import PmsDetailedDrawer from '../../components/pms/PmsDetailedDrawer';

const STAGE = 'qcStatus';

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

const QcStatusEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    qcDoneDate: formatDateInput(item?.qcDoneDate || item?.inspectionDate),
    qcDoneBy: item?.qcDoneBy || item?.inspectorName || '',
    qcStatus: item?.qcStatus || item?.qcApprovalStatus || 'Passed',
    currentOwner: item?.currentOwner || '',
    delay: item?.delay || 'No',
    status: item?.status || 'In Progress',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.qcStatus.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update Production / QC status'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal
      open={Boolean(item)}
      footer={
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" onClick={handleSubmit} loading={pending}>Save Production / QC</Button>
        </div>
      }
      onClose={onClose}
      title={`Production / QC Status: ${item?.code || 'New'}`}
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
          <Field label="Production / QC Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Production / QC Done Date">
            <Input type="date" value={form.qcDoneDate} onChange={(e) => setForm({...form, qcDoneDate: e.target.value})} />
          </Field>
          <Field label="Production / QC Done By">
            <Input value={form.qcDoneBy} onChange={(e) => setForm({...form, qcDoneBy: e.target.value})} placeholder="QC Inspector / Done by name" />
          </Field>
          <Field label="Production / QC Status">
            <Select value={form.qcStatus} onChange={(e) => setForm({...form, qcStatus: e.target.value})} options={[
              { value: 'Pending', label: 'Pending Inspection' },
              { value: 'In Progress', label: 'QC In Progress' },
              { value: 'Passed', label: 'Passed / Zero Defect' },
              { value: 'Minor Rework Needed', label: 'Minor Rework Needed' },
              { value: 'Failed', label: 'Failed' },
            ]} />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Owner / QC Lead" />
          </Field>
          <Field label="Overall Stage Status">
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

      </form>
    </Modal>
  );
};

const QcStatusPage = () => {
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
        (i.qcDoneBy || '').toLowerCase().includes(search) ||
        (i.qcStatus || '').toLowerCase().includes(search)
      )
    : rawStageItems;

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

  const passedCount = stageItems.filter(i => i.qcStatus === 'Passed' || i.qcApprovalStatus === 'Passed').length;
  const reworkCount = stageItems.filter(i => i.qcStatus === 'Minor Rework Needed' || i.qcStatus === 'Failed').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Production / QC Status" subtitle="Factory quality control, laser dimensions inspection, defect verification, and production sign-off" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Items" value={stageItems.length} sub="QC pipeline" icon={ClipboardCheck} tone="blue" />
        <StatTile label="QC Passed" value={passedCount} sub="Passed inspection" icon={CheckCircle} tone="green" />
        <StatTile label="Rework Required" value={reworkCount} sub="Failed / Rework" icon={AlertTriangle} tone="rose" />
        <StatTile label="In Progress" value={stageItems.filter(i => i.qcStatus === 'In Progress' || i.status === 'In Progress').length} sub="Under inspection" icon={Clock} tone="amber" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={ClipboardCheck} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel className="p-0 overflow-hidden">
          <Table
            items={stageItems}
            noHorizontalScroll={true}
            idColumnKey="code"
            idColumnLabel="Code / Client"
            idColumnRender={(item, idx) => (
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-100 block truncate">{item.code || `QC-${idx + 1}`}</span>
                {item.clientName && <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{item.clientName}</span>}
              </div>
            )}
            onEdit={setEditingItem}
            columns={[
              {
                key: 'dueDate',
                label: 'QC Due Date',
                render: (val) => formatDate(val),
              },
              {
                key: 'qcStatus',
                label: 'QC Status',
                render: (val, item) => (
                  <div>
                    <Badge tone={val === 'Passed' ? 'green' : val === 'Failed' ? 'rose' : 'amber'}>
                      {val || 'Passed'}
                    </Badge>
                    {item.qcDoneBy && (
                      <span className="block text-[10px] text-slate-400 mt-0.5 truncate">By: {item.qcDoneBy}</span>
                    )}
                  </div>
                ),
              },
              {
                key: 'currentOwner',
                label: 'Current Owner',
                render: (val) => val || '—',
              },
              {
                key: 'status',
                label: 'Stage Status',
                render: (val) => (
                  <Badge tone={val === 'Completed' ? 'green' : val === 'In Progress' ? 'blue' : 'slate'}>
                    {val || 'Pending'}
                  </Badge>
                ),
              },
            ]}
            onRowClick={setDrawerItem}
            onView={setDrawerItem}
          />
        </Panel>
      )}

      {editingItem && <QcStatusEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}

      <PmsDetailedDrawer
        open={Boolean(drawerItem)}
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
        onEdit={(item) => {
          setDrawerItem(null);
          setEditingItem(item);
        }}
        pageName="Production / QC Status"
        currentStageKey={STAGE}
      />
    </div>
  );
};

export default QcStatusPage;
