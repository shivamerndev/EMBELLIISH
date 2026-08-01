import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, PhoneCall, UserCheck, ArrowRightCircle, XCircle, Users } from 'lucide-react';
import { leadsApi, architectsApi, usersApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { currency, relative, humanise } from '../../utils/format';
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
    clientName: '', phone: '', email: '', location: '', projectType: 'VILLA',
    source: 'ARCHITECT', architect: '', budget: '', roomCount: '', requirement: '',
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
          <Field label="Phone" required>
            <Input value={form.phone} onChange={set('phone')} placeholder="98990 01122" required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email">
            <Input type="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={set('location')} placeholder="Delhi" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Source">
            <Select
              value={form.source}
              onChange={set('source')}
              options={['ARCHITECT', 'REFERRAL', 'WALK_IN', 'WEBSITE', 'EXHIBITION', 'SOCIAL', 'OTHER'].map((v) => ({ value: v, label: humanise(v) }))}
            />
          </Field>
          <Field label="Architect">
            <Select
              value={form.architect}
              onChange={set('architect')}
              placeholder="—"
              options={(architects || []).map((a) => ({ value: a.id, label: `${a.name}${a.firm ? ` · ${a.firm}` : ''}` }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Project type">
            <Select
              value={form.projectType}
              onChange={set('projectType')}
              options={['VILLA', 'BUNGALOW', 'APARTMENT', 'FARMHOUSE', 'HOTEL', 'OFFICE', 'RETAIL', 'OTHER'].map((v) => ({ value: v, label: humanise(v) }))}
            />
          </Field>
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
            {form.qualified ? 'Mark qualified' : 'Mark unqualified'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        <Checkbox
          label="This lead is worth pursuing"
          checked={form.qualified}
          onChange={(e) => setForm((prev) => ({ ...prev, qualified: e.target.checked }))}
        />

        {form.qualified ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Location"><Input value={form.location} onChange={set('location')} /></Field>
              <Field label="Rooms"><Input type="number" value={form.roomCount} onChange={set('roomCount')} /></Field>
              <Field label="Budget (₹)"><Input type="number" value={form.budget} onChange={set('budget')} /></Field>
            </div>
            <Field label="Notes from the call">
              <Textarea value={form.notes} onChange={set('notes')} placeholder="Delhi. 12 rooms. Around ₹35 lakhs." />
            </Field>
          </>
        ) : (
          <Field label="Why not?" required>
            <Textarea value={form.lostReason} onChange={set('lostReason')} placeholder="Budget far below our range" />
          </Field>
        )}
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------ convert */

const ConvertModal = ({ lead, onClose }) => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState(`${lead?.clientName} — ${humanise(lead?.projectType)}`);

  const { execute, pending, error } = useAction((payload) => leadsApi.convert(lead.id, payload), {
    onSuccess: (response) => navigate(`/projects/${response.data.project.id}`),
  });

  return (
    <Modal
      open={Boolean(lead)}
      onClose={onClose}
      title="Convert to a project"
      subtitle="Step 3 — the client and project records are created together"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={pending} onClick={() => execute({ projectName })}>Create project</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}
        <Field label="Project name" required>
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
        </Field>
        <p className="text-xs text-slate-500">
          The project opens at the Site Visit stage. Its client record carries over the phone number, so
          a returning client is recognised rather than duplicated.
        </p>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------- assign */

const AssignModal = ({ lead, onClose, onDone }) => {
  const [assignedDCM, setAssignedDCM] = useState(lead?.assignedDCM?.id || '');
  const { data: dcms } = useAsync(
    () => Promise.all([usersApi.byRole('DCM'), usersApi.byRole('SENIOR_DCM')]).then(([a, b]) => [...a.data, ...b.data]),
    []
  );

  const { execute, pending, error } = useAction((payload) => leadsApi.assign(lead.id, payload), {
    onSuccess: () => { onDone(); onClose(); },
  });

  return (
    <Modal
      open={Boolean(lead)}
      onClose={onClose}
      title="Assign a DCM"
      subtitle='Step 3 — "Rahul tum ye project handle karo."'
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={pending} disabled={!assignedDCM} onClick={() => execute({ assignedDCM })}>
            Assign
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}
        <Field label="Design Consultant Manager" required>
          <Select
            value={assignedDCM}
            onChange={(e) => setAssignedDCM(e.target.value)}
            placeholder="Select a DCM"
            options={(dcms || []).map((u) => ({ value: u.id, label: `${u.name} · ${humanise(u.role)}` }))}
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
          <p className="font-medium text-slate-200">{lead.clientName}</p>
          <p className="text-xs text-slate-500">{lead.code} · {lead.phone}</p>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (lead) => (
        <div>
          <p className="text-xs text-slate-300">{humanise(lead.source)}</p>
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
          {lead.status === 'QUALIFIED' && (
            <Button size="sm" icon={ArrowRightCircle} onClick={() => setConverting(lead)}>
              Convert
            </Button>
          )}
          {lead.status === 'CONVERTED' && lead.convertedProject && (
            <Link to={`/projects/${lead.convertedProject}`} className="text-xs text-blue-400 hover:text-blue-300 px-2">
              Open project
            </Link>
          )}
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
      {qualifying && <QualifyModal lead={qualifying} onClose={() => setQualifying(null)} onDone={reload} />}
      {converting && <ConvertModal lead={converting} onClose={() => setConverting(null)} />}
      {assigning && <AssignModal lead={assigning} onClose={() => setAssigning(null)} onDone={reload} />}
    </div>
  );
};

export default LeadsPage;
