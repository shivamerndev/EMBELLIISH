import React from 'react';
import { Eye, Pencil, MapPin, Calendar, UserCheck, Paperclip, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { Button, Badge, DelayBadge } from '../ui';
import { currency, date } from '../../utils/format';

const BUDGET_TONES = {
  ECONOMY: 'slate',
  MID_RANGE: 'blue',
  PREMIUM: 'violet',
  LUXURY: 'amber',
  ULTRA_LUXURY: 'brand',
};

export const SalesStageCard = ({ lead, stageKey, onView, onEdit, onRowClick }) => {
  const code = lead.code || 'LD';
  const clientName = lead.clientName || lead.companyName || '—';
  const location = lead.siteAddress || lead.location || '—';
  const priority = lead.priority || 'MEDIUM';
  const budgetTier = lead.budgetClassification || 'MID_RANGE';
  const estValue = Number(lead.contractValue || lead.budgetEstimate || lead.estimatedBudget || lead.quotationTotal || 0);

  // Extract stage-specific date and status
  let dueDate = lead.dueDate || lead.siteVisitDueDate || lead.measurement?.dueDate || lead.qualificationDueDate;
  let isCompleted = false;

  if (stageKey === 'pre-site') {
    dueDate = lead.siteVisitDueDate || lead.dueDate;
    isCompleted = Boolean(lead.actualSiteVisitDateTime);
  } else if (stageKey === 'measurement') {
    dueDate = lead.measurement?.dueDate || lead.measurementDueDate || lead.dueDate;
    isCompleted = Boolean(lead.measurement?.capturedAt || lead.measurementCaptured);
  } else if (stageKey === 'boq') {
    dueDate = lead.boqDueDate || lead.dueDate;
    isCompleted = lead.boqStatus === 'COMPLETED' || lead.boqStatus === 'APPROVED';
  } else if (stageKey === 'quotation') {
    dueDate = lead.quotationDueDate || lead.dueDate;
    isCompleted = lead.quotationStatus === 'APPROVED' || lead.quotationStatus === 'SENT';
  } else if (stageKey === 'client-approval') {
    dueDate = lead.approvalDueDate || lead.dueDate;
    isCompleted = lead.clientApprovalStatus === 'APPROVED';
  } else if (stageKey === 'kyc') {
    dueDate = lead.kycDueDate || lead.dueDate;
    isCompleted = lead.kycStatus === 'VERIFIED' || lead.status === 'CONVERTED';
  }

  const handleCardClick = () => {
    if (onRowClick) {
      onRowClick(lead);
    } else if (onView) {
      onView(lead);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col justify-between p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-amber-500/50 dark:hover:border-amber-500/40 transition-all cursor-pointer"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                {code}
              </span>
              <Badge tone={priority === 'HIGH' ? 'rose' : priority === 'MEDIUM' ? 'amber' : 'slate'}>
                {priority}
              </Badge>
              <Badge tone={BUDGET_TONES[budgetTier] || 'blue'}>{budgetTier}</Badge>
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {clientName}
            </h4>
          </div>
          <DelayBadge dueDate={dueDate} isCompleted={isCompleted} />
        </div>

        {/* Details grid */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 my-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{location}</span>
          </div>

          {lead.assignedInstaller?.name && (
            <div className="flex items-center gap-2 truncate">
              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Installer: {lead.assignedInstaller.name}</span>
            </div>
          )}

          {lead.status && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/40 text-[11px]">
              <span className="text-slate-400">Stage Status:</span>
              <Badge tone={lead.status === 'CONVERTED' || lead.status === 'APPROVED' ? 'emerald' : lead.status === 'QUALIFIED' ? 'blue' : 'slate'}>
                {lead.status}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400">Value / Budget:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {currency(estValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-auto" onClick={(e) => e.stopPropagation()}>
        <span className="text-[10px] text-slate-400 font-mono">
          {dueDate ? date(dueDate) : '—'}
        </span>

        <div className="flex items-center gap-1">
          {onView && (
            <Button
              size="sm"
              variant="ghost"
              icon={Eye}
              onClick={() => onView(lead)}
              title="View Details"
            />
          )}
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              icon={Pencil}
              onClick={() => onEdit(lead)}
              title="Edit / Update Stage"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesStageCard;
