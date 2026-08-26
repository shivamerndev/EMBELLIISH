import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Users, UserCheck, ShieldCheck, Pencil, ArrowRightCircle, ArrowRight } from 'lucide-react';
import { leadsApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import {
  PageHeader, Panel, Button, Modal, Field, Input, Select,
  Textarea, Loading, ErrorState, Tabs,
} from '../../components/ui';

const FOLLOWUP_TABS = [
  { key: 'ALL', label: 'All Leads' },
  { key: 'DUE_TODAY', label: 'Due Today' },
  { key: 'OVERDUE', label: 'Overdue' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

/* ------------------------------------------------------------- Badges */

const OverallStatusBadge = ({ value }) => {
  const styles = {
    NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    ASSIGNED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    UNDER_QUALIFICATION: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    REJECTED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
    HOLD: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    ON_HOLD: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    FOLLOW_UP: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    FOLLOWUP: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    IN_PROGRESS: 'bg-sky-200 text-sky-900 dark:bg-sky-700 dark:text-sky-100',
    APPROVED: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-600 dark:text-emerald-100',
  };
  const labelMap = {
    NEW: 'New',
    ASSIGNED: 'Assigned',
    UNDER_QUALIFICATION: 'Under Qualification',
    REJECTED: 'Rejected',
    HOLD: 'Hold',
    ON_HOLD: 'Hold',
    FOLLOW_UP: 'Followup',
    FOLLOWUP: 'Followup',
    IN_PROGRESS: 'In Progress',
    APPROVED: 'Approved',
  };
  const key = value || 'NEW';
  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-md shadow-sm ${styles[key] || styles.NEW}`}>
      {labelMap[key] || key}
    </span>
  );
};

import { getLocalDate } from '../../utils/format';

/* ------------------------------------------------------------- Follow-up Form Modal */

const PREDEFINED_NEXT_ACTIONS = [
  'Approved',
  'Rejected',
  'Pending',
  'Approval Required',
  'Other',
  'Text (enter your own)',
];

const NEXT_ACTION_OPTIONS = [
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approval Required', label: 'Approval Required' },
  { value: 'Other', label: 'Other' },
  { value: 'Text (enter your own)', label: 'Text (enter your own)' },
];

const EditFollowUpModal = ({ item, onClose, onDone }) => {
  const initialNextAction = item?.nextAction || '';
  const isPredefined = PREDEFINED_NEXT_ACTIONS.includes(initialNextAction);

  const [selectedOption, setSelectedOption] = useState(() => {
    if (!initialNextAction) return 'Pending';
    if (isPredefined) return initialNextAction;
    return 'Text (enter your own)';
  });

  const [customText, setCustomText] = useState(() => {
    if (initialNextAction && !isPredefined) return initialNextAction;
    return '';
  });

  const [form, setForm] = useState({
    nextAction: initialNextAction || 'Pending',
    nextActionDueDate: item?.nextActionDueDate ? new Date(item.nextActionDueDate).toISOString().slice(0, 10) : getLocalDate(),
    overallLeadStatus: item?.overallLeadStatus || 'NEW',
  });

  const { execute, pending, error } = useAction(
    (payload) => leadsApi.update(item.id || item._id, payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const handleSelectNextAction = (e) => {
    const val = e.target.value;
    setSelectedOption(val);
    if (val === 'Text (enter your own)') {
      setForm((prev) => ({ ...prev, nextAction: customText || 'Text (enter your own)' }));
    } else {
      setForm((prev) => ({ ...prev, nextAction: val }));
    }
  };

  const handleCustomTextChange = (e) => {
    const val = e.target.value;
    setCustomText(val);
    setForm((prev) => ({ ...prev, nextAction: val.trim() || 'Text (enter your own)' }));
  };

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    execute({ ...form });
  };

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title={`Log Follow-up — ${item?.code || ''}`}
      subtitle={`Set the next action and overall status for ${item?.clientName || ''}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={pending}>Save Follow-up</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4 pr-1">
        {error && <p className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error.message}</p>}

        <Field label="Next Action">
          <Select
            value={selectedOption}
            onChange={handleSelectNextAction}
            options={NEXT_ACTION_OPTIONS}
          />
          {selectedOption === 'Text (enter your own)' && (
            <div className="mt-2">
              <Input
                type="text"
                value={customText}
                onChange={handleCustomTextChange}
                placeholder="Enter custom next action details..."
                autoFocus
              />
            </div>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Next Action Due Date">
            <Input type="date" value={form.nextActionDueDate} onChange={set('nextActionDueDate')} />
          </Field>
          <Field label="Overall Lead Status">
            <Select
              value={form.overallLeadStatus}
              onChange={set('overallLeadStatus')}
              options={[
                { value: 'NEW', label: 'New' },
                { value: 'ASSIGNED', label: 'Assigned' },
                { value: 'UNDER_QUALIFICATION', label: 'Under Qualification' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'HOLD', label: 'Hold' },
                { value: 'FOLLOW_UP', label: 'Followup' },
              ]}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------- Main Page Component */

export const FollowUpPage = () => {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [editing, setEditing] = useState(null);

  const { data, loading, error, reload } = useAsync(
    () => leadsApi.list({ limit: 100 }).then((r) => r.data),
    []
  );

  const list = data?.items || [];
  const today = new Date().toISOString().slice(0, 10);

  const filtered = list.filter((item) => {
    const dueDate = item.nextActionDueDate ? new Date(item.nextActionDueDate).toISOString().slice(0, 10) : null;
    const status = item.overallLeadStatus || 'NEW';

    if (tab === 'DUE_TODAY' && dueDate !== today) return false;
    if (tab === 'OVERDUE' && !(dueDate && dueDate < today)) return false;
    if (tab === 'APPROVED' && status !== 'APPROVED') return false;
    if (tab === 'REJECTED' && status !== 'REJECTED') return false;

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.code?.toLowerCase().includes(q) ||
      item.clientName?.toLowerCase().includes(q) ||
      item.contactPerson?.toLowerCase().includes(q) ||
      item.nextAction?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="CRM — Lead Follow-up"
        subtitle="Track the next action, due date, and overall status for every lead in the pipeline"
        actions={
          <Link to="/crm/clients">
            <Button icon={ArrowRight}>
              Move to Clients
            </Button>
          </Link>
        }
      />

      <Panel className="mb-4">
        <div className="px-4 pt-1">
          <Tabs
            tabs={FOLLOWUP_TABS}
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
              placeholder="Search Lead ID, Client, Contact, Next Action..."
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
            <table className="min-w-[1100px] w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#836444] text-white font-bold border-b border-amber-300 dark:border-amber-500/30 uppercase tracking-wider whitespace-nowrap">
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 sticky left-0 z-20 bg-[#836444]">Lead Code & Client</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Next Action</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Next Action Due Date</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Overall Lead Status</th>
                  <th className="p-2.5 px-3 text-right sticky right-0 z-20 bg-[#836444] border-l border-amber-300/40 dark:border-amber-500/20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No leads match your filter or search query.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row._id || row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-slate-950 group-hover:bg-amber-100/50 dark:group-hover:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{row.code}</span>
                        <span className="block text-xs text-amber-900 dark:text-amber-200 font-bold">{row.clientName || row.companyName || '—'}</span>
                      </td>
                      <td className="p-3 max-w-[260px] truncate text-slate-700 dark:text-slate-300" title={row.nextAction || '—'}>
                        {row.nextAction || '—'}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {row.nextActionDueDate ? new Date(row.nextActionDueDate).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <OverallStatusBadge value={row.overallLeadStatus} />
                      </td>
                      <td className="p-3 text-right sticky right-0 z-10 bg-white dark:bg-slate-950 group-hover:bg-amber-100/50 dark:group-hover:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" icon={Pencil} onClick={() => setEditing(row)}>
                            Update
                          </Button>
                          <Link to={`/crm/sales-commercials?search=${encodeURIComponent(row.code || '')}`}>
                            <Button size="sm" variant="secondary" icon={ArrowRightCircle} title="Go to Sales & Commercials for this lead">
                              Sales
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

      {editing && <EditFollowUpModal item={editing} onClose={() => setEditing(null)} onDone={reload} />}
    </div>
  );
};

export default FollowUpPage;
