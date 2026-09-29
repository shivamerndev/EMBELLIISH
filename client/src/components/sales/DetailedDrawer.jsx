import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowRight,
  List,
  ExternalLink,
  X,
} from 'lucide-react';
import { Badge, Button } from '../ui';
import { date, currency } from '../../utils/format';
import { getNextStageUrl, getNextStage, isQuotationCreatedInDb, isAdvanceReceived } from '../../utils/salesPipeline';

const getNestedVal = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((curr, p) => (curr == null ? undefined : curr[p]), obj);
};

const renderFieldValue = (val, field) => {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (field?.type === 'currency' && typeof val === 'number') {
    return currency(val);
  }
  if ((field?.type === 'category' || field?.key === 'costing.category') && typeof val === 'string') {
    return `Category ${val.toUpperCase()}`;
  }
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

const DetailedDrawer = ({
  open,
  lead,
  onClose,
  onViewFull,
  onSiteVisit,
  pageFields,
  pageName,
  currentStageKey,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
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
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold font-mono text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-1 rounded-md border border-brand-200 dark:border-brand-800 shrink-0">
              {lead.code || 'LEAD'}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {lead.clientName || 'Lead Details'}
              </h2>
              {lead.companyName && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {lead.companyName}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close drawer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
          {activeTab === 'overview' && (
            <div className="space-y-4">
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
                    <span className="text-slate-400 block text-[11px]">Project Location / Site Address</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200 flex items-start gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                      <span>{lead.location || lead.address || lead.siteAddress || '—'}</span>
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
                        const display = renderFieldValue(raw, field);
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
            </div>
          )}

          {activeTab === 'stages' && (() => {
            const stages = [
              {
                key: 'leads',
                name: 'Qualified Leads',
                tabId: 'leads',
                path: '/crm/sales-commercials/leads',
                desc: 'Lead qualification, source attribution & contact capture',
                isCompleted: true,
                status: lead.qualificationDecision || lead.status || 'QUALIFIED',
                date: lead.captureDateTime || lead.createdAt || lead.qualifiedAt,
                meta: lead.budget ? `Budget: ${currency(lead.budget)}` : null,
              },
              {
                key: 'pre-site',
                name: 'Pre-Site Visit',
                tabId: 'pre-site',
                path: '/crm/sales-commercials/pre-site-visit',
                desc: 'Site survey feasibility & survey schedule',
                isCompleted: Boolean(
                  lead.actualSiteVisitDateTime ||
                  lead.siteVisitRequired === false ||
                  lead.siteVisitStatus === 'COMPLETED'
                ),
                status: lead.actualSiteVisitDateTime
                  ? 'Visited'
                  : lead.siteVisitRequired === false
                    ? 'Not Required'
                    : lead.siteVisitDueDate
                      ? 'Scheduled'
                      : 'Pending',
                date: lead.actualSiteVisitDateTime || lead.siteVisitDueDate,
                meta: lead.installerName
                  ? `Installer: ${lead.installerName}`
                  : lead.siteAddress
                    ? `Site: ${lead.siteAddress}`
                    : null,
              },
              {
                key: 'measurement',
                name: 'Measurement Capture',
                tabId: 'measurement',
                path: '/crm/sales-commercials/measurement',
                desc: 'Site dimensions, window surveys & physical measurements',
                isCompleted: Boolean(
                  (lead.measurement?.status && ['COMPLETED', 'Final', 'Provisional'].some((s) => s.toLowerCase() === String(lead.measurement.status).toLowerCase())) ||
                  lead.measurement?.capturedAt ||
                  lead.measurementCaptured ||
                  (Array.isArray(lead.measurement?.rows) && lead.measurement.rows.length > 0)
                ),
                status: lead.measurement?.status || (lead.measurement?.date ? 'Captured' : 'Pending'),
                date: lead.measurement?.date || lead.measurement?.capturedAt || lead.measurement?.dueDate,
                meta: Array.isArray(lead.measurement?.rows) && lead.measurement.rows.length > 0
                  ? `${lead.measurement.rows.length} window row(s)`
                  : null,
              },
              {
                key: 'studio-meeting',
                name: 'Studio Meeting',
                tabId: 'studio-meeting',
                path: '/crm/sales-commercials/studio-meeting',
                desc: 'Initial studio consultation & architectural brief',
                isCompleted: Boolean(
                  lead.studioMeeting?.date ||
                  lead.studioMeeting?.feedback ||
                  (lead.studioMeeting?.status && ['COMPLETED', 'CONDUCTED', 'DONE'].includes(String(lead.studioMeeting.status).toUpperCase()))
                ),
                status: lead.studioMeeting?.status || (lead.studioMeeting?.date ? 'Conducted' : 'Pending'),
                date: lead.studioMeeting?.date || lead.studioMeeting?.dueDate,
                meta: lead.studioMeeting?.attendees ? `Attendees: ${lead.studioMeeting.attendees}` : null,
              },
              {
                key: 'consumption-boq',
                name: 'Consumption Sheet / BOQ',
                tabId: 'consumption-boq',
                path: '/crm/sales-commercials/consumption-boq',
                desc: 'Fabric yardage, motorization & Bill of Quantities',
                isCompleted: Boolean(
                  (lead.boqStatus && ['COMPLETED', 'APPROVED'].includes(String(lead.boqStatus).toUpperCase())) ||
                  lead.consumption?.boqPreparedDate ||
                  (Number(lead.consumption?.quantity) > 0) ||
                  (Array.isArray(lead.consumption?.roomList) && lead.consumption.roomList.length > 0) ||
                  lead.consumption?.boqVersion
                ),
                status: lead.boqStatus || (lead.consumption?.boqVersion ? `Version ${lead.consumption.boqVersion}` : 'Pending'),
                date: lead.consumption?.boqPreparedDate || lead.consumption?.sheetDueDate,
                meta: lead.consumption?.quantity ? `Qty: ${lead.consumption.quantity} ${lead.consumption.unit || 'm'}` : null,
              },
              {
                key: 'proposal',
                name: 'Proposal Creation',
                tabId: 'proposal',
                path: '/crm/sales-commercials/proposal',
                desc: 'Design proposal, pricing range & presentation',
                isCompleted: Boolean(
                  (lead.proposal?.approvalStatus && ['APPROVED', 'COMPLETED', 'PENDING'].includes(String(lead.proposal.approvalStatus).toUpperCase()) && (lead.proposal?.actualDate || lead.proposal?.letterData || lead.proposal?.pricingRange)) ||
                  lead.proposal?.actualDate ||
                  (lead.proposal?.revisionHistory && lead.proposal.revisionHistory.length > 0)
                ),
                status: lead.proposal?.approvalStatus || (lead.proposal?.actualDate ? 'Created' : 'Pending'),
                date: lead.proposal?.actualDate || lead.proposal?.date || lead.proposal?.dueDate,
                meta: lead.proposal?.pricingRange ? `Range: ${lead.proposal.pricingRange}` : null,
              },
              {
                key: 'token',
                name: 'Advance Receiving',
                tabId: 'token-discussion',
                path: '/crm/sales-commercials/advance',
                desc: 'Booking deposit & token confirmation',
                isCompleted: Boolean(
                  isAdvanceReceived(lead) ||
                  lead.advance?.receivedDate ||
                  (lead.advance?.amount > 0 && lead.advance?.status && ['RECEIVED', 'COMMITTED', 'WAIVED'].includes(String(lead.advance.status).toUpperCase()))
                ),
                status: lead.advance?.status || lead.token?.status || (isAdvanceReceived(lead) ? 'Received' : 'Pending'),
                date: lead.advance?.receivedDate || lead.advance?.discussionDueDate,
                meta: lead.advance?.amount ? `Amount: ${currency(lead.advance.amount)}` : null,
              },
              {
                key: 'pricing-costing',
                name: 'Pricing / Material Costing',
                tabId: 'pricing-costing',
                path: '/crm/sales-commercials/pricing-costing',
                desc: 'Cost estimation & fabric rate breakdown',
                isCompleted: Boolean(
                  lead.costing?.category ||
                  (lead.costing?.price !== undefined && lead.costing?.price !== null && Number(lead.costing?.price) > 0) ||
                  (Array.isArray(lead.costing?.costingHistory) && lead.costing.costingHistory.length > 0)
                ),
                status: lead.costing?.category ? `Category ${String(lead.costing.category).toUpperCase()} (${lead.costing.version || 'v1.0'})` : 'Pending',
                date: lead.costing?.dueDate || lead.costing?.updatedAt,
                meta: lead.costing?.price ? `Price: ${currency(lead.costing.price)}` : null,
              },
              {
                key: 'quotation',
                name: 'Quotation Preparation',
                tabId: 'quotation',
                path: '/crm/sales-commercials/quotation',
                desc: 'Formal quote draft, margins & pricing terms',
                isCompleted: Boolean(
                  isQuotationCreatedInDb(lead) ||
                  lead.quotationStatus === 'APPROVED' ||
                  lead.quotationStatus === 'SENT' ||
                  lead.quotation?.no
                ),
                status: lead.quotation?.status || lead.quotationStatus || (isQuotationCreatedInDb(lead) ? 'Generated' : 'Pending'),
                date: lead.quotation?.date || lead.quotation?.dueDate,
                meta: lead.quotation?.finalQuotedValue ? `Final: ${currency(lead.quotation.finalQuotedValue)}` : (lead.quotation?.no ? `Quote #${lead.quotation.no}` : null),
              },
              {
                key: 'client-approval',
                name: 'Client Approval',
                tabId: 'client-approval',
                path: '/crm/sales-commercials/client-approval',
                desc: 'Client quote signoff & revision approvals',
                isCompleted: Boolean(
                  lead.approval?.clientApprovalStatus === 'APPROVED' ||
                  lead.clientApprovalStatus === 'APPROVED' ||
                  lead.approval?.finalApprovedVersion ||
                  lead.approval?.clientApprovalDate
                ),
                status: lead.approval?.clientApprovalStatus || lead.clientApprovalStatus || 'Pending',
                date: lead.approval?.clientApprovalDate || lead.approval?.planned,
                meta: lead.approval?.finalApprovedVersion ? `Version: ${lead.approval.finalApprovedVersion}` : null,
              },
              {
                key: 'kyc',
                name: 'KYC Document Verification',
                tabId: 'kyc',
                path: '/crm/sales-commercials/kyc',
                desc: 'Client identification, GST/PAN & PO check',
                isCompleted: Boolean(
                  (lead.kyc?.status && ['VERIFIED', 'Verified'].includes(lead.kyc.status)) ||
                  lead.kycStatus === 'VERIFIED' ||
                  lead.status === 'CONVERTED'
                ),
                status: lead.kyc?.status || lead.kycStatus || 'Pending',
                date: lead.kyc?.verificationDate || lead.kyc?.actualDate || lead.kyc?.dueDate,
                meta: lead.kyc?.gstin ? `GST: ${lead.kyc.gstin}` : (lead.kyc?.pan ? `PAN: ${lead.kyc.pan}` : null),
              },
              {
                key: 'ready-size',
                name: 'Site Detail Sheet',
                tabId: 'ready-size',
                path: '/crm/sales-commercials/ready-size',
                desc: 'Site details, Design PPT & Selection PPT for production',
                isCompleted: Boolean(
                  lead.readySize?.confirmationDate ||
                  lead.readySize?.productionHandoffStatus === 'HANDED_OVER' ||
                  lead.readySize?.productionHandoffStatus === 'READY_FOR_PRODUCTION'
                ),
                status: lead.readySize?.productionHandoffStatus || (lead.readySize?.confirmationDate ? 'Confirmed' : 'Pending'),
                date: lead.readySize?.confirmationDate || lead.readySize?.dueDate,
                meta: lead.readySize?.roomReadiness ? `Readiness: ${lead.readySize.roomReadiness}` : null,
              },
            ];

            // Determine active page context
            const activePageIndex = stages.findIndex((s) => {
              if (currentStageKey && (s.key === currentStageKey || s.tabId === currentStageKey)) return true;
              if (location.pathname && s.path && location.pathname.includes(s.path.replace('/crm/sales-commercials/', ''))) return true;
              if (pageName && s.name.toLowerCase().includes(pageName.toLowerCase())) return true;
              return false;
            });

            // Find first pending stage across the workflow
            const firstPendingIndex = stages.findIndex((s) => !s.isCompleted);
            const currentStageIndex = activePageIndex !== -1 ? activePageIndex : (firstPendingIndex !== -1 ? firstPendingIndex : stages.length - 1);

            const completedCount = stages.filter((s) => s.isCompleted).length;
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
                      <span className="font-bold text-slate-700 dark:text-slate-300">{progressPercent}%</span>
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
                    const isCompleted = stage.isCompleted;
                    const isCurrent = !isCompleted && (idx === currentStageIndex || (activePageIndex === -1 && idx === firstPendingIndex));
                    const isContextActive = idx === activePageIndex;

                    const stageDate = stage.date;
                    const stageStatus = stage.status;
                    const stageMeta = stage.meta;

                    return (
                      <div key={stage.key} className="relative group">
                        {/* Stepper Node Icon */}
                        <div
                          className={`absolute left-4 top-2 -translate-x-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${isCompleted
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
                            <span className="text-[10px] font-bold">{idx + 1}</span>
                          )}
                        </div>

                        {/* Timeline Card */}
                        <div
                          className={`ml-10 p-3 rounded-xl border transition-all ${isContextActive
                              ? 'ring-2 ring-brand-500/40 border-brand-400 dark:border-brand-600 bg-brand-50/20 dark:bg-brand-950/20 shadow-sm'
                              : isCompleted
                                ? 'border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-300'
                                : isCurrent
                                  ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/50 dark:bg-amber-950/30 shadow-xs'
                                  : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/30 opacity-75 hover:opacity-100'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 shrink-0">
                                {idx + 1 < 10 ? `STEP 0${idx + 1}` : `STEP ${idx + 1}`}
                              </span>
                              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {stage.name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isContextActive && (
                                <Badge tone="blue">CURRENT VIEW</Badge>
                              )}
                              <Badge tone={isCompleted ? 'emerald' : isCurrent ? 'amber' : 'slate'}>
                                {isCompleted ? 'COMPLETED' : isCurrent ? 'IN PROGRESS' : 'PENDING'}
                              </Badge>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {stage.desc}
                          </p>

                          {/* Extra info if stage has data */}
                          <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-2 flex-wrap">
                              {stageStatus && (
                                <span>
                                  Status: <strong className="font-semibold text-slate-700 dark:text-slate-300">{String(stageStatus)}</strong>
                                </span>
                              )}
                              {stageMeta && <span className="text-slate-400">• {stageMeta}</span>}
                              {stageDate && <span>• {date(stageDate)}</span>}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                navigate(`${stage.path}?search=${encodeURIComponent(lead.code)}`);
                                onClose?.();
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline hover:text-brand-700 dark:hover:text-brand-300 ml-auto cursor-pointer"
                              title={`Open ${stage.name} stage`}
                            >
                              <span>Open Stage</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
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
            {(() => {
              // Determine active stage key for next stage calculation
              const stagesKeys = [
                'leads',
                'pre-site',
                'measurement',
                'studio-meeting',
                'consumption-boq',
                'proposal',
                'token',
                'pricing-costing',
                'quotation',
                'client-approval',
                'kyc',
                'ready-size',
              ];

              const currentKey = (() => {
                if (currentStageKey && stagesKeys.includes(currentStageKey)) return currentStageKey;
                const p = location.pathname.toLowerCase();
                if (p.includes('pre-site')) return 'pre-site';
                if (p.includes('measurement')) return 'measurement';
                if (p.includes('studio-meeting')) return 'studio-meeting';
                if (p.includes('consumption')) return 'consumption-boq';
                if (p.includes('proposal')) return 'proposal';
                if (p.includes('advance')) return 'token';
                if (p.includes('pricing') || p.includes('costing')) return 'pricing-costing';
                if (p.includes('quotation')) return 'quotation';
                if (p.includes('client-approval') || p.includes('approval')) return 'client-approval';
                if (p.includes('kyc')) return 'kyc';
                if (p.includes('ready-size')) return 'ready-size';
                if (p.includes('leads')) return 'leads';
                return lead.stage || 'leads';
              })();

              const next = getNextStage(currentKey);

              return (
                <Button
                  size="sm"
                  variant="outline"
                  icon={ArrowRight}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold"
                  onClick={() => {
                    const { url } = getNextStageUrl(currentKey, lead.code);
                    navigate(url);
                    onClose?.();
                  }}
                  title={`Move to Next Step: ${next?.label || 'Next Stage'}`}
                >
                  Move to Next Step
                </Button>
              );
            })()}
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