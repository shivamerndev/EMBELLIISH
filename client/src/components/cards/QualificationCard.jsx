import React from 'react';
import { Pencil, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button, DelayBadge } from '../ui';

const TriStateBadge = ({ label, value }) => {
  const styles = {
    YES: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    NO: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    NOT_KNOWN: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  };
  const labelMap = { YES: 'Yes', NO: 'No', PENDING: 'Pending', NOT_KNOWN: 'Not Known' };
  const key = value || 'PENDING';
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-500">{label}:</span>
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${styles[key] || styles.PENDING}`}>
        {labelMap[key] || key}
      </span>
    </div>
  );
};

const DecisionBadge = ({ value }) => {
  const styles = {
    APPROVED: 'bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300',
    REJECTED: 'bg-rose-600 text-white dark:bg-rose-700',
    PENDING: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-300',
    'NOT DECIDED': 'bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300',
  };
  const key = value || 'PENDING';
  const labelMap = { APPROVED: 'Approved', REJECTED: 'Rejected', PENDING: 'Pending', 'NOT DECIDED': 'Not Decided' };
  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-md border shadow-2xs ${styles[key] || styles.PENDING}`}>
      {labelMap[key] || key}
    </span>
  );
};

export const QualificationCard = ({ item, onEdit, onView }) => {
  const clientNameVal = item.clientName || item.companyName || item.name || '—';
  const contactPersonVal = item.contactPerson || item.contactName || '—';
  const dueDateVal = item.qualificationDueDate || item.dueDate;

  return (
    <div
      onClick={() => (onView ? onView(item) : onEdit ? onEdit(item) : null)}
      className="group relative flex flex-col justify-between p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-amber-500/50 dark:hover:border-amber-500/40 transition-all cursor-pointer"
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                {item.code || 'LD'}
              </span>
              <DecisionBadge value={item.qualificationDecision} />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {clientNameVal}
            </h4>
          </div>
          <DelayBadge dueDate={dueDateVal} isCompleted={item.qualificationDecision === 'APPROVED' || item.qualificationDecision === 'REJECTED'} />
        </div>

        {/* Contact info & Verification criteria */}
        <div className="space-y-1.5 text-xs my-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">Contact:</span>
            <span className="font-medium">{contactPersonVal} ({item.phone || '—'})</span>
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/40">
            <TriStateBadge label="Requirement" value={item.requirementVerified} />
            <TriStateBadge label="Budget/Pricing" value={item.budgetPricingVerified} />
            <TriStateBadge label="Timeline Confirmed" value={item.timelineConfirmed} />
            <TriStateBadge label="Decision Maker" value={item.decisionMakerIdentified} />
          </div>
        </div>

        {item.rejectionHoldReason && (
          <p className="text-[11px] text-rose-700 dark:text-rose-300 italic bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200 dark:border-rose-800/40 mb-3 line-clamp-2">
            Reason: {item.rejectionHoldReason}
          </p>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-auto" onClick={(e) => e.stopPropagation()}>
        <span className="text-[10px] text-slate-400 font-mono">
          Due: {dueDateVal ? new Date(dueDateVal).toLocaleDateString('en-GB') : '—'}
        </span>

        <div className="flex items-center gap-1">
          {onView && <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(item)} title="View Lead" />}
          {onEdit && <Button size="sm" variant="secondary" icon={Pencil} onClick={() => onEdit(item)}>Update Qualification</Button>}
        </div>
      </div>
    </div>
  );
};

export default QualificationCard;
