import React from 'react';
import { Pencil, Trash2, Eye, Phone, Mail, MapPin, Paperclip, User, IndianRupee } from 'lucide-react';
import { Button, DelayBadge } from '../ui';
import { formatBudgetDisplay } from '../../utils/format';

const BudgetClassBadge = ({ value }) => {
  const styles = {
    A: 'bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
    B: 'bg-sky-200 text-sky-900 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40',
    C: 'bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
    D: 'bg-rose-200 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
  };
  return (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold rounded-md border shadow-2xs ${styles[value] || styles.A}`}>
      Tier {value || 'A'}
    </span>
  );
};

export const LeadCard = ({ lead, onView, onEdit, onDelete }) => {
  const formattedDate = lead.captureDateTime || (lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-GB') : '—');
  const clientNameVal = lead.clientName || lead.companyName || lead.name || '—';
  const contactPersonVal = lead.contactPerson || lead.contactName || '—';
  const sourceVal = lead.source || lead.leadSource || 'Direct';
  const archName = lead.architectName || (typeof lead.architect === 'object' ? (lead.architect?.name || lead.architect?.firm) : lead.architect);

  return (
    <div
      onClick={() => onView && onView(lead)}
      className="group relative flex flex-col justify-between p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-amber-500/50 dark:hover:border-amber-500/40 transition-all cursor-pointer"
    >
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                {lead.code || 'LEAD'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                {sourceVal}
              </span>
              <BudgetClassBadge value={lead.budgetClassification || 'A'} />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {clientNameVal}
            </h4>
          </div>
          <DelayBadge dueDate={lead.dueDate || lead.qualificationDueDate || lead.createdAt} isCompleted={lead.status === 'CONVERTED' || lead.status === 'QUALIFIED'} />
        </div>

        {/* Contact info & Meta */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 my-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium truncate">{contactPersonVal}</span>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-2 font-mono">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2 truncate">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {(lead.location || lead.pincode || lead.pinCode) && (
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {[lead.location, lead.pincode || lead.pinCode].filter(Boolean).join(' - ')}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
            <span>Budget: <strong className="text-slate-800 dark:text-slate-200">{formatBudgetDisplay(lead.indicativeBudget || lead.budget)}</strong></span>
            {archName && <span className="truncate max-w-[120px]" title={`Architect: ${archName}`}>Arch: {archName}</span>}
          </div>
        </div>

        {lead.requirementSummary && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic bg-slate-50 dark:bg-slate-950/60 p-2 rounded-md border border-slate-100 dark:border-slate-800/40 mb-3">
            "{lead.requirementSummary}"
          </p>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-auto" onClick={(e) => e.stopPropagation()}>
        <span className="text-[10px] text-slate-400 font-mono">{formattedDate}</span>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            icon={Eye}
            onClick={() => onView && onView(lead)}
            title="View Details"
          />
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              icon={Pencil}
              onClick={() => onEdit(lead)}
              title="Edit Lead"
            />
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              icon={Trash2}
              onClick={() => onDelete(lead)}
              className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
              title="Delete Lead"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
