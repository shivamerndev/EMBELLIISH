import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Search, Users, UserCheck, Pencil, ArrowRightCircle, ShieldCheck, Check, AlertCircle, FileText, UserPlus } from 'lucide-react';
import { leadsApi, usersApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { humanise, getLocalDate, getLocalDateTime } from '../../utils/format';
import {
  PageHeader, Panel, Button, Modal, Field, Input, Select, Textarea,
  Loading, ErrorState, Tabs, Pagination, DelayBadge, ViewSwitcher,
} from '../../components/ui';
import useViewMode from '../../hooks/useViewMode';
import CardGridView from '../../components/common/CardGridView';

const REASSIGNMENT_TABS = [
  { key: 'ALL', label: 'All Qualified Leads' },
  { key: 'REASSIGNMENT_NEEDED', label: 'Reassignment Needed' },
  { key: 'OVERLOADED', label: 'Overloaded DCM' },
  { key: 'HIGH', label: 'High Priority' },
];

const SAMPLE_QUALIFIED_LEADS = [
  {
    _id: 'seed-ld-002',
    code: 'LD/002',
    clientName: 'Amazon India',
    contactPerson: 'Rani Sharma',
    phone: '9876543210',
    email: 'rani@amazon.com',
    status: 'QUALIFIED',
    qualificationDecision: 'APPROVED',
    assignmentDueDate: '2026-08-18',
    dcmCapacityStatus: 'OVERLOADED',
    assignedDcmName: 'Rahul Verma',
    assignmentDateTime: '08/04/2026 15:30',
    dcmActiveProjectCount: 6,
    priority: 'HIGH',
    reassignmentRequired: true,
    reassignedToName: 'Punam K',
    reassignmentReason: 'DCM capacity limit reached. Reassigned for faster execution.',
    updatedUser: 'Sakshi',
  },
  {
    _id: 'seed-ld-004',
    code: 'LD/004',
    clientName: 'Prestige Tech Park',
    contactPerson: 'Vikram Mehta',
    phone: '9812345678',
    email: 'vikram@prestige.com',
    status: 'QUALIFIED',
    qualificationDecision: 'APPROVED',
    assignmentDueDate: '2026-08-22',
    dcmCapacityStatus: 'AVAILABLE',
    assignedDcmName: 'Hitesh Sharma',
    assignmentDateTime: '08/05/2026 10:15',
    dcmActiveProjectCount: 3,
    priority: 'HIGH',
    reassignmentRequired: false,
    reassignedToName: 'NA',
    reassignmentReason: 'Initial assignment completed smoothly.',
    updatedUser: 'Hitesh',
  },
  {
    _id: 'seed-ld-005',
    code: 'LD/005',
    clientName: 'Urban Ladder Designs',
    contactPerson: 'Ananya Roy',
    phone: '9711223344',
    email: 'ananya@urbanladder.com',
    status: 'QUALIFIED',
    qualificationDecision: 'APPROVED',
    assignmentDueDate: '2026-08-25',
    dcmCapacityStatus: 'OVERLOADED',
    assignedDcmName: 'Saskhi M',
    assignmentDateTime: '08/06/2026 11:45',
    dcmActiveProjectCount: 9,
    priority: 'MEDIUM',
    reassignmentRequired: true,
    reassignedToName: 'Amit Patel',
    reassignmentReason: 'Client requested senior DCM switch due to specialized commercial scope.',
    updatedUser: 'Admin',
  },
  {
    _id: 'seed-ld-006',
    code: 'LD/006',
    clientName: 'Wipro Enterprises',
    contactPerson: 'Karan Malhotra',
    phone: '9900112233',
    email: 'karan@wipro.com',
    status: 'QUALIFIED',
    qualificationDecision: 'APPROVED',
    assignmentDueDate: '2026-08-28',
    dcmCapacityStatus: 'AVAILABLE',
    assignedDcmName: 'Neha Gupta',
    assignmentDateTime: '08/07/2026 16:20',
    dcmActiveProjectCount: 4,
    priority: 'HIGH',
    reassignmentRequired: false,
    reassignedToName: 'NA',
    reassignmentReason: 'Reassigned after initial manager workload balance.',
    updatedUser: 'Neha',
  }
];

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

/* ------------------------------------------------------------- Reassign DCM Modal Component */

export const ReassignDcmModal = ({ item, onClose, onDone }) => {
  const currentUser = useSelector((state) => state.auth?.user);
  const currentUserName = currentUser?.name || currentUser?.email || 'Admin';

  const [form, setForm] = useState({
    assignedDcmName: item?.assignedDcmName || item?.reassignedToName || '',
    reassignedToName: item?.reassignedToName || '',
    reassignmentReason: item?.reassignmentReason || '',
    priority: item?.priority || 'MEDIUM',
    assignmentDueDate: item?.assignmentDueDate ? new Date(item.assignmentDueDate).toISOString().slice(0, 10) : getLocalDate(),
    assignmentDateTime: item?.assignmentDateTime ? new Date(item.assignmentDateTime).toISOString().slice(0, 16) : getLocalDateTime(),
    dcmCapacityStatus: item?.dcmCapacityStatus || 'AVAILABLE',
    dcmActiveProjectCount: item?.dcmActiveProjectCount ?? 0,
    updatedUser: currentUserName || item?.updatedUser || 'Admin',
  });

  const [managerSearch, setManagerSearch] = useState('');
  const [formError, setFormError] = useState('');

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

  const navigate = useNavigate();

  const { execute, pending, error } = useAction(
    (payload) => leadsApi.update(item.id || item._id, payload),
    {
      onSuccess: () => {
        if (onDone) onDone();
        if (onClose) onClose();
        const code = item?.code || '';
        navigate(`/crm/qualification${code ? `?search=${encodeURIComponent(code)}` : ''}`);
      },
    }
  );

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSelectDcm = (dcmName) => {
    const selectedDcm = dcmList.find((d) => d.name === dcmName);
    if (selectedDcm) {
      setForm((prev) => ({
        ...prev,
        assignedDcmName: selectedDcm.name,
        reassignedToName: selectedDcm.name,
        dcmActiveProjectCount: selectedDcm.activeProjectCount ?? 0,
        dcmCapacityStatus: selectedDcm.capacityStatus || ((selectedDcm.activeProjectCount ?? 0) >= 6 ? 'OVERLOADED' : 'AVAILABLE'),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        assignedDcmName: dcmName,
        reassignedToName: dcmName,
        dcmActiveProjectCount: 0,
        dcmCapacityStatus: 'AVAILABLE',
      }));
    }
  };

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFormError('');

    if (!form.assignedDcmName?.trim()) {
      setFormError('Please select a DCM / Manager to reassign.');
      return;
    }

    execute({
      ...form,
      reassignmentRequired: true,
      updatedUser: currentUserName || 'Admin',
    });
  };

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title={`Reassign DCM — ${item?.clientName || item?.companyName || item?.code || ''}`}
      subtitle="Select a new Dedicated Customer Manager (optional note / reason)"
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={pending} icon={UserCheck}>Save and Move to Next Step</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4 pr-1">
        {(error?.message || formError) && (
          <p className="text-xs text-rose-500 font-semibold p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">{error?.message || formError}</p>
        )}

        {/* Lead Summary Header */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 dark:bg-amber-950/40 dark:border-amber-800/60 flex items-center justify-between text-xs">
          <div>
            <span className="  font-bold text-amber-800 dark:text-amber-300">{item?.code || 'LEAD'}</span>
            <span className="ml-2 font-bold text-stone-900 dark:text-stone-100">{item?.clientName || item?.companyName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-500">Currently Assigned:</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">{item?.assignedDcmName || 'Unassigned'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Reassign to DCM / Manager" required>
            <Select
              value={form.assignedDcmName}
              onChange={(e) => handleSelectDcm(e.target.value)}
              options={[
                { value: '', label: '-- Select New DCM / Manager --' },
                ...dcmList.map((d) => ({
                  value: d.name,
                  label: `${d.name} : ${humanise(d.role || 'DCM')}`,
                })),
              ]}
              required
            />
          </Field>
          <Field label="Lead Priority">
            <Select
              value={form.priority}
              onChange={setField('priority')}
              options={[
                { value: 'HIGH', label: 'High Priority' },
                { value: 'MEDIUM', label: 'Medium Priority' },
                { value: 'LOW', label: 'Low Priority' },
              ]}
            />
          </Field>
        </div>

        {/* Manager Directory Selector */}
        <div className="rounded-xl border border-stone-200 dark:border-[#3d3026] bg-stone-50/70 dark:bg-[#171310] p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                Select from DCM Directory
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-[#2e251e] text-stone-700 dark:text-stone-300">
                {dcmList.length} Available
              </span>
            </div>
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={managerSearch}
                onChange={(e) => setManagerSearch(e.target.value)}
                placeholder="Search DCM..."
                className="w-full pl-8 pr-2 py-1 text-xs rounded-md border border-stone-200 dark:border-[#3d3026] bg-white dark:bg-[#120f0d] text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {filteredDcms.map((dcm) => {
              const isSelected = form.assignedDcmName === dcm.name;
              const initials = dcm.name
                ? dcm.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
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

        {/* Note */}
        <Field label="Note" hint="Provide context, workload reasons, or client requests for reassigning DCM">
          <Textarea
            value={form.reassignmentReason}
            onChange={setField('reassignmentReason')}
            placeholder="e.g. Workload rebalance required / Client requested senior DCM / Technical specification match..."
            rows={3}
          />
        </Field>

        <Field label="Assignment Date & Time">
          <Input type="datetime-local" value={form.assignmentDateTime} onChange={setField('assignmentDateTime')} />
        </Field>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------- Reassign DCM Card Component */

const ReassignDcmCard = ({ item, onReassign }) => {
  const clientNameVal = item.clientName || item.companyName || item.name || '—';
  const contactPersonVal = item.contactPerson || item.contactName || '—';

  return (
    <div className="group relative flex flex-col justify-between p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-amber-500/50 dark:hover:border-amber-500/40 transition-all">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="  text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                {item.code || 'LD'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                QUALIFIED
              </span>
              <LeadPriorityBadge value={item.priority} />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {clientNameVal}
            </h4>
          </div>
          <DelayBadge dueDate={item.assignmentDueDate || item.dueDate} isCompleted={Boolean(item.assignedDcmName && !item.reassignmentRequired)} />
        </div>

        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 my-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Contact:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{contactPersonVal}</span>
          </div>
          {item.phone && (
            <div className="flex items-center justify-between  ">
              <span className="text-slate-400">Phone:</span>
              <span>{item.phone}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/40">
            <span className="text-slate-400">Current Assigned DCM:</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">{item.assignedDcmName || 'Unassigned'}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">DCM Capacity:</span>
            <div className="flex items-center gap-1.5">
              <span className="  text-slate-700 dark:text-slate-300">{item.dcmActiveProjectCount || 0} active</span>
              <DcmCapacityBadge value={item.dcmCapacityStatus} />
            </div>
          </div>
        </div>

        {/* Note / Reason display */}
        <div className="p-2.5 rounded-lg bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/20 text-stone-800 dark:text-stone-200 text-xs mb-3">
          <span className="font-bold text-[11px] text-amber-800 dark:text-amber-400 block mb-0.5 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Reassignment Note / Reason:
          </span>
          <span className="text-[11px] italic text-stone-700 dark:text-stone-300 line-clamp-2">
            {item.reassignmentReason || 'No note added yet.'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-auto">
        <span className="text-[10px] text-slate-400  ">
          Due: {item.assignmentDueDate ? new Date(item.assignmentDueDate).toLocaleDateString('en-GB') : '—'}
        </span>
        <Button
          size="sm"
          variant="primary"
          icon={UserCheck}
          onClick={() => onReassign(item)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
        >
          Assign DCM
        </Button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------- Main Reassign DCM Page Component */

export const ReassignDcmPage = () => {
  const [viewMode, setViewMode] = useViewMode('table');
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [reassigningItem, setReassigningItem] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, loading, error, reload } = useAsync(
    () => leadsApi.list({ limit: 100 }).then((r) => r.data),
    []
  );

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  const apiItems = data?.items || [];

  // Filter for qualified leads
  const qualifiedApiItems = apiItems.filter(
    (i) => i.status === 'QUALIFIED' || i.qualificationDecision === 'APPROVED'
  );

  const list = qualifiedApiItems.length > 0 ? qualifiedApiItems : SAMPLE_QUALIFIED_LEADS;

  const filtered = list.filter((item) => {
    if (tab === 'HIGH' && item.priority !== 'HIGH') return false;
    if (tab === 'REASSIGNMENT_NEEDED' && item.reassignmentRequired !== true && item.reassignmentRequired !== 'YES') return false;
    if (tab === 'OVERLOADED' && item.dcmCapacityStatus !== 'OVERLOADED') return false;

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.code?.toLowerCase().includes(q) ||
      item.clientName?.toLowerCase().includes(q) ||
      item.assignedDcmName?.toLowerCase().includes(q) ||
      item.reassignedToName?.toLowerCase().includes(q) ||
      item.reassignmentReason?.toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <PageHeader
        title="CRM — Reassign DCM (Qualified Leads)"
        subtitle="View qualified leads and reassign Dedicated Customer Managers (DCMs)"
      />

      <Panel className="mb-4">
        <div className="px-4 pt-1">
          <Tabs
            tabs={REASSIGNMENT_TABS}
            active={tab}
            onChange={setTab}
          />
        </div>
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Lead ID, Qualified Client, DCM, Reason..."
              className="pl-9"
            />
          </div>
          <ViewSwitcher view={viewMode} onViewChange={setViewMode} />
        </div>
      </Panel>

      <Panel className="overflow-hidden flex flex-col">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="p-4">
                <CardGridView
                  items={paginated}
                  renderCard={(item) => (
                    <ReassignDcmCard
                      item={item}
                      onReassign={(i) => setReassigningItem(i)}
                    />
                  )}
                  empty={<div className="p-8 text-center text-slate-500">No qualified leads found for DCM reassignment.</div>}
                />
              </div>
            ) : (
              <div className="w-full overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="min-w-[1850px] w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#836444] text-white font-bold border-b border-amber-300 dark:border-amber-500/30 uppercase tracking-wider whitespace-nowrap sticky top-0 z-30">
                      <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 sticky left-0 z-40 bg-[#836444]">Lead Code & Client</th>
                      <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Status</th>
                      <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Delay / SLA Status</th>
                      <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Assigned DCM / Manager</th>
                      <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">DCM Load</th>
                      <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Lead Priority</th>
                      <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Reassignment Note / Reason</th>
                      <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Assignment Date & Time</th>
                      <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Updated By</th>
                      <th className="p-2.5 px-3 text-right sticky right-0 z-40 bg-[#836444] border-l border-amber-300/40 dark:border-amber-500/20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-500">
                          No qualified leads found for DCM reassignment.
                        </td>
                      </tr>
                    ) : (
                      paginated.map((row) => (
                        <tr key={row._id || row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                          <td className="p-3 whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-slate-950 group-hover:bg-amber-100 dark:group-hover:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{row.code}</span>
                            <span className="block text-xs text-amber-900 dark:text-amber-200 font-bold">{row.clientName || row.companyName || '—'}</span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                              QUALIFIED
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <DelayBadge
                              dueDate={row.assignmentDueDate || row.dueDate || row.qualificationDueDate || row.createdAt}
                              isCompleted={Boolean(row.assignedDcmName && row.assignedDcmName !== 'NA' && !row.reassignmentRequired)}
                              fallback={<span className="text-slate-400">—</span>}
                            />
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{row.assignedDcmName || 'Unassigned'}</td>
                          <td className="p-3 text-center">
                            <DcmCapacityBadge value={row.dcmCapacityStatus || 'AVAILABLE'} />
                          </td>
                          <td className="p-3 text-center">
                            <LeadPriorityBadge value={row.priority} />
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300 max-w-[320px]">
                            <div className="flex items-start gap-1.5 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                              <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <span className="text-xs font-medium italic truncate" title={row.reassignmentReason || 'No note/reason added'}>
                                {row.reassignmentReason || 'No note/reason added'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {row.assignmentDateTime ? new Date(row.assignmentDateTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{row.updatedUser || 'Admin'}</td>
                          <td className="p-3 text-right sticky right-0 z-10 bg-white dark:bg-slate-950 group-hover:bg-amber-100 dark:group-hover:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                            <Button
                              size="sm"
                              variant="primary"
                              icon={UserCheck}
                              onClick={() => setReassigningItem(row)}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                            >
                              Reassign DCM
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

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

      {reassigningItem && (
        <ReassignDcmModal
          item={reassigningItem}
          onClose={() => setReassigningItem(null)}
          onDone={reload}
        />
      )}
    </div>
  );
};

export default ReassignDcmPage;
