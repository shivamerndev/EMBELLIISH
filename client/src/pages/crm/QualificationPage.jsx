import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Users, UserCheck, PhoneCall, Pencil, ArrowRightCircle } from 'lucide-react';
import { leadsApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import {
  PageHeader, Panel, Button, Modal, Field, Input, Select,
  Textarea, Loading, ErrorState, Tabs,
} from '../../components/ui';

const QUALIFICATION_TABS = [
  { key: 'ALL', label: 'All Leads' },
  { key: 'PENDING', label: 'Pending Decision' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

/* ------------------------------------------------------------- Badges */

const TriStateBadge = ({ value }) => {
  const styles = {
    YES: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-600 dark:text-emerald-100',
    NO: 'bg-red-700 text-white dark:bg-red-800 dark:text-white',
    PENDING: 'bg-amber-200 text-amber-900 dark:bg-amber-600 dark:text-amber-100',
    NOT_KNOWN: 'bg-sky-200 text-sky-900 dark:bg-sky-700 dark:text-sky-100',
  };
  const labelMap = { YES: 'Yes', NO: 'No', PENDING: 'Pending', NOT_KNOWN: 'Not Known' };
  const key = value || 'PENDING';
  return (
    <span className={`inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-md shadow-sm ${styles[key] || styles.PENDING}`}>
      {labelMap[key] || key}
    </span>
  );
};

const DecisionBadge = ({ value }) => {
  const styles = {
    APPROVED: 'bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300',
    REJECTED: 'bg-rose-600 text-white dark:bg-rose-700',
    PENDING: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-300',
  };
  const key = value || 'PENDING';
  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-md border shadow-sm ${styles[key] || styles.PENDING}`}>
      {key.charAt(0) + key.slice(1).toLowerCase()}
    </span>
  );
};

import { getLocalDate, getLocalDateTime } from '../../utils/format';

/* ------------------------------------------------------------- Qualification Form Modal */

const EditQualificationModal = ({ item, onClose, onDone }) => {
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    qualificationDueDate: item?.qualificationDueDate ? new Date(item.qualificationDueDate).toISOString().slice(0, 10) : getLocalDate(),
    requirementVerified: item?.requirementVerified || 'PENDING',
    budgetPricingVerified: item?.budgetPricingVerified || 'PENDING',
    timelineConfirmed: item?.timelineConfirmed || 'PENDING',
    decisionMakerIdentified: item?.decisionMakerIdentified || 'PENDING',
    siteVisitRequired: item?.siteVisitRequired === false ? 'NO' : 'YES',
    competitionDetailsCaptured: item?.competitionDetailsCaptured || 'NOT_KNOWN',
    qualificationDecision: item?.qualificationDecision || 'PENDING',
    decisionDateTime: item?.decisionDateTime ? new Date(item.decisionDateTime).toISOString().slice(0, 16) : getLocalDateTime(),
    rejectionHoldReason: item?.rejectionHoldReason || '',
  });

  const { execute, pending, error } = useAction(
    (payload) => leadsApi.update(item.id || item._id, payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const isReasonRequired = form.qualificationDecision === 'REJECTED' || form.qualificationDecision === 'NOT DECIDED';

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFormError('');

    if (isReasonRequired && !form.rejectionHoldReason?.trim()) {
      setFormError('Rejection / Hold reason is required when qualification decision is Rejected or Not Decided.');
      return;
    }

    const payload = {
      ...form,
      siteVisitRequired: form.siteVisitRequired === 'YES',
      decisionDateTime: form.decisionDateTime || (form.qualificationDecision !== 'PENDING' ? new Date().toISOString() : undefined),
    };

    if (form.qualificationDecision === 'APPROVED') {
      payload.status = 'QUALIFIED';
    } else if (form.qualificationDecision === 'REJECTED') {
      payload.status = 'UNQUALIFIED';
      payload.lostReason = form.rejectionHoldReason;
    }

    execute(payload);
  };

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title={`Qualify Lead — ${item?.code || ''}`}
      subtitle={`Verify requirement, budget, and timeline for ${item?.clientName || ''}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={pending}>Save Qualification</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4 pr-1">
        {(error?.message || formError) && (
          <p className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error?.message || formError}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Qualification Due Date">
            <Input type="date" value={form.qualificationDueDate} onChange={set('qualificationDueDate')} />
          </Field>
          <Field label="Requirement Verified">
            <Select
              value={form.requirementVerified}
              onChange={set('requirementVerified')}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'YES', label: 'Yes' },
                { value: 'NO', label: 'No' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Budget / Pricing Verified">
            <Select
              value={form.budgetPricingVerified}
              onChange={set('budgetPricingVerified')}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'YES', label: 'Yes' },
                { value: 'NO', label: 'No' },
              ]}
            />
          </Field>
          <Field label="Timeline Confirmed">
            <Select
              value={form.timelineConfirmed}
              onChange={set('timelineConfirmed')}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'YES', label: 'Yes' },
                { value: 'NO', label: 'No' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Decision Maker Identified">
            <Select
              value={form.decisionMakerIdentified}
              onChange={set('decisionMakerIdentified')}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'YES', label: 'Yes' },
                { value: 'NO', label: 'No' },
                { value: 'NOT_KNOWN', label: 'Not Known' },
              ]}
            />
          </Field>
          <Field label="Site Visit Required">
            <Select
              value={form.siteVisitRequired}
              onChange={set('siteVisitRequired')}
              options={[
                { value: 'YES', label: 'Yes' },
                { value: 'NO', label: 'No' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Competition Details Captured">
            <Select
              value={form.competitionDetailsCaptured}
              onChange={set('competitionDetailsCaptured')}
              options={[
                { value: 'NOT_KNOWN', label: 'Not Known' },
                { value: 'YES', label: 'Yes' },
                { value: 'NO', label: 'No' },
              ]}
            />
          </Field>
          <Field label="Qualification Decision">
            <Select
              value={form.qualificationDecision}
              onChange={set('qualificationDecision')}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'NOT DECIDED', label: 'Not Decided' },
              ]}
            />
          </Field>
        </div>

        <Field label="Decision Date & Time">
          <Input type="datetime-local" value={form.decisionDateTime} onChange={set('decisionDateTime')} />
        </Field>

        <Field label="Rejection / Hold Reason" required={isReasonRequired}>
          <Textarea
            value={form.rejectionHoldReason}
            onChange={set('rejectionHoldReason')}
            placeholder={isReasonRequired ? "Required when decision is Rejected or Not Decided" : "Enter reason if applicable"}
            required={isReasonRequired}
          />
        </Field>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------- Main Page Component */

