import { useEffect, useState } from 'react';
import { Wrench, Pencil, AlertTriangle, CheckCircle, Clock, Home } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'installation';

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

const InstallationEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    installationDate: formatDateInput(item?.installationDate || item?.createdAt),
    leadInstaller: item?.leadInstaller || '',
    siteSupervisor: item?.siteSupervisor || '',
    roomsCompleted: item?.roomsCompleted || '0',
    totalRooms: item?.totalRooms || '1',
    siteCondition: item?.siteCondition || 'Ready',
    clientSignoffStatus: item?.clientSignoffStatus || 'Pending',
    status: item?.status || 'Scheduled',
    remarks: item?.remarks || '',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.installation.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update installation details'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Installation: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Installation Date">
            <Input type="date" value={form.installationDate} onChange={(e) => setForm({...form, installationDate: e.target.value})} />
          </Field>
          <Field label="Lead Installer">
            <Input value={form.leadInstaller} onChange={(e) => setForm({...form, leadInstaller: e.target.value})} placeholder="Installer name" />
          </Field>
          <Field label="Site Supervisor / DCM">
            <Input value={form.siteSupervisor} onChange={(e) => setForm({...form, siteSupervisor: e.target.value})} placeholder="Supervisor name" />
          </Field>
          <Field label="Installation Status">
            <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={[
              { value: 'Scheduled', label: 'Scheduled' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
              { value: 'On Hold', label: 'On Hold' },
            ]} />
          </Field>
          <Field label="Rooms Completed">
            <Input type="number" min="0" value={form.roomsCompleted} onChange={(e) => setForm({...form, roomsCompleted: e.target.value})} />
          </Field>
          <Field label="Total Rooms / Windows">
            <Input type="number" min="1" value={form.totalRooms} onChange={(e) => setForm({...form, totalRooms: e.target.value})} />
          </Field>
          <Field label="Site Condition">
            <Select value={form.siteCondition} onChange={(e) => setForm({...form, siteCondition: e.target.value})} options={[
              { value: 'Ready', label: 'Clean & Ready' },
              { value: 'Civil Work Active', label: 'Civil Work / Painting Active' },
              { value: 'No Power', label: 'Pending Electrical Points' },
              { value: 'Access Restrict', label: 'Restricted Site Access' },
            ]} />
          </Field>
          <Field label="Client Sign-off">
            <Select value={form.clientSignoffStatus} onChange={(e) => setForm({...form, clientSignoffStatus: e.target.value})} options={[
              { value: 'Pending', label: 'Pending Handover' },
              { value: 'Signed', label: 'Signed Off / Delighted' },
              { value: 'Conditional', label: 'Conditional (Snags Noted)' },
            ]} />
          </Field>
        </div>

        <Field label="Installation Remarks & Site Observations">
          <Textarea rows={3} value={form.remarks} onChange={(e) => setForm({...form, remarks: e.target.value})} placeholder="Channel leveling, motor test on site, client satisfaction..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Installation</Button>
        </div>
      </form>
    </Modal>
  );
};

const InstallationPage = () => {
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
  const inProgressCount = stageItems.filter(i => i.status === 'In Progress').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Installation" subtitle="Track on-site installation, setup, commissioning, and handover" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Projects" value={stageItems.length} sub="Installation sites" icon={Wrench} tone="blue" />
        <StatTile label="Installed & Signed" value={completedCount} sub="Handover complete" icon={CheckCircle} tone="green" />
        <StatTile label="In Progress" value={inProgressCount} sub="Teams on site" icon={Clock} tone="amber" />
        <StatTile label="Scheduled" value={stageItems.filter(i => i.status === 'Scheduled').length} sub="Upcoming visits" icon={Home} tone="orange" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={Wrench} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Installation Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Lead Installer</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Rooms Done</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Client Sign-off</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stageItems.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-medium">{item.code || `Project ${idx + 1}`}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(item.installationDate || item.createdAt)}</td>
                    <td className="px-4 py-3 text-xs">{item.leadInstaller || '—'}</td>
                    <td className="px-4 py-3 text-xs font-semibold">{item.roomsCompleted || 0} / {item.totalRooms || 1}</td>
                    <td className="px-4 py-3"><Badge tone={item.clientSignoffStatus === 'Signed' ? 'green' : item.clientSignoffStatus === 'Conditional' ? 'amber' : 'slate'}>{item.clientSignoffStatus || 'Pending'}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={item.status === 'Completed' ? 'green' : item.status === 'In Progress' ? 'blue' : 'slate'}>{item.status || 'Scheduled'}</Badge></td>
                    <td className="px-4 py-3 text-center"><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingItem(item)} title="Edit" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {editingItem && <InstallationEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default InstallationPage;
