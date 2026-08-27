import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Users,
  UserCheck,
  Briefcase,
  Building2,
  Folder,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import { membersApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { date, currency } from '../../utils/format';
import {
  PageHeader,
  Panel,
  Table,
  Button,
  Input,
  Select,
  Field,
  Modal,
  StatTile,
  Badge,
  Loading,
  ErrorState,
  EmptyState,
  PhoneInput,
  EmailInput,
  validatePhoneNumber,
  validateEmail,
  Tabs,
  StatusBadge,
  Pagination,
} from '../../components/ui';

const ROLE_OPTIONS = [
  { value: 'DCM', label: 'DCM (Design & Client Manager)' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Architect', label: 'Architect' },
  { value: 'Senior DCM', label: 'Senior DCM' },
  { value: 'Project Coordinator', label: 'Project Coordinator' },
  { value: 'Designer', label: 'Designer' },
  { value: 'Execution Engineer', label: 'Execution Engineer' },
  { value: 'Purchase Manager', label: 'Purchase Manager' },
  { value: 'Factory Manager', label: 'Factory Manager' },
  { value: 'QC Inspector', label: 'QC Inspector' },
  { value: 'Installer', label: 'Installer' },
  { value: 'Accountant', label: 'Accountant' },
];

const MEMBER_TABS = [
  { key: 'ALL', label: 'All Members' },
  { key: 'DCM', label: 'DCMs' },
  { key: 'MANAGER', label: 'Managers' },
  { key: 'ARCHITECT', label: 'Architects' },
];

const WorkloadBadge = ({ workload }) => {
  const value = String(workload || 'Low').toUpperCase();
  let tone = 'green';
  if (value === 'HIGH') tone = 'rose';
  else if (value === 'MEDIUM') tone = 'amber';

  return (
    <Badge tone={tone} className="px-2.5 py-1 text-xs uppercase tracking-wider">
      {workload || 'Low'}
    </Badge>
  );
};

const RoleBadge = ({ roleLabel, role }) => {
  const label = roleLabel || role || 'Member';
  const norm = String(role || roleLabel || '').toUpperCase();

  let tone = 'blue';
  if (norm.includes('DCM')) tone = 'brand';
  else if (norm.includes('MANAGER') || norm.includes('ADMIN')) tone = 'violet';
  else if (norm.includes('ARCHITECT')) tone = 'amber';

  return <Badge tone={tone}>{label}</Badge>;
};

/* ------------------------------------------------------------- View Member Modal */

const ViewMemberModal = ({ item, onClose }) => {
  const { data, loading, error } = useAsync(
    () => (item ? membersApi.get(item.id || item._id).then((r) => r.data) : Promise.resolve(null)),
    [item]
  );

  const member = data || item;
  const initials = member?.name
    ? member.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'M';

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title="Member Details"
      subtitle={`Viewing profile and project allocations for ${item?.name || 'Member'}`}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {loading ? (
        <Loading label="Loading details..." />
      ) : error ? (
        <ErrorState error={error} />
      ) : (
        <div className="space-y-6">
          {/* Header Profile Info */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/50">
            <div className="w-12 h-12 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-700 dark:text-brand-400 font-bold text-base flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{member?.name}</h2>
                <RoleBadge roleLabel={member?.displayRole} role={member?.role} />
                <WorkloadBadge workload={member?.workload} />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{member?.department || 'General Department'}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Number</p>
              <p className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 mt-1">{member?.phone || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">{member?.email || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Projects</p>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">{member?.projectCount ?? 0} Projects</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Workload Capacity</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1">{member?.workload || 'Low'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</p>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">Active</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Member Since</p>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-1">{date(member?.createdAt)}</p>
            </div>
          </div>

          {/* Assigned Projects Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Folder className="w-4 h-4 text-brand-500" />
              Assigned Projects ({member?.assignedProjects?.length || 0})
            </h4>

            {member?.assignedProjects && member.assignedProjects.length > 0 ? (
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                <Table
                  keyField="id"
                  columns={[
                    { key: 'code', header: 'Code', render: (p) => <span className="font-bold text-slate-900 dark:text-slate-100">{p.code}</span> },
                    { key: 'name', header: 'Project Name', render: (p) => p.name },
                    { key: 'stage', header: 'Stage', render: (p) => <StatusBadge status={p.stage} /> },
                    { key: 'value', header: 'Contract Value', align: 'right', render: (p) => currency(p.value, { compact: true }) },
                  ]}
                  rows={member.assignedProjects}
                />
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-center text-xs text-slate-500 dark:text-slate-400">
                No active projects assigned to this member currently.
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

/* ------------------------------------------------------------- Edit Member Modal */

const EditMemberModal = ({ item, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: item?.name || '',
    phone: item?.phone || '',
    email: item?.email || '',
    role: item?.displayRole || item?.role || 'DCM',
  });

  const [formErrors, setFormErrors] = useState({});

  const { execute, pending, error } = useAction(
    (payload) => membersApi.update(item.id || item._id, payload),
    {
      onSuccess: () => {
        setFormErrors({});
        onSuccess();
        onClose();
      },
    }
  );

  const handleChange = (field) => (e) => {
    const val = e?.target?.value ?? e;
    setForm((prev) => ({ ...prev, [field]: val }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!form.name || form.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }

    const phoneVal = validatePhoneNumber(form.phone, '+91', true);
    if (!phoneVal.isValid) {
      errors.phone = phoneVal.error || 'Valid contact number is required';
    }

    const emailVal = validateEmail(form.email, true);
    if (!emailVal.isValid) {
      errors.email = emailVal.error || 'Valid email address is required';
    }

    if (!form.role) {
      errors.role = 'Role selection is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateForm()) return;

    execute({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
    });
  };

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title={`Edit Member — ${item?.name || ''}`}
      subtitle="Update contact details, email, or role assignment for this member"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={pending} icon={Pencil}>
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400">
            {error.message || 'Failed to update member. Please try again.'}
          </div>
        )}

        <Field label="Name" required error={formErrors.name}>
          <Input
            value={form.name}
            onChange={handleChange('name')}
            placeholder="e.g. Rajesh Sharma"
            required
          />
        </Field>

        <Field label="Contact Number" required error={formErrors.phone}>
          <PhoneInput
            value={form.phone}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, phone: e.target.value }));
              if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
            }}
            required
          />
        </Field>

        <Field label="Email" required error={formErrors.email}>
          <EmailInput
            value={form.email}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, email: e.target.value }));
              if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
            }}
            placeholder="e.g. rajesh@embellish.com"
            required
          />
        </Field>

        <Field label="Role" required error={formErrors.role}>
          <Select
            value={form.role}
            onChange={handleChange('role')}
            options={ROLE_OPTIONS}
            required
          />
        </Field>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------- Delete Member Confirm Modal */

