import { useEffect, useState } from 'react';
import { Palette, Pencil, AlertTriangle } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState, Button, Modal, Field, Input, Select, Textarea, Badge, StatTile } from '../../components/ui';
import { useAction } from '../../hooks/useAsync';
import usePms from '../../hooks/usePms';
import { pmsApi } from '../../api/pms.api';

const STAGE = 'designFinalisation';

const DesignFinalisationEditModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    dueDate: item?.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : '',
    finalDesignStatus: item?.finalDesignStatus || 'In Progress',
    designVersion: item?.designVersion || 'v1',
    designApprovalDate: item?.designApprovalDate ? new Date(item.designApprovalDate).toISOString().slice(0, 10) : '',
    pendingDesignDecisions: item?.pendingDesignDecisions || '',
    clientBrief: item?.clientBrief || '',
    approvedProposalQuote: item?.approvedProposalQuote || '',
    fabrics: item?.fabrics || '',
    siteDetails: item?.siteDetails || '',
    designReferences: item?.designReferences || '',
    currentOwner: item?.currentOwner || '',
    status: item?.status || 'Pending',
    delay: item?.delay || 'No',
  });
  const [error, setError] = useState('');

  const { execute, pending } = useAction(
    (payload) => pmsApi.designFinalisation.update(item._id || item.id, payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.dueDate) {
      setError('Due Date is required');
      return;
    }
    execute(form);
  };

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={`Design Finalisation: ${item?.code || 'New'}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2 text-xs"><AlertTriangle className="w-4 h-4" /><span>{error}</span></div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Design Finalisation Due Date *">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} required />
          </Field>
          <Field label="Final Design Status">
            <Select value={form.finalDesignStatus} onChange={(e) => setForm({...form, finalDesignStatus: e.target.value})} options={[
              { value: 'Draft', label: 'Draft' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Client Review', label: 'Client Review' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Revision Required', label: 'Revision Required' },
            ]} />
          </Field>
          <Field label="Design Version">
            <Input value={form.designVersion} onChange={(e) => setForm({...form, designVersion: e.target.value})} placeholder="e.g. v1, v2, v3" />
          </Field>
          <Field label="Design Approval Date">
            <Input type="date" value={form.designApprovalDate} onChange={(e) => setForm({...form, designApprovalDate: e.target.value})} />
          </Field>
          <Field label="Approved Proposal / Quote">
            <Input value={form.approvedProposalQuote} onChange={(e) => setForm({...form, approvedProposalQuote: e.target.value})} placeholder="Quote reference" />
          </Field>
          <Field label="Current Owner">
            <Input value={form.currentOwner} onChange={(e) => setForm({...form, currentOwner: e.target.value})} placeholder="Designer/Owner name" />
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

        <Field label="Client Brief">
          <Textarea rows={2} value={form.clientBrief} onChange={(e) => setForm({...form, clientBrief: e.target.value})} placeholder="Client requirements and preferences..." />
        </Field>

        <Field label="Pending Design Decisions">
          <Textarea rows={2} value={form.pendingDesignDecisions} onChange={(e) => setForm({...form, pendingDesignDecisions: e.target.value})} placeholder="List pending decisions..." />
        </Field>

        <Field label="Fabrics">
          <Textarea rows={2} value={form.fabrics} onChange={(e) => setForm({...form, fabrics: e.target.value})} placeholder="Selected fabrics and materials..." />
        </Field>

        <Field label="Design References">
          <Textarea rows={2} value={form.designReferences} onChange={(e) => setForm({...form, designReferences: e.target.value})} placeholder="Reference materials, images, links..." />
        </Field>

        <Field label="Site Details">
          <Textarea rows={2} value={form.siteDetails} onChange={(e) => setForm({...form, siteDetails: e.target.value})} placeholder="Site address and details..." />
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={pending}>Save Design Finalisation</Button>
        </div>
      </form>
    </Modal>
  );
};

const DesignFinalisationPage = () => {
  const { handleFetchStage, pmsState } = usePms();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const stageItems = pmsState?.items?.[STAGE] || [];

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

  const approvedCount = stageItems.filter(i => i.finalDesignStatus === 'Approved').length;
  const completedCount = stageItems.filter(i => i.status === 'Completed').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Design Finalisation" subtitle="Finalize design specifications, approve design variations, and confirm production-ready designs" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Designs" value={stageItems.length} sub="In finalization" icon={Palette} tone="blue" />
        <StatTile label="Approved" value={approvedCount} sub="Design approved" icon={Palette} tone="green" />
        <StatTile label="Completed" value={completedCount} sub="Stage completed" icon={Palette} tone="amber" />
        <StatTile label="In Review" value={stageItems.filter(i => i.finalDesignStatus === 'Client Review').length} sub="Awaiting client feedback" icon={Palette} tone="orange" />
      </div>

      {loading ? (
        <Panel className="p-12 text-center"><Loading text="Loading..." /></Panel>
      ) : error ? (
        <ErrorState error={error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center"><EmptyState icon={Palette} title="No Records Found" hint="Records will appear here." /></Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Design Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Version</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Owner</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stageItems.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-medium">{item.code || `Design ${idx + 1}`}</td>
                    <td className="px-4 py-3 text-xs">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3"><Badge tone={item.finalDesignStatus === 'Approved' ? 'green' : 'slate'}>{item.finalDesignStatus || 'Pending'}</Badge></td>
                    <td className="px-4 py-3 text-xs">{item.designVersion || '—'}</td>
                    <td className="px-4 py-3 text-xs">{item.currentOwner || '—'}</td>
                    <td className="px-4 py-3"><Badge tone={item.status === 'Completed' ? 'green' : 'slate'}>{item.status || 'Pending'}</Badge></td>
                    <td className="px-4 py-3 text-center"><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingItem(item)} title="Edit" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {editingItem && <DesignFinalisationEditModal item={editingItem} onClose={() => setEditingItem(null)} onDone={handleLoad} />}
    </div>
  );
};

export default DesignFinalisationPage;
