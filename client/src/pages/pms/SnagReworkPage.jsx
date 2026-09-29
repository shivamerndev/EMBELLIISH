import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

import { useSearchParams } from 'react-router-dom';
import PmsDetailedDrawer from '../../components/pms/PmsDetailedDrawer';

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
    <Modal
      open={Boolean(item)}
      footer={
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" onClick={handleSubmit} loading={pending}>Save Snag Record</Button>
        </div>
      }
      onClose={onClose}
      title={`Snag / Rework: ${item?.snagId || item?.code || 'Record'}`}
      size="2xl"
    >
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

      </form>
    </Modal>
  );
};

const SnagReworkPage = () => {
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
        (i.snagId || '').toLowerCase().includes(search) ||
        (i.issueReport || '').toLowerCase().includes(search) ||
        (i.snagOwner || '').toLowerCase().includes(search)
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
        <Panel className="p-0 overflow-hidden">
          <Table
            items={stageItems}
            idColumnKey="snagId"
            idColumnLabel="Snag ID"
            idColumnRender={(item, idx) => item.snagId || item.code || `SNG-${idx + 1}`}
            onEdit={setEditingItem}
            columns={[
              {
                key: 'dueDate',
                label: 'Due Date',
                render: (val) => formatDate(val),
              },
              {
                key: 'siteItem',
                label: 'Site / Item',
                render: (val) => <span className="max-w-[150px] truncate block">{val || '—'}</span>,
              },
              {
                key: 'issueReport',
                label: 'Issue Report',
                render: (val, item) => (
                  <span className="max-w-xs truncate block" title={val || item.clientComplaint}>
                    {val || item.clientComplaint || '—'}
                  </span>
                ),
              },
              {
                key: 'snagOwner',
                label: 'Snag Owner',
                render: (val) => val || '—',
              },
              {
                key: 'targetClosureDate',
                label: 'Target Closure',
                render: (val) => formatDate(val),
              },
              {
                key: 'snagStatus',
                label: 'Snag Status',
                render: (val, item) => (
                  <Badge
                    tone={
                      val === 'Closed'
                        ? 'green'
                        : val === 'Rectified'
                        ? 'blue'
                        : val === 'In Progress'
                        ? 'amber'
                        : 'rose'
                    }
                  >
                    {val || item.status || 'Open'}
                  </Badge>
                ),
              },
              {
                key: 'currentOwner',
                label: 'Current Owner',
                render: (val) => val || '—',
              },
              {
                key: 'delay',
                label: 'Delay',
                render: (val) => <span className="font-mono text-xs">{val || '0 days'}</span>,
              },
            ]}
            onRowClick={setDrawerItem}
            onView={setDrawerItem}
          />
        </Panel>
      )}

      {editingItem && <SnagReworkEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}

      <PmsDetailedDrawer
        open={Boolean(drawerItem)}
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
        onEdit={(item) => {
          setDrawerItem(null);
          setEditingItem(item);
        }}
        pageName="Snag / Rework"
        currentStageKey={STAGE}
      />
    </div>
  );
};

export default SnagReworkPage;