export const QualificationPage = () => {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [editing, setEditing] = useState(null);

  const { data, loading, error, reload } = useAsync(
    () => leadsApi.list({ limit: 100 }).then((r) => r.data),
    []
  );

  const list = data?.items || [];

  const filtered = list.filter((item) => {
    const decision = item.qualificationDecision || 'PENDING';
    if (tab !== 'ALL' && decision !== tab) return false;

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.code?.toLowerCase().includes(q) ||
      item.clientName?.toLowerCase().includes(q) ||
      item.contactPerson?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="CRM — Lead Qualification"
        subtitle="Verify requirement, budget, timeline, and decision maker before approving or rejecting a lead"
        actions={
          <>
            <Link to="/crm/leads">
              <Button variant="secondary" icon={Users}>Lead Capture Sheet</Button>
            </Link>
            <Link to="/crm/dcm-assignments">
              <Button variant="secondary" icon={UserCheck}>DCM Assignments</Button>
            </Link>
            <Link to="/crm/follow-ups">
              <Button variant="secondary" icon={PhoneCall}>Follow-ups</Button>
            </Link>
          </>
        }
      />

      <Panel className="mb-4">
        <div className="px-4 pt-1">
          <Tabs
            tabs={QUALIFICATION_TABS.map((t) => ({ ...t, key: t.key === 'ALL' ? 'ALL' : t.key }))}
            active={tab}
            onChange={setTab}
          />
        </div>
        <div className="p-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Lead ID, Client, Contact..."
              className="pl-9"
            />
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-[1900px] w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#836444] text-white font-bold border-b border-amber-300 dark:border-amber-500/30 uppercase tracking-wider whitespace-nowrap">
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Lead Code & Client</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Qualification Due Date</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Requirement Verified</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Budget / Pricing Verified</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Timeline Confirmed</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Decision Maker Identified</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Site Visit Required</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Competition Details Captured</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Qualification Decision</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Decision Date & Time</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Rejection / Hold Reason</th>
                  <th className="p-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-500">
                      No leads match your filter or search query.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row._id || row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{row.code}</span>
                        <span className="block text-xs text-amber-900 dark:text-amber-200 font-bold">{row.clientName || row.companyName || '—'}</span>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {row.qualificationDueDate ? new Date(row.qualificationDueDate).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="p-3 text-center"><TriStateBadge value={row.requirementVerified} /></td>
                      <td className="p-3 text-center"><TriStateBadge value={row.budgetPricingVerified} /></td>
                      <td className="p-3 text-center"><TriStateBadge value={row.timelineConfirmed} /></td>
                      <td className="p-3 text-center"><TriStateBadge value={row.decisionMakerIdentified} /></td>
                      <td className="p-3 text-center"><TriStateBadge value={row.siteVisitRequired === false ? 'NO' : 'YES'} /></td>
                      <td className="p-3 text-center"><TriStateBadge value={row.competitionDetailsCaptured} /></td>
                      <td className="p-3 text-center"><DecisionBadge value={row.qualificationDecision} /></td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {row.decisionDateTime ? new Date(row.decisionDateTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="p-3 max-w-[200px] truncate text-slate-600 dark:text-slate-400" title={row.rejectionHoldReason || '—'}>
                        {row.rejectionHoldReason || '—'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" icon={Pencil} onClick={() => setEditing(row)}>
                            Qualify
                          </Button>
                          <Link to={`/crm/follow-ups?search=${encodeURIComponent(row.code || '')}`}>
                            <Button size="sm" variant="secondary" icon={ArrowRightCircle} title="Go to Follow-up for this lead">
                              Follow-up
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {editing && <EditQualificationModal item={editing} onClose={() => setEditing(null)} onDone={reload} />}
    </div>
  );
};

export default QualificationPage;
