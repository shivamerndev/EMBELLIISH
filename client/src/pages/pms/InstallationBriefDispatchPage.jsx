import { useEffect, useState } from 'react';
import { Send, Pencil, AlertTriangle, CheckCircle, Clock, ClipboardList } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'installationBriefDispatch';

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

const InstallationBriefEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    dispatchDateTime: item?.dispatchDateTime || (item?.dispatchDate ? `${item.dispatchDate} 08:30 AM` : ''),
    materialHandedOverToReceivedByInstaller: item?.materialHandedOverToReceivedByInstaller || item?.dispatchedToInstaller || '',
    installationBriefAcknowledged: item?.installationBriefAcknowledged || 'Acknowledged & Signed',
    packingList: item?.packingList || '',
    challan: item?.challan || '',
    roomScopeList: item?.roomScopeList || '',
    siteDetails: item?.siteDetails || item?.siteAddress || '',
    clientSiteContact: item?.clientSiteContact || '',
    motorWiringInfo: item?.motorWiringInfo || '',
    currentOwner: item?.currentOwner || '',
    status: item?.status || 'In Progress',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.installationBriefDispatch.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update brief & dispatch'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Installation Brief / Dispatch to Site: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Installation Brief / Dispatch Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Dispatch Date & Time">
            <Input value={form.dispatchDateTime} onChange={(e) => setForm({...form, dispatchDateTime: e.target.value})} placeholder="e.g. 2026-10-02 08:30 AM" />
          </Field>
          <Field label="Material Handed Over To / Received By Installer">
            <Input value={form.materialHandedOverToReceivedByInstaller} onChange={(e) => setForm({...form, materialHandedOverToReceivedByInstaller: e.target.value})} placeholder="Installer name / signature" />
          </Field>
          <Field label="Installation Brief Acknowledged">
            <Select value={form.installationBriefAcknowledged} onChange={(e) => setForm({...form, installationBriefAcknowledged: e.target.value})} options={[
              { value: 'Acknowledged & Signed', label: 'Acknowledged & Signed' },
              { value: 'Pending Installer Acknowledgement', label: 'Pending Installer Acknowledgement' },
              { value: 'Questions Raised', label: 'Questions Raised / Reviewing' },
            ]} />
          </Field>
          <Field label="Challan Reference">
            <Input value={form.challan} onChange={(e) => setForm({...form, challan: e.target.value})} placeholder="e.g. DC-2026-088" />
          </Field>
          <Field label="Client / Site Contact">
            <Input value={form.clientSiteContact} onChange={(e) => setForm({...form, clientSiteContact: e.target.value})} placeholder="Client name, phone, site supervisor" />
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
          <Textarea rows={2} value={form.packingList} onChange={(e) => setForm({...form, packingList: e.target.value})} placeholder="Bundles, track crates, hardware packages..." />
        </Field>

        <Field label="Room / Scope List">
          <Textarea rows={2} value={form.roomScopeList} onChange={(e) => setForm({...form, roomScopeList: e.target.value})} placeholder="Room-wise scope of curtains and motorized tracks..." />
        </Field>

        <Field label="Site Details">
          <Textarea rows={2} value={form.siteDetails} onChange={(e) => setForm({...form, siteDetails: e.target.value})} placeholder="Site location, floor, lift access, entry instructions..." />
        </Field>

        <Field label="Motor / Wiring Info">
          <Textarea rows={2} value={form.motorWiringInfo} onChange={(e) => setForm({...form, motorWiringInfo: e.target.value})} placeholder="Motor power sockets, channel pairing, RTS remote channels..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Brief & Dispatch</Button>
        </div>
      </form>
    </Modal>
  );
};

const InstallationBriefDispatchPage = () => {
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
  const acknowledgedCount = stageItems.filter(i => i.installationBriefAcknowledged?.includes('Acknowledged')).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Installation Brief / Dispatch to Site" subtitle="Handover project briefs to site installers, verify material dispatch, and capture acknowledgement" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Briefs" value={stageItems.length} sub="Installation briefs" icon={Send} tone="blue" />
        <StatTile label="Acknowledged" value={acknowledgedCount} sub="Signed by installer" icon={CheckCircle} tone="green" />
        <StatTile label="Dispatched" value={completedCount} sub="Dispatched to site" icon={ClipboardList} tone="amber" />
        <StatTile label="Delayed" value={stageItems.filter(i => i.delay === 'Yes').length} sub="Handover delayed" icon={AlertTriangle} tone="rose" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={Send} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <Table
            items={stageItems}
            columns={[
              { key: 'dueDate', label: 'Due Date', render: (val) => formatDate(val) },
              { key: 'dispatchDateTime', label: 'Dispatch Date & Time', className: 'font-semibold text-slate-800 dark:text-slate-200' },
              {
                key: 'materialHandedOverToReceivedByInstaller',
                label: 'Handed Over To / Received By',
                render: (val, item) => val || item.dispatchedToInstaller || '—',
              },
              {
                key: 'installationBriefAcknowledged',
                label: 'Brief Acknowledged',
                render: (val) => <Badge tone={val?.includes('Acknowledged') ? 'green' : 'amber'}>{val || 'Pending'}</Badge>,
              },
              { key: 'challan', label: 'Challan', className: 'font-mono' },
              { key: 'clientSiteContact', label: 'Client Contact' },
              { key: 'currentOwner', label: 'Owner' },
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
            idColumnRender={(item, idx) => item.code || `Project ${idx + 1}`}
            onEdit={setEditingItem}
            theme="slate"
          />
        </Panel>
      )}

      {editingItem && <InstallationBriefEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default InstallationBriefDispatchPage;