const DeleteMemberConfirmModal = ({ item, onClose, onSuccess }) => {
  const { execute, pending, error } = useAction(
    () => membersApi.remove(item.id || item._id),
    {
      onSuccess: () => {
        onSuccess();
        onClose();
      },
    }
  );

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title="Delete Member"
      subtitle="Confirm permanent deletion of this member record"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={execute} loading={pending} icon={Trash2}>
            Delete Member
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && (
          <div className="p-3 text-xs rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400">
            {error.message || 'Failed to delete member.'}
          </div>
        )}
        <p className="text-sm text-slate-800 dark:text-slate-200">
          Are you sure you want to delete <strong className="text-slate-900 dark:text-slate-100">{item?.name}</strong> ({item?.email})?
        </p>
        <p className="text-xs text-rose-500 font-medium">
          This action will remove the member record from the ERP database and update role summary counts automatically.
        </p>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------- Add Member Modal */

const AddMemberModal = ({ open, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'DCM',
  });

  const [formErrors, setFormErrors] = useState({});

  const { execute, pending, error } = useAction(
    (payload) => membersApi.create(payload),
    {
      onSuccess: () => {
        setForm({ name: '', phone: '', email: '', role: 'DCM' });
        setFormErrors({});
        onSuccess();
        onClose();
      },
    }
  );

  const handleChange = (field) => (e) => {
    const val = e?.target?.value ?? e;
    setForm((prev) => ({ ...prev, [field]: val }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!form.name || form.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }

    const phoneVal = validatePhoneNumber(form.phone, '+91', true);
    if (!phoneVal.isValid) {
      errors.phone = phoneVal.error || 'Valid contact number is required';
    }

    const emailVal = validateEmail(form.email, true);
    if (!emailVal.isValid) {
      errors.email = emailVal.error || 'Valid email address is required';
    }

    if (!form.role) {
      errors.role = 'Role selection is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateForm()) return;

    execute({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Member"
      subtitle="Register a new team member with contact details, email, and role assignment"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={pending} icon={UserPlus}>
            Add Member
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400">
            {error.message || 'Failed to create member. Please try again.'}
          </div>
        )}

        <Field label="Name" required error={formErrors.name}>
          <Input
            value={form.name}
            onChange={handleChange('name')}
            placeholder="e.g. Rajesh Sharma"
            required
            autoFocus
          />
        </Field>

        <Field label="Contact Number" required error={formErrors.phone}>
          <PhoneInput
            value={form.phone}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, phone: e.target.value }));
              if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
            }}
            required
          />
        </Field>

        <Field label="Email" required error={formErrors.email}>
          <EmailInput
            value={form.email}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, email: e.target.value }));
              if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
            }}
            placeholder="e.g. rajesh@embellish.com"
            required
          />
        </Field>

        <Field label="Role" required error={formErrors.role}>
          <Select
            value={form.role}
            onChange={handleChange('role')}
            options={ROLE_OPTIONS}
            required
          />
        </Field>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------- Main Members Page */

