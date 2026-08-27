import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  BadgeDollarSign,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Tag,
  UserCheck
} from 'lucide-react';
import { Badge, Button, StatusBadge, toneForStatus } from '../ui';
import { currency, date } from '../../utils/format';

const BUDGET_TONES = {
  ECONOMY: 'slate',
  MID_RANGE: 'blue',
  PREMIUM: 'violet',
  LUXURY: 'amber',
  ULTRA_LUXURY: 'brand',
};

const DetailedDrawer = ({ open, lead, onClose, onViewFull, onSiteVisit }) => {
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !lead) return null;

  const budgetVal = lead.budgetClassification || 'MID_RANGE';
  const budgetTone = BUDGET_TONES[budgetVal] || 'blue';
  const priority = lead.priority || 'MEDIUM';
  const priorityTone = priority === 'HIGH' ? 'rose' : priority === 'MEDIUM' ? 'amber' : 'slate';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full sm:max-w-xl md:max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 shrink-0">
                {lead.code || 'NO-ID'}
              </span>
              <StatusBadge status={lead.status || 'NEW'} />
              <Badge tone={budgetTone}>{budgetVal}</Badge>
              <Badge tone={priorityTone}>{priority} PRIORITY</Badge>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
              {lead.clientName || 'Unnamed Client'}
            </h2>
            {lead.location && (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <span className="truncate">{lead.location}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/80 px-4 sm:px-6 gap-4 sm:gap-6 text-xs font-medium overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors shrink-0 ${
              activeTab === 'overview'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Overview & Contact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('commercial')}
            className={`py-3 border-b-2 transition-colors shrink-0 ${
              activeTab === 'commercial'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Commercial & Team
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stages')}
            className={`py-3 border-b-2 transition-colors shrink-0 ${
              activeTab === 'stages'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Pipeline Stages
          </button>
        </div>

        {/* Scrollable Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Budget Estimate
                  </span>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {currency(lead.budgetEstimate || lead.estimatedBudget || 0)}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Acquisition Channel
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-1">
                    <Tag className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    <span>{lead.source || lead.acquisitionSource || 'Direct Client'}</span>
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-500" /> Client Contact Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Phone Number</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{lead.phone || lead.contactPhone || '—'}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email Address</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-sky-500" />
                      <span className="truncate">{lead.email || lead.contactEmail || '—'}</span>
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">Project Location</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200 flex items-start gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                      <span>{lead.location || lead.address || '—'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Description / Notes */}
              {(lead.notes || lead.remarks || lead.projectDetails) && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-brand-500" /> Notes & Requirements
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {lead.notes || lead.remarks || lead.projectDetails}
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                {lead.createdAt && (
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Created: {date(lead.createdAt, { time: true })}</span>
                  </p>
                )}
                {lead.updatedAt && (
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Last Updated: {date(lead.updatedAt, { time: true })}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'commercial' && (
            <div className="space-y-4">
              {/* Team Assignments */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-brand-500" /> Team & Relationship Management
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500">Assigned DCM / Manager:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {lead.assignedDCM?.name || lead.assignedDCMName || lead.assignedManager?.name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500">Relationship Owner:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {lead.existingRelationshipOwner?.name || lead.existingRelationshipOwnerName || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500">Previous Relationship:</span>
                    {lead.previousClientRelationship ? (
                      <Badge tone="violet">YES</Badge>
                    ) : (
                      <Badge tone="slate">NO</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Architect Information */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-brand-500" /> Architect & Design Partner
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500">Architect Involved:</span>
                    <Badge tone={lead.architectInvolved === 'YES' || lead.architectInvolvedDetails ? 'blue' : 'slate'}>
                      {lead.architectInvolved || (lead.architectInvolvedDetails ? 'YES' : 'NO')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500">Architect / Designer Name:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {lead.architect?.name || lead.architectName || lead.architectInvolvedDetails || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Site Visit Section */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-500" /> Site Visit Status
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500">Site Visit Required:</span>
                    {lead.siteVisitRequired ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>}
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500">Scheduled / Target Date:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {lead.siteVisitDueDate ? date(lead.siteVisitDueDate) : 'Not Scheduled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stages' && (
            <div className="space-y-3 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Workflow Stage Statuses
              </h3>
              {[
                { name: 'Measurement Capture', key: 'measurement', data: lead.measurement },
                { name: 'Ready Size Confirmation', key: 'readySize', data: lead.readySize },
                { name: 'Consumption & BOQ', key: 'consumption', data: lead.consumption },
                { name: 'Pricing & Costing', key: 'costing', data: lead.costing },
                { name: 'Quotation Preparation', key: 'quotation', data: lead.quotation },
                { name: 'Proposal Creation', key: 'proposal', data: lead.proposal },
                { name: 'Token Advance', key: 'token', data: lead.token },
                { name: 'KYC Document Verification', key: 'kyc', data: lead.kyc },
              ].map((stage) => {
                const isCompleted = Boolean(stage.data && Object.keys(stage.data).length > 0);
                return (
                  <div
                    key={stage.key}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40"
                  >
                    <div className="flex items-center gap-2.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {stage.name}
                      </span>
                    </div>
                    <Badge tone={isCompleted ? 'green' : 'slate'}>
                      {isCompleted ? 'UPDATED' : 'PENDING'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between gap-3">
          {onSiteVisit && (
            <Button
              size="sm"
              variant="secondary"
              className="bg-emerald-700 hover:bg-emerald-600 text-white border-transparent"
              onClick={() => onSiteVisit(lead)}
            >
              Schedule Site Visit
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {onViewFull && (
              <Button
                size="sm"
                variant="primary"
                icon={ArrowUpRight}
                onClick={() => onViewFull(lead)}
              >
                View Full Page
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedDrawer;