import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, IndianRupee, BookOpen } from 'lucide-react';
import { invoicesApi, paymentsApi, transactionsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { currency, date, humanise } from '../../utils/format';
import {
  PageHeader, Panel, PanelHeader, Table, Tabs, StatusBadge, StatTile,
  Loading, ErrorState, EmptyState,
} from '../../components/ui';

const TABS = [
  { key: 'invoices', label: 'Invoices' },
  { key: 'payments', label: 'Receipts' },
  { key: 'ledger', label: 'Ledger' },
];

export const AccountsPage = () => {
  const [tab, setTab] = useState('invoices');

  const { data: invoices, loading, error, reload } = useAsync(
    () => invoicesApi.list({ limit: 200 }).then((r) => r.data.items),
    []
  );
  const { data: payments } = useAsync(() => paymentsApi.list({ limit: 200 }).then((r) => r.data.items), []);
  const { data: transactions } = useAsync(() => transactionsApi.list({ limit: 200 }).then((r) => r.data.items), []);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const invoiced = (invoices || []).reduce((sum, i) => sum + (i.total || 0), 0);
  const collected = (payments || []).filter((p) => p.status === 'CLEARED').reduce((sum, p) => sum + p.amount, 0);
  const outstanding = (invoices || [])
    .filter((i) => ['ISSUED', 'PARTIALLY_PAID'].includes(i.status))
    .reduce((sum, i) => sum + Math.max(0, i.total - (i.amountPaid || 0)), 0);
  const spent = (transactions || []).filter((t) => t.direction === 'DEBIT').reduce((sum, t) => sum + t.amount, 0);

  const projectLink = (project) =>
    project?.id || project?._id ? (
      <Link to={`/projects/${project.id || project._id}`} className="text-brand-400 hover:text-brand-300">
        {project.code}
      </Link>
    ) : (
      '—'
    );

  return (
    <div>
      <PageHeader title="Accounts" subtitle="Steps 9, 10 and 18 — the money that unlocks the workflow" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatTile label="Invoiced" value={currency(invoiced, { compact: true })} icon={Receipt} />
        <StatTile label="Collected" value={currency(collected, { compact: true })} tone="green" icon={IndianRupee} />
        <StatTile label="Outstanding" value={currency(outstanding, { compact: true })} tone={outstanding ? 'amber' : 'green'} icon={IndianRupee} />
        <StatTile label="Paid out" value={currency(spent, { compact: true })} tone="violet" icon={BookOpen} />
      </div>

      <Panel className="mb-4">
        <div className="px-4 pt-1">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </Panel>

      {tab === 'invoices' && (
        <Panel>
          <PanelHeader title="Invoices" subtitle="Milestone demands across every project" icon={Receipt} />
          <Table
            columns={[
              { key: 'code', header: 'Invoice', render: (i) => i.code },
              { key: 'project', header: 'Project', render: (i) => projectLink(i.project) },
              { key: 'client', header: 'Client', render: (i) => i.client?.name || '—' },
              { key: 'milestone', header: 'Milestone', render: (i) => humanise(i.milestone) },
              { key: 'total', header: 'Total', align: 'right', render: (i) => currency(i.total) },
              { key: 'paid', header: 'Paid', align: 'right', render: (i) => currency(i.amountPaid) },
              {
                key: 'balance',
                header: 'Balance',
                align: 'right',
                render: (i) => {
                  const balance = Math.max(0, i.total - (i.amountPaid || 0));
                  return balance > 0 ? <span className="text-amber-400">{currency(balance)}</span> : currency(0);
                },
              },
              { key: 'due', header: 'Due', render: (i) => date(i.dueDate) },
              { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
            ]}
            rows={invoices || []}
            empty={<EmptyState title="No invoices raised" hint="Approving a quotation raises the token invoice automatically." icon={Receipt} />}
          />
        </Panel>
      )}

      {tab === 'payments' && (
        <Panel>
          <PanelHeader title="Receipts" subtitle="Only cleared receipts open a workflow gate" icon={IndianRupee} />
          <Table
            columns={[
              { key: 'code', header: 'Receipt', render: (p) => p.code },
              { key: 'project', header: 'Project', render: (p) => projectLink(p.project) },
              { key: 'milestone', header: 'Milestone', render: (p) => humanise(p.milestone) },
              { key: 'amount', header: 'Amount', align: 'right', render: (p) => currency(p.amount) },
              { key: 'mode', header: 'Mode', render: (p) => p.mode },
              { key: 'ref', header: 'Reference', render: (p) => p.referenceNo || '—' },
              { key: 'received', header: 'Received', render: (p) => date(p.receivedAt) },
              { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
            ]}
            rows={payments || []}
            empty={<EmptyState title="No payments recorded" icon={IndianRupee} />}
          />
        </Panel>
      )}

      {tab === 'ledger' && (
        <Panel>
          <PanelHeader title="Cash ledger" subtitle="Client receipts in, vendor and factory costs out" icon={BookOpen} />
          <Table
            columns={[
              { key: 'date', header: 'When', render: (t) => date(t.transactionDate) },
              { key: 'code', header: 'Entry', render: (t) => t.code },
              { key: 'project', header: 'Project', render: (t) => projectLink(t.project) },
              {
                key: 'direction',
                header: 'Direction',
                render: (t) => <StatusBadge status={t.direction} label={t.direction === 'CREDIT' ? 'In' : 'Out'} />,
              },
              { key: 'category', header: 'Category', render: (t) => humanise(t.category) },
              {
                key: 'amount',
                header: 'Amount',
                align: 'right',
                render: (t) => (
                  <span className={t.direction === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'}>
                    {t.direction === 'CREDIT' ? '+' : '−'}{currency(t.amount)}
                  </span>
                ),
              },
              { key: 'description', header: 'Description', render: (t) => t.description || '—' },
            ]}
            rows={transactions || []}
            empty={<EmptyState title="No ledger entries yet" icon={BookOpen} />}
          />
        </Panel>
      )}
    </div>
  );
};

export default AccountsPage;
