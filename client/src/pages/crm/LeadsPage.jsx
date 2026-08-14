import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, PhoneCall, UserCheck, ArrowRightCircle, ShieldCheck, Users, Pencil, Trash2, ExternalLink, Paperclip } from 'lucide-react';
import { leadsApi, architectsApi, usersApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { humanise } from '../../utils/format';
import {
  PageHeader, Panel, Button, Modal, Field, Input, Select,
  Textarea, Loading, ErrorState, EmptyState, Tabs,
} from '../../components/ui';

const STATUS_TABS = [
  { key: 'ALL', label: 'All Leads' },
  { key: 'NEW', label: 'New' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'CONVERTED', label: 'Converted' },
  { key: 'LOST', label: 'Lost' },
];


const BudgetClassBadge = ({ value }) => {
  const styles = {
    A: 'bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
    B: 'bg-sky-200 text-sky-900 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40',
    C: 'bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
    D: 'bg-rose-200 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
  };
  return (
    <span className={`inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-md border shadow-sm ${styles[value] || styles.A}`}>
      {value || 'A'}
    </span>
  );
};

const RelationshipBadge = ({ value }) => {
  const isYes = value === true || value === 'Yes' || value === 'YES';
  return (
    <span className={`inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-md shadow-sm ${isYes
        ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-600 dark:text-emerald-100'
        : 'bg-red-700 text-white dark:bg-red-800 dark:text-white'
      }`}>
      {isYes ? 'Yes' : 'No'}
    </span>
  );
};

const ArchitectInvolvedBadge = ({ value }) => {
  if (value === 'Yes' || value === true) {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-md bg-emerald-200 text-emerald-900 dark:bg-emerald-600 dark:text-emerald-100 shadow-sm">
        Yes
      </span>
    );
  }
  if (value === 'No' || value === false) {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-md bg-red-700 text-white dark:bg-red-800 dark:text-white shadow-sm">
        No
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-md bg-sky-200 text-sky-900 dark:bg-sky-700 dark:text-sky-100 shadow-sm">
      Not Known
    </span>
  );
};

/* ------------------------------------------------------------- New Lead Modal */

