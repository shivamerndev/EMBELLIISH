import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Clock, Eye, Pencil, ArrowRight } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

import { useSearchParams, useNavigate } from 'react-router-dom';
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
    issueReport: item?.issueReport || item?.snagNote || '',
    closureDate: formatDateInput(item?.closureDate),
    closureProof: item?.closureProof || '',
    siteItem: item?.siteItem || item?.siteDetails || '',
    photosVideo: item?.photosVideo || '',
    clientComplaint: item?.clientComplaint || item?.snagNote || '',
    returnedMaterial: item?.returnedMaterial || '',
    requiredCorrection: item?.requiredCorrection || '',
    currentOwner: item?.currentOwner || '',
    status: item?.status || 'Open',
    delay: item?.delay || '0 days',
  });
  const [error, setError] = useState('');

  const isCompletedSnag = ['completed', 'closed', 'resolved'].includes(
    String(form.snagStatus || '').toLowerCase()
  );

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
    const payload = {
      ...form,
      status: isCompletedSnag ? 'Completed' : form.status,
      closureDate: isCompletedSnag && !form.closureDate ? new Date().toISOString().slice(0, 10) : form.closureDate,
    };
    execute(payload);
  };

  return (
    <Modal
      open={Boolean(item)}
      footer={
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            onClick={handleSubmit}
            loading={pending}
            className={isCompletedSnag ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs' : ''}
          >
            {isCompletedSnag ? 'Save & Move to Project Closure' : 'Save Snag Record'}
          </Button>
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

        {isCompletedSnag && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center gap-2 text-xs">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              Snag status is <strong>Completed</strong>. Saving this record will automatically move this lead into <strong>Project Closure</strong>.
            </span>
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
            <Select
              value={form.snagStatus}
              onChange={(e) => {
                const val = e.target.value;
                const isDone = ['completed', 'closed', 'resolved'].includes(val.toLowerCase());
                setForm((prev) => ({
                  ...prev,
                  snagStatus: val,
                  status: isDone ? 'Completed' : prev.status === 'Completed' ? 'Open' : prev.status,
                  closureDate: isDone && !prev.closureDate ? new Date().toISOString().slice(0, 10) : prev.closureDate,
                }));
              }}
              options={[
                { value: 'Open', label: 'Open' },
                { value: 'In Progress', label: 'In Progress / Assigned' },
                { value: 'Rectified', label: 'Rectified (Pending Inspection)' },
                { value: 'Completed', label: 'Completed (Move into Project Closure)' },
                { value: 'Closed', label: 'Closed / Signed Off' },
              ]}
            />
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
          <Field label="Stage Status">
            <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={[
              { value: 'Open', label: 'Open' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Pending Client Inspection', label: 'Pending Client Inspection' },
              { value: 'Completed', label: 'Completed' },
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const search = (searchParams.get('search') || '').toLowerCase().trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [drawerItem, setDrawerItem] = useState(null);
  const [quickCompletingId, setQuickCompletingId] = useState(null);

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

  const handleQuickComplete = async (item) => {
    const id = item._id || item.id;
    if (!id || quickCompletingId) return;
    setQuickCompletingId(id);
    try {
      await pmsApi.snagRework.update(id, {
        snagStatus: 'Completed',
        status: 'Completed',
        closureDate: new Date().toISOString().slice(0, 10),
      });
      await handleLoad();
    } catch (err) {
      setError(err?.message || 'Failed to complete snag');
    } finally {
      setQuickCompletingId(null);
    }
  };

  useEffect(() => {
    handleLoad();
  }, []);

  const closedCount = stageItems.filter(i =>
    ['closed', 'completed', 'resolved'].includes(String(i.snagStatus || i.status || '').toLowerCase())
  ).length;
  const inProgressCount = stageItems.filter(i => i.snagStatus === 'In Progress' || i.status === 'In Progress').length;
  const openCount = stageItems.filter(i =>
    !['closed', 'completed', 'resolved', 'in progress'].includes(String(i.snagStatus || i.status || '').toLowerCase())
  ).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Snag / Rework" subtitle="Approved Snag tracking, rectifications, closure proofs, and rework status" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Snags Logged" value={stageItems.length} sub="All snag reports" icon={AlertCircle} tone="blue" />
        <StatTile label="Completed / Closed" value={closedCount} sub="Moved to Project Closure" icon={CheckCircle} tone="green" />
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
            idColumnRender={(item, idx) => (
              <div>
                <span className="font-semibold text-brand-600 dark:text-brand-400">{item.snagId || item.code || `SNG-${idx + 1}`}</span>
                {item.code && <span className="block text-[10px] text-slate-400 font-normal">{item.code}</span>}
              </div>
            )}
            onEdit={setEditingItem}
            renderActions={(item) => {
              const isCompleted = ['closed', 'completed', 'resolved'].includes(
                String(item.snagStatus || item.status || '').toLowerCase()
              );
              const projectCode = item.code || item.lead?.code || item.clientName || '';
              return (
                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Eye}
                    title="View Details"
                    onClick={() => setDrawerItem(item)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Pencil}
                    title="Edit Record"
                    onClick={() => setEditingItem(item)}
                  />
                  {isCompleted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={ArrowRight}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 text-[11px] px-2 py-0.5 font-medium"
                      title="Lead moved to Project Closure. Click to open Project Closure."
                      onClick={() => navigate(`/pms/project-closure?search=${encodeURIComponent(projectCode)}`)}
                    >
                      Closure →
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={CheckCircle}
                      className="text-slate-600 hover:text-emerald-700 hover:border-emerald-400 text-[11px] px-2 py-0.5"
                      title="Quick Mark Completed & Move into Project Closure"
                      loading={quickCompletingId === (item._id || item.id)}
                      onClick={() => handleQuickComplete(item)}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              );
            }}
            columns={[
              {
                key: 'clientName',
                label: 'Lead / Client',
                render: (val, item) => (
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{val || item.lead?.clientName || '—'}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.siteDetails || item.lead?.phone || '—'}</div>
                  </div>
                ),
              },
              {
                key: 'dueDate',
                label: 'Due Date',
                render: (val) => formatDate(val),
              },
              {
                key: 'siteItem',
                label: 'Site / Item',
                render: (val, item) => <span className="max-w-[150px] truncate block">{val || item.siteDetails || '—'}</span>,
              },
              {
                key: 'issueReport',
                label: 'Issue / Snag Note',
                render: (val, item) => (
                  <span className="max-w-xs truncate block font-medium text-rose-600 dark:text-rose-400" title={val || item.clientComplaint || item.snagNote}>
                    {val || item.clientComplaint || item.snagNote || '—'}
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
                render: (val, item) => {
                  const isDone = ['closed', 'completed', 'resolved'].includes(String(val || '').toLowerCase());
                  return (
                    <div>
                      <Badge
                        tone={
                          isDone
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
                      {isDone && (
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                          In Project Closure
                        </span>
                      )}
                    </div>
                  );
                },
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
