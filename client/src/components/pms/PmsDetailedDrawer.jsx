import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Briefcase,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  X,
  Pencil,
  Copy,
  Check,
  Calendar,
  Layers,
  FileText,
  ShieldCheck,
  DollarSign,
  Cpu,
} from 'lucide-react';
import { Badge, Button } from '../ui';
import { date, currency } from '../../utils/format';
import {
  PMS_WORKFLOW_STAGES,
  getPmsStageIndex,
  getPmsNextStage,
  getPmsNextStageUrl,
  DEFAULT_STAGE_FIELDS,
} from '../../utils/pmsPipeline';
import { pmsApi } from '../../api/pms.api';
import usePms from '../../hooks/usePms';

const getNestedVal = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((curr, p) => (curr == null ? undefined : curr[p]), obj);
};

const renderFieldValue = (val, field) => {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';

  // Currency
  if (field?.type === 'currency' || (typeof val === 'string' && val.startsWith('₹'))) {
    if (typeof val === 'string') return val;
    return currency(val);
  }

  // Date
  if (field?.type === 'date' || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))) {
    return date(val);
  }
  if (val instanceof Date) return date(val);

  // Array
  if (Array.isArray(val)) {
    if (val.length === 0) return '—';
    return `${val.length} item(s)`;
  }

  // Object
  if (typeof val === 'object') {
    return val.name || val.label || JSON.stringify(val);
  }

  return String(val);
};

const getStatusTone = (statusStr) => {
  if (!statusStr) return 'slate';
  const s = String(statusStr).toLowerCase();
  if (['completed', 'approved', 'passed', 'closed', 'verified', 'complete', 'cleared', 'signed'].includes(s)) {
    return 'green';
  }
  if (['in progress', 'in production', 'in review', 'scheduled', 'ordered', 'released', 'ready'].includes(s)) {
    return 'blue';
  }
  if (['pending', 'on hold'].includes(s)) {
    return 'amber';
  }
  if (['rejected', 'delayed', 'failed'].includes(s)) {
    return 'rose';
  }
  return 'slate';
};