const NewLeadModal = ({ open, onClose, onCreated, architects }) => {
  const [form, setForm] = useState({
    code: '',
    contactPerson: '',
    phone: '',
    email: '',
    source: 'Architect',
    clientName: '',
    architectName: '',
    indicativeBudget: '',
    budgetClassification: 'A',
    location: '',
    previousClientRelationship: 'NO',
    existingRelationshipOwner: 'NA',
    requirementSummary: '',
    architectInvolved: 'Yes',
    attachmentUrl: '',
  });

  const { execute, pending, error } = useAction(
    (payload) => leadsApi.create(payload),
    { onSuccess: () => { onCreated(); onClose(); } }
  );

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = (event) => {
    event.preventDefault();
    execute({
      ...form,
      previousClientRelationship: form.previousClientRelationship === 'YES' || form.previousClientRelationship === 'Yes',
      companyName: form.clientName,
      budget: form.indicativeBudget ? Number(form.indicativeBudget.replace(/[^0-9.]/g, '')) || undefined : undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Capture New Lead"
      subtitle="Step 1 — Lead Capture sheet entry form"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={pending}>Save Lead Record</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4 pr-1">
        {error && <p className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error.message}</p>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Client Name" required>
            <Input value={form.clientName} onChange={set('clientName')} placeholder="e.g. D-table Analytics" required />
          </Field>
          <Field label="Contact Person" required>
            <Input value={form.contactPerson} onChange={set('contactPerson')} placeholder="e.g. Saskhi" required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Mobile Number" required>
            <Input value={form.phone} onChange={set('phone')} placeholder="e.g. 12345678" required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={set('email')} placeholder="asc@gamil.com" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Lead Source">
            <Select
              value={form.source}
              onChange={set('source')}
              options={[
                { value: 'Architect', label: 'Architect' },
                { value: 'Interior Designer', label: 'Interior Designer' },
              ]}
            />
          </Field>
          <Field label="Architect / Designer Name">
            <Input value={form.architectName} onChange={set('architectName')} placeholder="e.g. Wintek" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Indicative Budget">
            <Input value={form.indicativeBudget} onChange={set('indicativeBudget')} placeholder="e.g. 15 L or 1 Cr" />
          </Field>
          <Field label="Budget Classification">
            <Select
              value={form.budgetClassification}
              onChange={set('budgetClassification')}
              options={[
                { value: 'A', label: 'A (High Priority/Budget)' },
                { value: 'B', label: 'B (Medium-High)' },
                { value: 'C', label: 'C (Standard)' },
                { value: 'D', label: 'D (Basic)' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Project Location">
            <Input value={form.location} onChange={set('location')} placeholder="e.g. Aurangabad / Mumbai / Pune" />
          </Field>
          <Field label="Previous Client Relationship">
            <Select
              value={form.previousClientRelationship}
              onChange={set('previousClientRelationship')}
              options={[
                { value: 'NO', label: 'No' },
                { value: 'YES', label: 'Yes' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Existing Relationship Owner">
            <Input value={form.existingRelationshipOwner} onChange={set('existingRelationshipOwner')} placeholder="e.g. Sakshi or NA" />
          </Field>
          <Field label="Architect / Designer Involved">
            <Select
              value={form.architectInvolved}
              onChange={set('architectInvolved')}
              options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
                { value: 'Not Known', label: 'Not Known' },
              ]}
            />
          </Field>
        </div>

        <Field label="Requirement Summary">
          <Textarea value={form.requirementSummary} onChange={set('requirementSummary')} placeholder="As per given document..." />
        </Field>

        <Field label="Attachment Link (Google Drive / Web URL)">
          <Input value={form.attachmentUrl} onChange={set('attachmentUrl')} placeholder="https://drive.google.com/open?id=..." />
        </Field>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------- Edit Lead Modal */

const EditLeadModal = ({ lead, onClose, onDone }) => {
  const getInitialForm = (l) => ({
    clientName: l?.clientName || '',
    contactPerson: l?.contactPerson || '',
    phone: l?.phone || '',
    email: l?.email || '',
    source: l?.source || 'Architect',
    architectName: l?.architectName || (typeof l?.architect === 'object' ? l?.architect?.name : l?.architect) || '',
    indicativeBudget: l?.indicativeBudget || (l?.budget ? `${l.budget}` : ''),
    budgetClassification: l?.budgetClassification || 'A',
    location: l?.location || '',
    previousClientRelationship: l?.previousClientRelationship ? 'YES' : 'NO',
    existingRelationshipOwner: l?.existingRelationshipOwner || 'NA',
    requirementSummary: l?.requirementSummary || l?.requirement || '',
    architectInvolved: l?.architectInvolved || 'Yes',
    attachmentUrl: l?.attachmentUrl || '',
  });

  const [form, setForm] = useState(() => getInitialForm(lead));

  useEffect(() => {
    if (lead) {
      setForm(getInitialForm(lead));
    }
  }, [lead]);

  const { execute, pending, error } = useAction(
    (payload) => leadsApi.update(lead.id || lead._id, payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = (event) => {
    event.preventDefault();
    execute({
      ...form,
      previousClientRelationship: form.previousClientRelationship === 'YES' || form.previousClientRelationship === 'Yes',
    });
  };

  return (
    <Modal
      open={Boolean(lead)}
      onClose={onClose}
      title={`Edit Lead — ${lead?.code || ''}`}
      subtitle={`Update capture details for ${lead?.clientName || ''}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={pending}>Save Changes</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4 pr-1">
        {error && <p className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error.message}</p>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Client Name" required>
            <Input value={form.clientName} onChange={set('clientName')} required />
          </Field>
          <Field label="Contact Person">
            <Input value={form.contactPerson} onChange={set('contactPerson')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Mobile Number" required>
            <Input value={form.phone} onChange={set('phone')} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={set('email')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Lead Source">
            <Select
              value={form.source}
              onChange={set('source')}
              options={[
                { value: 'Architect', label: 'Architect' },
                { value: 'Interior Designer', label: 'Interior Designer' },
              ]}
            />
          </Field>
          <Field label="Architect / Designer Name">
            <Input value={form.architectName} onChange={set('architectName')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Indicative Budget">
            <Input value={form.indicativeBudget} onChange={set('indicativeBudget')} />
          </Field>
          <Field label="Budget Classification">
            <Select
              value={form.budgetClassification}
              onChange={set('budgetClassification')}
              options={[
                { value: 'A', label: 'A' },
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
                { value: 'D', label: 'D' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Project Location">
            <Input value={form.location} onChange={set('location')} />
          </Field>
          <Field label="Previous Client Relationship">
            <Select
              value={form.previousClientRelationship}
              onChange={set('previousClientRelationship')}
              options={[
                { value: 'NO', label: 'No' },
                { value: 'YES', label: 'Yes' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Existing Relationship Owner">
            <Input value={form.existingRelationshipOwner} onChange={set('existingRelationshipOwner')} />
          </Field>
          <Field label="Architect / Designer Involved">
            <Select
              value={form.architectInvolved}
              onChange={set('architectInvolved')}
              options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
                { value: 'Not Known', label: 'Not Known' },
              ]}
            />
          </Field>
        </div>

        <Field label="Requirement Summary">
          <Textarea value={form.requirementSummary} onChange={set('requirementSummary')} />
        </Field>

        <Field label="Attachment Link">
          <Input value={form.attachmentUrl} onChange={set('attachmentUrl')} />
        </Field>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------- Delete Lead Modal */

const DeleteLeadModal = ({ lead, onClose, onDone }) => {
  const { execute, pending, error } = useAction(
    () => leadsApi.remove(lead.id || lead._id),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  return (
    <Modal
      open={Boolean(lead)}
      onClose={onClose}
      title="Delete Lead Record"
      subtitle={`Remove lead ${lead?.code || ''}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={pending} onClick={() => execute()}>Delete</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Are you sure you want to delete lead <strong className="text-slate-900 dark:text-slate-100">{lead?.code}</strong> ({lead?.clientName})?
        </p>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------- Main Page Component */

export const LeadsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, loading, error, reload } = useAsync(
    () => leadsApi.list({ ...(tab !== 'ALL' && { status: tab }), ...(search && { search }), limit: 100 }).then((r) => r.data),
    [tab, search]
  );

  const { data: architects } = useAsync(() => architectsApi.list({ limit: 100 }).then((r) => r.data?.items || []), []);

  // Merge server records with fallback initial sample rows if server returns empty list
  const apiItems = data?.items || [];
  const leadsList = apiItems || []

  const filteredLeads = leadsList.filter((lead) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      lead.code?.toLowerCase().includes(q) ||
      lead.clientName?.toLowerCase().includes(q) ||
      lead.contactPerson?.toLowerCase().includes(q) ||
      lead.phone?.includes(q) ||
      lead.location?.toLowerCase().includes(q) ||
      lead.architectName?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="CRM — Lead Capture"
        subtitle="Manage, track, and qualify leads recorded through Architects, Interior Designers, or Direct Channels"
        actions={
          <>
            <Button icon={Plus} onClick={() => setCreating(true)}>New Lead</Button>
            <Link to="/crm/dcm-assignments">
              <Button variant="secondary" icon={UserCheck}>DCM Assignments</Button>
            </Link>
            <Link to="/crm/qualification">
              <Button variant="secondary" icon={ShieldCheck}>Qualification</Button>
            </Link>
            <Link to="/crm/follow-ups">
              <Button variant="secondary" icon={PhoneCall}>Follow-ups</Button>
            </Link>
            <Link to="/crm/clients">
              <Button variant="secondary" icon={Users}>Clients</Button>
            </Link>
          </>
        }
      />

      <Panel className="mb-4">
        <div className="px-4 pt-1">
          <Tabs
            tabs={STATUS_TABS}
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
              placeholder="Search Lead ID, Client, Contact, Location..."
              className="pl-9"
            />
          </div>
        </div>
      </Panel>

      {/* Main 16-Column Sheet Table */}
      <Panel className="overflow-hidden">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-[2300px] w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#836444] text-white font-bold border-b border-amber-300 dark:border-amber-500/30 uppercase tracking-wider whitespace-nowrap">
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Lead ID</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Capture Date & Time</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Contact Person</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Mobile Number</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Email</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Lead Source</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Client Name</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Architect / Designer Name</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Indicative Budget</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Budget Classification</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Project Location</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Previous Client Relationship</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Existing Relationship Owner</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Requirement Summary</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Architect / Designer Involved</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Attachment</th>
                  <th className="p-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="p-8 text-center text-slate-500">
                      No leads match your filter or search query.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((row) => {
                    const formattedDate = row.captureDateTime || (row.createdAt ? new Date(row.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
                    const archName = row.architectName || (typeof row.architect === 'object' ? row.architect?.name : row.architect) || '—';

                    return (
                      <tr key={row._id || row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.code}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formattedDate}</td>
                        <td className="p-3 font-medium">{row.contactPerson || '—'}</td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{row.phone || '—'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{row.email || '—'}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{row.source || '—'}</td>
                        <td className="p-3 font-semibold text-brand-600 dark:text-brand-400">{row.clientName}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{archName}</td>
                        <td className="p-3 font-medium whitespace-nowrap">{row.indicativeBudget || (row.budget ? `₹${row.budget}` : '—')}</td>
                        <td className="p-3 text-center">
                          <BudgetClassBadge value={row.budgetClassification || 'A'} />
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.location || '—'}</td>
                        <td className="p-3 text-center">
                          <RelationshipBadge value={row.previousClientRelationship} />
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{row.existingRelationshipOwner || 'NA'}</td>
                        <td className="p-3 max-w-[180px] truncate text-slate-600 dark:text-slate-400" title={row.requirementSummary || row.requirement || '—'}>
                          {row.requirementSummary || row.requirement || '—'}
                        </td>
                        <td className="p-3 text-center">
                          <ArchitectInvolvedBadge value={row.architectInvolved} />
                        </td>
                        <td className="p-3">
                          {row.attachmentUrl ? (
                            <a
                              href={row.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline max-w-[180px] truncate block"
                              title={row.attachmentUrl}
                            >
                              <Paperclip className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{row.attachmentUrl}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={UserCheck}
                              onClick={() => navigate(`/crm/dcm-assignments?search=${encodeURIComponent(row.code || '')}&assign=true`)}
                              title={`Assign DCM manager for lead ${row.code}`}
                              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs font-semibold"
                            >
                              Assign DCM
                            </Button>
                            <button
                              type="button"
                              onClick={() => setEditing(row)}
                              title="Edit lead"
                              className="p-1.5 text-slate-600 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(row)}
                              title="Delete lead"
                              className="p-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <NewLeadModal open={creating} onClose={() => setCreating(false)} onCreated={reload} architects={architects} />
      {editing && <EditLeadModal lead={editing} onClose={() => setEditing(null)} onDone={reload} />}
      {deleting && <DeleteLeadModal lead={deleting} onClose={() => setDeleting(null)} onDone={reload} />}
    </div>
  );
};

export default LeadsPage;
