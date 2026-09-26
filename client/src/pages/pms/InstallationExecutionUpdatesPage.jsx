import { useEffect, useState } from 'react';
import { Activity, Pencil, AlertTriangle, CheckCircle, Clock, TrendingUp, Camera } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'installationExecutionUpdates';

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

const InstallationExecutionEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    installationStartDate: formatDateInput(item?.installationStartDate || item?.reportDate),
    siteIssueBlocker: item?.siteIssueBlocker || item?.blockersReported || 'None',
    installationPhotosProof: item?.installationPhotosProof || '',
    installationBrief: item?.installationBrief || '',
    siteReadiness: item?.siteReadiness || 'Ready & Active',
    material: item?.material || 'All draperies and motors intact',
    tools: item?.tools || 'Laser level, drills, Somfy setting tool',
    siteAccess: item?.siteAccess || 'Full access verified',
    currentOwner: item?.currentOwner || item?.installerName || '',
    status: item?.status || 'In Progress',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.installationExecutionUpdates.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update daily execution update'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Installation Execution / Daily Update: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Installation Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Installation Start Date">
            <Input type="date" value={form.installationStartDate} onChange={(e) => setForm({...form, installationStartDate: e.target.value})} />
          </Field>
          <Field label="Site Issue / Blocker">
            <Input value={form.siteIssueBlocker} onChange={(e) => setForm({...form, siteIssueBlocker: e.target.value})} placeholder="e.g. None, Power Cut, False ceiling cavity issue..." />
          </Field>
          <Field label="Site Readiness">
            <Select value={form.siteReadiness} onChange={(e) => setForm({...form, siteReadiness: e.target.value})} options={[
              { value: 'Ready & Active', label: 'Ready & Active (Power on)' },
              { value: 'Partial Readiness', label: 'Partial Readiness' },
              { value: 'Blocked by Paint/Civil', label: 'Blocked by Paint/Civil' },
            ]} />
          </Field>
          <Field label="Site Access">
            <Input value={form.siteAccess} onChange={(e) => setForm({...form, siteAccess: e.target.value})} placeholder="e.g. Elevator operational, service pass approved" />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Reporting Installer / Site Supervisor" />
          </Field>
          <Field label="Execution Status">
            <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={[
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Blocked', label: 'Blocked' },
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

        <Field label="Installation Photos / Proof">
          <Input value={form.installationPhotosProof} onChange={(e) => setForm({...form, installationPhotosProof: e.target.value})} placeholder="Photo/Video links, cloud folder URL, or verification note..." />
        </Field>

        <Field label="Installation Brief Compliance">
          <Textarea rows={2} value={form.installationBrief} onChange={(e) => setForm({...form, installationBrief: e.target.value})} placeholder="Brief instructions followed, track positioning, remote pairing..." />
        </Field>

        <Field label="Material Check">
          <Textarea rows={2} value={form.material} onChange={(e) => setForm({...form, material: e.target.value})} placeholder="Condition of fabrics, tracks, motors upon site arrival..." />
        </Field>

        <Field label="Tools & Equipment Used">
          <Textarea rows={2} value={form.tools} onChange={(e) => setForm({...form, tools: e.target.value})} placeholder="Laser levels, specialized drills, scaffolding, power adapters..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Daily Update</Button>
        </div>
      </form>
    </Modal>
  );
};

const InstallationExecutionUpdatesPage = () => {
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
  const blockedCount = stageItems.filter(i => i.status === 'Blocked' || (i.siteIssueBlocker && i.siteIssueBlocker !== 'None')).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Installation Execution / Daily Updates" subtitle="Daily installation logs, on-site issue tracking, photo proof, and tool/material readiness" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Daily Logs" value={stageItems.length} sub="Active site jobs" icon={Activity} tone="blue" />
        <StatTile label="Completed Handover" value={completedCount} sub="100% Installed" icon={CheckCircle} tone="green" />
        <StatTile label="Issues / Blocked" value={blockedCount} sub="Site issues reported" icon={AlertTriangle} tone="rose" />
        <StatTile label="In Progress" value={stageItems.filter(i => i.status === 'In Progress').length} sub="Ongoing fitting" icon={Clock} tone="amber" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={Activity} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code / Client</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Installation Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Start Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Site Issue / Blocker</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Photos / Proof</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Readiness & Access</th>
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
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(item.installationStartDate || item.reportDate)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {item.siteIssueBlocker && item.siteIssueBlocker !== 'None' ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">{item.siteIssueBlocker}</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">None (Smooth)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.installationPhotosProof}>
                      {item.installationPhotosProof || 'Photos verified on drive'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.siteReadiness || 'Ready'} ({item.siteAccess || 'Full Access'})</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.currentOwner || item.installerName || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.status === 'Completed' ? 'green' : item.status === 'In Progress' ? 'blue' : 'rose'}>{item.status || 'Pending'}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.delay === 'Yes' ? 'rose' : 'green'}>{item.delay === 'Yes' ? 'Delayed' : 'No Delay'}</Badge></td>
                    <td className="px-4 py-3 text-center"><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingItem(item)} title="Edit" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {editingItem && <InstallationExecutionEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default InstallationExecutionUpdatesPage;
