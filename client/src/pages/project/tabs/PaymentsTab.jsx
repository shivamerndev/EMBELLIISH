import React, { useState } from 'react';
import { IndianRupee, Plus, Check, FileText, FileDown } from 'lucide-react';
import { paymentsApi, invoicesApi, transactionsApi, documentsApi } from '../../../api';
import { useAsync, useAction } from '../../../hooks/useAsync';
import { currency, date, humanise } from '../../../utils/format';
import {
  Panel, PanelHeader, Table, Button, Badge, StatusBadge, Progress, Modal, Field,
  Input, Select, Loading, ErrorState, EmptyState, StatTile,
} from '../../../components/ui';

/**
 * Steps 9, 10 and 18 — the milestone ladder. These are the records the workflow
 * gates read, so this tab is where a project gets unblocked.
 */

const RecordPaymentModal = ({ open, onClose, projectId, schedule, invoices, onDone }) => {
  const [form, setForm] = useState({ milestone: 'TOKEN', amount: '', mode: 'NEFT', referenceNo: '', invoice: '' });

  const { execute, pending, error } = useAction(
    (payload) => paymentsApi.create(payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // Default the amount to whatever is still outstanding on the chosen milestone.
  const chooseMilestone = (event) => {
    const milestone = event.target.value;
    const row = schedule?.find((entry) => entry.milestone === milestone);
    const matchingInvoice = invoices?.find((inv) => inv.milestone === milestone && inv.status !== 'PAID');
    setForm((prev) => ({
      ...prev,
      milestone,
      amount: row?.balance ? String(row.balance) : '',
      invoice: matchingInvoice?.id || '',
    }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a payment"
      subtitle="Only cleared payments open the workflow gates"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={pending}
            onClick={() =>
              execute({
                project: projectId,
                milestone: form.milestone,
                amount: Number(form.amount),
                mode: form.mode,
                referenceNo: form.referenceNo || undefined,
                invoice: form.invoice || undefined,
                status: 'CLEARED',
              })
            }
          >
            Record as cleared
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60">
            <p className="text-xs text-rose-200">{error.message}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Milestone" required>
            <Select
              value={form.milestone}
              onChange={chooseMilestone}
              options={[
                { value: 'TOKEN', label: 'Token (10%)' },
                { value: 'ADVANCE', label: 'Advance (60%)' },
                { value: 'BALANCE', label: 'Balance (30%)' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </Field>
          <Field label="Amount (₹)" required>
            <Input type="number" value={form.amount} onChange={set('amount')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Mode">
            <Select
              value={form.mode}
              onChange={set('mode')}
              options={['NEFT', 'RTGS', 'UPI', 'CHEQUE', 'CASH', 'CARD', 'OTHER'].map((v) => ({ value: v, label: v }))}
            />
          </Field>
          <Field label="Reference no.">
            <Input value={form.referenceNo} onChange={set('referenceNo')} placeholder="NEFT/TOKEN/8891" />
          </Field>
        </div>

        <Field label="Against invoice" hint="Optional — keeps the invoice balance in step">
          <Select
            value={form.invoice}
            onChange={set('invoice')}
            placeholder="—"
            options={(invoices || []).map((inv) => ({
              value: inv.id,
              label: `${inv.code} · ${humanise(inv.milestone)} · ${currency(inv.total)}`,
            }))}
          />
        </Field>
      </div>
    </Modal>
  );
};

export const PaymentsTab = ({ projectId, project, onChange }) => {
  const [recording, setRecording] = useState(false);

  const { data: summary, loading, error, reload } = useAsync(
    () => paymentsApi.summary(projectId).then((r) => r.data),
    [projectId]
  );
  const { data: payments, reload: reloadPayments } = useAsync(
    () => paymentsApi.list({ project: projectId, limit: 50 }).then((r) => r.data.items),
    [projectId]
  );
  const { data: invoices, reload: reloadInvoices } = useAsync(
    () => invoicesApi.list({ project: projectId, limit: 50 }).then((r) => r.data.items),
    [projectId]
  );
  const { data: ledger } = useAsync(
    () => transactionsApi.ledger(projectId).then((r) => r.data),
    [projectId]
  );

  const refresh = () => { reload(); reloadPayments(); reloadInvoices(); onChange?.(); };

  const raiseInvoice = useAction(
    (milestone) => invoicesApi.raiseMilestone(projectId, { milestone }),
    { onSuccess: refresh }
  );
  const invoicePdf = useAction((id) => documentsApi.invoice(id));

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  if (!project.contractValue) {
    return (
      <Panel>
        <PanelHeader title="Payments" subtitle="Steps 9, 10 and 18" icon={IndianRupee} />
        <EmptyState
          title="No contract value yet"
          hint="Milestones are a share of the approved quotation. Approve one first, and the 10 / 60 / 30 ladder appears here."
          icon={IndianRupee}
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatTile label="Contract value" value={currency(summary.contractValue, { compact: true })} icon={IndianRupee} />
        <StatTile label="Received" value={currency(summary.totalReceived, { compact: true })} sub={`${summary.percentReceived}%`} tone="green" icon={IndianRupee} />
        <StatTile label="Outstanding" value={currency(summary.totalOutstanding, { compact: true })} tone={summary.totalOutstanding > 0 ? 'amber' : 'green'} icon={IndianRupee} />
        <StatTile
          label="Project margin"
          value={ledger ? currency(ledger.margin, { compact: true }) : '—'}
          sub={ledger ? `${ledger.marginPercent}% · spent ${currency(ledger.spent, { compact: true })}` : undefined}
          tone="violet"
          icon={IndianRupee}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Milestone ladder"
          subtitle="10% token · 60% advance · 30% before installation"
          icon={IndianRupee}
          actions={<Button size="sm" icon={Plus} onClick={() => setRecording(true)}>Record payment</Button>}
        />

        <div className="p-5 space-y-4">
          {summary.schedule.map((row) => {
            const invoice = invoices?.find((inv) => inv.milestone === row.milestone && inv.status !== 'CANCELLED');
            const percentPaid = row.due ? Math.min(100, (row.received / row.due) * 100) : 0;

            return (
              <div key={row.milestone}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200">{humanise(row.milestone)}</span>
                    <Badge tone="slate">{row.percent}%</Badge>
                    {row.cleared && <Badge tone="green"><Check className="w-3 h-3 mr-1" />Cleared</Badge>}
                    {invoice && <Badge tone="slate">{invoice.code}</Badge>}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs numeric text-slate-400">
                      {currency(row.received)} of {currency(row.due)}
                    </span>
                    {!invoice && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={FileText}
                        loading={raiseInvoice.pending}
                        onClick={() => raiseInvoice.execute(row.milestone)}
                      >
                        Raise invoice
                      </Button>
                    )}
                  </div>
                </div>
                <Progress value={percentPaid} tone={row.cleared ? 'green' : 'amber'} />
              </div>
            );
          })}
          {raiseInvoice.error && <p className="text-xs text-rose-400">{raiseInvoice.error.message}</p>}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Receipts" subtitle="Money actually received against this project" />
        <Table
          columns={[
            { key: 'code', header: 'Receipt', render: (p) => p.code },
            { key: 'milestone', header: 'Milestone', render: (p) => humanise(p.milestone) },
            { key: 'amount', header: 'Amount', align: 'right', render: (p) => currency(p.amount) },
            { key: 'mode', header: 'Mode', render: (p) => p.mode },
            { key: 'ref', header: 'Reference', render: (p) => p.referenceNo || '—' },
            { key: 'date', header: 'Received', render: (p) => date(p.receivedAt) },
            { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
          ]}
          rows={payments || []}
          empty={<EmptyState title="No payments recorded yet" icon={IndianRupee} />}
        />
      </Panel>

      <Panel>
        <PanelHeader title="Invoices" subtitle="Demands raised against the contract" />
        <Table
          columns={[
            { key: 'code', header: 'Invoice', render: (i) => i.code },
            { key: 'milestone', header: 'Milestone', render: (i) => humanise(i.milestone) },
            { key: 'total', header: 'Total', align: 'right', render: (i) => currency(i.total) },
            { key: 'paid', header: 'Paid', align: 'right', render: (i) => currency(i.amountPaid) },
            { key: 'issued', header: 'Issued', render: (i) => date(i.issueDate) },
            { key: 'due', header: 'Due', render: (i) => date(i.dueDate) },
            { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
            {
              key: 'pdf',
              header: '',
              align: 'right',
              render: (i) => (
                <button
                  type="button"
                  onClick={() => invoicePdf.execute(i.id)}
                  className="p-1.5 text-stone-500 hover:text-brand-400 rounded transition"
                  title="Open the invoice PDF"
                >
                  <FileDown className="w-3.5 h-3.5" />
                </button>
              ),
            },
          ]}
          rows={invoices || []}
          empty={<EmptyState title="No invoices raised yet" icon={FileText} />}
        />
      </Panel>

      <RecordPaymentModal
        open={recording}
        onClose={() => setRecording(false)}
        projectId={projectId}
        schedule={summary.schedule}
        invoices={invoices}
        onDone={refresh}
      />
    </div>
  );
};

export default PaymentsTab;
