import React, { useState } from 'react';
import {
  FileText, Send, CheckCircle2, XCircle, RefreshCw, ShieldAlert, Download,
  Plus, PlusCircle, Trash2, AlertTriangle, Percent, Calendar, DollarSign,
} from 'lucide-react';
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
 * Step 7 — the founder's gate on a big discount (> 10%).
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
      <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
          The <span className="font-bold text-emerald-400">{approval.requestedPercent}%</span> discount was approved
          {approval.decisionNote ? ` — ${approval.decisionNote}` : ''}.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: rejected ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)',
        backgroundColor: rejected ? 'rgba(244, 63, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
      }}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className={`w-5 h-5 mt-0.5 shrink-0 ${rejected ? 'text-rose-400' : 'text-amber-400'}`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: rejected ? '#fda4af' : '#fcd34d' }}>
            {rejected
              ? `The ${approval.requestedPercent}% discount was rejected`
              : `${approval.requestedPercent}% discount needs founder approval`}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {rejected
              ? `${approval.decisionNote || 'No reason recorded'}. Revise the quotation before sending it.`
              : `This discount is higher than the house limit of ${approval.thresholdPercent}%. The quotation cannot be sent or accepted until approved.`}
          </p>

          {pending && canDecide && (
            <div className="mt-3 space-y-2">
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for discount — repeat client, high volume, competitive bid..."
              />
              {decide.error && <p className="text-xs text-rose-400">{decide.error.message}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="success" loading={decide.pending} onClick={() => decide.execute(true)}>
                  Approve Discount
                </Button>
                <Button size="sm" variant="danger" loading={decide.pending} onClick={() => decide.execute(false)}>
                  Reject Discount
                </Button>
              </div>
            </div>
          )}

          {pending && !canDecide && (
            <p className="text-[11px] text-amber-400 mt-2">
              Waiting on Founder approval. You will be notified once decided.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const QuotationTab = ({ projectId, onChange }) => {
  const [approving, setApproving] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

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
      <div className="space-y-4">
        <Panel>
          <PanelHeader
            title="Quotation Section"
            subtitle="Create or generate a quotation for this project"
            icon={FileText}
            actions={
              <Button size="sm" variant="primary" icon={Plus} onClick={() => setShowManualModal(true)}>
                Create Manual Quotation
              </Button>
            }
          />
          <EmptyState
            title="No quotation created yet"
            hint="Create a quotation manually by typing details or generate automatically from the project BOQ."
            icon={FileText}
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="primary" icon={Plus} onClick={() => setShowManualModal(true)}>
                  Create Manual Quotation
                </Button>
                <Button size="sm" variant="secondary" icon={RefreshCw} loading={generate.pending} onClick={() => generate.execute()}>
                  Generate from BOQ
                </Button>
              </div>
            }
          />
          {generate.error && <p className="px-5 pb-4 text-xs text-rose-400">{generate.error.message}</p>}
        </Panel>

        <CreateManualQuotationModal
          open={showManualModal}
          onClose={() => setShowManualModal(false)}
          projectId={projectId}
          onSuccess={refresh}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DiscountApprovalNotice quotation={current} onDone={refresh} />

      <Panel>
        <PanelHeader
          title={`Quotation ${current.code}`}
          subtitle={`Version ${current.revision} · Prepared ${date(current.createdAt)}${current.validUntil ? ` · Valid until ${date(current.validUntil)}` : ''}`}
          icon={FileText}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={current.status} />
              <Button
                size="sm"
                variant="ghost"
                icon={Download}
                loading={pdf.pending}
                onClick={() => pdf.execute(current.id)}
                title="Open PDF Document"
              >
                PDF
              </Button>
              {current.status === 'DRAFT' && (
                <Button size="sm" variant="secondary" icon={Send} loading={send.pending} onClick={() => send.execute(current.id)}>
                  Send to Client
                </Button>
              )}
              {['DRAFT', 'SENT', 'REVISED'].includes(current.status) && (
                <>
                  <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => setApproving(true)}>
                    Approved
                  </Button>
                  <Button size="sm" variant="ghost" icon={XCircle} loading={reject.pending} onClick={() => reject.execute(current.id)}>
                    Rejected
                  </Button>
                </>
              )}
              {current.status !== 'APPROVED' && (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="secondary" icon={Plus} onClick={() => setShowManualModal(true)}>
                    New Manual Quotation
                  </Button>
                  <Button size="sm" variant="ghost" icon={RefreshCw} loading={generate.pending} onClick={() => generate.execute()}>
                    From BOQ
                  </Button>
                </div>
              )}
            </div>
          }
        />

        {/* Key Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-alt)' }}>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Quotation No</span>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{current.code}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Version</span>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>Rev {current.revision}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Discount %</span>
            <p className="text-sm font-bold numeric text-amber-400 mt-0.5">
              {current.discountPercent || 0}% ({currency(current.discountAmount || 0)})
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Margin %</span>
            <p className="text-sm font-bold numeric text-emerald-400 mt-0.5">
              {current.marginPercent || 0}% ({currency(current.marginAmount || 0)})
            </p>
          </div>
        </div>

        {(generate.error || send.error || reject.error || pdf.error) && (
          <p className="px-5 pt-3 text-xs text-rose-400">
            {(generate.error || send.error || reject.error || pdf.error).message}
          </p>
        )}

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Particular</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Qty</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Unit</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Rate</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {current.lines.map((line, index) => (
                <tr key={index} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{line.particular}</td>
                  <td className="px-4 py-2.5 text-right numeric" style={{ color: 'var(--text-secondary)' }}>{number(line.quantity)}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{line.unit}</td>
                  <td className="px-4 py-2.5 text-right numeric" style={{ color: 'var(--text-secondary)' }}>{currency(line.rate)}</td>
                  <td className="px-4 py-2.5 text-right numeric font-semibold" style={{ color: 'var(--text-primary)' }}>{currency(line.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td colSpan={4} className="px-4 py-2 text-right text-xs" style={{ color: 'var(--text-muted)' }}>Subtotal</td>
                <td className="px-4 py-2 text-right numeric font-medium" style={{ color: 'var(--text-primary)' }}>{currency(current.subtotal)}</td>
              </tr>
              {current.discountAmount > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                    Discount ({current.discountPercent}%)
                  </td>
                  <td className="px-4 py-2 text-right numeric text-amber-400 font-semibold">−{currency(current.discountAmount)}</td>
                </tr>
              )}
              {current.marginAmount > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                    Margin ({current.marginPercent}%)
                  </td>
                  <td className="px-4 py-2 text-right numeric text-emerald-400 font-semibold">+{currency(current.marginAmount)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-xs" style={{ color: 'var(--text-muted)' }}>GST @ {current.gstPercent}%</td>
                <td className="px-4 py-2 text-right numeric" style={{ color: 'var(--text-secondary)' }}>{currency(current.gstAmount)}</td>
              </tr>
              <tr className="border-t-2" style={{ borderColor: 'var(--border-strong)' }}>
                <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Grand Total</td>
                <td className="px-4 py-3 text-right numeric text-lg font-bold text-emerald-400">
                  {currency(current.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-5 py-4 border-t flex flex-wrap gap-6 text-xs" style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="mb-1" style={{ color: 'var(--text-muted)' }}>Payment Terms</p>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {current.paymentTerms.tokenPercent}% token · {current.paymentTerms.advancePercent}% advance ·{' '}
              {current.paymentTerms.balancePercent}% before installation
            </p>
          </div>
          {current.validUntil && (
            <div>
              <p className="mb-1" style={{ color: 'var(--text-muted)' }}>Validity</p>
              <p className="font-medium text-amber-400">Valid until {date(current.validUntil)}</p>
            </div>
          )}
          {current.approvedByClient && (
            <div>
              <p className="mb-1" style={{ color: 'var(--text-muted)' }}>Approved By</p>
              <p className="font-medium text-emerald-400">{current.approvedByClient} on {date(current.approvedAt)}</p>
            </div>
          )}
        </div>
      </Panel>

      {superseded.length > 0 && (
        <Panel>
          <PanelHeader title="Earlier Revisions" subtitle="Archived versions kept for audit" icon={FileText} />
          <div className="p-4 space-y-2">
            {superseded.map((quotation) => (
              <div key={quotation.id} className="flex items-center justify-between text-xs py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{quotation.code}</strong> · Version {quotation.revision} · {date(quotation.createdAt)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="numeric font-semibold text-emerald-400">{currency(quotation.grandTotal)}</span>
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

      <CreateManualQuotationModal
        open={showManualModal}
        onClose={() => setShowManualModal(false)}
        projectId={projectId}
        onSuccess={refresh}
      />
    </div>
  );
};

/* Modal for Manual Quotation Creation */
import { getLocalDate } from '../../../utils/format';

const CreateManualQuotationModal = ({ open, onClose, projectId, onSuccess }) => {
  const [code, setCode] = useState('');
  const [revision, setRevision] = useState(1);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [marginPercent, setMarginPercent] = useState(0);
  const [validUntil, setValidUntil] = useState(getLocalDate());
  const [gstPercent, setGstPercent] = useState(18);
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [tokenPercent, setTokenPercent] = useState(10);
  const [advancePercent, setAdvancePercent] = useState(60);
  const [balancePercent, setBalancePercent] = useState(30);

  const [lines, setLines] = useState([
    { particular: 'Curtains & Drapery Installation', quantity: 1, unit: 'sft', rate: 15000, discountPercent: 0 },
  ]);

  const createManual = useAction(
    (payload) => quotationsApi.create(payload),
    {
      onSuccess: () => {
        onClose();
        onSuccess?.();
      },
    }
  );

  const addLine = () => {
    setLines([...lines, { particular: '', quantity: 1, unit: 'nos', rate: 0, discountPercent: 0 }]);
  };

  const removeLine = (index) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index, field, value) => {
    const next = [...lines];
    next[index] = { ...next[index], [field]: value };
    setLines(next);
  };

  const subtotal = lines.reduce((sum, line) => {
    const gross = (Number(line.quantity) || 0) * (Number(line.rate) || 0);
    const disc = gross * ((Number(line.discountPercent) || 0) / 100);
    return sum + (gross - disc);
  }, 0);

  const discountAmount = (subtotal * (Number(discountPercent) || 0)) / 100;
  const taxableAmount = subtotal - discountAmount;
  const marginAmount = (taxableAmount * (Number(marginPercent) || 0)) / 100;
  const gstAmount = (taxableAmount * (Number(gstPercent) || 18)) / 100;
  const grandTotal = taxableAmount + gstAmount;

  const handleSubmit = (e) => {
    e.preventDefault();
    createManual.execute({
      project: projectId,
      code: code || undefined,
      revision: Number(revision) || 1,
      discountPercent: Number(discountPercent) || 0,
      marginPercent: Number(marginPercent) || 0,
      gstPercent: Number(gstPercent) || 18,
      validUntil: validUntil || undefined,
      notes,
      termsAndConditions,
      paymentTerms: {
        tokenPercent: Number(tokenPercent) || 10,
        advancePercent: Number(advancePercent) || 60,
        balancePercent: Number(balancePercent) || 30,
      },
      lines,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Manual Quotation"
      subtitle="Fill in quotation fields, version, discount %, margin %, validity, and line items"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {createManual.error && <p className="text-xs text-rose-400">{createManual.error.message}</p>}

        {/* Top Field Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Quotation No (Code)">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Auto-generated if empty"
            />
          </Field>
          <Field label="Version / Revision">
            <Input
              type="number"
              min={1}
              value={revision}
              onChange={(e) => setRevision(e.target.value)}
            />
          </Field>
          <Field label="Valid Until">
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </Field>
        </div>

        {/* Pricing Metrics & Approval Warning */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Discount %">
            <Input
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
            />
          </Field>
          <Field label="Margin %">
            <Input
              type="number"
              min={0}
              max={100}
              value={marginPercent}
              onChange={(e) => setMarginPercent(e.target.value)}
            />
          </Field>
          <Field label="GST %">
            <Input
              type="number"
              min={0}
              value={gstPercent}
              onChange={(e) => setGstPercent(e.target.value)}
            />
          </Field>
        </div>

        {/* > 10% Discount Founder Approval Alert */}
        {Number(discountPercent) > 10 && (
          <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              ⚠️ Discount exceeds 10%. Founder approval workflow will automatically be triggered on creation.
            </p>
          </div>
        )}

        {/* Line Items Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="field-label mb-0">Quotation Line Items</label>
            <Button size="sm" variant="ghost" icon={PlusCircle} type="button" onClick={addLine}>
              Add Item
            </Button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-alt)' }}>
                <div className="col-span-4">
                  <Input
                    placeholder="Particular / Description"
                    value={line.particular}
                    onChange={(e) => updateLine(idx, 'particular', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    placeholder="Unit"
                    value={line.unit}
                    onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    placeholder="Rate"
                    value={line.rate}
                    onChange={(e) => updateLine(idx, 'rate', e.target.value)}
                  />
                </div>
                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="p-1 text-rose-400 hover:text-rose-300 transition"
                    disabled={lines.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculation Summary Panel */}
        <div className="p-3 rounded-lg border space-y-1.5 text-xs numeric" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-alt)' }}>
          <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
            <span>Subtotal:</span>
            <span style={{ color: 'var(--text-primary)' }}>{currency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>Discount ({discountPercent}%):</span>
              <span>−{currency(discountAmount)}</span>
            </div>
          )}
          {marginAmount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Margin ({marginPercent}%):</span>
              <span>+{currency(marginAmount)}</span>
            </div>
          )}
          <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
            <span>GST ({gstPercent}%):</span>
            <span style={{ color: 'var(--text-secondary)' }}>{currency(gstAmount)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            <span>Grand Total:</span>
            <span className="text-emerald-400">{currency(grandTotal)}</span>
          </div>
        </div>

        {/* Payment Terms Split */}
        <div>
          <label className="field-label">Payment Schedule Split (%)</label>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Token %">
              <Input type="number" value={tokenPercent} onChange={(e) => setTokenPercent(e.target.value)} />
            </Field>
            <Field label="Advance %">
              <Input type="number" value={advancePercent} onChange={(e) => setAdvancePercent(e.target.value)} />
            </Field>
            <Field label="Balance %">
              <Input type="number" value={balancePercent} onChange={(e) => setBalancePercent(e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Notes & Terms */}
        <Field label="Terms & Conditions / Notes">
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special terms, delivery window, warranty policies..."
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={createManual.pending}>
            Save Quotation
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const ApproveModal = ({ open, onClose, quotation, action }) => {
  const [approvedByClient, setApprovedByClient] = useState('');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Client Approved Quotation"
      subtitle="Stamps contract value and raises token invoice"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="success"
            loading={action.pending}
            onClick={() => action.execute({ approvedByClient: approvedByClient || undefined })}
          >
            Confirm Approval
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {action.error && <p className="text-xs text-rose-400">{action.error.message}</p>}

        <Field label="Approved by Client Name">
          <Input value={approvedByClient} onChange={(e) => setApprovedByClient(e.target.value)} placeholder="e.g. Mr. Hiral" />
        </Field>

        <div className="rounded-lg border p-4 space-y-2 text-xs" style={{ backgroundColor: 'var(--bg-surface-alt)', borderColor: 'var(--border)' }}>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>On approval the ERP will:</p>
          <ul className="space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <li>• Stamp contract value at <b className="text-emerald-400">{currency(quotation.grandTotal)}</b></li>
            <li>• Raise {quotation.paymentTerms.tokenPercent}% token invoice: <b className="text-emerald-400">{currency((quotation.grandTotal * quotation.paymentTerms.tokenPercent) / 100)}</b></li>
            <li>• Advance project workflow to token step</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default QuotationTab;
