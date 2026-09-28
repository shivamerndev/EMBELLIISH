import { useEffect, useState } from 'react';
import { Calendar, Pencil, AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

import { useSearchParams } from 'react-router-dom';
import PmsDetailedDrawer from '../../components/pms/PmsDetailedDrawer';

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
        (i.assignedInstallerTeam || '').toLowerCase().includes(search) ||
        (i.confirmedInstallationDateTime || '').toLowerCase().includes(search)
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
          <Table
            items={stageItems}
            columns={[
              { key: 'dueDate', label: 'Due Date', render: (val) => formatDate(val) },
              { key: 'confirmedInstallationDateTime', label: 'Confirmed Date & Time', className: 'font-semibold text-brand-600 dark:text-brand-400' },
              { key: 'assignedInstallerTeam', label: 'Installer / Team' },
              {
                key: 'clientConfirmationStatus',
                label: 'Client Confirmation',
                render: (val) => <Badge tone={val?.includes('Confirmed') ? 'green' : 'amber'}>{val || 'Pending'}</Badge>,
              },
              {
                key: 'gates',
                label: 'Pre-Install Gates (Pay/QC/Pack)',
                render: (_, item) => (
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.finalPaymentStatus === 'Cleared' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>Pay: {item.finalPaymentStatus || 'N/A'}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.qcStatus === 'Passed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>QC: {item.qcStatus || 'N/A'}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.packingStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-600'}`}>Pack: {item.packingStatus || 'N/A'}</span>
                  </div>
                ),
              },
              {
                key: 'siteReadiness',
                label: 'Site Readiness',
                render: (val) => <Badge tone={val?.includes('Ready') ? 'green' : 'amber'}>{val || 'Pending'}</Badge>,
              },
              { key: 'challan', label: 'Challan', className: 'font-mono' },
              { key: 'currentOwner', label: 'Owner' },
              {
                key: 'status',
                label: 'Status',
                render: (val) => (
                  <Badge tone={val === 'Completed' ? 'green' : val === 'Scheduled' ? 'blue' : 'slate'}>
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
            idColumnRender={(item, idx) => item.code || `Schedule ${idx + 1}`}
            onRowClick={setDrawerItem}
            onView={setDrawerItem}
            onEdit={setEditingItem}
          />
        </Panel>
      )}

      {editingItem && <InstallationSchedulingEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}

      <PmsDetailedDrawer
        open={Boolean(drawerItem)}
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
        onEdit={(item) => {
          setDrawerItem(null);
          setEditingItem(item);
        }}
        pageName="Installation Scheduling"
        currentStageKey={STAGE}
      />
    </div>
  );
};

export default InstallationSchedulingPage;
