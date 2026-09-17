import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Mail, MapPin, CheckCircle2, Clock, ArrowUpRight, ArrowRight, List } from 'lucide-react';
import { Badge, Button } from '../ui';
import { date } from '../../utils/format';
import { getNextStageUrl } from '../../utils/salesPipeline';



const getNestedVal = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((curr, p) => (curr == null ? undefined : curr[p]), obj);
};

const renderFieldValue = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) {
    if (val.length === 0) return '—';
    const rooms = Array.from(new Set(val.map((item) => (typeof item === 'object' ? item?.room : null)).filter(Boolean)));
    if (rooms.length > 0) {
      return `${val.length} item(s) (${rooms.join(', ')})`;
    }
    return `${val.length} item(s)`;
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    return date(val);
  }
  if (val instanceof Date) return date(val);
  if (typeof val === 'object') {
    // e.g. populated user object
    return val.name || val.label || JSON.stringify(val);
  }
  return String(val);
};

const DetailedDrawer = ({ open, lead, onClose, onViewFull, onSiteVisit, pageFields, pageName }) => {
  const navigate = useNavigate();
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


  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full sm:max-w-xl md:max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 transform transition-transform duration-300 ease-in-out">


        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/80 px-4 sm:px-6 gap-4 sm:gap-6 text-xs font-medium overflow-x-auto whitespace-nowrap scrollbar-none">

          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors shrink-0 ${activeTab === 'overview'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
          >
            Overview & Contact
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stages')}
            className={`py-3 border-b-2 transition-colors shrink-0 ${activeTab === 'stages'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
          >
            Pipeline Stages
          </button>

        </div>

        {/* Scrollable Drawer Content */}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {activeTab === 'overview' && (<div className='space-y-4'>

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



            {pageFields && pageFields.length > 0 && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <List className="w-3.5 h-3.5 text-brand-500" />
                  {pageName || 'Page'} Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {pageFields
                    .filter((f) => f.key !== 'delayStatus') // skip computed-only fields
                    .map((field) => {
                      const raw = getNestedVal(lead, field.key);
                      const display = renderFieldValue(raw);
                      return (
                        <div key={field.key}>
                          <span className="text-slate-400 block text-[11px]">{field.label}</span>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={typeof display === 'string' ? display : undefined}>
                            {display}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

          </div>)}



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

            // Derive current position from lead.stage (authoritative source)
            const leadStageKey = String(lead.stage || '').toLowerCase();
            const currentStageIndex = (() => {
              // Map lead.stage value to stages[] index by matching the stage key
              const idx = stages.findIndex((s) => leadStageKey.includes(s.key.toLowerCase()));
              // If no match, fall back to first stage with no data (old behavior as last resort)
              if (idx !== -1) return idx;
              return stages.findIndex((s) => !Boolean(s.data && Object.keys(s.data).length > 0));
            })();
            // Only stages strictly before currentStageIndex are truly completed
            const completedCount = currentStageIndex < 0 ? stages.length : currentStageIndex;
            const totalCount = stages.length;
            const progressPercent = Math.round((completedCount / totalCount) * 100);

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
                    const isCompleted = currentStageIndex < 0 ? true : idx < currentStageIndex;
                    const isCurrent = !isCompleted && idx === currentStageIndex;

                    // Extracted stage metadata details if present
                    const stageDate = stage.data?.date || stage.data?.dueDate || stage.data?.updatedAt;
                    const stageStatus = stage.data?.status;

                    return (
                      <div key={stage.key} className="relative group">
                        {/* Stepper Node Icon */}
                        <div
                          className={`absolute left-4 top-1.5 -translate-x-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${isCompleted
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
                          className={`ml-10 p-3 rounded-xl border transition-all ${isCompleted
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
            <Button
              size="sm"
              variant="outline"
              icon={ArrowRight}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold"
              onClick={() => {
                const { url } = getNextStageUrl(lead.stage || 'token', lead.code);
                navigate(url);
                onClose?.();
              }}
              title="Move to Next Step & Redirect"
            >
              Move to Next Step
            </Button>
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