const PmsDetailedDrawer = ({
  open,
  item,
  lead,
  project,
  onClose,
  onEdit,
  onViewFull,
  pageFields,
  pageName,
  currentStageKey,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  const pmsState = useSelector((state) => state?.pms);
  const [projectStagesData, setProjectStagesData] = useState({});
  const [loadingStages, setLoadingStages] = useState(false);

  // Normalize project object from props
  const currentItem = item || lead || project;
  const { handleAdvanceStageItem } = usePms();
  const [advancing, setAdvancing] = useState(false);

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

  // Derive normalized fields
  const projectCode = useMemo(() => {
    if (!currentItem) return 'PRJ';
    const raw = currentItem.code || currentItem.projectCode || currentItem.id || 'PRJ';
    if (raw.includes('(')) return raw.split('(')[0].trim();
    return raw;
  }, [currentItem]);

  const clientName = useMemo(() => {
    if (!currentItem) return 'Project Client';
    if (currentItem.clientName) return currentItem.clientName;
    const raw = currentItem.code || currentItem.projectCode || '';
    if (raw.includes('(')) return raw.split('(')[1].replace(')', '').trim();
    return raw || 'Client';
  }, [currentItem]);

  const siteLocation = useMemo(() => {
    if (!currentItem) return '—';
    return (
      currentItem.siteDetails ||
      currentItem.location ||
      currentItem.siteAddress ||
      currentItem.address ||
      'Site details not specified'
    );
  }, [currentItem]);

  const assignedOwner = useMemo(() => {
    if (!currentItem) return 'Unassigned';
    return (
      currentItem.assignedPcExecutionOwner ||
      currentItem.executionOwnerPc ||
      currentItem.currentOwner ||
      currentItem.owner ||
      currentItem.requestedBy ||
      currentItem.preparedBy ||
      'Unassigned'
    );
  }, [currentItem]);

  const delayStatus = useMemo(() => {
    if (!currentItem) return 'No Delay';
    if (currentItem.delay === 'Yes' || currentItem.delayStatus === 'DELAYED') return 'Delayed';
    return 'On Track';
  }, [currentItem]);

  // Fetch real cross-stage lifecycle from backend when drawer opens
  useEffect(() => {
    if (!open || !currentItem) {
      setProjectStagesData({});
      return;
    }
    const ident = projectCode || currentItem.code || currentItem._id || currentItem.id;
    if (!ident) return;

    let cancelled = false;
    const loadProjectLifecycle = async () => {
      setLoadingStages(true);
      try {
        const res = await pmsApi.getProjectStages(ident);
        const data = res?.data || res;
        if (!cancelled && data?.records && Array.isArray(data.records)) {
          const map = {};
          data.records.forEach((rec) => {
            if (rec.stageKey) map[rec.stageKey] = rec;
            if (rec.stageSlug) map[rec.stageSlug] = rec;
            if (rec.stage) map[rec.stage] = rec;
          });
          setProjectStagesData(map);
        }
      } catch (err) {
        // Non-blocking stage retrieval
        console.warn('[PmsDetailedDrawer] Project lifecycle load notice:', err?.message || err);
      } finally {
        if (!cancelled) setLoadingStages(false);
      }
    };

    loadProjectLifecycle();
    return () => {
      cancelled = true;
    };
  }, [open, currentItem, projectCode]);

  // Determine active stage key
  const activeStage = useMemo(() => {
    if (currentStageKey) return currentStageKey;
    const p = location.pathname.toLowerCase();
    const found = PMS_WORKFLOW_STAGES.find((s) => p.includes(s.slug));
    return found ? found.key : 'projectActivation';
  }, [currentStageKey, location.pathname]);

  const activeStageIndex = useMemo(() => {
    return getPmsStageIndex(activeStage);
  }, [activeStage]);

  // Compute fields to display in Current Stage Details
  const displayFields = useMemo(() => {
    if (pageFields && pageFields.length > 0) {
      return pageFields.filter(
        (f) => !['_id', 'id', 'sno', 'createdAt', 'updatedAt', 'code'].includes(f.key)
      );
    }
    const defaultFields = DEFAULT_STAGE_FIELDS[activeStage];
    if (defaultFields && defaultFields.length > 0) {
      return defaultFields;
    }
    if (currentItem) {
      return Object.keys(currentItem)
        .filter((k) => !['_id', 'id', 'createdAt', 'updatedAt', 'code', 'clientName'].includes(k))
        .map((k) => ({
          key: k,
          label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
        }));
    }
    return [];
  }, [pageFields, activeStage, currentItem]);

  // Cross-stage lookup for all 20 stages
  const stageDataList = useMemo(() => {
    if (!currentItem) return [];

    return PMS_WORKFLOW_STAGES.map((stage, idx) => {
      // Find matching item in backend projectStagesData or Redux store
      const storeItems = pmsState?.items?.[stage.key] || [];
      const remoteRecord = projectStagesData[stage.key] || projectStagesData[stage.slug];

      const match =
        remoteRecord ||
        storeItems.find((itm) => {
          if (!itm) return false;
          if (itm.id === currentItem.id || itm._id === currentItem._id) return true;
          const itmCode = itm.code || '';
          if (projectCode && itmCode.includes(projectCode)) return true;
          if (clientName && itmCode.includes(clientName)) return true;
          return false;
        }) ||
        (idx === activeStageIndex ? currentItem : null);

      const stageStatus =
        match?.status ||
        (idx < activeStageIndex
          ? 'Completed'
          : idx === activeStageIndex
          ? currentItem.status || 'In Progress'
          : 'Pending');

      const isCompleted = [
        'completed',
        'approved',
        'passed',
        'closed',
        'verified',
        'cleared',
        'signed',
      ].includes(String(stageStatus).toLowerCase()) || idx < activeStageIndex;

      const isCurrent = !isCompleted && (idx === activeStageIndex || String(stageStatus).toLowerCase() === 'in progress');

      const stageDate =
        match?.dueDate ||
        match?.projectActivationDate ||
        match?.approvalDate ||
        match?.creationDate ||
        match?.qcDoneDate ||
        match?.targetDispatchDate ||
        match?.confirmedInstallationDateTime ||
        match?.installationStartDate ||
        match?.lastClientUpdateDate ||
        match?.closureDate ||
        match?.projectClosureDate;

      const stageOwner =
        match?.assignedPcExecutionOwner ||
        match?.executionOwnerPc ||
        match?.currentOwner ||
        match?.requestedBy ||
        match?.preparedBy ||
        match?.approvedBy ||
        match?.qcDoneBy ||
        match?.assignedInstallerTeam ||
        match?.snagOwner ||
        match?.owner;

      let keyMeta = null;
      if (match?.approvedQuote) keyMeta = `Quote: ${match.approvedQuote}`;
      else if (match?.designVersion) keyMeta = `Version: ${match.designVersion}`;
      else if (match?.orderSheetFmsNo) keyMeta = `FMS: ${match.orderSheetFmsNo}`;
      else if (match?.motorType) keyMeta = match.motorType;
      else if (match?.snagId) keyMeta = match.snagId;
      else if (match?.ticketId) keyMeta = match.ticketId;
      else if (match?.challan) keyMeta = match.challan;

      return {
        ...stage,
        isCompleted,
        isCurrent,
        status: stageStatus,
        date: stageDate,
        owner: stageOwner,
        meta: keyMeta,
        record: match,
      };
    });
  }, [currentItem, projectCode, clientName, activeStageIndex, pmsState, projectStagesData]);

  const completedStagesCount = useMemo(() => {
    return stageDataList.filter((s) => s.isCompleted).length;
  }, [stageDataList]);

  const progressPercent = useMemo(() => {
    return Math.round((completedStagesCount / PMS_WORKFLOW_STAGES.length) * 100);
  }, [completedStagesCount]);

  const handleCopyCode = () => {
    if (!currentItem?.code && !projectCode) return;
    navigator.clipboard.writeText(currentItem.code || projectCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open || !currentItem) return null;

  const currentStageInfo = PMS_WORKFLOW_STAGES[activeStageIndex] || PMS_WORKFLOW_STAGES[0];
  const nextStageInfo = getPmsNextStage(activeStage);

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
              {projectCode}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {clientName}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                <span className="truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                  <span className="truncate">{siteLocation}</span>
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className={delayStatus === 'Delayed' ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-medium'}>
                  {delayStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Copy Project Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close drawer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/80 px-4 sm:px-6 gap-4 sm:gap-6 text-xs font-medium overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overview & Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stages')}
            className={`py-3 border-b-2 transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'stages'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Lifecycle Stages (20)</span>
            <Badge tone="slate" className="ml-1 text-[10px] py-0 px-1.5">
              {completedStagesCount}/20
            </Badge>
          </button>
        </div>

        {/* Scrollable Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 1: OVERVIEW & DETAILS */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Project Identity Card */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-brand-500" />
                  Project & Execution Identity
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Project Code / ID</span>
                    <p className="font-semibold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      {projectCode}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Client / Residence</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {clientName}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Execution Owner / PC</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <User className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{assignedOwner}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Overall Stage Status</span>
                    <div className="mt-1">
                      <Badge tone={getStatusTone(currentItem.status)}>
                        {currentItem.status || 'Pending'}
                      </Badge>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">Site Address & Access Info</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200 flex items-start gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                      <span>{siteLocation}</span>
                    </p>
                  </div>
                  {currentItem.createdAt && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Record Created</span>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{date(currentItem.createdAt)}</span>
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block text-[11px]">SLA / Timeline Health</span>
                    <div className="mt-1">
                      <Badge tone={delayStatus === 'Delayed' ? 'rose' : 'green'}>
                        {delayStatus === 'Delayed' ? 'Delayed SLA' : 'On Schedule'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Stage Parameters Card */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-brand-500" />
                    {pageName || currentStageInfo.label} Parameters
                  </h3>
                  <Badge tone="blue" className="text-[10px]">
                    STAGE {String(activeStageIndex + 1).padStart(2, '0')}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {displayFields.map((field) => {
                    const raw = getNestedVal(currentItem, field.key);
                    const isBadgeType =
                      field.type === 'badge' ||
                      ['status', 'delay', 'kycBillingStatus', 'clientApproval', 'paymentStatus', 'finalDesignStatus', 'inputCompletenessStatus', 'executionDrawingStatus', 'procurementStatus', 'qcStatus', 'packingStatus', 'installationStatus', 'snagStatus', 'warrantyStatus'].includes(field.key);

                    if (isBadgeType) {
                      return (
                        <div key={field.key}>
                          <span className="text-slate-400 block text-[11px]">{field.label}</span>
                          <div className="mt-1">
                            <Badge tone={getStatusTone(raw)}>
                              {raw || 'Pending'}
                            </Badge>
                          </div>
                        </div>
                      );
                    }

                    const display = renderFieldValue(raw, field);
                    const isLongText = typeof display === 'string' && display.length > 50;

                    return (
                      <div key={field.key} className={isLongText ? 'sm:col-span-2' : ''}>
                        <span className="text-slate-400 block text-[11px]">{field.label}</span>
                        <p
                          className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5"
                          title={typeof display === 'string' ? display : undefined}
                        >
                          {display}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Navigation Context */}
              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center shrink-0 text-brand-600 dark:text-brand-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      Stage {activeStageIndex + 1}: {currentStageInfo.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {currentStageInfo.desc}
                    </p>
                  </div>
                </div>

                {nextStageInfo && nextStageInfo.key !== currentStageInfo.key && (
                  activeStage === 'projectClosure' && String(currentItem?.maintenanceRequired || '').toLowerCase() !== 'yes' ? null : (
                  <button
                    type="button"
                    onClick={() => {
                      const { url } = getPmsNextStageUrl(activeStage, projectCode);
                      navigate(url);
                      onClose?.();
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline shrink-0"
                  >
                    <span>Next: {nextStageInfo.shortLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: LIFECYCLE WORKFLOW (20 STAGES) */}
          {activeTab === 'stages' && (
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
                      Live Project Lifecycle
                    </h3>
                  </div>
                  <Badge
                    tone={
                      completedStagesCount === PMS_WORKFLOW_STAGES.length
                        ? 'green'
                        : completedStagesCount > 0
                        ? 'amber'
                        : 'slate'
                    }
                  >
                    {completedStagesCount === PMS_WORKFLOW_STAGES.length
                      ? 'ALL 20 COMPLETED'
                      : `${completedStagesCount}/${PMS_WORKFLOW_STAGES.length} COMPLETED`}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span>Workflow Progress</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Vertical Timeline Stepper */}
              <div className="relative space-y-4 pt-1">
                {/* Connecting line */}
                <div className="absolute left-4 top-3.5 bottom-3.5 w-0.5 -translate-x-1/2 bg-slate-200 dark:border-slate-800" />

                {stageDataList.map((stage, idx) => {
                  const isContextActive = idx === activeStageIndex;
                  const isCompleted = stage.isCompleted;
                  const isCurrent = stage.isCurrent;

                  return (
                    <div key={stage.key} className="relative group">
                      {/* Stepper Node Icon */}
                      <div
                        className={`absolute left-4 top-2 -translate-x-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
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
                          <span className="text-[10px] font-bold">{idx + 1}</span>
                        )}
                      </div>

                      {/* Timeline Card */}
                      <div
                        className={`ml-10 p-3 rounded-xl border transition-all ${
                          isContextActive
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
                              {stage.label}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isContextActive && <Badge tone="blue">CURRENT VIEW</Badge>}
                            <Badge
                              tone={
                                isCompleted
                                  ? 'green'
                                  : isCurrent
                                  ? 'amber'
                                  : getStatusTone(stage.status)
                              }
                            >
                              {isCompleted ? 'COMPLETED' : isCurrent ? 'IN PROGRESS' : stage.status || 'PENDING'}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {stage.desc}
                        </p>

                        {/* Extra metadata & Action footer */}
                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2 flex-wrap">
                            {stage.status && (
                              <span>
                                Status:{' '}
                                <strong className="font-semibold text-slate-700 dark:text-slate-300">
                                  {String(stage.status)}
                                </strong>
                              </span>
                            )}
                            {stage.owner && <span className="text-slate-400">• Owner: {stage.owner}</span>}
                            {stage.meta && <span className="text-slate-400">• {stage.meta}</span>}
                            {stage.date && <span>• {date(stage.date)}</span>}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              navigate(`${stage.path}?search=${encodeURIComponent(projectCode)}`);
                              onClose?.();
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline ml-auto cursor-pointer"
                            title={`Open ${stage.label}`}
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
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between gap-3">
          {onEdit && (
            <Button
              size="sm"
              variant="secondary"
              icon={Pencil}
              className="bg-brand-600 hover:bg-brand-700 text-white border-transparent"
              onClick={() => onEdit(currentItem)}
            >
              Edit Stage Record
            </Button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {/* If stage is not completed, offer Complete & Auto-Advance */}
            {!['completed', 'approved', 'closed', 'signed', 'verified'].includes(String(currentItem?.status || '').toLowerCase()) && (
              <Button
                size="sm"
                variant="primary"
                icon={CheckCircle2}
                loading={advancing}
                onClick={async () => {
                  if (!currentItem || advancing) return;
                  setAdvancing(true);
                  try {
                    const res = await handleAdvanceStageItem(activeStage, currentItem._id || currentItem.id, {
                      status: 'Completed',
                    });
                    if (res?.nextStage?.slug) {
                      navigate(`/pms/${res.nextStage.slug}?search=${encodeURIComponent(projectCode)}`);
                      onClose?.();
                    }
                  } catch (err) {
                    console.error('Failed to complete and advance stage:', err);
                  } finally {
                    setAdvancing(false);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                title="Mark this stage Completed and auto-unlock next stage"
              >
                Complete & Advance →
              </Button>
            )}

            {nextStageInfo && nextStageInfo.key !== currentStageInfo.key && (
              activeStage === 'projectClosure' && String(currentItem?.maintenanceRequired || '').toLowerCase() !== 'yes' ? null : (
              <Button
                size="sm"
                variant="outline"
                icon={ArrowRight}
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold"
                onClick={() => {
                  const { url } = getPmsNextStageUrl(activeStage, projectCode);
                  navigate(url);
                  onClose?.();
                }}
                title={`Move to Next Step: ${nextStageInfo.label}`}
              >
                Next: {nextStageInfo.shortLabel}
              </Button>
            ))}

            {onViewFull && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => onViewFull(currentItem)}
              >
                View Full
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

export default PmsDetailedDrawer;