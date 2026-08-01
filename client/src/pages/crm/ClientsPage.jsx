import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Building2 } from 'lucide-react';
import { clientsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { currency, date } from '../../utils/format';
import {
  PageHeader, Panel, Table, Button, Input, Loading, ErrorState, EmptyState, StatusBadge,
} from '../../components/ui';

export const ClientsPage = () => {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const { data, loading, error, reload } = useAsync(
    () => clientsApi.list({ ...(search && { search }), limit: 100 }).then((r) => r.data),
    [search]
  );

  const { data: detail } = useAsync(
    () => (expanded ? clientsApi.projects(expanded).then((r) => r.data) : Promise.resolve(null)),
    [expanded]
  );

  const columns = [
    {
      key: 'name',
      header: 'Client',
      render: (client) => (
        <div>
          <p className="font-medium text-slate-200">{client.name}</p>
          <p className="text-xs text-slate-500">{client.code} · {client.phone}</p>
        </div>
      ),
    },
    { key: 'company', header: 'Company', render: (c) => c.company || '—' },
    { key: 'architect', header: 'Architect', render: (c) => c.architect?.name || '—' },
    {
      key: 'site',
      header: 'Site',
      render: (c) => [c.siteAddress?.city, c.siteAddress?.state].filter(Boolean).join(', ') || '—',
    },
    { key: 'since', header: 'Client since', render: (c) => date(c.createdAt) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (client) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setExpanded(expanded === client.id ? null : client.id)}
        >
          {expanded === client.id ? 'Hide projects' : 'Projects'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Converted leads, and every project they have run with Embellish"
        actions={
          <Link to="/crm/leads">
            <Button variant="secondary" icon={Users}>Leads</Button>
          </Link>
        }
      />

      <Panel className="mb-4 p-4">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone or company"
            className="pl-9"
          />
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
            empty={<EmptyState title="No clients yet" hint="Convert a qualified lead to create one." icon={Building2} />}
          />
        )}
      </Panel>

      {expanded && detail && (
        <Panel className="mt-4">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-100">{detail.client.name} — projects</h3>
          </div>
          <Table
            keyField="_id"
            columns={[
              { key: 'code', header: 'Code', render: (p) => p.code },
              { key: 'name', header: 'Project', render: (p) => p.name },
              { key: 'stage', header: 'Stage', render: (p) => <StatusBadge status={p.stage} /> },
              {
                key: 'value',
                header: 'Value',
                align: 'right',
                render: (p) => currency(p.contractValue || p.estimatedValue, { compact: true }),
              },
              { key: 'started', header: 'Started', render: (p) => date(p.createdAt) },
              {
                key: 'open',
                header: '',
                align: 'right',
                render: (p) => (
                  <Link to={`/projects/${p._id}`} className="text-xs text-blue-400 hover:text-blue-300">
                    Open
                  </Link>
                ),
              },
            ]}
            rows={detail.projects || []}
            empty={<EmptyState title="No projects for this client yet" />}
          />
        </Panel>
      )}
    </div>
  );
};

export default ClientsPage;
