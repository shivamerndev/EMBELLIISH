import { useEffect, useState } from 'react';
import { Activity,AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import Table from '../../components/table/Table';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

import { useSearchParams } from 'react-router-dom';
import PmsDetailedDrawer from '../../components/pms/PmsDetailedDrawer';

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
    snag: item?.snag || 'No',
    snagNote: item?.snagNote || '',
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
    <Modal
      open={Boolean(item)}
      footer={
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" onClick={handleSubmit} loading={pending}>Save Daily Update</Button>
        </div>
      }
      onClose={onClose}
      title={`Installation Execution / Daily Update: ${item?.code || 'New'}`}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-amber-500/10 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/50 rounded-lg">
          <Field label="Snag / Rework">
            <Select
              value={form.snag}
              onChange={(e) => setForm({...form, snag: e.target.value})}
              options={[
                { value: 'No', label: 'No' },
                { value: 'Yes', label: 'Yes (Send to Snag / Rework)' },
              ]}
            />
          </Field>

          <Field label="Add note about snag / rework">
            <Input
              value={form.snagNote}
              onChange={(e) => setForm({...form, snagNote: e.target.value})}
              placeholder={form.snag === 'Yes' ? 'Specify issue details for rework punchlist...' : 'Add note about snag / rework'}
            />
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

      </form>
    </Modal>
  );
};

const InstallationExecutionUpdatesPage = () => {
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
        (i.siteIssueBlocker || '').toLowerCase().includes(search) ||
        (i.siteReadiness || '').toLowerCase().includes(search) ||
        (i.snagNote || '').toLowerCase().includes(search) ||
        (i.snag || '').toLowerCase().includes(search)
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

  const completedCount = stageItems.filter(i => i.status === 'Completed').length;
  const snagCount = stageItems.filter(i => i.snag === 'Yes').length;
  const blockedCount = stageItems.filter(i => i.status === 'Blocked' || (i.siteIssueBlocker && i.siteIssueBlocker !== 'None')).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Installation Execution / Daily Updates" subtitle="Daily installation logs, on-site issue tracking, photo proof, and tool/material readiness" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Daily Logs" value={stageItems.length} sub="Active site jobs" icon={Activity} tone="blue" />
        <StatTile label="Completed Handover" value={completedCount} sub="100% Installed" icon={CheckCircle} tone="green" />
        <StatTile label="Snags Reported" value={snagCount} sub="Sent to Snag / Rework" icon={AlertCircle} tone={snagCount > 0 ? "rose" : "slate"} />
        <StatTile label="Issues / Blocked" value={blockedCount} sub="Site issues reported" icon={AlertTriangle} tone="amber" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={Activity} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <Table
            items={stageItems}
            noHorizontalScroll={true}
            columns={[
              {
                key: 'dueDate',
                label: 'Installation Due Date',
                render: (val) => formatDate(val),
              },
              {
                key: 'siteIssueBlocker',
                label: 'Site Issue / Status',
                render: (val, item) => (
                  <div>
                    {val && val !== 'None' ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold block truncate max-w-[180px]">{val}</span>
                    ) : item.snag === 'Yes' ? (
                      <span className="text-rose-500 font-medium block truncate max-w-[180px]">Snag Reported</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Smooth Execution</span>
                    )}
                  </div>
                ),
              },
              {
                key: 'currentOwner',
                label: 'Owner',
                render: (val, item) => val || item.installerName || '—',
              },
              {
                key: 'status',
                label: 'Status',
                render: (val) => (
                  <Badge tone={val === 'Completed' ? 'green' : val === 'In Progress' ? 'blue' : 'rose'}>
                    {val || 'Pending'}
                  </Badge>
                ),
              },
            ]}
            idColumnKey="code"
            idColumnLabel="Code / Client"
            idColumnRender={(item, idx) => (
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-100 block truncate">{item.code || `IEU-${idx + 1}`}</span>
                {item.clientName && <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{item.clientName}</span>}
              </div>
            )}
            onRowClick={setDrawerItem}
            onView={setDrawerItem}
            onEdit={setEditingItem}
          />
        </Panel>
      )}

      {editingItem && <InstallationExecutionEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}

      <PmsDetailedDrawer
        open={Boolean(drawerItem)}
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
        onEdit={(item) => {
          setDrawerItem(null);
          setEditingItem(item);
        }}
        pageName="Installation Execution Updates"
        currentStageKey={STAGE}
      />
    </div>
  );
};

export default InstallationExecutionUpdatesPage;
