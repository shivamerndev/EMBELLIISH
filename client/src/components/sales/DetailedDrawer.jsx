import { useEffect, useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  ExternalLink,
  FileText,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Tag,
  UserCheck,
  Paperclip,
  Users,
  Download
} from 'lucide-react';
import { Badge, Button, StatusBadge } from '../ui';
import { currency, date, humanise, getMediaUrl } from '../../utils/format';

const BUDGET_TONES = {
  ECONOMY: 'slate',
  MID_RANGE: 'blue',
  PREMIUM: 'violet',
  LUXURY: 'amber',
  ULTRA_LUXURY: 'brand',
};

const parseAttachmentsOrLinks = (raw) => {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      if (raw.includes(',')) {
        parsed = raw.split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        parsed = [raw.trim()];
      }
    }
  }
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'object') return [parsed];
  return [];
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
  const priorityTone = priority === 'HIGH' || priority === 'HOT' ? 'rose' : priority === 'MEDIUM' ? 'amber' : 'slate';

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
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {currency(lead.budgetEstimate || lead.estimatedBudget || lead.budget || 0)}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                    Class: {lead.budgetClassification || budgetVal}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Acquisition Channel
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-1 truncate">
                    <Tag className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    <span className="truncate">{humanise(lead.source || lead.acquisitionSource || 'Direct Client')}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Lead Priority
                  </span>
                  <div className="mt-1">
                    <Badge tone={priorityTone}>{priority}</Badge>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Account Owner / DCM
                  </span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-1 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">
                      {lead.assignedDCM?.name || lead.assignedToName || lead.existingRelationshipOwner?.name || lead.relationshipOwnerName || 'Unassigned'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Client Contact Information */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-500" /> Client Contact Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Client Name</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {lead.clientName || 'Unnamed Client'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Primary Contact Person</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {lead.contactPerson || lead.clientName || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Phone Number</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5 font-mono">
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
                    <span className="text-slate-400 block text-[11px]">Project Location / Site Address</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200 flex items-start gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                      <span>{lead.location || lead.address || '—'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Architect & Partner Information */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-brand-500" /> Architect & Design Partner Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Architect / Designer Involved</span>
                    <div className="mt-1">
                      <Badge tone={lead.architectInvolved || lead.architect ? 'emerald' : 'slate'}>
                        {lead.architectInvolved || lead.architect ? 'YES' : 'NO / NOT SPECIFIED'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Architect / Firm Name</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {lead.architect?.name || lead.architectName || lead.architectFirm || lead.architect?.firm || '—'}
                    </p>
                  </div>
                  {(lead.architectPhone || lead.architect?.phone || lead.architectEmail || lead.architect?.email) && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">Architect Contact</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                        {[lead.architectPhone || lead.architect?.phone, lead.architectEmail || lead.architect?.email].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  )}
                  {lead.architectInvolvedDetails && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">Architect Notes & Involvement</span>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                        {lead.architectInvolvedDetails}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Relationship & History Details */}
              {(lead.previousClientRelationship || lead.previousClientRelationshipDetails || lead.existingRelationshipOwner) && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-brand-500" /> Client Relationship & History
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Previous Relationship</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {lead.previousClientRelationship ? 'Yes (Existing Client)' : 'No (New Lead)'}
                      </p>
                    </div>
                    {lead.existingRelationshipOwner && (
                      <div>
                        <span className="text-slate-400 block text-[11px]">Relationship Owner</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {lead.existingRelationshipOwner?.name || lead.existingRelationshipOwnerName || '—'}
                        </p>
                      </div>
                    )}
                    {lead.previousClientRelationshipDetails && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block text-[11px]">Relationship History Details</span>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                          {lead.previousClientRelationshipDetails}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description / Notes & Requirements */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-500" /> Project Requirements & Notes
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {lead.requirementSummary || lead.notes || lead.remarks || lead.projectDetails || lead.requirement || 'No specific requirement details recorded.'}
                </p>
              </div>

              {/* Attachments & Files */}
              {(() => {
                const filesList = parseAttachmentsOrLinks(lead.attachments || lead.files);
                if (filesList.length === 0) return null;
                return (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-brand-500" /> General Attachments ({filesList.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {filesList.map((att, i) => {
                        const rawHref = typeof att === 'string' ? att : (att?.url || att?.path || '#');
                        const href = getMediaUrl(rawHref);
                        const isLink = att?.type === 'link' || (typeof rawHref === 'string' && (rawHref.startsWith('http://') || rawHref.startsWith('https://')));
                        const rawName = typeof att === 'object' ? (att?.name || att?.filename || att?.originalName) : (typeof att === 'string' ? att.split('/').pop() : null);
                        const filename = rawName || `Attachment ${i + 1}`;

                        return (
                          <a
                            key={i}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 rounded-lg text-xs transition group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isLink ? (
                                <ExternalLink className="w-4 h-4 text-sky-500 shrink-0" />
                              ) : (
                                <Paperclip className="w-4 h-4 text-brand-500 shrink-0" />
                              )}
                              <span className="truncate text-slate-700 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400 font-medium">
                                {filename}
                              </span>
                            </div>
                            <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0 ml-2" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Timestamps & Audit Metadata */}
              <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Created: <strong className="text-slate-700 dark:text-slate-300">{date(lead.captureDateTime || lead.createdAt, { time: true })}</strong></span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Last Updated: <strong className="text-slate-700 dark:text-slate-300">{date(lead.updatedAt, { time: true })}</strong></span>
                  </p>
                </div>
                {lead.code && (
                  <p className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    Lead Code: {lead.code}
                  </p>
                )}
              </div>
            </div>
          )}

     

          {activeTab === 'stages' && (() => {
            const stages = [
              { name: 'Measurement Capture', key: 'measurement', data: lead.measurement, desc: 'Site dimensions & survey details' },
              { name: 'Ready Size Confirmation', key: 'readySize', data: lead.readySize, desc: 'Pelmet & channel sizing verification' },
              { name: 'Consumption & BOQ', key: 'consumption', data: lead.consumption, desc: 'Fabric & component calculations' },
              { name: 'Pricing & Costing', key: 'costing', data: lead.costing, desc: 'Cost estimation & rate breakdown' },
              { name: 'Quotation Preparation', key: 'quotation', data: lead.quotation, desc: 'Formal quote draft & pricing terms' },
              { name: 'Proposal Creation', key: 'proposal', data: lead.proposal, desc: 'Design proposal & client presentation' },
              { name: 'Token Advance', key: 'token', data: lead.token, desc: 'Booking deposit & token confirmation' },
              { name: 'KYC Document Verification', key: 'kyc', data: lead.kyc, desc: 'Client identification & document check' },
            ];

            const completedCount = stages.filter((s) => Boolean(s.data && Object.keys(s.data).length > 0)).length;
            const totalCount = stages.length;
            const progressPercent = Math.round((completedCount / totalCount) * 100);
            const currentStageIndex = stages.findIndex((s) => !Boolean(s.data && Object.keys(s.data).length > 0));

            return (
              <div className="space-y-5 text-xs">
                {/* Live Tracking Header Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Live Order Progress
                      </h3>
                    </div>
                    <Badge tone={completedCount === totalCount ? 'emerald' : completedCount > 0 ? 'amber' : 'slate'}>
                      {completedCount === totalCount ? 'ALL COMPLETED' : `${completedCount}/${totalCount} COMPLETED`}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <span>Workflow Progress</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Timeline Stepper */}
                <div className="relative space-y-4 pt-1">
                  {/* Vertical connecting line */}
                  <div className="absolute left-4 top-3.5 bottom-3.5 w-0.5 -translate-x-1/2 bg-slate-200 dark:bg-slate-800" />

                  {stages.map((stage, idx) => {
                    const isCompleted = Boolean(stage.data && Object.keys(stage.data).length > 0);
                    const isCurrent = !isCompleted && idx === currentStageIndex;

                    // Extracted stage metadata details if present
                    const stageDate = stage.data?.date || stage.data?.dueDate || stage.data?.updatedAt;
                    const stageStatus = stage.data?.status;

                    return (
                      <div key={stage.key} className="relative group">
                        {/* Stepper Node Icon */}
                        <div
                          className={`absolute left-4 top-1.5 -translate-x-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/60 shadow-sm'
                              : isCurrent
                              ? 'bg-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-950/60 animate-pulse shadow-md'
                              : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                          ) : isCurrent ? (
                            <Clock className="w-3.5 h-3.5 text-white shrink-0" />
                          ) : (
                            <span className="text-[10px] font-bold font-mono">{idx + 1}</span>
                          )}
                        </div>

                        {/* Timeline Card */}
                        <div
                          className={`ml-10 p-3 rounded-xl border transition-all ${
                            isCompleted
                              ? 'border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20'
                              : isCurrent
                              ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/50 dark:bg-amber-950/30 shadow-xs'
                              : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/30 opacity-70'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 shrink-0">
                                STEP 0{idx + 1}
                              </span>
                              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {stage.name}
                              </h4>
                            </div>
                            <Badge tone={isCompleted ? 'emerald' : isCurrent ? 'amber' : 'slate'}>
                              {isCompleted ? 'COMPLETED' : isCurrent ? 'IN PROGRESS' : 'PENDING'}
                            </Badge>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {stage.desc}
                          </p>

                          {/* Extra info if stage has data */}
                          {(stageDate || stageStatus) && (
                            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              {stageStatus && <span>Status: {String(stageStatus)}</span>}
                              {stageDate && <span>Updated: {date(stageDate)}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
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