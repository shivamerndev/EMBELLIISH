import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Users, ShieldCheck, PhoneCall, Pencil, ArrowRightCircle } from 'lucide-react';
import { leadsApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import {
  PageHeader, Panel, Button, Modal, Field, Input, Select,
  Loading, ErrorState, Tabs,
} from '../../components/ui';

const ASSIGNMENT_TABS = [
  { key: 'ALL', label: 'All Assignments' },
  { key: 'HOT', label: 'Hot Priority' },
  { key: 'REASSIGNMENT_NEEDED', label: 'Reassignment Needed' },
  { key: 'OVERLOADED', label: 'Overloaded' },
];

const INITIAL_SAMPLE_LEADS = [
  {
    _id: 'seed-ld-001',
    code: 'LD/001',
    clientName: 'D-table Analytics',
    contactPerson: 'Sakshi',
    phone: '12345678',
    status: 'NEW',
    assignmentDueDate: '2026-08-15',
    dcmCapacityStatus: 'AVAILABLE',
    assignedDcmName: 'Hitesh Sharma',
    assignmentDateTime: '08/04/2026 14:00',
    dcmActiveProjectCount: 3,
    priority: 'HOT',
    reassignmentRequired: false,
    reassignedToName: 'NA',
    reassignmentReason: 'N/A',
    updatedUser: 'Hitesh',
  },
  {
    _id: 'seed-ld-002',
    code: 'LD/002',
    clientName: 'Amazon',
    contactPerson: 'Rani',
    phone: '12345678',
    status: 'QUALIFIED',
    assignmentDueDate: '2026-08-18',
    dcmCapacityStatus: 'OVERLOADED',
    assignedDcmName: 'Rahul Verma',
    assignmentDateTime: '08/04/2026 15:30',
    dcmActiveProjectCount: 6,
    priority: 'HIGH',
    reassignmentRequired: true,
    reassignedToName: 'Punam K',
    reassignmentReason: 'High workload allocation',
    updatedUser: 'Sakshi',
  },
  {
    _id: 'seed-ld-003',
    code: 'LD/003',
    clientName: 'Prime',
    contactPerson: 'Punam',
    phone: '12345678',
    status: 'NEW',
    assignmentDueDate: '2026-08-20',
    dcmCapacityStatus: 'OVERLOADED',
    assignedDcmName: 'Saskhi M',
    assignmentDateTime: '08/04/2026 16:10',
    dcmActiveProjectCount: 9,
    priority: 'MEDIUM',
    reassignmentRequired: false,
    reassignedToName: 'NA',
    reassignmentReason: 'N/A',
    updatedUser: 'Admin',
  },
];

/* ------------------------------------------------------------- Badges */

const DcmCapacityBadge = ({ value }) => {
  const styles = {
    AVAILABLE: 'bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300',
    OVERLOADED: 'bg-rose-200 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300',
  };
  const labelMap = {
    AVAILABLE: 'Available',
    OVERLOADED: 'Overloaded',
  };
  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold rounded-md border shadow-sm ${styles[value] || styles.AVAILABLE}`}>
      {labelMap[value] || value || 'Available'}
    </span>
  );
};

const LeadPriorityBadge = ({ value }) => {
  const styles = {
    HOT: 'bg-rose-600 text-white dark:bg-rose-700',
    HIGH: 'bg-amber-600 text-white dark:bg-amber-700',
    MEDIUM: 'bg-sky-600 text-white dark:bg-sky-700',
    LOW: 'bg-slate-500 text-white dark:bg-slate-600',
  };
  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-md shadow-sm ${styles[value] || styles.MEDIUM}`}>
      {value || 'MEDIUM'}
    </span>
  );
};

