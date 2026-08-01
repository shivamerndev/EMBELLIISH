import React from 'react';
import { UserCog } from 'lucide-react';
import { usersApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { date, humanise } from '../../utils/format';
import {
  PageHeader, Panel, PanelHeader, Table, Badge, StatusBadge,
  Loading, ErrorState, EmptyState,
} from '../../components/ui';

export const TeamPage = () => {
  const { data, loading, error, reload } = useAsync(() => usersApi.list({ limit: 100 }).then((r) => r.data.items), []);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader title="Team" subtitle="Who works on which part of the spine" />

      <Panel>
        <PanelHeader title="People" subtitle="Roles decide what each person can see and change" icon={UserCog} />
        <Table
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (u) => (
                <div>
                  <p className="text-slate-200">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
              ),
            },
            { key: 'role', header: 'Role', render: (u) => <Badge tone="blue">{humanise(u.role)}</Badge> },
            { key: 'department', header: 'Department', render: (u) => u.department || '—' },
            { key: 'phone', header: 'Phone', render: (u) => u.phone || '—' },
            { key: 'lastLogin', header: 'Last signed in', render: (u) => (u.lastLoginAt ? date(u.lastLoginAt) : 'Never') },
            {
              key: 'active',
              header: 'Status',
              render: (u) => <StatusBadge status={u.isActive ? 'ACTIVE' : 'CANCELLED'} label={u.isActive ? 'Active' : 'Disabled'} />,
            },
          ]}
          rows={data || []}
          empty={<EmptyState title="No users yet" icon={UserCog} />}
        />
      </Panel>
    </div>
  );
};

export default TeamPage;
