import { useEffect, useState } from 'react';
import { Hammer, Pencil, AlertTriangle, CheckCircle, Clock, ShieldCheck } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'maintenance';

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

const MaintenanceEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    ticketId: item?.ticketId || item?.code || '',
    requestDate: formatDateInput(item?.requestDate || item?.createdAt),
    warrantyStatus: item?.warrantyStatus || 'Under 5-Year Somfy Warranty',
    owner: item?.owner || '',
    targetResolutionDate: formatDateInput(item?.targetResolutionDate),
    status: item?.status || 'Open',
    closureDate: formatDateInput(item?.closureDate),
    clientComplaint: item?.clientComplaint || '',
    siteDetails: item?.siteDetails || '',
    issuePhotos: item?.issuePhotos || '',
    warrantyMaintenanceContext: item?.warrantyMaintenanceContext || '',
    priorInstallationRecord: item?.priorInstallationRecord || '',
    currentOwner: item?.currentOwner || '',
    delay: item?.delay || '0 days',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.maintenance.update(item._id || item.id, payload),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update maintenance request'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Maintenance Service: ${item?.ticketId || item?.code || 'Ticket'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Maintenance Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Ticket ID">
            <Input value={form.ticketId} onChange={(e) => setForm({...form, ticketId: e.target.value})} placeholder="e.g. MNT-2026-001" />
          </Field>
          <Field label="Request Date">
            <Input type="date" value={form.requestDate} onChange={(e) => setForm({...form, requestDate: e.target.value})} />
          </Field>
          <Field label="Target Resolution Date">
            <Input type="date" value={form.targetResolutionDate} onChange={(e) => setForm({...form, targetResolutionDate: e.target.value})} />
          </Field>
          <Field label="Warranty Status">
            <Select value={form.warrantyStatus} onChange={(e) => setForm({...form, warrantyStatus: e.target.value})} options={[
              { value: 'Under 5-Year Somfy Warranty', label: 'Under 5-Year Somfy Warranty' },
              { value: 'Under 1-Year Fabric Warranty', label: 'Under 1-Year Fabric Warranty' },
              { value: 'AMC Active', label: 'AMC Active' },
              { value: 'Chargeable / Expired', label: 'Chargeable / Out of Warranty' },
            ]} />
          </Field>
          <Field label="Owner">
            <Input value={form.owner} onChange={(e) => setForm({...form, owner: e.target.value})} placeholder="Case owner / PM" />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Current handling tech/supervisor" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={[
              { value: 'Open', label: 'Open' },
              { value: 'In Progress', label: 'In Progress / Assigned' },
              { value: 'Pending Parts', label: 'Pending Parts' },
              { value: 'Resolved', label: 'Resolved' },
              { value: 'Closed', label: 'Closed' },
            ]} />
          </Field>
          <Field label="Closure Date">
            <Input type="date" value={form.closureDate} onChange={(e) => setForm({...form, closureDate: e.target.value})} />
          </Field>
          <Field label="Delay">
            <Input value={form.delay} onChange={(e) => setForm({...form, delay: e.target.value})} placeholder="e.g. 0 days" />
          </Field>
        </div>

        <Field label="Site Details">
          <Input value={form.siteDetails} onChange={(e) => setForm({...form, siteDetails: e.target.value})} placeholder="e.g. Living Room Formal, Ceiling Pelmet Bay 1" />
        </Field>

        <Field label="Client Complaint">
          <Textarea rows={2} value={form.clientComplaint} onChange={(e) => setForm({...form, clientComplaint: e.target.value})} placeholder="Reported issue / complaint from client..." />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Issue Photos / Media">
            <Input value={form.issuePhotos} onChange={(e) => setForm({...form, issuePhotos: e.target.value})} placeholder="e.g. motor_receiver_blink.jpg, remote_screen.jpg" />
          </Field>
          <Field label="Prior Installation Record">
            <Input value={form.priorInstallationRecord} onChange={(e) => setForm({...form, priorInstallationRecord: e.target.value})} placeholder="e.g. Installed under PRJ-401 on 2026-03-26" />
          </Field>
        </div>

        <Field label="Warranty / Maintenance Context">
          <Textarea rows={2} value={form.warrantyMaintenanceContext} onChange={(e) => setForm({...form, warrantyMaintenanceContext: e.target.value})} placeholder="Motor batch info, wiring type, original invoice reference..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Maintenance Ticket</Button>
        </div>
      </form>
    </Modal>
  );
};

const MaintenancePage = () => {
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

  const closedCount = stageItems.filter(i => i.status === 'Closed' || i.status === 'Resolved').length;
  const warrantyCount = stageItems.filter(i => (i.warrantyStatus || '').toLowerCase().includes('warranty') || (i.warrantyStatus || '').toLowerCase().includes('amc')).length;
  const inProgressCount = stageItems.filter(i => i.status === 'In Progress').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Maintenance" subtitle="Track warranty tickets, site details, motor context, and service closure" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Tickets" value={stageItems.length} sub="All maintenance tickets" icon={Hammer} tone="blue" />
        <StatTile label="Resolved / Closed" value={closedCount} sub="Serviced & verified" icon={CheckCircle} tone="green" />
        <StatTile label="Under Warranty / AMC" value={warrantyCount} sub="Active coverage" icon={ShieldCheck} tone="amber" />
        <StatTile label="In Progress" value={inProgressCount} sub="Technician visiting" icon={Clock} tone="orange" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={Hammer} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <Table
            items={stageItems}
            columns={[
              { key: 'dueDate', label: 'Due Date', render: (val) => formatDate(val) },
              { key: 'requestDate', label: 'Request Date', render: (val) => formatDate(val) },
              {
                key: 'siteDetails',
                label: 'Site Details',
                render: (val) => (
                  <span className="text-xs max-w-[140px] truncate block" title={val}>
                    {val || '—'}
                  </span>
                ),
              },
              {
                key: 'clientComplaint',
                label: 'Client Complaint',
                render: (val) => (
                  <span className="text-xs max-w-xs truncate block" title={val}>
                    {val || '—'}
                  </span>
                ),
              },
              {
                key: 'warrantyStatus',
                label: 'Warranty Status',
                render: (val) => (
                  <Badge tone={val?.includes('Warranty') || val?.includes('AMC') ? 'green' : 'slate'}>
                    {val || 'Standard'}
                  </Badge>
                ),
              },
              { key: 'owner', label: 'Owner' },
              { key: 'currentOwner', label: 'Current Owner' },
              {
                key: 'status',
                label: 'Status',
                render: (val) => (
                  <Badge tone={val === 'Closed' ? 'green' : val === 'Resolved' ? 'blue' : val === 'In Progress' ? 'amber' : 'rose'}>
                    {val || 'Open'}
                  </Badge>
                ),
              },
              { key: 'delay', label: 'Delay', className: 'font-mono text-xs', render: (val) => val || '0 days' },
            ]}
            idColumnKey="ticketId"
            idColumnLabel="Ticket ID"
            idColumnRender={(item, idx) => item.ticketId || item.code || `MNT-${idx + 1}`}
            onEdit={setEditingItem}
          />
        </Panel>
      )}

      {editingItem && <MaintenanceEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default MaintenancePage;
