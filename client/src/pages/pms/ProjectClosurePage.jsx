import { useEffect, useState } from 'react';
import { CheckSquare, Pencil, AlertTriangle, CheckCircle, Clock, Award, ShieldCheck, Lock } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'projectClosure';

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

const checkClosureGate = (item) => {
  const installDone = item?.installationCompletion === 'Completed' || item?.installationCompletion === 'Complete';
  const signOffDone = item?.clientSignOff === 'Signed' || item?.clientSignOff === 'Approved';
  const snagsDone = item?.snagStatus === 'Closed' || item?.snagStatus === 'Resolved';
  const paymentDone = item?.paymentClosure === 'Closed' || item?.paymentClosure === 'Cleared' || item?.paymentClosure === 'Settled';
  return installDone && signOffDone && snagsDone && paymentDone;
};

const ProjectClosureEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: formatDateInput(item?.dueDate),
    projectClosureDate: formatDateInput(item?.projectClosureDate || item?.createdAt),
    approvedBy: item?.approvedBy || '',
    installationCompletion: item?.installationCompletion || 'Completed',
    clientSignOff: item?.clientSignOff || 'Signed',
    snagStatus: item?.snagStatus || 'Closed',
    paymentClosure: item?.paymentClosure || 'Closed',
    challans: item?.challans || '',
    finalPhotos: item?.finalPhotos || '',
    currentOwner: item?.currentOwner || '',
    status: item?.status || 'Closed',
    delay: item?.delay || '0 days',
  });
  const [error, setError] = useState('');

  const isGatePassed = checkClosureGate(form);

  const { execute, pending } = useAction(
    (payload) => pmsApi.projectClosure.update(item._id || item.id, { ...payload, closureGatePassed: isGatePassed }),
    {
      onSuccess: () => { onDone(); onClose(); },
      onError: (err) => setError(err?.message || 'Failed to update project closure'),
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Project Closure: ${item?.code || 'Record'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Update failed'}</span>
          </div>
        )}

        {/* Closure Gate Indicator */}
        <div className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
          isGatePassed 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
        }`}>
          <div className="flex items-center gap-2 font-semibold">
            {isGatePassed ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>Closure Gate Status: {isGatePassed ? 'PASSED (Eligible for Closure)' : 'LOCKED (Prerequisites Pending)'}</span>
          </div>
          <span className="text-[11px] opacity-80">Requires: Install Complete + Sign-off + Snags Closed + Payment Closed</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Project Closure Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
          </Field>
          <Field label="Project Closure Date">
            <Input type="date" value={form.projectClosureDate} onChange={(e) => setForm({...form, projectClosureDate: e.target.value})} />
          </Field>
          <Field label="Approved By">
            <Input value={form.approvedBy} onChange={(e) => setForm({...form, approvedBy: e.target.value})} placeholder="e.g. Rajesh Singhania (VP Projects)" />
          </Field>
          <Field label="Installation Completion">
            <Select value={form.installationCompletion} onChange={(e) => setForm({...form, installationCompletion: e.target.value})} options={[
              { value: 'Completed', label: 'Completed (All windows handed over)' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Pending', label: 'Pending' },
            ]} />
          </Field>
          <Field label="Client Sign-Off">
            <Select value={form.clientSignOff} onChange={(e) => setForm({...form, clientSignOff: e.target.value})} options={[
              { value: 'Signed', label: 'Signed (Physical/Digital sign-off received)' },
              { value: 'Pending Signature', label: 'Pending Signature' },
              { value: 'Not Started', label: 'Not Started' },
            ]} />
          </Field>
          <Field label="Snag Status">
            <Select value={form.snagStatus} onChange={(e) => setForm({...form, snagStatus: e.target.value})} options={[
              { value: 'Closed', label: 'Closed (All punch list items rectified)' },
              { value: 'Open Snags', label: 'Open Snags Pending' },
              { value: 'No Snags Reported', label: 'No Snags Reported' },
            ]} />
          </Field>
          <Field label="Payment Closure">
            <Select value={form.paymentClosure} onChange={(e) => setForm({...form, paymentClosure: e.target.value})} options={[
              { value: 'Closed', label: 'Closed (100% Invoiced & Received)' },
              { value: 'Pending Balance', label: 'Pending Balance Collection' },
              { value: 'Retention Amount Held', label: 'Retention Amount Held' },
            ]} />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Current handling owner" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={[
              { value: 'Closed', label: 'Closed & Archived' },
              { value: 'Pending Sign-off', label: 'Pending Sign-off' },
              { value: 'Pending Payments', label: 'Pending Payments' },
              { value: 'In Review', label: 'In Review' },
            ]} />
          </Field>
          <Field label="Delay">
            <Input value={form.delay} onChange={(e) => setForm({...form, delay: e.target.value})} placeholder="e.g. 0 days" />
          </Field>
        </div>

        <Field label="Challans (Delivery & Site Challans)">
          <Input value={form.challans} onChange={(e) => setForm({...form, challans: e.target.value})} placeholder="e.g. Verified (DC-2026-089 signed copy archived)" />
        </Field>

        <Field label="Final Photos Archive">
          <Input value={form.finalPhotos} onChange={(e) => setForm({...form, finalPhotos: e.target.value})} placeholder="e.g. Archived (8 high-res completion photos in drive)" />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Project Closure</Button>
        </div>
      </form>
    </Modal>
  );
};

const ProjectClosurePage = () => {
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

  const closedCount = stageItems.filter(i => i.status === 'Closed').length;
  const gatePassedCount = stageItems.filter(i => checkClosureGate(i)).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Project Closure" subtitle="Formal closure audit, auto-updating 4-factor closure gate, sign-offs, and final archives" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Projects" value={stageItems.length} sub="Closure pipeline" icon={CheckSquare} tone="blue" />
        <StatTile label="Closure Gate Passed" value={gatePassedCount} sub="All 4 conditions met" icon={ShieldCheck} tone="green" />
        <StatTile label="Officially Closed" value={closedCount} sub="Signed & archived" icon={CheckCircle} tone="emerald" />
        <StatTile label="Gate Blocked" value={stageItems.length - gatePassedCount} sub="Pending install/snag/payment" icon={Clock} tone="amber" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={typeof error === 'string' ? { message: error } : error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={CheckSquare} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code / Project</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Closure Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Closure Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Approved By</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Installation</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Client Sign-Off</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Snags</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Payment</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Closure Gate</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Current Owner</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stageItems.map((item, idx) => {
                  const gatePassed = checkClosureGate(item);
                  return (
                    <tr key={item.id || item._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{item.code || item.project || `PC-${idx + 1}`}</td>
                      <td className="px-4 py-3 text-xs">{formatDate(item.dueDate)}</td>
                      <td className="px-4 py-3 text-xs">{formatDate(item.projectClosureDate || item.closureDate || item.createdAt)}</td>
                      <td className="px-4 py-3 text-xs">{item.approvedBy || '—'}</td>
                      <td className="px-4 py-3 text-xs">
                        <Badge tone={item.installationCompletion === 'Completed' ? 'green' : 'amber'}>
                          {item.installationCompletion || 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <Badge tone={item.clientSignOff === 'Signed' ? 'green' : 'amber'}>
                          {item.clientSignOff || 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <Badge tone={item.snagStatus === 'Closed' ? 'green' : 'rose'}>
                          {item.snagStatus || 'Open'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <Badge tone={item.paymentClosure === 'Closed' ? 'green' : 'amber'}>
                          {item.paymentClosure || 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <Badge tone={gatePassed ? 'emerald' : 'orange'}>
                          {gatePassed ? 'Gate Passed' : 'Gate Locked'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">{item.currentOwner || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge tone={item.status === 'Closed' ? 'green' : 'blue'}>{item.status || 'In Review'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingItem(item)} title="Edit" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {editingItem && <ProjectClosureEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default ProjectClosurePage;
