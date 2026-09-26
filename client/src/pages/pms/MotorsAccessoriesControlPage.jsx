import { useEffect, useState } from 'react';
import { Zap, Pencil, AlertTriangle, CheckCircle, Clock, Settings2 } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'motorsAccessoriesControl';

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

const MotorsAccessoriesEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    requirement: item?.requirement || '',
    expectedReadinessDate: formatDateInput(item?.expectedReadinessDate),
    motorType: item?.motorType || '',
    automationWiringDetails: item?.automationWiringDetails || '',
    siteRoomRequirement: item?.siteRoomRequirement || '',
    vendorOrder: item?.vendorOrder || '',
    accessoriesList: item?.accessoriesList || '',
    currentOwner: item?.currentOwner || '',
    status: item?.status || 'In Progress',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.motorsAccessoriesControl.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update motor/accessories control'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Motors & Accessories: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Motors / Accessories Control Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Expected Readiness Date">
            <Input type="date" value={form.expectedReadinessDate} onChange={(e) => setForm({...form, expectedReadinessDate: e.target.value})} />
          </Field>
          <Field label="Motor Type">
            <Input value={form.motorType} onChange={(e) => setForm({...form, motorType: e.target.value})} placeholder="e.g. Somfy Glydea Ultra 60 RTS (AC 230V)" />
          </Field>
          <Field label="Vendor Order Reference">
            <Input value={form.vendorOrder} onChange={(e) => setForm({...form, vendorOrder: e.target.value})} placeholder="e.g. PO-SOMFY-2026-081" />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Technician / Automation Lead" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Bench Testing Passed', label: 'Bench Testing Passed' },
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

        <Field label="Requirement">
          <Textarea rows={2} value={form.requirement} onChange={(e) => setForm({...form, requirement: e.target.value})} placeholder="Summary of motor and accessory requirements..." />
        </Field>

        <Field label="Automation / Wiring Details">
          <Textarea rows={2} value={form.automationWiringDetails} onChange={(e) => setForm({...form, automationWiringDetails: e.target.value})} placeholder="Power drop location, AC/DC, channel relays, smart home bridge..." />
        </Field>

        <Field label="Site / Room Requirement">
          <Textarea rows={2} value={form.siteRoomRequirement} onChange={(e) => setForm({...form, siteRoomRequirement: e.target.value})} placeholder="Room-specific track lengths, motor side placement..." />
        </Field>

        <Field label="Accessories List">
          <Textarea rows={2} value={form.accessoriesList} onChange={(e) => setForm({...form, accessoriesList: e.target.value})} placeholder="Remotes, wall switches, ceiling brackets, heavy duty carriers..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Motor & Accessories</Button>
        </div>
      </form>
    </Modal>
  );
};

const MotorsAccessoriesControlPage = () => {
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

  const completedCount = stageItems.filter(i => i.status === 'Completed' || i.status === 'Bench Testing Passed').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Motors / Accessories Control" subtitle="Track motor orders, wiring specifications, automation readiness, and accessory kits" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Systems" value={stageItems.length} sub="Motor setups" icon={Zap} tone="blue" />
        <StatTile label="Readiness Complete" value={completedCount} sub="Tested & verified" icon={CheckCircle} tone="green" />
        <StatTile label="In Testing / Prep" value={stageItems.filter(i => i.status === 'In Progress').length} sub="Bench testing" icon={Clock} tone="amber" />
        <StatTile label="Delayed" value={stageItems.filter(i => i.delay === 'Yes').length} sub="Supply/wiring delay" icon={AlertTriangle} tone="rose" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={Zap} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code / Client</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Motor Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Requirement</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Expected Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Automation / Wiring</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Vendor Order</th>
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
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{item.motorType || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.requirement}>{item.requirement || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(item.expectedReadinessDate)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.automationWiringDetails}>{item.automationWiringDetails || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.vendorOrder || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.currentOwner || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.status === 'Completed' || item.status === 'Bench Testing Passed' ? 'green' : item.status === 'In Progress' ? 'blue' : 'slate'}>{item.status || 'Pending'}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.delay === 'Yes' ? 'rose' : 'green'}>{item.delay === 'Yes' ? 'Delayed' : 'No Delay'}</Badge></td>
                    <td className="px-4 py-3 text-center"><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingItem(item)} title="Edit" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {editingItem && <MotorsAccessoriesEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default MotorsAccessoriesControlPage;
