import { useEffect, useState } from 'react';
import { Calendar, Pencil, AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'installationScheduling';

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

const InstallationSchedulingEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    confirmedInstallationDateTime: item?.confirmedInstallationDateTime || (item?.scheduledDate ? `${item.scheduledDate} ${item.timeSlot || '10:00 AM'}` : ''),
    assignedInstallerTeam: item?.assignedInstallerTeam || item?.assignedTeam || 'Team A (Master Fitters)',
    clientConfirmationStatus: item?.clientConfirmationStatus || item?.customerConfirmation || 'Confirmed by Client',
    finalPaymentStatus: item?.finalPaymentStatus || 'Cleared',
    qcStatus: item?.qcStatus || 'Passed',
    packingStatus: item?.packingStatus || 'Completed',
    siteReadiness: item?.siteReadiness || item?.siteReadinessStatus || 'Ready & Verified',
    challan: item?.challan || '',
    roomWiseScope: item?.roomWiseScope || '',
    installerAvailability: item?.installerAvailability || 'Confirmed Available',
    currentOwner: item?.currentOwner || '',
    status: item?.status || 'Scheduled',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.installationScheduling.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update installation schedule'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Installation Scheduling: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Installation Scheduling Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Confirmed Installation Date & Time">
            <Input value={form.confirmedInstallationDateTime} onChange={(e) => setForm({...form, confirmedInstallationDateTime: e.target.value})} placeholder="e.g. 2026-10-02 at 10:00 AM" />
          </Field>
          <Field label="Assigned Installer / Team">
            <Input value={form.assignedInstallerTeam} onChange={(e) => setForm({...form, assignedInstallerTeam: e.target.value})} placeholder="Team name / Lead fitter" />
          </Field>
          <Field label="Client Confirmation Status">
            <Select value={form.clientConfirmationStatus} onChange={(e) => setForm({...form, clientConfirmationStatus: e.target.value})} options={[
              { value: 'Confirmed by Client', label: 'Confirmed by Client' },
              { value: 'Pending Client Call', label: 'Pending Client Call' },
              { value: 'Rescheduled by Client', label: 'Rescheduled by Client' },
            ]} />
          </Field>
          <Field label="Final Payment Status">
            <Select value={form.finalPaymentStatus} onChange={(e) => setForm({...form, finalPaymentStatus: e.target.value})} options={[
              { value: 'Cleared', label: 'Cleared (Approved)' },
              { value: 'Pending Balance', label: 'Pending Balance' },
              { value: 'On Hold', label: 'On Hold' },
            ]} />
          </Field>
          <Field label="QC Status">
            <Select value={form.qcStatus} onChange={(e) => setForm({...form, qcStatus: e.target.value})} options={[
              { value: 'Passed', label: 'QC Passed' },
              { value: 'Pending', label: 'QC Pending' },
              { value: 'Conditional', label: 'QC Conditional' },
            ]} />
          </Field>
          <Field label="Packing Status">
            <Select value={form.packingStatus} onChange={(e) => setForm({...form, packingStatus: e.target.value})} options={[
              { value: 'Completed', label: 'Packing Completed' },
              { value: 'In Progress', label: 'Packing In Progress' },
              { value: 'Pending', label: 'Packing Pending' },
            ]} />
          </Field>
          <Field label="Site Readiness">
            <Select value={form.siteReadiness} onChange={(e) => setForm({...form, siteReadiness: e.target.value})} options={[
              { value: 'Ready & Verified', label: 'Ready & Verified' },
              { value: 'Tentative / Verification Pending', label: 'Tentative / Verification Pending' },
              { value: 'Delayed by Civil / Paint', label: 'Delayed by Civil / Paint' },
            ]} />
          </Field>
          <Field label="Challan Reference">
            <Input value={form.challan} onChange={(e) => setForm({...form, challan: e.target.value})} placeholder="e.g. DC-2026-088" />
          </Field>
          <Field label="Installer Availability">
            <Select value={form.installerAvailability} onChange={(e) => setForm({...form, installerAvailability: e.target.value})} options={[
              { value: 'Confirmed Available', label: 'Confirmed Available' },
              { value: 'Tentative', label: 'Tentative' },
              { value: 'Overbooked / Substitute Needed', label: 'Overbooked / Substitute Needed' },
            ]} />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Installation Lead / Coordinator" />
          </Field>
          <Field label="Overall Status">
            <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={[
              { value: 'Scheduled', label: 'Scheduled' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
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

        <Field label="Room-Wise Scope">
          <Textarea rows={2} value={form.roomWiseScope} onChange={(e) => setForm({...form, roomWiseScope: e.target.value})} placeholder="Rooms and window scopes to install on this schedule..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Installation Schedule</Button>
        </div>
      </form>
    </Modal>
  );
};

const InstallationSchedulingPage = () => {
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

  const confirmedCount = stageItems.filter(i => i.clientConfirmationStatus?.includes('Confirmed')).length;
  const readyCount = stageItems.filter(i => i.siteReadiness?.includes('Ready')).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Installation Scheduling" subtitle="Coordinate installation dates, installer teams, pre-install gates (payment, QC, packing), and site readiness" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Scheduled" value={stageItems.length} sub="Installation appointments" icon={Calendar} tone="blue" />
        <StatTile label="Client Confirmed" value={confirmedCount} sub="Confirmed appointments" icon={CheckCircle} tone="green" />
        <StatTile label="Site Ready" value={readyCount} sub="Verified ready" icon={Users} tone="amber" />
        <StatTile label="Delayed / At Risk" value={stageItems.filter(i => i.delay === 'Yes').length} sub="Rescheduling needed" icon={AlertTriangle} tone="rose" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={Calendar} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code / Client</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Confirmed Date & Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Installer / Team</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Client Confirmation</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Pre-Install Gates (Pay/QC/Pack)</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Site Readiness</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Challan</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Owner</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Delay</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stageItems.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{item.code || `Schedule ${idx + 1}`}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(item.dueDate)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-brand-600 dark:text-brand-400 whitespace-nowrap">{item.confirmedInstallationDateTime || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.assignedInstallerTeam || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.clientConfirmationStatus?.includes('Confirmed') ? 'green' : 'amber'}>{item.clientConfirmationStatus || 'Pending'}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.finalPaymentStatus === 'Cleared' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>Pay: {item.finalPaymentStatus || 'N/A'}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.qcStatus === 'Passed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>QC: {item.qcStatus || 'N/A'}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.packingStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-600'}`}>Pack: {item.packingStatus || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.siteReadiness?.includes('Ready') ? 'green' : 'amber'}>{item.siteReadiness || 'Pending'}</Badge></td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.challan || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.currentOwner || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.status === 'Completed' ? 'green' : item.status === 'Scheduled' ? 'blue' : 'slate'}>{item.status || 'Pending'}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge tone={item.delay === 'Yes' ? 'rose' : 'green'}>{item.delay === 'Yes' ? 'Delayed' : 'No Delay'}</Badge></td>
                    <td className="px-4 py-3 text-center"><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingItem(item)} title="Edit" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {editingItem && <InstallationSchedulingEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default InstallationSchedulingPage;
