import { useEffect, useState } from 'react';
import { Truck, Pencil, AlertTriangle, CheckCircle, Clock, Boxes, Calendar } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'packingDispatchReadiness';

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

const PackingDispatchEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    packingStatus: item?.packingStatus || 'Completed',
    dispatchReadinessStatus: item?.dispatchReadinessStatus || item?.dispatchReadiness || 'Ready for Dispatch',
    targetDispatchDate: formatDateInput(item?.targetDispatchDate),
    installationDate: formatDateInput(item?.installationDate),
    packingList: item?.packingList || '',
    accessories: item?.accessories || '',
    challan: item?.challan || '',
    roomWiseScope: item?.roomWiseScope || '',
    currentOwner: item?.currentOwner || '',
    status: item?.status || 'In Progress',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.packingDispatchReadiness.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update packing/dispatch readiness'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Packing & Dispatch: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Packing / Dispatch Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Packing Status">
            <Select value={form.packingStatus} onChange={(e) => setForm({...form, packingStatus: e.target.value})} options={[
              { value: 'Pending', label: 'Pending Packaging' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Packing Completed' },
            ]} />
          </Field>
          <Field label="Dispatch Readiness Status">
            <Select value={form.dispatchReadinessStatus} onChange={(e) => setForm({...form, dispatchReadinessStatus: e.target.value})} options={[
              { value: 'Pending QC', label: 'Pending QC' },
              { value: 'Ready for Dispatch', label: 'Ready for Dispatch' },
              { value: 'Hold (Payment)', label: 'Hold (Payment)' },
              { value: 'Hold (Site Delay)', label: 'Hold (Site Delay)' },
              { value: 'Dispatched', label: 'Dispatched' },
            ]} />
          </Field>
          <Field label="Target Dispatch Date">
            <Input type="date" value={form.targetDispatchDate} onChange={(e) => setForm({...form, targetDispatchDate: e.target.value})} />
          </Field>
          <Field label="Installation Date">
            <Input type="date" value={form.installationDate} onChange={(e) => setForm({...form, installationDate: e.target.value})} />
          </Field>
          <Field label="Delivery Challan Reference">
            <Input value={form.challan} onChange={(e) => setForm({...form, challan: e.target.value})} placeholder="e.g. DC-2026-088" />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Owner / Dispatch Coordinator" />
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

        <Field label="Packing List">
          <Textarea rows={2} value={form.packingList} onChange={(e) => setForm({...form, packingList: e.target.value})} placeholder="Box count, packaging type, room barcodes..." />
        </Field>

        <Field label="Accessories">
          <Textarea rows={2} value={form.accessories} onChange={(e) => setForm({...form, accessories: e.target.value})} placeholder="Motors, remotes, brackets, screws packed..." />
        </Field>

        <Field label="Room-Wise Scope">
          <Textarea rows={2} value={form.roomWiseScope} onChange={(e) => setForm({...form, roomWiseScope: e.target.value})} placeholder="Breakdown of packages per room..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Packing Status</Button>
        </div>
      </form>
    </Modal>
  );
};

const PackingDispatchReadinessPage = () => {
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

  const readyCount = stageItems.filter(i => i.dispatchReadinessStatus === 'Ready for Dispatch' || i.dispatchReadiness === 'Ready').length;
  const dispatchedCount = stageItems.filter(i => i.dispatchReadinessStatus === 'Dispatched' || i.status === 'Completed').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Packing / Dispatch Readiness" subtitle="Manage protective packaging, room-wise scope kits, dispatch readiness, and delivery challans" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Shipments" value={stageItems.length} sub="Packaging lots" icon={Boxes} tone="blue" />
        <StatTile label="Ready for Dispatch" value={readyCount} sub="Packaging & QC ready" icon={CheckCircle} tone="green" />
        <StatTile label="Dispatched to Site" value={dispatchedCount} sub="Handed to transport" icon={Truck} tone="amber" />
        <StatTile label="Delayed / On Hold" value={stageItems.filter(i => i.delay === 'Yes' || i.dispatchReadinessStatus?.startsWith('Hold')).length} sub="Awaiting clearance" icon={AlertTriangle} tone="rose" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={Boxes} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code / Client</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Packing Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Dispatch Readiness</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Target Dispatch</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Installation Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Challan</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Room Scope</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Owner</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Delay</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stageItems.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{item.code || `Project ${idx + 1}`}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(item.dueDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.packingStatus === 'Completed' ? 'green' : 'amber'}>{item.packingStatus || 'Pending'}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.dispatchReadinessStatus === 'Ready for Dispatch' || item.dispatchReadiness === 'Ready' ? 'green' : item.dispatchReadinessStatus?.startsWith('Hold') ? 'rose' : 'blue'}>{item.dispatchReadinessStatus || item.dispatchReadiness || 'Pending'}</Badge></td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(item.targetDispatchDate)}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(item.installationDate)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.challan || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.roomWiseScope}>{item.roomWiseScope || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.currentOwner || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.status === 'Completed' ? 'green' : item.status === 'In Progress' ? 'blue' : 'slate'}>{item.status || 'Pending'}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.delay === 'Yes' ? 'rose' : 'green'}>{item.delay === 'Yes' ? 'Delayed' : 'No Delay'}</Badge></td>
                    <td className="px-4 py-3 text-center"><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingItem(item)} title="Edit" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {editingItem && <PackingDispatchEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default PackingDispatchReadinessPage;
