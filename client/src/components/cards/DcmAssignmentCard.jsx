import React from 'react';
import { Pencil, ArrowRightCircle, User, Phone, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button, DelayBadge } from '../ui';

const DcmCapacityBadge = ({ value }) => {
  const isAvailable = value === 'AVAILABLE' || !value || value === 'Available';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border shadow-2xs ${isAvailable
        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
        : 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
        }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
      {isAvailable ? 'Available' : 'Overloaded'}
    </span>
  );
};

const LeadPriorityBadge = ({ value }) => {
  const styles = {
    HIGH: 'bg-rose-600 text-white dark:bg-rose-700',
    MEDIUM: 'bg-sky-600 text-white dark:bg-sky-700',
    LOW: 'bg-slate-500 text-white dark:bg-slate-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase rounded shadow-2xs ${styles[value] || styles.MEDIUM}`}>
      {value || 'MEDIUM'}
    </span>
  );
};

export const DcmAssignmentCard = ({ item, onAssign, onRowClick }) => {
  const clientNameVal = item.clientName || item.companyName || item.name || '—';
  const contactPersonVal = item.contactPerson || item.contactName || '—';
  const dcmName = item.assignedDcmName || item.assignedDcm?.name || 'Unassigned';

  return (
    <div
      onClick={() => onRowClick && onRowClick(item)}
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
              <LeadPriorityBadge value={item.priority} />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {clientNameVal}
            </h4>
          </div>
          <DelayBadge dueDate={item.assignmentDueDate || item.dueDate} isCompleted={Boolean(item.assignedDcmName && !item.reassignmentRequired)} />
        </div>

        {/* Contact Info */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 my-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Contact:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{contactPersonVal}</span>
          </div>
          {item.phone && (
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-400">Phone:</span>
              <span>{item.phone}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/40">
            <span className="text-slate-400">Assigned DCM:</span>
            <span className="font-bold text-brand-600 dark:text-brand-400">{dcmName}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">DCM Load:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-slate-700 dark:text-slate-300">{item.dcmActiveProjectCount || 0} active</span>
              <DcmCapacityBadge value={item.dcmCapacityStatus} />
            </div>
          </div>
        </div>

        {item.reassignmentRequired && (
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-[11px] mb-3">
            <span className="font-bold block">Reassignment Needed</span>
            <span className="text-[10px] text-rose-600 dark:text-rose-400">{item.reassignmentReason || 'Workload rebalance'}</span>
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-auto" onClick={(e) => e.stopPropagation()}>
        <span className="text-[10px] text-slate-400 font-mono">
          Due: {item.assignmentDueDate ? new Date(item.assignmentDueDate).toLocaleDateString('en-GB') : '—'}
        </span>

        <Button
          size="sm"
          variant={item.reassignmentRequired ? 'danger' : 'primary'}
          icon={item.assignedDcmName ? Pencil : ArrowRightCircle}
          onClick={() => onAssign && onAssign(item)}
        >
          {item.assignedDcmName ? 'Reassign DCM' : 'Assign DCM'}
        </Button>
      </div>
    </div>
  );
};

export default DcmAssignmentCard;
