import React from 'react';
import { Pencil, Eye, Calendar, User, ArrowRight } from 'lucide-react';
import { Button, DelayBadge } from '../ui';

const OverallStatusBadge = ({ value }) => {
  const styles = {
    NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    ASSIGNED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    UNDER_QUALIFICATION: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    REJECTED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
    HOLD: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    ON_HOLD: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    FOLLOW_UP: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    FOLLOWUP: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    IN_PROGRESS: 'bg-sky-200 text-sky-900 dark:bg-sky-700 dark:text-sky-100',
    APPROVED: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-600 dark:text-emerald-100',
  };
  const key = value || 'NEW';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase rounded shadow-2xs ${styles[key] || styles.NEW}`}>
      {key.replace(/_/g, ' ')}
    </span>
  );
};

export const FollowUpCard = ({ item, onEdit, onView }) => {
  const clientNameVal = item.clientName || item.companyName || item.name || '—';
  const contactPersonVal = item.contactPerson || item.contactName || '—';
  const followUpDateVal = item.followUpDate || item.nextFollowUpDate || item.dueDate;
  const assignedPersonVal = item.assignedPerson || item.assignedDcmName || item.assignedDcm?.name || 'Unassigned';

  return (
    <div
      onClick={() => (onView ? onView(item) : onEdit ? onEdit(item) : null)}
      className="group relative flex flex-col justify-between p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-amber-500/50 dark:hover:border-amber-500/40 transition-all cursor-pointer"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                {item.code || 'LD'}
              </span>
              <OverallStatusBadge value={item.overallStatus || item.status} />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {clientNameVal}
            </h4>
          </div>
          <DelayBadge dueDate={followUpDateVal} isCompleted={item.overallStatus === 'APPROVED' || item.overallStatus === 'REJECTED'} />
        </div>

        {/* Info */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 my-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Contact:</span>
            <span className="font-medium">{contactPersonVal} ({item.phone || '—'})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Follow-up Date:</span>
            <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
              {followUpDateVal ? new Date(followUpDateVal).toLocaleDateString('en-GB') : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Assigned Person:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{assignedPersonVal}</span>
          </div>
        </div>

        {item.nextAction && (
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-xs mb-3">
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold block uppercase">Next Action</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">{item.nextAction}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-auto" onClick={(e) => e.stopPropagation()}>
        <span className="text-[10px] text-slate-400 font-mono">
          Last updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-GB') : '—'}
        </span>

        <div className="flex items-center gap-1">
          {onView && <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(item)} title="View Details" />}
          {onEdit && <Button size="sm" variant="secondary" icon={Pencil} onClick={() => onEdit(item)}>Update Follow-up</Button>}
        </div>
      </div>
    </div>
  );
};

export default FollowUpCard;
