import { useEffect, useState } from 'react';
import { AlertCircle, Pencil, AlertTriangle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'snagRework';

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

const SnagReworkEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    snagId: item?.snagId || item?.code || '',
    snagOwner: item?.snagOwner || '',
    targetClosureDate: formatDateInput(item?.targetClosureDate),
    snagStatus: item?.snagStatus || 'Open',
    issueReport: item?.issueReport || '',
    closureDate: formatDateInput(item?.closureDate),
    closureProof: item?.closureProof || '',
    siteItem: item?.siteItem || '',
    photosVideo: item?.photosVideo || '',
    clientComplaint: item?.clientComplaint || '',
    returnedMaterial: item?.returnedMaterial || '',
    requiredCorrection: item?.requiredCorrection || '',
    currentOwner: item?.currentOwner || '',
    status: item?.status || 'Open',
    delay: item?.delay || '0 days',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.snagRework.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update snag item'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Snag / Rework: ${item?.snagId || item?.code || 'Record'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Snag / Rework Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Snag ID">
            <Input value={form.snagId} onChange={(e) => setForm({...form, snagId: e.target.value})} placeholder="e.g. SNG-2026-001" />
          </Field>
          <Field label="Snag Owner">
            <Input value={form.snagOwner} onChange={(e) => setForm({...form, snagOwner: e.target.value})} placeholder="Snag owner name" />
          </Field>
          <Field label="Target Closure Date">
            <Input type="date" value={form.targetClosureDate} onChange={(e) => setForm({...form, targetClosureDate: e.target.value})} />
          </Field>
          <Field label="Snag Status">
            <Select value={form.snagStatus} onChange={(e) => setForm({...form, snagStatus: e.target.value})} options={[
              { value: 'Open', label: 'Open' },
              { value: 'In Progress', label: 'In Progress / Assigned' },
              { value: 'Rectified', label: 'Rectified (Pending Inspection)' },
              { value: 'Closed', label: 'Closed / Signed Off' },
            ]} />
          </Field>
          <Field label="Closure Date">
            <Input type="date" value={form.closureDate} onChange={(e) => setForm({...form, closureDate: e.target.value})} />
          </Field>
          <Field label="Site / Item">
            <Input value={form.siteItem} onChange={(e) => setForm({...form, siteItem: e.target.value})} placeholder="e.g. Master Bedroom - Bay Window #2 Sheer" />
          </Field>
          <Field label="Photos / Video Proof">
            <Input value={form.photosVideo} onChange={(e) => setForm({...form, photosVideo: e.target.value})} placeholder="Links or file descriptions" />
          </Field>
          <Field label="Closure Proof">
            <Input value={form.closureProof} onChange={(e) => setForm({...form, closureProof: e.target.value})} placeholder="Signed punch list, closure photo" />
          </Field>
          <Field label="Returned Material">
            <Input value={form.returnedMaterial} onChange={(e) => setForm({...form, returnedMaterial: e.target.value})} placeholder="e.g. Damaged fabric roll or None" />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Current handling owner" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={[
              { value: 'Open', label: 'Open' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Pending Client Inspection', label: 'Pending Client Inspection' },
              { value: 'Closed', label: 'Closed' },
            ]} />
          </Field>
          <Field label="Delay">
            <Input value={form.delay} onChange={(e) => setForm({...form, delay: e.target.value})} placeholder="e.g. 0 days" />
          </Field>
        </div>

        <Field label="Issue Report">
          <Textarea rows={2} value={form.issueReport} onChange={(e) => setForm({...form, issueReport: e.target.value})} placeholder="Detailed issue description..." />
        </Field>

        <Field label="Client Complaint">
          <Textarea rows={2} value={form.clientComplaint} onChange={(e) => setForm({...form, clientComplaint: e.target.value})} placeholder="Exact client observation or complaint..." />
        </Field>

        <Field label="Required Correction">
          <Textarea rows={2} value={form.requiredCorrection} onChange={(e) => setForm({...form, requiredCorrection: e.target.value})} placeholder="Steps taken or instructions for rectification..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Snag Record</Button>
        </div>
      </form>
    </Modal>
  );
};

const SnagReworkPage = () => {
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

  const closedCount = stageItems.filter(i => i.snagStatus === 'Closed' || i.status === 'Closed').length;
  const inProgressCount = stageItems.filter(i => i.snagStatus === 'In Progress' || i.status === 'In Progress').length;
  const openCount = stageItems.filter(i => i.snagStatus === 'Open' || i.status === 'Open').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Snag / Rework" subtitle="Approved Snag tracking, rectifications, closure proofs, and rework status" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Snags Logged" value={stageItems.length} sub="All snag reports" icon={AlertCircle} tone="blue" />
        <StatTile label="Closed / Resolved" value={closedCount} sub="Verified & closed" icon={CheckCircle} tone="green" />
        <StatTile label="In Progress" value={inProgressCount} sub="Under rectification" icon={Clock} tone="amber" />
        <StatTile label="Open / Unassigned" value={openCount} sub="Needs action" icon={AlertTriangle} tone="rose" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={AlertCircle} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Snag ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Site / Item</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Issue Report</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Snag Owner</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Target Closure</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Snag Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Current Owner</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Delay</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stageItems.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{item.snagId || item.code || `SNG-${idx + 1}`}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(item.dueDate)}</td>
                    <td className="px-4 py-3 text-xs max-w-[150px] truncate">{item.siteItem || '—'}</td>
                    <td className="px-4 py-3 text-xs max-w-xs truncate" title={item.issueReport}>{item.issueReport || item.clientComplaint || '—'}</td>
                    <td className="px-4 py-3 text-xs">{item.snagOwner || '—'}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(item.targetClosureDate)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={item.snagStatus === 'Closed' ? 'green' : item.snagStatus === 'Rectified' ? 'blue' : item.snagStatus === 'In Progress' ? 'amber' : 'rose'}>
                        {item.snagStatus || item.status || 'Open'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">{item.currentOwner || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono">{item.delay || '0 days'}</td>
                    <td className="px-4 py-3 text-center">
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingItem(item)} title="Edit" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {editingItem && <SnagReworkEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default SnagReworkPage;