const ReassignmentBadge = ({ value }) => {
  const isYes = value === true || value === 'Yes' || value === 'YES';
  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold rounded-md shadow-sm ${
      isYes
        ? 'bg-amber-200 text-amber-900 dark:bg-amber-600 dark:text-amber-100'
        : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
    }`}>
      {isYes ? 'Yes' : 'No'}
    </span>
  );
};

/* ------------------------------------------------------------- Assignment Form Modal */

const EditAssignmentModal = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    assignedDcmName: item?.assignedDcmName || '',
    assignmentDueDate: item?.assignmentDueDate ? new Date(item.assignmentDueDate).toISOString().slice(0, 10) : '',
    dcmCapacityStatus: item?.dcmCapacityStatus || 'AVAILABLE',
    dcmActiveProjectCount: item?.dcmActiveProjectCount ?? 0,
    priority: item?.priority || 'MEDIUM',
    assignmentDateTime: item?.assignmentDateTime ? new Date(item.assignmentDateTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    reassignmentRequired: item?.reassignmentRequired ? 'YES' : 'NO',
    reassignedToName: item?.reassignedToName || '',
    reassignmentReason: item?.reassignmentReason || '',
    updatedUser: item?.updatedUser || '',
  });

  const { execute, pending, error } = useAction(
    (payload) => leadsApi.update(item.id || item._id, payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    execute({
      ...form,
      reassignmentRequired: form.reassignmentRequired === 'YES' || form.reassignmentRequired === 'Yes',
    });
  };

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title={`Update DCM Assignment — ${item?.code || ''}`}
      subtitle={`Configure capacity and DCM manager for ${item?.clientName || ''}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={pending}>Save Assignment</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4 pr-1">
        {error && <p className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error.message}</p>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Assigned DCM / Manager" required>
            <Input value={form.assignedDcmName} onChange={set('assignedDcmName')} placeholder="e.g. Hitesh Sharma" required />
          </Field>
          <Field label="Assignment Due Date" required>
            <Input type="date" value={form.assignmentDueDate} onChange={set('assignmentDueDate')} required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="DCM Capacity Status">
            <Select
              value={form.dcmCapacityStatus}
              onChange={set('dcmCapacityStatus')}
              options={[
                { value: 'AVAILABLE', label: 'Available' },
                { value: 'OVERLOADED', label: 'Overloaded' },
              ]}
            />
          </Field>
          <Field label="DCM Active Project Count">
            <Input type="number" value={form.dcmActiveProjectCount} onChange={set('dcmActiveProjectCount')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Lead Priority">
            <Select
              value={form.priority}
              onChange={set('priority')}
              options={[
                { value: 'HOT', label: 'Hot' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />
          </Field>
          <Field label="Assignment Date & Time">
            <Input type="datetime-local" value={form.assignmentDateTime} onChange={set('assignmentDateTime')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Reassignment Required">
            <Select
              value={form.reassignmentRequired}
              onChange={set('reassignmentRequired')}
              options={[
                { value: 'NO', label: 'No' },
                { value: 'YES', label: 'Yes' },
              ]}
            />
          </Field>
          <Field label="Reassigned To">
            <Input value={form.reassignedToName} onChange={set('reassignedToName')} placeholder="e.g. Punam K" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Reassignment Reason">
            <Input value={form.reassignmentReason} onChange={set('reassignmentReason')} placeholder="e.g. High workload" />
          </Field>
          <Field label="Updated User">
            <Input value={form.updatedUser} onChange={set('updatedUser')} placeholder="e.g. Hitesh" />
          </Field>
        </div>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------- Main Page Component */

export const DcmAssignmentPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [editing, setEditing] = useState(null);
  const autoOpenedRef = useRef(false);

  const { data, loading, error, reload } = useAsync(
    () => leadsApi.list({ limit: 100 }).then((r) => r.data),
    []
  );

  const apiItems = data?.items || [];
  const list = apiItems.length > 0 ? apiItems : INITIAL_SAMPLE_LEADS;

  const filtered = list.filter((item) => {
    // Filter Tab
    if (tab === 'HOT' && item.priority !== 'HOT') return false;
    if (tab === 'REASSIGNMENT_NEEDED' && item.reassignmentRequired !== true && item.reassignmentRequired !== 'YES') return false;
    if (tab === 'OVERLOADED' && item.dcmCapacityStatus !== 'OVERLOADED') return false;

    // Search Query
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.code?.toLowerCase().includes(q) ||
      item.clientName?.toLowerCase().includes(q) ||
      item.assignedDcmName?.toLowerCase().includes(q) ||
      item.reassignedToName?.toLowerCase().includes(q) ||
      item.updatedUser?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (searchParams.get('assign') === 'true' && search && filtered.length > 0 && !editing && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      const match = filtered.find(
        (i) => i.code?.toLowerCase() === search.toLowerCase()
      ) || filtered[0];
      if (match) {
        setEditing(match);
      }
    }
  }, [searchParams, search, filtered, editing]);

  const handleCloseModal = () => {
    setEditing(null);
    if (searchParams.get('assign')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('assign');
          return next;
        },
        { replace: true }
      );
    }
  };

  return (
    <div>
      <PageHeader
        title="CRM — DCM Capacity & Lead Assignment"
        subtitle="Dedicated portal for managing DCM workloads, lead priorities, assignment due dates, capacity statuses, and reassignments"
        actions={
          <>
            <Link to="/crm/leads">
              <Button variant="secondary" icon={Users}>Lead Capture Sheet</Button>
            </Link>
            <Link to="/crm/qualification">
              <Button variant="secondary" icon={ShieldCheck}>Qualification</Button>
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
            tabs={ASSIGNMENT_TABS}
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
              placeholder="Search Lead ID, Client, Assigned DCM, Reassigned To..."
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
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Assignment Due Date</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">DCM Capacity Status</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Assigned DCM / Manager</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Assignment Date & Time</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">DCM Active Project Count</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Lead Priority</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Reassignment Required</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Reassigned To</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Reassignment Reason</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Updated User</th>
                  <th className="p-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-500">
                      No assignment records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row._id || row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{row.code}</span>
                        <span className="block text-xs text-brand-600 dark:text-brand-400 font-medium">{row.clientName}</span>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {row.assignmentDueDate ? new Date(row.assignmentDueDate).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <DcmCapacityBadge value={row.dcmCapacityStatus || 'AVAILABLE'} />
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{row.assignedDcmName || '—'}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {row.assignmentDateTime ? new Date(row.assignmentDateTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">{row.dcmActiveProjectCount ?? 0}</td>
                      <td className="p-3 text-center">
                        <LeadPriorityBadge value={row.priority || 'MEDIUM'} />
                      </td>
                      <td className="p-3 text-center">
                        <ReassignmentBadge value={row.reassignmentRequired} />
                      </td>
                      <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{row.reassignedToName || 'NA'}</td>
                      <td className="p-3 max-w-[180px] truncate text-slate-600 dark:text-slate-400" title={row.reassignmentReason || 'N/A'}>
                        {row.reassignmentReason || 'N/A'}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{row.updatedUser || '—'}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" icon={Pencil} onClick={() => setEditing(row)}>
                            Edit
                          </Button>
                          <Link to={`/crm/qualification?search=${encodeURIComponent(row.code || '')}`}>
                            <Button size="sm" variant="secondary" icon={ArrowRightCircle} title="Go to Qualification for this lead">
                              Qualify
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

      {editing && <EditAssignmentModal item={editing} onClose={handleCloseModal} onDone={reload} />}
    </div>
  );
};

export default DcmAssignmentPage;