export const MembersPage = () => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch Summary statistics dynamically from backend DB
  const {
    data: summaryData,
    loading: summaryLoading,
    reload: reloadSummary,
  } = useAsync(() => membersApi.summary().then((res) => res.data), []);

  // Fetch Members list dynamically from backend DB
  const {
    data: membersData,
    loading: membersLoading,
    error: membersError,
    reload: reloadMembers,
  } = useAsync(() => membersApi.list().then((res) => res.data), []);

  const handleRefresh = () => {
    reloadSummary();
    reloadMembers();
  };

  const summary = summaryData || {
    totalDcms: 0,
    totalManagers: 0,
    totalArchitects: 0,
    totalProjects: 0,
  };

  const membersList = membersData || [];

  // Filter list based on active tab & search query
  const filteredMembers = useMemo(() => {
    return membersList.filter((m) => {
      // Role Filter Tab
      const roleStr = String(m.role || m.displayRole || '').toUpperCase();
      if (activeTab === 'DCM' && !roleStr.includes('DCM')) return false;
      if (
        activeTab === 'MANAGER' &&
        !roleStr.includes('MANAGER') &&
        !roleStr.includes('ADMIN')
      )
        return false;
      if (activeTab === 'ARCHITECT' && !roleStr.includes('ARCHITECT')) return false;

      // Search Query Filter
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.toLowerCase().includes(q) ||
        m.displayRole?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q)
      );
    });
  }, [membersList, activeTab, search]);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (m) => {
        const initials = m.name
          ? m.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
          : 'M';

        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-700 dark:text-brand-400 font-bold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{m.name}</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{m.department || 'General'}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'phone',
      header: 'Contact Number',
      render: (m) => (
        <span className="font-mono text-slate-800 dark:text-slate-200 text-xs font-semibold">{m.phone || '—'}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (m) => (
        <span className="text-slate-800 dark:text-slate-200 text-xs font-semibold">{m.email || '—'}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (m) => <RoleBadge roleLabel={m.displayRole} role={m.role} />,
    },
    {
      key: 'projectCount',
      header: 'Project Count',
      align: 'center',
      render: (m) => (
        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{m.projectCount ?? 0}</span>
      ),
    },
    {
      key: 'workload',
      header: 'Workload',
      align: 'center',
      render: (m) => <WorkloadBadge workload={m.workload} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (m) => (
        <div className="flex items-center justify-end gap-1.5 font-medium">
          <Button
            size="sm"
            variant="ghost"
            icon={Eye}
            onClick={() => setViewingMember(m)}
            title="View Details"
          >
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={Pencil}
            onClick={() => setEditingMember(m)}
            title="Edit Member"
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={Trash2}
            onClick={() => setDeletingMember(m)}
            title="Delete Member"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle="Manage team members, roles, project assignments, and capacities across the ERP"
        actions={
          <Button icon={UserPlus} onClick={() => setModalOpen(true)}>
            Add New Member
          </Button>
        }
      />

      {/* Summary Tiles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile
          label="Total DCMs"
          value={summaryLoading ? '…' : summary.totalDcms}
          sub="Design & Client Managers"
          icon={UserCheck}
          tone="brand"
        />
        <StatTile
          label="Total Managers"
          value={summaryLoading ? '…' : summary.totalManagers}
          sub="Operations & Admin Managers"
          icon={Briefcase}
          tone="blue"
        />
        <StatTile
          label="Total Architects"
          value={summaryLoading ? '…' : summary.totalArchitects}
          sub="External & In-house Architects"
          icon={Building2}
          tone="amber"
        />
        <StatTile
          label="Total Projects"
          value={summaryLoading ? '…' : summary.totalProjects}
          sub="Active ERP Projects"
          icon={Folder}
          tone="green"
        />
      </div>

      {/* Filter Tabs & Search Bar */}
      <Panel className="mb-4">
        <div className="px-4 pt-1">
          <Tabs
            tabs={MEMBER_TABS}
            active={activeTab}
            onChange={setActiveTab}
            syncQuery={false}
          />
        </div>
        <div className="p-3.5 sm:p-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member name, email, contact number or role..."
              className="pl-9"
            />
          </div>
        </div>
      </Panel>

      {/* Members List Table */}
      <Panel>
        {membersLoading ? (
          <Loading label="Fetching members..." />
        ) : membersError ? (
          <ErrorState error={membersError} onRetry={handleRefresh} />
        ) : (
          <>
            <Table
              columns={columns}
              rows={filteredMembers.slice((page - 1) * pageSize, page * pageSize)}
              keyField="id"
              empty={
                <EmptyState
                  title="No members found"
                  hint="Add a new member to start assigning projects and tracking capacity."
                  icon={Users}
                  action={
                    <Button size="sm" icon={UserPlus} onClick={() => setModalOpen(true)}>
                      Add New Member
                    </Button>
                  }
                />
              }
            />
            <Pagination
              currentPage={page}
              totalItems={filteredMembers.length}
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

      {/* Add Member Modal */}
      <AddMemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* View Member Modal */}
      {viewingMember && (
        <ViewMemberModal
          item={viewingMember}
          onClose={() => setViewingMember(null)}
        />
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <EditMemberModal
          item={editingMember}
          onClose={() => setEditingMember(null)}
          onSuccess={handleRefresh}
        />
      )}

      {/* Delete Member Confirm Modal */}
      {deletingMember && (
        <DeleteMemberConfirmModal
          item={deletingMember}
          onClose={() => setDeletingMember(null)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
};

export default MembersPage;
