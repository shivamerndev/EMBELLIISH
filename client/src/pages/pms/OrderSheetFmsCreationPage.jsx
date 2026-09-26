import { useEffect, useState } from 'react';
import { ShoppingCart, Pencil, AlertTriangle, CheckCircle, Clock, FileSpreadsheet, ArrowRight, Sparkles } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'orderSheetFmsCreation';

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

const OrderSheetFmsEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    orderSheetFmsNo: item?.orderSheetFmsNo || item?.orderSheetNumber || item?.fmsNumber || '',
    versionCreatedBy: item?.versionCreatedBy || '',
    creationDate: formatDateInput(item?.creationDate || item?.createdAt),
    productionReleaseStatusDate: item?.productionReleaseStatusDate || '',
    approvedOrder: item?.approvedOrder || 'Approved',
    roomDetails: item?.roomDetails || '',
    design: item?.design || '',
    fabric: item?.fabric || item?.fabricDetails || '',
    motorAccessoryNeeds: item?.motorAccessoryNeeds || item?.motorDetails || '',
    stageDates: item?.stageDates || '',
    currentOwner: item?.currentOwner || '',
    status: item?.status || 'In Production',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.orderSheetFmsCreation.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update order sheet / FMS'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Order Sheet / FMS: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
          <span><strong>Auto-flow Forward:</strong> Fabric and motor specifications flow forward automatically from design/proposals into room details.</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Order Sheet / FMS Creation Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Order Sheet / FMS No">
            <Input value={form.orderSheetFmsNo} onChange={(e) => setForm({...form, orderSheetFmsNo: e.target.value})} placeholder="e.g. OS/FMS-2026-088" />
          </Field>
          <Field label="Version, Created By">
            <Input value={form.versionCreatedBy} onChange={(e) => setForm({...form, versionCreatedBy: e.target.value})} placeholder="e.g. v2.0, Vikram Mehta" />
          </Field>
          <Field label="Creation Date">
            <Input type="date" value={form.creationDate} onChange={(e) => setForm({...form, creationDate: e.target.value})} />
          </Field>
          <Field label="Production Release Status / Date">
            <Input value={form.productionReleaseStatusDate} onChange={(e) => setForm({...form, productionReleaseStatusDate: e.target.value})} placeholder="e.g. Released on 2026-09-26" />
          </Field>
          <Field label="Approved Order">
            <Input value={form.approvedOrder} onChange={(e) => setForm({...form, approvedOrder: e.target.value})} placeholder="Approved order status / reference" />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Owner name" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={[
              { value: 'Draft', label: 'Draft' },
              { value: 'In Review', label: 'In Review' },
              { value: 'Approved', label: 'Approved' },
              { value: 'In Production', label: 'In Production' },
              { value: 'Completed', label: 'Completed' },
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

        <Field label="Room Details (Fabric & Motor Data Flow Forward)">
          <Textarea rows={2} value={form.roomDetails} onChange={(e) => setForm({...form, roomDetails: e.target.value})} placeholder="Room-wise scope, e.g. Living Room Sheer Wave, Master Bed Blackout..." />
        </Field>

        <Field label="Design">
          <Input value={form.design} onChange={(e) => setForm({...form, design: e.target.value})} placeholder="Design specification (e.g. Ripplefold 120% Fullness)" />
        </Field>

        <Field label="Fabric (Auto-flows forward)">
          <Textarea rows={2} value={form.fabric} onChange={(e) => setForm({...form, fabric: e.target.value})} placeholder="Fabric codes, quantities, and lining specs..." />
        </Field>

        <Field label="Motor / Accessory Needs (Auto-flows forward)">
          <Textarea rows={2} value={form.motorAccessoryNeeds} onChange={(e) => setForm({...form, motorAccessoryNeeds: e.target.value})} placeholder="Motor models, tracks, brackets, remotes..." />
        </Field>

        <Field label="Stage Dates">
          <Input value={form.stageDates} onChange={(e) => setForm({...form, stageDates: e.target.value})} placeholder="e.g. Cut: 2026-09-27 | Stitch: 2026-09-29 | QC: 2026-09-30" />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Order Sheet / FMS</Button>
        </div>
      </form>
    </Modal>
  );
};

const OrderSheetFmsCreationPage = () => {
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

  const inProductionCount = stageItems.filter(i => i.status === 'In Production').length;
  const approvedCount = stageItems.filter(i => i.status === 'Approved' || i.approvedOrder === 'Approved').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Order Sheet / FMS Creation" subtitle="Generate production order sheets, fabric/motor sync, FMS tracking, and stage scheduling" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Order Sheets" value={stageItems.length} sub="Order sheets / FMS" icon={FileSpreadsheet} tone="blue" />
        <StatTile label="In Production" value={inProductionCount} sub="Actively manufacturing" icon={ShoppingCart} tone="green" />
        <StatTile label="Approved" value={approvedCount} sub="Ready for release" icon={CheckCircle} tone="amber" />
        <StatTile label="Pending Release" value={stageItems.filter(i => i.status === 'Draft' || i.status === 'In Review').length} sub="Draft or review" icon={Clock} tone="orange" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={ShoppingCart} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code / Client</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Order Sheet / FMS No</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Version & Creator</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Creation Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Production Release</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Design & Fabric</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Motor / Needs</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Stage Dates</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Owner</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Delay</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stageItems.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{item.code || `Order ${idx + 1}`}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(item.dueDate || item.createdAt)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-brand-600 dark:text-brand-400 font-semibold whitespace-nowrap">{item.orderSheetFmsNo || item.orderSheetNumber || item.fmsNumber || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.versionCreatedBy || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(item.creationDate || item.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.productionReleaseStatusDate || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={`Design: ${item.design || '—'} | Fabric: ${item.fabric || item.fabricDetails || '—'}`}>
                      {item.design ? `${item.design}: ` : ''}{item.fabric || item.fabricDetails || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.motorAccessoryNeeds || item.motorDetails}>
                      {item.motorAccessoryNeeds || item.motorDetails || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.stageDates || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.currentOwner || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.status === 'Completed' || item.status === 'In Production' ? 'green' : item.status === 'Approved' ? 'blue' : 'slate'}>{item.status || 'Draft'}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.delay === 'Yes' ? 'rose' : 'green'}>{item.delay === 'Yes' ? 'Delayed' : 'No Delay'}</Badge></td>
                    <td className="px-4 py-3 text-center"><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingItem(item)} title="Edit" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {editingItem && <OrderSheetFmsEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default OrderSheetFmsCreationPage;
