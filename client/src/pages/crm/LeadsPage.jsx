import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, PhoneCall, UserCheck, ArrowRightCircle, XCircle, Users, Pencil, Trash2 } from 'lucide-react';
import { leadsApi, architectsApi, usersApi, projectsApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { currency, relative, humanise, initials } from '../../utils/format';
import {
  PageHeader, Panel, Table, Button, Badge, StatusBadge, Modal, Field, Input, Select,
  Textarea, Checkbox, Loading, ErrorState, EmptyState, Tabs,
} from '../../components/ui';

const STATUS_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'New' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'CONVERTED', label: 'Converted' },
  { key: 'LOST', label: 'Lost' },
];

/* ------------------------------------------------------------- new lead */

const NewLeadModal = ({ open, onClose, onCreated, architects }) => {
  const [form, setForm] = useState({
    clientName: '', companyName: '', phone: '', email: '', location: '', priority: 'MEDIUM', projectType: 'VILLA',
    source: 'DCM', architect: '', budget: '', roomCount: '', requirement: '', previousClientRelationship: 'NO',
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
      previousClientRelationship: form.previousClientRelationship === 'YES',
      companyName: form.companyName || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      roomCount: form.roomCount ? Number(form.roomCount) : undefined,
      architect: form.architect || undefined,
      email: form.email || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New lead"
      subtitle="Step 1 — what the desk takes down on the first call"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={pending}>Create lead</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Client name" required>
            <Input value={form.clientName} onChange={set('clientName')} placeholder="Mr. Hiral" required />
          </Field>
          <Field label="Company name">
            <Input value={form.companyName} onChange={set('companyName')} placeholder="Embelliish Corp" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone" required>
            <Input value={form.phone} onChange={set('phone')} placeholder="98990 01122" required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={set('email')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Location">
            <Input value={form.location} onChange={set('location')} placeholder="Delhi" />
          </Field>
          <Field label="Source">
            <Select
              value={form.source}
              onChange={set('source')}
              options={[
                { value: 'ARCHITECT', label: 'Architect' },
                { value: 'DCM', label: 'DCM' },
                { value: 'DIRECT_CLIENT', label: 'Direct Client' },
                { value: 'EXISTING_CLIENT', label: 'Existing Client' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <Select
              value={form.priority}
              onChange={set('priority')}
              options={[
                { value: 'HOT', label: 'Hot' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />
          </Field>
          <Field label="Architect">
            <Select
              value={form.architect}
              onChange={set('architect')}
              placeholder="—"
              options={(architects || []).map((a) => ({ value: a.id || a._id, label: `${a.name}${a.firm ? ` · ${a.firm}` : ''}` }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Previous client relationship">
            <Select
              value={form.previousClientRelationship}
              onChange={set('previousClientRelationship')}
              options={[
                { value: 'NO', label: 'No' },
                { value: 'YES', label: 'Yes' },
              ]}
            />
          </Field>
          <Field label="Project type">
            <Select
              value={form.projectType}
              onChange={set('projectType')}
              options={['VILLA', 'BUNGALOW', 'APARTMENT', 'FARMHOUSE', 'HOTEL', 'OFFICE', 'RETAIL', 'OTHER'].map((v) => ({ value: v, label: humanise(v) }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Budget (₹)">
            <Input type="number" value={form.budget} onChange={set('budget')} placeholder="3500000" />
          </Field>
          <Field label="Rooms">
            <Input type="number" value={form.roomCount} onChange={set('roomCount')} placeholder="12" />
          </Field>
        </div>

        <Field label="Requirement">
          <Textarea value={form.requirement} onChange={set('requirement')} placeholder="Luxury curtains, motorised where possible…" />
        </Field>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------- edit lead */

const EditLeadModal = ({ lead, onClose, onDone, architects }) => {
  const getInitialForm = (l) => ({
    clientName: l?.clientName || '',
    companyName: l?.companyName || '',
    phone: l?.phone || '',
    email: l?.email || '',
    location: l?.location || '',
    priority: l?.priority || 'MEDIUM',
    projectType: l?.projectType || 'VILLA',
    source: l?.source || 'DCM',
    architect: typeof l?.architect === 'object' ? (l?.architect?.id || l?.architect?._id || '') : (l?.architect || ''),
    budget: l?.budget ?? '',
    roomCount: l?.roomCount ?? '',
    requirement: l?.requirement || '',
    previousClientRelationship: l?.previousClientRelationship ? 'YES' : 'NO',
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
      previousClientRelationship: form.previousClientRelationship === 'YES',
      companyName: form.companyName || undefined,
      budget: form.budget !== '' ? Number(form.budget) : undefined,
      roomCount: form.roomCount !== '' ? Number(form.roomCount) : undefined,
      architect: form.architect || undefined,
      email: form.email || undefined,
    });
  };

  return (
    <Modal
      open={Boolean(lead)}
      onClose={onClose}
      title="Edit lead"
      subtitle={`Update lead details for ${lead?.clientName || ''}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={pending}>Save changes</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Client name" required>
            <Input value={form.clientName} onChange={set('clientName')} placeholder="Mr. Hiral" required />
          </Field>
          <Field label="Company name">
            <Input value={form.companyName} onChange={set('companyName')} placeholder="Embelliish Corp" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone" required>
            <Input value={form.phone} onChange={set('phone')} placeholder="98990 01122" required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={set('email')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Location">
            <Input value={form.location} onChange={set('location')} placeholder="Delhi" />
          </Field>
          <Field label="Source">
            <Select
              value={form.source}
              onChange={set('source')}
              options={[
                { value: 'ARCHITECT', label: 'Architect' },
                { value: 'DCM', label: 'DCM' },
                { value: 'DIRECT_CLIENT', label: 'Direct Client' },
                { value: 'EXISTING_CLIENT', label: 'Existing Client' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <Select
              value={form.priority}
              onChange={set('priority')}
              options={[
                { value: 'HOT', label: 'Hot' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />
          </Field>
          <Field label="Architect">
            <Select
              value={form.architect}
              onChange={set('architect')}
              placeholder="—"
              options={(architects || []).map((a) => ({ value: a.id || a._id, label: `${a.name}${a.firm ? ` · ${a.firm}` : ''}` }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Previous client relationship">
            <Select
              value={form.previousClientRelationship}
              onChange={set('previousClientRelationship')}
              options={[
                { value: 'NO', label: 'No' },
                { value: 'YES', label: 'Yes' },
              ]}
            />
          </Field>
          <Field label="Project type">
            <Select
              value={form.projectType}
              onChange={set('projectType')}
              options={['VILLA', 'BUNGALOW', 'APARTMENT', 'FARMHOUSE', 'HOTEL', 'OFFICE', 'RETAIL', 'OTHER'].map((v) => ({ value: v, label: humanise(v) }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Budget (₹)">
            <Input type="number" value={form.budget} onChange={set('budget')} placeholder="3500000" />
          </Field>
          <Field label="Rooms">
            <Input type="number" value={form.roomCount} onChange={set('roomCount')} placeholder="12" />
          </Field>
        </div>

        <Field label="Requirement">
          <Textarea value={form.requirement} onChange={set('requirement')} placeholder="Luxury curtains, motorised where possible…" />
        </Field>
      </form>
    </Modal>
  );
};

/* ----------------------------------------------------------- delete lead */

const DeleteLeadModal = ({ lead, onClose, onDone }) => {
  const { execute, pending, error } = useAction(
    () => leadsApi.remove(lead.id || lead._id),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  return (
    <Modal
      open={Boolean(lead)}
      onClose={onClose}
      title="Delete lead"
      subtitle={`Remove lead record for ${lead?.clientName || ''}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={pending} onClick={() => execute()}>Delete lead</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Are you sure you want to delete lead <strong className="text-slate-900 dark:text-slate-100">{lead?.code}</strong> ({lead?.clientName})? This action cannot be undone.
        </p>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------- qualification */

const QualifyModal = ({ lead, onClose, onDone }) => {
  const [form, setForm] = useState({
    qualified: true,
    budget: lead?.budget || '',
    roomCount: lead?.roomCount || '',
    location: lead?.location || '',
    notes: '',
    lostReason: '',
  });

  const { execute, pending, error } = useAction(
    (payload) => leadsApi.qualify(lead.id, payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Modal
      open={Boolean(lead)}
      onClose={onClose}
      title={`Qualify ${lead?.clientName}`}
      subtitle="Step 2 — what the Senior DCM learns on the call back"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant={form.qualified ? 'success' : 'danger'}
            loading={pending}
            onClick={() =>
              execute({
                qualified: form.qualified,
                budget: form.budget ? Number(form.budget) : undefined,
                roomCount: form.roomCount ? Number(form.roomCount) : undefined,
                location: form.location || undefined,
                notes: form.notes || undefined,
                lostReason: form.lostReason || undefined,
              })
            }
          >
            {form.qualified ? 'Save qualification' : 'Mark lost'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        <div className="flex items-center gap-4 py-2 border-b border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
            <input
              type="radio"
              name="qualified"
              checked={form.qualified}
              onChange={() => setForm((p) => ({ ...p, qualified: true }))}
              className="text-brand-500"
            />
            Qualified lead
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-rose-400">
            <input
              type="radio"
              name="qualified"
              checked={!form.qualified}
              onChange={() => setForm((p) => ({ ...p, qualified: false }))}
              className="text-rose-500"
            />
            Unqualified / Lost
          </label>
        </div>

        {form.qualified ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Confirmed budget (₹)">
                <Input type="number" value={form.budget} onChange={set('budget')} placeholder="3500000" />
              </Field>
              <Field label="Room count">
                <Input type="number" value={form.roomCount} onChange={set('roomCount')} placeholder="12" />
              </Field>
            </div>
            <Field label="Location">
              <Input value={form.location} onChange={set('location')} placeholder="Vasant Vihar, Delhi" />
            </Field>
            <Field label="Qualification notes">
              <Textarea
                value={form.notes}
                onChange={set('notes')}
                placeholder="Needs motorised tracks for double height windows, budget confirmed with spouse…"
              />
            </Field>
          </>
        ) : (
          <Field label="Why is this lost?" required>
            <Textarea
              value={form.lostReason}
              onChange={set('lostReason')}
              placeholder="Budget below house minimum, timeline mismatch, chose another vendor…"
              required
            />
          </Field>
        )}
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------- conversion */

const ConvertModal = ({ lead, onClose }) => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState(`${lead?.clientName} Villa`);
  const [estimatedValue, setEstimatedValue] = useState(lead?.budget || '');
  const [siteAddress, setSiteAddress] = useState({ line1: '', line2: '', city: lead?.location || '', state: '', pincode: '' });

  const { execute, pending, error } = useAction(
    (payload) => leadsApi.convert(lead.id, payload),
    {
      onSuccess: (res) => {
        onClose();
        const createdProject = res.data?.project;
        if (createdProject?._id || createdProject?.id) {
          navigate(`/projects/${createdProject._id || createdProject.id}`);
        } else {
          navigate('/crm/clients');
        }
      },
    }
  );

  return (
    <Modal
      open={Boolean(lead)}
      onClose={onClose}
      title={`Convert ${lead?.clientName} to Client`}
      subtitle="Step 3 — Lead qualification finished. Create client record and start project spine."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={pending}
            onClick={() =>
              execute({
                projectName: projectName || undefined,
                estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
                siteAddress: {
                  line1: siteAddress.line1 || undefined,
                  line2: siteAddress.line2 || undefined,
                  city: siteAddress.city || undefined,
                  state: siteAddress.state || undefined,
                  pincode: siteAddress.pincode || undefined,
                },
              })
            }
          >
            Create Client & Project
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        <Field label="Project Title" required>
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Mr. Hiral Villa" required />
        </Field>

        <Field label="Estimated Project Value (₹)">
          <Input type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="3500000" />
        </Field>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Initial Site Address</p>
          <Input value={siteAddress.line1} onChange={(e) => setSiteAddress((p) => ({ ...p, line1: e.target.value }))} placeholder="Address Line 1" />
          <Input value={siteAddress.line2} onChange={(e) => setSiteAddress((p) => ({ ...p, line2: e.target.value }))} placeholder="Address Line 2 (Optional)" />
          <div className="grid grid-cols-3 gap-2">
            <Input value={siteAddress.city} onChange={(e) => setSiteAddress((p) => ({ ...p, city: e.target.value }))} placeholder="City" />
            <Input value={siteAddress.state} onChange={(e) => setSiteAddress((p) => ({ ...p, state: e.target.value }))} placeholder="State" />
            <Input value={siteAddress.pincode} onChange={(e) => setSiteAddress((p) => ({ ...p, pincode: e.target.value }))} placeholder="Pincode" />
          </div>
        </div>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------- assignment */

const AssignModal = ({ lead, onClose, onDone }) => {
  const [assignedDCM, setAssignedDCM] = useState(lead?.assignedDCM?._id || lead?.assignedDCM?.id || '');
  const [note, setNote] = useState('');

  const isReassign = Boolean(lead?.assignedDCM);

  const { data: dcms } = useAsync(
    () => usersApi.byRole('DCM').then((r) => r.data),
    []
  );

  const { execute, pending, error } = useAction(
    (payload) => leadsApi.assign(lead.id || lead._id, payload),
    {
      onSuccess: () => {
        onDone();
        onClose();
      },
    }
  );

  const handleSave = () => {
    if (!assignedDCM) return;
    execute({ assignedDCM, note: note || undefined });
  };

  return (
    <Modal
      open={Boolean(lead)}
      onClose={onClose}
      title={isReassign ? `Reassign DCM — ${lead?.clientName}` : `Assign DCM — ${lead?.clientName}`}
      subtitle={isReassign ? "Transfer lead ownership to a different DCM" : "Assign an owner to manage this lead"}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={pending} disabled={!assignedDCM} onClick={handleSave}>
            {isReassign ? "Reassign DCM" : "Assign DCM"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        {isReassign && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
            Current Owner: <span className="font-semibold text-amber-200">{lead?.assignedDCM?.name}</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="field-label">Select DCM Owner <span className="text-rose-400">*</span></label>
          {!(dcms && dcms.length > 0) ? (
            <p className="text-xs text-slate-500 py-2">Loading DCMs...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {(dcms || []).map((u) => {
                const userId = u._id || u.id;
                const isSelected = assignedDCM === userId;
                return (
                  <div
                    key={userId}
                    onClick={() => setAssignedDCM(userId)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/10 text-slate-100'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-medium">{u.name}</p>
                      <p className="text-[11px] text-slate-500">{u.email}</p>
                    </div>
                    <div className="shrink-0 ml-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected ? 'border-brand-400 bg-brand-500' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Field label="Notes">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for assignment..."
          />
        </Field>
      </div>
    </Modal>
  );
};

/* --------------------------------------------------------------- page */

export const LeadsPage = () => {
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [qualifying, setQualifying] = useState(null);
  const [converting, setConverting] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, loading, error, reload } = useAsync(
    () => leadsApi.list({ ...(tab !== 'ALL' && { status: tab }), ...(search && { search }), limit: 100 }).then((r) => r.data),
    [tab, search]
  );

  const { data: architects } = useAsync(() => architectsApi.list({ limit: 100 }).then((r) => r.data.items), []);
  const { data: pipeline } = useAsync(() => leadsApi.pipeline().then((r) => r.data), []);

  const counts = Object.fromEntries((pipeline || []).map((row) => [row.status, row.count]));

  const columns = [
    {
      key: 'client',
      header: 'Client',
      render: (lead) => (
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-slate-200">{lead.clientName}</p>
            {lead.previousClientRelationship && (
              <Badge tone="purple">Repeat Client</Badge>
            )}
          </div>
          {lead.companyName && <p className="text-xs text-brand-400 font-medium">{lead.companyName}</p>}
          <p className="text-xs text-slate-500">{lead.code} · {lead.phone}</p>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (lead) => (
        <div>
          <p className="text-xs text-slate-300">{lead.source === 'DCM' ? 'DCM' : humanise(lead.source)}</p>
          {lead.architect && <p className="text-[11px] text-slate-500">{lead.architect.name}</p>}
        </div>
      ),
    },
    { key: 'location', header: 'Location', render: (lead) => lead.location || '—' },
    { key: 'rooms', header: 'Rooms', align: 'right', render: (lead) => lead.roomCount ?? '—' },
    {
      key: 'budget',
      header: 'Budget',
      align: 'right',
      render: (lead) => (lead.budget ? currency(lead.budget, { compact: true }) : '—'),
    },
    {
      key: 'dcm',
      header: 'Owner',
      render: (lead) => lead.assignedDCM?.name || <span className="text-slate-600">Unassigned</span>,
    },
    { key: 'status', header: 'Status', render: (lead) => <StatusBadge status={lead.status} /> },
    {
      key: 'followUp',
      header: 'Follow-up',
      render: (lead) =>
        lead.nextFollowUpAt ? (
          <span className={new Date(lead.nextFollowUpAt) < new Date() ? 'text-amber-400 text-xs' : 'text-xs text-slate-400'}>
            {relative(lead.nextFollowUpAt)}
          </span>
        ) : (
          <span className="text-slate-600 text-xs">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (lead) => (
        <div className="flex items-center justify-end gap-1">
          {['NEW', 'CONTACTED'].includes(lead.status) && (
            <Button size="sm" variant="secondary" icon={PhoneCall} onClick={() => setQualifying(lead)}>
              Qualify
            </Button>
          )}
          {lead.status === 'QUALIFIED' && !lead.assignedDCM && (
            <Button size="sm" variant="secondary" icon={UserCheck} onClick={() => setAssigning(lead)}>
              Assign
            </Button>
          )}
          {lead.assignedDCM && !['CONVERTED', 'LOST'].includes(lead.status) && (
            <Button size="sm" variant="secondary" icon={UserCheck} onClick={() => setAssigning(lead)}>
              Reassign DCM
            </Button>
          )}
          {lead.status === 'QUALIFIED' && (
            <Button size="sm" icon={ArrowRightCircle} onClick={() => setConverting(lead)}>
              Convert
            </Button>
          )}
          {lead.status === 'CONVERTED' && lead.convertedProject && (
            <Link to={`/projects/${lead.convertedProject}`} className="text-xs text-brand-400 hover:text-brand-300 px-2">
              Open project
            </Link>
          )}
          <button
            type="button"
            onClick={() => setEditing(lead)}
            title="Edit lead"
            className="p-1.5 text-slate-600 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleting(lead)}
            title="Delete lead"
            className="p-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Steps 1–3 — the call comes in, gets qualified, and finds an owner"
        actions={
          <>
            <Link to="/crm/clients">
              <Button variant="secondary" icon={Users}>Clients</Button>
            </Link>
            <Button icon={Plus} onClick={() => setCreating(true)}>New lead</Button>
          </>
        }
      />

      <Panel className="mb-4">
        <div className="px-4 pt-1">
          <Tabs
            tabs={STATUS_TABS.map((t) => ({ ...t, count: t.key === 'ALL' ? undefined : counts[t.key] }))}
            active={tab}
            onChange={setTab}
          />
        </div>
        <div className="p-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone or location"
              className="pl-9"
            />
          </div>
        </div>
      </Panel>

      <Panel>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Table
            columns={columns}
            rows={data?.items || []}
            empty={
              <EmptyState
                title="No leads here"
                hint="When the architect calls, this is where it starts."
                action={<Button size="sm" icon={Plus} onClick={() => setCreating(true)}>New lead</Button>}
              />
            }
          />
        )}
      </Panel>

      <NewLeadModal open={creating} onClose={() => setCreating(false)} onCreated={reload} architects={architects} />
      {editing && <EditLeadModal lead={editing} onClose={() => setEditing(null)} onDone={reload} architects={architects} />}
      {deleting && <DeleteLeadModal lead={deleting} onClose={() => setDeleting(null)} onDone={reload} />}
      {qualifying && <QualifyModal lead={qualifying} onClose={() => setQualifying(null)} onDone={reload} />}
      {converting && <ConvertModal lead={converting} onClose={() => setConverting(null)} />}
      {assigning && <AssignModal lead={assigning} onClose={() => setAssigning(null)} onDone={reload} />}
    </div>
  );
};

export default LeadsPage;
