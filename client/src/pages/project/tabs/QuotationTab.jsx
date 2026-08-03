import React, { useState } from 'react';
import { FileText, Send, CheckCircle2, XCircle, RefreshCw, ShieldAlert, Download } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectCan } from '../../../features/auth/authSlice';
import { quotationsApi, documentsApi } from '../../../api';
import { useAsync, useAction } from '../../../hooks/useAsync';
import { currency, number, date } from '../../../utils/format';
import {
  Panel, PanelHeader, Button, StatusBadge, Badge, Modal, Field, Input, Textarea,
  Loading, ErrorState, EmptyState,
} from '../../../components/ui';

/**
 * Step 7 — the founder's gate on a big discount.
 *
 * Shown to everyone, because the DCM needs to know their quotation is stalled and
 * why; only somebody carrying `discount:approve` gets the buttons.
 */
const DiscountApprovalNotice = ({ quotation, onDone }) => {
  const [note, setNote] = useState('');
  const canDecide = useSelector(selectCan('discount:approve'));

  const approval = quotation.discountApproval;

  const decide = useAction(
    (approved) =>
      approved
        ? quotationsApi.approveDiscount(quotation.id, { note })
        : quotationsApi.rejectDiscount(quotation.id, { note }),
    { onSuccess: onDone }
  );

  if (!approval?.required || approval.status === 'NOT_REQUIRED') return null;

  const pending = approval.status === 'PENDING';
  const rejected = approval.status === 'REJECTED';

  if (approval.status === 'APPROVED') {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <p className="text-xs text-emerald-200/90">
          The {approval.requestedPercent}% discount was approved
          {approval.decisionNote ? ` — ${approval.decisionNote}` : ''}.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        rejected ? 'border-rose-500/30 bg-rose-500/[0.06]' : 'border-amber-500/30 bg-amber-500/[0.06]'
      }`}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className={`w-4 h-4 mt-0.5 shrink-0 ${rejected ? 'text-rose-400' : 'text-amber-400'}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold ${rejected ? 'text-rose-300' : 'text-amber-300'}`}>
            {rejected
              ? `The ${approval.requestedPercent}% discount was rejected`
              : `${approval.requestedPercent}% discount needs founder approval`}
          </p>
          <p className={`text-xs mt-1 ${rejected ? 'text-rose-200/80' : 'text-amber-200/80'}`}>
            {rejected
              ? `${approval.decisionNote || 'No reason recorded'}. Revise the quotation before sending it.`
              : `This is past the ${approval.thresholdPercent}% a DCM may give. The quotation cannot be sent or accepted until it is signed off.`}
          </p>

          {pending && canDecide && (
            <div className="mt-3 space-y-2">
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why this is (or is not) acceptable — repeat client, competitive bid, margin floor…"
              />
              {decide.error && <p className="text-xs text-rose-400">{decide.error.message}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="success" loading={decide.pending} onClick={() => decide.execute(true)}>
                  Approve the discount
                </Button>
                <Button size="sm" variant="danger" loading={decide.pending} onClick={() => decide.execute(false)}>
                  Reject
                </Button>
              </div>
            </div>
          )}

          {pending && !canDecide && (
            <p className="text-[11px] text-amber-200/60 mt-2">
              Waiting on the founder. You will be notified when it is decided.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/** Step 8/9 — the quotation falls out of the BOQ, and approval sets the contract value. */
export const QuotationTab = ({ projectId, onChange }) => {
  const [approving, setApproving] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => quotationsApi.list({ project: projectId, limit: 20 }).then((r) => r.data.items),
    [projectId]
  );

  const refresh = () => { reload(); onChange?.(); };

  const generate = useAction(() => quotationsApi.generate(projectId, {}), { onSuccess: refresh });
  const send = useAction((id) => quotationsApi.send(id), { onSuccess: refresh });
  const approve = useAction((payload) => quotationsApi.approve(current.id, payload), {
    onSuccess: () => { refresh(); setApproving(false); },
  });
  const reject = useAction((id) => quotationsApi.reject(id, { reason: 'Client declined' }), { onSuccess: refresh });
  const pdf = useAction((id) => documentsApi.quotation(id));

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const current = data?.find((q) => q.isCurrent) || data?.[0];
  const superseded = (data || []).filter((q) => q.id !== current?.id);

  if (!current) {
    return (
      <Panel>
        <PanelHeader title="Quotation" subtitle="Step 8 — generated from the consumption sheet" icon={FileText} />
        <EmptyState
          title="No quotation yet"
          hint="The ERP already knows fabric quantity, accessories, motors, stitching and installation, so the quotation is generated rather than typed."
          icon={FileText}
          action={
            <Button size="sm" icon={RefreshCw} loading={generate.pending} onClick={() => generate.execute()}>
              Generate from BOQ
            </Button>
          }
        />
        {generate.error && <p className="px-5 pb-4 text-xs text-rose-400">{generate.error.message}</p>}
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <DiscountApprovalNotice quotation={current} onDone={refresh} />

      <Panel>
        <PanelHeader
          title={`Quotation ${current.code}`}
          subtitle={`Revision ${current.revision} · prepared ${date(current.createdAt)}${current.validUntil ? ` · valid to ${date(current.validUntil)}` : ''}`}
          icon={FileText}
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge status={current.status} />
              <Button
                size="sm"
                variant="ghost"
                icon={Download}
                loading={pdf.pending}
                onClick={() => pdf.execute(current.id)}
                title="Open the client-facing PDF"
              >
                PDF
              </Button>
              {current.status === 'DRAFT' && (
                <Button size="sm" variant="secondary" icon={Send} loading={send.pending} onClick={() => send.execute(current.id)}>
                  Send to client
                </Button>
              )}
              {['DRAFT', 'SENT', 'REVISED'].includes(current.status) && (
                <>
                  <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => setApproving(true)}>
                    Client approved
                  </Button>
                  <Button size="sm" variant="ghost" icon={XCircle} loading={reject.pending} onClick={() => reject.execute(current.id)}>
                    Rejected
                  </Button>
                </>
              )}
              {current.status !== 'APPROVED' && (
                <Button size="sm" variant="ghost" icon={RefreshCw} loading={generate.pending} onClick={() => generate.execute()}>
                  New revision
                </Button>
              )}
            </div>
          }
        />

        {(generate.error || send.error || reject.error || pdf.error) && (
          <p className="px-5 pt-3 text-xs text-rose-400">
            {(generate.error || send.error || reject.error || pdf.error).message}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Particular</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Qty</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Unit</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rate</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {current.lines.map((line, index) => (
                <tr key={index} className="border-b border-slate-800/50">
                  <td className="px-4 py-2.5 text-slate-300">{line.particular}</td>
                  <td className="px-4 py-2.5 text-right numeric text-slate-300">{number(line.quantity)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{line.unit}</td>
                  <td className="px-4 py-2.5 text-right numeric text-slate-400">{currency(line.rate)}</td>
                  <td className="px-4 py-2.5 text-right numeric text-slate-100 font-medium">{currency(line.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-xs text-slate-400">Subtotal</td>
                <td className="px-4 py-2 text-right numeric text-slate-200">{currency(current.subtotal)}</td>
              </tr>
              {current.discountAmount > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-xs text-slate-400">
                    Discount ({current.discountPercent}%)
                  </td>
                  <td className="px-4 py-2 text-right numeric text-amber-400">−{currency(current.discountAmount)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-xs text-slate-400">GST @ {current.gstPercent}%</td>
                <td className="px-4 py-2 text-right numeric text-slate-200">{currency(current.gstAmount)}</td>
              </tr>
              <tr className="border-t border-slate-700">
                <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-slate-100">Grand total</td>
                <td className="px-4 py-3 text-right numeric text-lg font-bold text-emerald-400">
                  {currency(current.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-slate-800 flex flex-wrap gap-6 text-xs">
          <div>
            <p className="text-slate-500 mb-1">Payment terms</p>
            <p className="text-slate-300">
              {current.paymentTerms.tokenPercent}% token · {current.paymentTerms.advancePercent}% advance ·{' '}
              {current.paymentTerms.balancePercent}% before installation
            </p>
          </div>
          {current.approvedByClient && (
            <div>
              <p className="text-slate-500 mb-1">Approved by</p>
              <p className="text-slate-300">{current.approvedByClient} on {date(current.approvedAt)}</p>
            </div>
          )}
        </div>
      </Panel>

      {superseded.length > 0 && (
        <Panel>
          <PanelHeader title="Earlier revisions" subtitle="Kept for audit" />
          <div className="p-4 space-y-2">
            {superseded.map((quotation) => (
              <div key={quotation.id} className="flex items-center justify-between text-xs py-1.5">
                <span className="text-slate-400">
                  {quotation.code} · revision {quotation.revision} · {date(quotation.createdAt)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="numeric text-slate-300">{currency(quotation.grandTotal)}</span>
                  <StatusBadge status={quotation.status} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <ApproveModal
        open={approving}
        onClose={() => setApproving(false)}
        quotation={current}
        action={approve}
      />
    </div>
  );
};

const ApproveModal = ({ open, onClose, quotation, action }) => {
  const [approvedByClient, setApprovedByClient] = useState('');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Client approved the quotation"
      subtitle='Step 9 — "Done."'
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="success"
            loading={action.pending}
            onClick={() => action.execute({ approvedByClient: approvedByClient || undefined })}
          >
            Confirm approval
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {action.error && <p className="text-xs text-rose-400">{action.error.message}</p>}

        <Field label="Approved by">
          <Input value={approvedByClient} onChange={(e) => setApprovedByClient(e.target.value)} placeholder="Mr. Hiral" />
        </Field>

        <div className="rounded-lg bg-[#251e18] border border-[#3d3026] p-4 space-y-2 text-xs">
          <p className="text-slate-400">On approval the ERP will:</p>
          <ul className="space-y-1 text-slate-300">
            <li>• stamp the contract value at <b>{currency(quotation.grandTotal)}</b></li>
            <li>• raise the {quotation.paymentTerms.tokenPercent}% token invoice, {' '}
              <b>{currency((quotation.grandTotal * quotation.paymentTerms.tokenPercent) / 100)}</b></li>
            <li>• unlock the token stage of the workflow</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default QuotationTab;
