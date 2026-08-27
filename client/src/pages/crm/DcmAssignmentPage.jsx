import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Search, Users, ShieldCheck, PhoneCall, Pencil, ArrowRightCircle, ArrowRight, UserCheck, Check } from 'lucide-react';
import { leadsApi, usersApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { humanise } from '../../utils/format';
import {
  PageHeader, Panel, Button, Modal, Field, Input, Select, Textarea,
  Loading, ErrorState, Tabs, Pagination, DelayBadge,
} from '../../components/ui';

const ASSIGNMENT_TABS = [
  { key: 'ALL', label: 'All Assignments' },
  { key: 'HIGH', label: 'High Priority' },
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
    priority: 'HIGH',
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
  const isAvailable = value === 'AVAILABLE' || !value || value === 'Available';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border shadow-2xs transition-colors ${isAvailable
        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
        : 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
        }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
      {isAvailable ? 'Available' : 'Overloaded'}
    </span>
  );
};

const LeadPriorityBadge = ({ value }) => {
  const styles = {
    HIGH: 'bg-rose-600 text-white dark:bg-rose-700',
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
    <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold rounded-md shadow-sm ${isYes
      ? 'bg-amber-200 text-amber-900 dark:bg-amber-600 dark:text-amber-100'
      : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
      }`}>
      {isYes ? 'Yes' : 'No'}
    </span>
  );
};

const DCM_MANAGERS_LIST = [
  { _id: 'dcm-1', name: 'Hitesh Sharma', role: 'Senior DCM', activeProjectCount: 3, capacityStatus: 'AVAILABLE' },
  { _id: 'dcm-2', name: 'Rahul Verma', role: 'DCM Manager', activeProjectCount: 6, capacityStatus: 'OVERLOADED' },
  { _id: 'dcm-3', name: 'Saskhi M', role: 'Lead DCM', activeProjectCount: 9, capacityStatus: 'OVERLOADED' },
  { _id: 'dcm-4', name: 'Punam K', role: 'Assistant DCM Manager', activeProjectCount: 2, capacityStatus: 'AVAILABLE' },
  { _id: 'dcm-5', name: 'Amit Patel', role: 'DCM Specialist', activeProjectCount: 4, capacityStatus: 'AVAILABLE' },
  { _id: 'dcm-6', name: 'Neha Gupta', role: 'Senior DCM Manager', activeProjectCount: 7, capacityStatus: 'OVERLOADED' },
  { _id: 'dcm-7', name: 'Karan Johar', role: 'Junior DCM', activeProjectCount: 1, capacityStatus: 'AVAILABLE' },
  { _id: 'dcm-8', name: 'Rohan Singh', role: 'DCM Coordinator', activeProjectCount: 5, capacityStatus: 'AVAILABLE' },
];

/* ------------------------------------------------------------- Assignment Form Modal */

import { getLocalDate, getLocalDateTime } from '../../utils/format';

const EditAssignmentModal = ({ item, onClose, onDone }) => {
  const currentUser = useSelector((state) => state.auth.user);
  const currentUserName = currentUser?.name || currentUser?.email || 'Admin';

  const [form, setForm] = useState({
    assignedDcmName: item?.assignedDcmName || '',
    assignmentDueDate: item?.assignmentDueDate ? new Date(item.assignmentDueDate).toISOString().slice(0, 10) : getLocalDate(),
    dcmCapacityStatus: item?.dcmCapacityStatus || 'AVAILABLE',
    dcmActiveProjectCount: item?.dcmActiveProjectCount ?? 0,
    priority: item?.priority || 'MEDIUM',
    assignmentDateTime: item?.assignmentDateTime ? new Date(item.assignmentDateTime).toISOString().slice(0, 16) : getLocalDateTime(),
    reassignmentRequired: item?.reassignmentRequired ? 'YES' : 'NO',
    reassignedToName: item?.reassignedToName || '',
    reassignmentReason: item?.reassignmentReason || '',
    updatedUser: currentUserName || item?.updatedUser || '',
  });

  const [managerSearch, setManagerSearch] = useState('');
  const [formError, setFormError] = useState('');
  const isReassignmentYes = form.reassignmentRequired === 'YES' || form.reassignmentRequired === 'Yes';

  const { data: usersData } = useAsync(() => usersApi.list({ limit: 100 }).then((r) => r.data?.items || r.data || []), []);

  const dcmList = React.useMemo(() => {
    if (!usersData || usersData.length === 0) return DCM_MANAGERS_LIST;
    const fetched = usersData
      .filter((u) => !u.role || u.role.includes('DCM') || u.role.includes('MANAGER') || u.role.includes('ADMIN') || u.department === 'DCM' || u.department === 'Sales')
      .map((u) => ({
        _id: u._id || u.id,
        name: u.name,
        role: u.role || 'DCM / Manager',
        activeProjectCount: u.activeProjectCount ?? 3,
        capacityStatus: u.capacityStatus || ((u.activeProjectCount ?? 3) >= 6 ? 'OVERLOADED' : 'AVAILABLE'),
      }));

    const names = new Set(fetched.map((f) => f.name));
    const merged = [...fetched];
    DCM_MANAGERS_LIST.forEach((d) => {
      if (!names.has(d.name)) merged.push(d);
    });
    return merged;
  }, [usersData]);

  const filteredDcms = React.useMemo(() => {
    if (!managerSearch.trim()) return dcmList;
    const q = managerSearch.toLowerCase();
    return dcmList.filter((d) =>
      d.name?.toLowerCase().includes(q) ||
      humanise(d.role || '')?.toLowerCase().includes(q)
    );
  }, [dcmList, managerSearch]);

  const { execute, pending, error } = useAction(
    (payload) => leadsApi.update(item.id || item._id, payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSelectDcm = (dcmName) => {
    const selectedDcm = dcmList.find((d) => d.name === dcmName);
    if (selectedDcm) {
      setForm((prev) => ({
        ...prev,
        assignedDcmName: selectedDcm.name,
        dcmActiveProjectCount: selectedDcm.activeProjectCount ?? 0,
        dcmCapacityStatus: selectedDcm.capacityStatus || ((selectedDcm.activeProjectCount ?? 0) >= 6 ? 'OVERLOADED' : 'AVAILABLE'),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        assignedDcmName: dcmName,
        dcmActiveProjectCount: 0,
        dcmCapacityStatus: 'AVAILABLE',
      }));
    }
  };

  useEffect(() => {
    if (form.assignedDcmName) {
      const selectedDcm = dcmList.find((d) => d.name === form.assignedDcmName);
      if (selectedDcm) {
        setForm((prev) => ({
          ...prev,
          dcmActiveProjectCount: selectedDcm.activeProjectCount ?? 0,
          dcmCapacityStatus: selectedDcm.capacityStatus || ((selectedDcm.activeProjectCount ?? 0) >= 6 ? 'OVERLOADED' : 'AVAILABLE'),
        }));
      }
    }
  }, [form.assignedDcmName, dcmList]);

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFormError('');

    if (isReassignmentYes) {
      if (!form.reassignedToName?.trim() || form.reassignedToName === 'None / NA') {
        setFormError('Reassigned To is required when Reassignment Required is Yes.');
        return;
      }
      if (!form.reassignmentReason?.trim()) {
        setFormError('Reassignment Reason is required when Reassignment Required is Yes.');
        return;
      }
    }

    execute({
      ...form,
      updatedUser: currentUserName || form.updatedUser || 'Admin',
      reassignmentRequired: isReassignmentYes,
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
        {(error?.message || formError) && (
          <p className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error?.message || formError}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Assigned DCM / Manager" required>
            <Select
              value={form.assignedDcmName}
              onChange={(e) => handleSelectDcm(e.target.value)}
              options={[
                { value: '', label: '-- Select DCM / Manager --' },
                ...dcmList.map((d) => ({
                  value: d.name,
                  label: `${d.name} — ${humanise(d.role || 'DCM')}`,
                })),
              ]}
              required
            />
          </Field>
          <Field label="Assignment Due Date" required>
            <Input type="date" value={form.assignmentDueDate} onChange={set('assignmentDueDate')} required />
          </Field>
        </div>

        {/* Sleek Manager Directory Grid */}
        <div className="rounded-xl border border-stone-200 dark:border-[#3d3026] bg-stone-50/70 dark:bg-[#171310] p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                DCM & Manager Directory
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-[#2e251e] text-stone-700 dark:text-stone-300">
                {dcmList.length} Managers
              </span>
            </div>
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={managerSearch}
                onChange={(e) => setManagerSearch(e.target.value)}
                placeholder="Search manager..."
                className="w-full pl-8 pr-2 py-1 text-xs rounded-md border border-stone-200 dark:border-[#3d3026] bg-white dark:bg-[#120f0d] text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
            {filteredDcms.map((dcm) => {
              const isSelected = form.assignedDcmName === dcm.name;
              const initials = dcm.name
                ? dcm.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
                : 'M';

              return (
                <button
                  key={dcm._id || dcm.name}
                  type="button"
                  onClick={() => handleSelectDcm(dcm.name)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all duration-150 flex items-center justify-between gap-2 ${isSelected
                    ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/20 ring-2 ring-amber-500/30 shadow-xs'
                    : 'border-stone-200 dark:border-[#2e251e] bg-white dark:bg-[#1a1512] hover:border-amber-500/40 hover:bg-stone-50 dark:hover:bg-[#251e18]'
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${isSelected
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-200 dark:bg-[#2e251e] text-stone-700 dark:text-stone-300'
                        }`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-stone-900 dark:text-stone-100 truncate flex items-center gap-1">
                        <span className="truncate">{dcm.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                        {humanise(dcm.role || 'DCM')} • {dcm.activeProjectCount} Projects
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <DcmCapacityBadge value={dcm.capacityStatus} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="DCM Capacity Status">
            <Select
              value={form.dcmCapacityStatus}
              disabled
              tabIndex={-1}
              className="cursor-not-allowed bg-slate-100 dark:bg-slate-800/60 opacity-85 select-none"
              options={[
                { value: 'AVAILABLE', label: 'Available' },
                { value: 'OVERLOADED', label: 'Overloaded' },
              ]}
            />
          </Field>
          <Field label="DCM Active Project Count">
            <Input
              type="number"
              value={form.dcmActiveProjectCount}
              readOnly
              disabled
              tabIndex={-1}
              className="cursor-not-allowed bg-slate-100 dark:bg-slate-800/60 font-bold opacity-85 select-none"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Lead Priority">
            <Select
              value={form.priority}
              onChange={set('priority')}
              options={[
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
          {isReassignmentYes && (
            <Field label="Reassigned To" required={isReassignmentYes}>
              <Select
                value={form.reassignedToName}
                onChange={set('reassignedToName')}
                required={isReassignmentYes}
                options={[
                  { value: '', label: 'None / NA' },
                  ...dcmList.map((d) => ({
                    value: d.name,
                    label: `${d.name} (${humanise(d.role || 'DCM')})`,
                  })),
                ]}
              />
            </Field>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {isReassignmentYes && (
            <Field label="Reassignment Reason" required={isReassignmentYes}>
              <Textarea
                value={form.reassignmentReason}
                onChange={set('reassignmentReason')}
                required={isReassignmentYes}
                placeholder="Enter detailed reassignment reason..."
                rows={3}
              />
            </Field>
          )}
          <Field label="Updated User">
            <Input
              value={currentUserName || form.updatedUser}
              readOnly
              disabled
              tabIndex={-1}
              className="cursor-not-allowed bg-slate-100 dark:bg-slate-800/60 font-medium opacity-85 select-none"
            />
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const autoOpenedRef = useRef(false);

  const { data, loading, error, reload } = useAsync(
    () => leadsApi.list({ limit: 100 }).then((r) => r.data),
    []
  );

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  const apiItems = data?.items || [];
  const list = apiItems.length > 0 ? apiItems : INITIAL_SAMPLE_LEADS;

  const filtered = list.filter((item) => {
    // Filter Tab
    if (tab === 'HIGH' && item.priority !== 'HIGH') return false;
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

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

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
          <Link to="/crm/qualification">
            <Button icon={ArrowRight}>
              Move to Qualification
            </Button>
          </Link>
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
        <div className="p-3.5 sm:p-4">
          <div className="relative w-full sm:max-w-sm">
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

      <Panel className="overflow-hidden flex flex-col">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <>
            <div className="w-full overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="min-w-[1900px] w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#836444] text-white font-bold border-b border-amber-300 dark:border-amber-500/30 uppercase tracking-wider whitespace-nowrap sticky top-0 z-30">
                    <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 sticky left-0 z-40 bg-[#836444]">Lead Code & Client</th>
                    <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Assignment Due Date</th>
                    <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Delay / SLA Status</th>
                    <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">DCM Capacity Status</th>
                    <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Assigned DCM / Manager</th>
                    <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Assignment Date & Time</th>
                    <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">DCM Active Project Count</th>
                    <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Lead Priority</th>
                    <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Reassignment Required</th>
                    <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Reassigned To</th>
                    <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Reassignment Reason</th>
                    <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Updated User</th>
                    <th className="p-2.5 px-3 text-right sticky right-0 z-40 bg-[#836444] border-l border-amber-300/40 dark:border-amber-500/20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-8 text-center text-slate-500">
                        No assignment records found.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((row) => (
                      <tr key={row._id || row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-slate-950 group-hover:bg-amber-100/50 dark:group-hover:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{row.code}</span>
                          <span className="block text-xs text-amber-900 dark:text-amber-200 font-bold">{row.clientName || row.companyName || '—'}</span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {row.assignmentDueDate ? new Date(row.assignmentDueDate).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <DelayBadge
                            dueDate={row.assignmentDueDate}
                            isCompleted={Boolean(row.assignedDcmName && row.assignedDcmName !== 'NA' && row.reassignmentRequired !== 'YES')}
                            fallback={<span className="text-slate-400">—</span>}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <DcmCapacityBadge value={row.dcmCapacityStatus || 'AVAILABLE'} />
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{row.assignedDcmName || '—'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {row.assignmentDateTime ? new Date(row.assignmentDateTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-100">{row.dcmActiveProjectCount ?? 0}</td>
                        <td className="p-3 text-center">
                          <LeadPriorityBadge value={row.priority} />
                        </td>
                        <td className="p-3 text-center">
                          <ReassignmentBadge value={row.reassignmentRequired} />
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">{row.reassignedToName || 'NA'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={row.reassignmentReason || 'N/A'}>
                          {row.reassignmentReason || 'N/A'}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{row.updatedUser || '—'}</td>
                        <td className="p-3 text-right sticky right-0 z-10 bg-white dark:bg-slate-950 group-hover:bg-amber-100/50 dark:group-hover:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Pencil}
                            onClick={() => setEditing(row)}
                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs font-semibold"
                          >
                            Assign / Edit
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </>
        )}
      </Panel>

      {editing && <EditAssignmentModal item={editing} onClose={handleCloseModal} onDone={reload} />}
    </div>
  );
};

export default DcmAssignmentPage;
