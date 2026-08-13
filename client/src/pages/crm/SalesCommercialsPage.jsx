import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Paperclip, Eye, Pencil, UserCheck, Building2, BadgeDollarSign, Phone, Mail, MapPin, User, FileText, Upload, Download, ArrowRightCircle, Sparkles, CheckCircle2, LayoutGrid, Table as TableIcon, Ruler, ClipboardList, Wallet, ReceiptText, ShieldCheck, Presentation as PresentationIcon, CalendarCheck2, Users } from 'lucide-react';
import { leadsApi, architectsApi, usersApi, uploadApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { currency, date, humanise } from '../../utils/format';
import { PageHeader, Panel, Table, Button, Badge, StatusBadge, Modal, Field, Input, Select, Textarea, Loading, ErrorState, EmptyState, Tabs, StatTile } from '../../components/ui';

const BUDGET_CLASSIFICATIONS = [
  { value: 'ECONOMY', label: 'Economy (Under ₹15L)' },
  { value: 'MID_RANGE', label: 'Mid-Range (₹15L - ₹35L)' },
  { value: 'PREMIUM', label: 'Premium (₹35L - ₹75L)' },
  { value: 'LUXURY', label: 'Luxury (₹75L - ₹1.5Cr)' },
  { value: 'ULTRA_LUXURY', label: 'Ultra Luxury (₹1.5Cr+)' },
];

const BUDGET_TONES = {
  ECONOMY: 'slate',
  MID_RANGE: 'blue',
  PREMIUM: 'violet',
  LUXURY: 'amber',
  ULTRA_LUXURY: 'brand',
};

const LEAD_SOURCES = [
  { value: 'DCM', label: 'DCM' },
  { value: 'ARCHITECT', label: 'Architect' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'WALK_IN', label: 'Walk-In' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'EXHIBITION', label: 'Exhibition' },
  { value: 'SOCIAL', label: 'Social Media' },
  { value: 'DIRECT_VISIT', label: 'Direct Visit' },
  { value: 'DIRECT_CLIENT', label: 'Direct Client' },
  { value: 'EXISTING_CLIENT', label: 'Existing Client' },
  { value: 'OTHER', label: 'Other' },
];

const MEASUREMENT_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REVISIT_REQUIRED', label: 'Revisit Required' },
];

const TOKEN_STATUSES = [
  { value: 'NOT_DISCUSSED', label: 'Not Discussed' },
  { value: 'DISCUSSED', label: 'Discussed' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'WAIVED', label: 'Waived' },
];

const DISCOUNT_APPROVAL_STATUSES = [
  { value: 'NOT_REQUIRED', label: 'Not Required' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const CLIENT_APPROVAL_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'REVISION_REQUESTED', label: 'Revision Requested' },
];

/** Reusable multi-file uploader used by every new Sales & Commercials sub-section. */
const FileListField = ({ label, files = [], uploading, onUpload, onRemove, hint }) => (
  <div>
    <label className="field-label flex items-center justify-between">
      <span>{label}</span>
      {uploading && <span className="text-xs text-brand-400 animate-pulse">Uploading files...</span>}
    </label>
    <div className="mt-1 flex items-center gap-3">
      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-700 hover:border-brand-500 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/50 transition">
        <Upload className="w-4 h-4 text-brand-400" />
        <span>Upload {label}</span>
        <input type="file" multiple onChange={onUpload} className="hidden" disabled={uploading} />
      </label>
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </div>
    {files.length > 0 && (
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {files.map((att, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/60 border border-slate-800 rounded-md text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span className="truncate text-slate-200">{att.filename || 'File'}</span>
            </div>
            <button type="button" onClick={() => onRemove(idx)} className="text-rose-400 hover:text-rose-300 p-1 shrink-0">
              &times;
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ---------------------------------------------------------------- Lead Form Modal */
const FORM_TABS = [
  { id: 'client', label: '1. Client & Source', icon: User, desc: 'Contact, Source, Relationship' },
  { id: 'site', label: '2. Site & Measurement', icon: MapPin, desc: 'Site Visit, Installer & Specs' },
  { id: 'studio', label: '3. Studio & BOQ', icon: CalendarCheck2, desc: 'Meeting, Readiness & BOQ' },
  { id: 'proposals', label: '4. Proposal & Token', icon: ReceiptText, desc: 'Proposal, Token & Costing' },
  { id: 'quotation', label: '5. Quotation & Approval', icon: ShieldCheck, desc: 'Quote, Approval & Presentation' },
];

const LeadFormModal = ({ open, lead, onClose, onSaved, architects, users }) => {
  const isEdit = Boolean(lead);
  const [activeFormTab, setActiveFormTab] = useState('client');

  const [form, setForm] = useState(() => ({
    captureDateTime: lead?.captureDateTime ? new Date(lead.captureDateTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    contactPerson: lead?.contactPerson || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    clientName: lead?.clientName || '',
    companyName: lead?.companyName || '',
    source: lead?.source || 'DCM',
    architect: typeof lead?.architect === 'object' ? (lead?.architect?.id || lead?.architect?._id || '') : (lead?.architect || ''),
    architectName: lead?.architectName || '',
    architectInvolved: lead?.architectInvolved ? 'YES' : 'NO',
    architectInvolvedDetails: lead?.architectInvolvedDetails || '',
    budget: lead?.budget ?? '',
    budgetClassification: lead?.budgetClassification || 'MID_RANGE',
    location: lead?.location || '',
    priority: lead?.priority || 'MEDIUM',
    projectType: lead?.projectType || 'VILLA',
    previousClientRelationship: lead?.previousClientRelationship ? 'YES' : 'NO',
    previousClientRelationshipDetails: lead?.previousClientRelationshipDetails || '',
    existingRelationshipOwner: typeof lead?.existingRelationshipOwner === 'object' ? (lead?.existingRelationshipOwner?.id || lead?.existingRelationshipOwner?._id || '') : (lead?.existingRelationshipOwner || ''),
    existingRelationshipOwnerName: lead?.existingRelationshipOwnerName || '',
    requirementSummary: lead?.requirementSummary || lead?.requirement || '',
    attachments: lead?.attachments || [],

    // 9 Parameters
    siteVisitDueDate: lead?.siteVisitDueDate ? new Date(lead.siteVisitDueDate).toISOString().slice(0, 10) : '',
    siteAddress: lead?.siteAddress || '',
    actualSiteVisitDateTime: lead?.actualSiteVisitDateTime ? new Date(lead.actualSiteVisitDateTime).toISOString().slice(0, 16) : '',
    assignedInstaller: typeof lead?.assignedInstaller === 'object' ? (lead?.assignedInstaller?.id || lead?.assignedInstaller?._id || '') : (lead?.assignedInstaller || ''),
    assignedInstallerName: lead?.assignedInstallerName || '',
    clientArchitectAvailability: lead?.clientArchitectAvailability || '',
    scope: lead?.scope || '',
    rooms: lead?.rooms || '',
    drawingsRenders: lead?.drawingsRenders || [],
    installerAvailability: lead?.installerAvailability || 'AVAILABLE',

    // Sales & Commercials — Site Visit requirement
    siteVisitRequired: lead?.siteVisitRequired === false ? 'NO' : 'YES',

    // Sales & Commercials — Measurement
    measurement: {
      dueDate: lead?.measurement?.dueDate ? new Date(lead.measurement.dueDate).toISOString().slice(0, 10) : '',
      date: lead?.measurement?.date ? new Date(lead.measurement.date).toISOString().slice(0, 10) : '',
      measuredBy: typeof lead?.measurement?.measuredBy === 'object' ? (lead?.measurement?.measuredBy?.id || lead?.measurement?.measuredBy?._id || '') : (lead?.measurement?.measuredBy || ''),
      status: lead?.measurement?.status || 'PENDING',
      siteAccess: lead?.measurement?.siteAccess || '',
      attachments: lead?.measurement?.attachments || [],
      roomList: lead?.measurement?.roomList || '',
      drawings: lead?.measurement?.drawings || [],
      pelmetDetails: lead?.measurement?.pelmetDetails || '',
      channelDetails: lead?.measurement?.channelDetails || '',
      motorDetails: lead?.measurement?.motorDetails || '',
      wiringDetails: lead?.measurement?.wiringDetails || '',
      notes: lead?.measurement?.notes || '',
    },

    // Sales & Commercials — Studio Meeting
    studioMeeting: {
      dueDate: lead?.studioMeeting?.dueDate ? new Date(lead.studioMeeting.dueDate).toISOString().slice(0, 10) : '',
      date: lead?.studioMeeting?.date ? new Date(lead.studioMeeting.date).toISOString().slice(0, 10) : '',
      attendees: lead?.studioMeeting?.attendees || '',
      clientDrawings: lead?.studioMeeting?.clientDrawings || [],
      feedback: lead?.studioMeeting?.feedback || '',
      nextAction: lead?.studioMeeting?.nextAction || '',
      architectBrief: lead?.studioMeeting?.architectBrief || '',
      samples: lead?.studioMeeting?.samples || [],
      projectPictures: lead?.studioMeeting?.projectPictures || [],
      pricingRange: lead?.studioMeeting?.pricingRange || '',
    },

    // Sales & Commercials — Ready Size / Room Readiness
    readySize: {
      roomReadiness: lead?.readySize?.roomReadiness || '',
      dueDate: lead?.readySize?.dueDate ? new Date(lead.readySize.dueDate).toISOString().slice(0, 10) : '',
      confirmedBy: typeof lead?.readySize?.confirmedBy === 'object' ? (lead?.readySize?.confirmedBy?.id || lead?.readySize?.confirmedBy?._id || '') : (lead?.readySize?.confirmedBy || ''),
      confirmationDate: lead?.readySize?.confirmationDate ? new Date(lead.readySize.confirmationDate).toISOString().slice(0, 10) : '',
      windowSize: lead?.readySize?.windowSize || '',
      siteCondition: lead?.readySize?.siteCondition || '',
      pelmetDetails: lead?.readySize?.pelmetDetails || '',
      channelDetails: lead?.readySize?.channelDetails || '',
      readyHeight: lead?.readySize?.readyHeight || '',
      finalMeasurements: lead?.readySize?.finalMeasurements || '',
    },

    // Sales & Commercials — Consumption / BOQ
    consumption: {
      sheetDueDate: lead?.consumption?.sheetDueDate ? new Date(lead.consumption.sheetDueDate).toISOString().slice(0, 10) : '',
      measurements: lead?.consumption?.measurements || '',
      quantity: lead?.consumption?.quantity ?? '',
      unit: lead?.consumption?.unit || '',
      wastageAllowance: lead?.consumption?.wastageAllowance || '',
      boqVersion: lead?.consumption?.boqVersion || '',
      roomList: lead?.consumption?.roomList || '',
      fabricDesignSelection: lead?.consumption?.fabricDesignSelection || '',
      panelCount: lead?.consumption?.panelCount ?? '',
      liningAccessoryAssumptions: lead?.consumption?.liningAccessoryAssumptions || '',
    },

    // Sales & Commercials — Proposal
    proposal: {
      dueDate: lead?.proposal?.dueDate ? new Date(lead.proposal.dueDate).toISOString().slice(0, 10) : '',
      noVersion: lead?.proposal?.noVersion || '',
      date: lead?.proposal?.date ? new Date(lead.proposal.date).toISOString().slice(0, 10) : '',
      clientBrief: lead?.proposal?.clientBrief || '',
      consumptionSheet: lead?.proposal?.consumptionSheet || [],
      designDirection: lead?.proposal?.designDirection || '',
      pricingRange: lead?.proposal?.pricingRange || '',
      terms: lead?.proposal?.terms || '',
      refundRevisionClause: lead?.proposal?.refundRevisionClause || '',
    },

    // Sales & Commercials — Token / Advance
    token: {
      discussionDueDate: lead?.token?.discussionDueDate ? new Date(lead.token.discussionDueDate).toISOString().slice(0, 10) : '',
      amount: lead?.token?.amount ?? '',
      status: lead?.token?.status || 'NOT_DISCUSSED',
      receivedDate: lead?.token?.receivedDate ? new Date(lead.token.receivedDate).toISOString().slice(0, 10) : '',
      clientBudgetResponse: lead?.token?.clientBudgetResponse || '',
      proposalAttachment: lead?.token?.proposalAttachment || [],
      budgetEstimate: lead?.token?.budgetEstimate ?? '',
      clientResponse: lead?.token?.clientResponse || '',
      projectTimeline: lead?.token?.projectTimeline || '',
      commercialTerms: lead?.token?.commercialTerms || '',
    },

    // Sales & Commercials — Costing
    costing: {
      dueDate: lead?.costing?.dueDate ? new Date(lead.costing.dueDate).toISOString().slice(0, 10) : '',
      catalogueCost: lead?.costing?.catalogueCost ?? '',
      version: lead?.costing?.version || '',
      landedCost: lead?.costing?.landedCost ?? '',
      localFabricCost: lead?.costing?.localFabricCost ?? '',
      labourCost: lead?.costing?.labourCost ?? '',
      sampleCost: lead?.costing?.sampleCost ?? '',
      marginModel: lead?.costing?.marginModel || '',
    },

    // Sales & Commercials — Quotation
    quotation: {
      dueDate: lead?.quotation?.dueDate ? new Date(lead.quotation.dueDate).toISOString().slice(0, 10) : '',
      no: lead?.quotation?.no || '',
      version: lead?.quotation?.version || '',
      date: lead?.quotation?.date ? new Date(lead.quotation.date).toISOString().slice(0, 10) : '',
      finalQuotedValue: lead?.quotation?.finalQuotedValue ?? '',
      taxes: lead?.quotation?.taxes ?? '',
      addSubtotal: lead?.quotation?.addSubtotal ?? '',
      validity: lead?.quotation?.validity || '',
      discountApprovalStatus: lead?.quotation?.discountApprovalStatus || 'NOT_REQUIRED',
      boq: lead?.quotation?.boq || [],
      fabricSelection: lead?.quotation?.fabricSelection || '',
      cataloguePrice: lead?.quotation?.cataloguePrice ?? '',
      labourPrice: lead?.quotation?.labourPrice ?? '',
      samplePrice: lead?.quotation?.samplePrice ?? '',
      discount: lead?.quotation?.discount ?? '',
      marginRules: lead?.quotation?.marginRules || '',
    },

    // Sales & Commercials — Client Approval
    approval: {
      planned: lead?.approval?.planned || '',
      clientApprovalStatus: lead?.approval?.clientApprovalStatus || 'PENDING',
      proofAttachment: lead?.approval?.proofAttachment || [],
      finalApprovedVersion: lead?.approval?.finalApprovedVersion || '',
    },

    // Sales & Commercials — Presentation
    presentation: {
      attachment: lead?.presentation?.attachment || [],
      clientSelection: lead?.presentation?.clientSelection || '',
      fabricSelection: lead?.presentation?.fabricSelection || '',
      designDirection: lead?.presentation?.designDirection || '',
      revisionNotes: lead?.presentation?.revisionNotes || '',
    },
  }));

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const { execute, pending, error } = useAction(
    (payload) => (isEdit ? leadsApi.update(lead.id || lead._id, payload) : leadsApi.create(payload)),
    {
      onSuccess: () => {
        onSaved();
        onClose();
      },
    }
  );

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const setNested = (section, field) => (e) =>
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [field]: e.target.value } }));

  const uploadFiles = async (files) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    const res = await uploadApi.upload(formData);
    const uploadedFiles = Array.isArray(res.data) ? res.data : [res.data];
    return uploadedFiles.map((f) => ({
      filename: f.filename || f.name,
      url: f.url,
      mimetype: f.mimetype,
      size: f.size,
    }));
  };

  const handleNestedFileUpload = (section, field) => async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const newFiles = await uploadFiles(files);
      setForm((prev) => ({
        ...prev,
        [section]: { ...prev[section], [field]: [...(prev[section][field] || []), ...newFiles] },
      }));
    } catch (err) {
      setUploadError(err?.response?.data?.message || err.message || 'File upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removeNestedFile = (section, field, index) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: prev[section][field].filter((_, i) => i !== index) },
    }));
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      const res = await uploadApi.upload(formData);
      const uploadedFiles = Array.isArray(res.data) ? res.data : [res.data];
      const newAttachments = uploadedFiles.map((f) => ({
        filename: f.filename || f.name,
        url: f.url,
        mimetype: f.mimetype,
        size: f.size,
        storage: f.storage || 'local',
      }));
      setForm((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments],
      }));
    } catch (err) {
      setUploadError(err?.response?.data?.message || err.message || 'File upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removeAttachment = (index) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleDrawingsUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      const res = await uploadApi.upload(formData);
      const uploadedFiles = Array.isArray(res.data) ? res.data : [res.data];
      const newDrawings = uploadedFiles.map((f) => ({
        filename: f.filename || f.name,
        url: f.url,
        mimetype: f.mimetype,
        size: f.size,
      }));
      setForm((prev) => ({
        ...prev,
        drawingsRenders: [...prev.drawingsRenders, ...newDrawings],
      }));
    } catch (err) {
      setUploadError(err?.response?.data?.message || err.message || 'Drawings upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removeDrawing = (index) => {
    setForm((prev) => ({
      ...prev,
      drawingsRenders: prev.drawingsRenders.filter((_, i) => i !== index),
    }));
  };

  const num = (v) => (v !== '' && v !== null && v !== undefined ? Number(v) : undefined);
  const dt = (v) => (v ? new Date(v) : undefined);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      captureDateTime: form.captureDateTime ? new Date(form.captureDateTime) : new Date(),
      budget: form.budget !== '' ? Number(form.budget) : undefined,
      architectInvolved: form.architectInvolved === 'YES',
      previousClientRelationship: form.previousClientRelationship === 'YES',
      architect: form.architect || undefined,
      existingRelationshipOwner: form.existingRelationshipOwner || undefined,
      companyName: form.companyName || undefined,
      email: form.email || undefined,
      requirement: form.requirementSummary,
      siteVisitDueDate: form.siteVisitDueDate ? new Date(form.siteVisitDueDate) : undefined,
      actualSiteVisitDateTime: form.actualSiteVisitDateTime ? new Date(form.actualSiteVisitDateTime) : undefined,
      assignedInstaller: form.assignedInstaller || undefined,

      siteVisitRequired: form.siteVisitRequired === 'YES',

      measurement: {
        ...form.measurement,
        dueDate: dt(form.measurement.dueDate),
        date: dt(form.measurement.date),
        measuredBy: form.measurement.measuredBy || undefined,
      },
      studioMeeting: {
        ...form.studioMeeting,
        dueDate: dt(form.studioMeeting.dueDate),
        date: dt(form.studioMeeting.date),
      },
      readySize: {
        ...form.readySize,
        dueDate: dt(form.readySize.dueDate),
        confirmationDate: dt(form.readySize.confirmationDate),
        confirmedBy: form.readySize.confirmedBy || undefined,
      },
      consumption: {
        ...form.consumption,
        sheetDueDate: dt(form.consumption.sheetDueDate),
        quantity: num(form.consumption.quantity),
        panelCount: num(form.consumption.panelCount),
      },
      proposal: {
        ...form.proposal,
        dueDate: dt(form.proposal.dueDate),
        date: dt(form.proposal.date),
      },
      token: {
        ...form.token,
        discussionDueDate: dt(form.token.discussionDueDate),
        receivedDate: dt(form.token.receivedDate),
        amount: num(form.token.amount),
        budgetEstimate: num(form.token.budgetEstimate),
      },
      costing: {
        ...form.costing,
        dueDate: dt(form.costing.dueDate),
        catalogueCost: num(form.costing.catalogueCost),
        landedCost: num(form.costing.landedCost),
        localFabricCost: num(form.costing.localFabricCost),
        labourCost: num(form.costing.labourCost),
        sampleCost: num(form.costing.sampleCost),
      },
      quotation: {
        ...form.quotation,
        dueDate: dt(form.quotation.dueDate),
        date: dt(form.quotation.date),
        finalQuotedValue: num(form.quotation.finalQuotedValue),
        taxes: num(form.quotation.taxes),
        addSubtotal: num(form.quotation.addSubtotal),
        cataloguePrice: num(form.quotation.cataloguePrice),
        labourPrice: num(form.quotation.labourPrice),
        samplePrice: num(form.quotation.samplePrice),
        discount: num(form.quotation.discount),
      },
      approval: { ...form.approval },
      presentation: { ...form.presentation },
    };
    execute(payload);
  };

  const activeTabIndex = FORM_TABS.findIndex((t) => t.id === activeFormTab);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Lead — ${lead?.code || lead?.clientName}` : 'Capture New Sales Lead'}
      subtitle="Section-by-section CRM workspace for easy navigation"
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            {activeTabIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveFormTab(FORM_TABS[activeTabIndex - 1].id)}
              >
                ← Previous Section
              </Button>
            )}
            {activeTabIndex < FORM_TABS.length - 1 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setActiveFormTab(FORM_TABS[activeTabIndex + 1].id)}
              >
                Next Section →
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} loading={pending || uploading}>
              {isEdit ? 'Save Changes' : 'Capture Lead'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Section Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl">
          {FORM_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFormTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFormTab(tab.id)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg text-xs transition-all ${isActive
                  ? 'bg-brand-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-brand-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 max-h-[60vh] overflow-y-auto overflow-x-hidden pr-2">
          {(error || uploadError) && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
              {error?.message || uploadError}
            </div>
          )}

          {/* TAB 1: CLIENT & SOURCE */}
          {activeFormTab === 'client' && (
            <div className="space-y-6">
              {/* Section 1: Primary Lead & Contact */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <User className="w-3.5 h-3.5" /> 1. Client & Primary Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Capture Date & Time" required>
                    <Input type="datetime-local" value={form.captureDateTime} onChange={set('captureDateTime')} required />
                  </Field>

                  <Field label="Client Name" required>
                    <Input value={form.clientName} onChange={set('clientName')} placeholder="e.g. Mr. Rajesh Sharma" required />
                  </Field>

                  <Field label="Contact Person">
                    <Input value={form.contactPerson} onChange={set('contactPerson')} placeholder="e.g. Mrs. Sunita Sharma" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Mobile Number" required>
                    <Input value={form.phone} onChange={set('phone')} placeholder="e.g. 98110 99887" required />
                  </Field>

                  <Field label="Email Address">
                    <Input type="email" value={form.email} onChange={set('email')} placeholder="rajesh@sharmagroup.com" />
                  </Field>

                  <Field label="Company Name">
                    <Input value={form.companyName} onChange={set('companyName')} placeholder="Sharma Group Pvt Ltd" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Project Location">
                    <Input value={form.location} onChange={set('location')} placeholder="Golf Course Road, Gurugram" />
                  </Field>

                  <Field label="Project Type">
                    <Select
                      value={form.projectType}
                      onChange={set('projectType')}
                      options={['VILLA', 'BUNGALOW', 'APARTMENT', 'FARMHOUSE', 'HOTEL', 'OFFICE', 'RETAIL', 'OTHER'].map((v) => ({ value: v, label: humanise(v) }))}
                    />
                  </Field>
                </div>
              </div>

              {/* Section 2: Commercial & Budget */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <BadgeDollarSign className="w-3.5 h-3.5" /> 2. Commercials & Budget Classification
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Indicative Budget (₹)">
                    <Input type="number" value={form.budget} onChange={set('budget')} placeholder="e.g. 4500000" />
                  </Field>

                  <Field label="Budget Classification">
                    <Select
                      value={form.budgetClassification}
                      onChange={set('budgetClassification')}
                      options={BUDGET_CLASSIFICATIONS}
                    />
                  </Field>

                  <Field label="Lead Priority">
                    <Select
                      value={form.priority}
                      onChange={set('priority')}
                      options={[
                        { value: 'HOT', label: '🔥 Hot' },
                        { value: 'MEDIUM', label: '⚡ Medium' },
                        { value: 'LOW', label: '💤 Low' },
                      ]}
                    />
                  </Field>
                </div>
              </div>

              {/* Section 3: Source, Architect & Relationship Owners */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Building2 className="w-3.5 h-3.5" /> 3. Lead Source, Architect & Relationship Owners
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Lead Source">
                    <Select value={form.source} onChange={set('source')} options={LEAD_SOURCES} />
                  </Field>

                  <Field label="Architect / Designer Name">
                    <Input value={form.architectName} onChange={set('architectName')} placeholder="e.g. Morphogenesis" />
                  </Field>

                  <Field label="Select Master Architect (Ref)">
                    <Select
                      value={form.architect}
                      onChange={set('architect')}
                      placeholder="Select from Master"
                      options={(architects || []).map((a) => ({ value: a.id || a._id, label: `${a.name}${a.firm ? ` (${a.firm})` : ''}` }))}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Architect / Designer Involved?">
                    <Select
                      value={form.architectInvolved}
                      onChange={set('architectInvolved')}
                      options={[
                        { value: 'NO', label: 'No Architect Involved' },
                        { value: 'YES', label: 'Yes — Architect Involved' },
                      ]}
                    />
                  </Field>

                  {form.architectInvolved === 'YES' && (
                    <Field label="Architect Involvement Notes">
                      <Input value={form.architectInvolvedDetails} onChange={set('architectInvolvedDetails')} placeholder="Involved in layout signoff..." />
                    </Field>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Previous Client Relationship">
                    <Select
                      value={form.previousClientRelationship}
                      onChange={set('previousClientRelationship')}
                      options={[
                        { value: 'NO', label: 'No Previous Relationship' },
                        { value: 'YES', label: 'Yes — Existing/Repeat Client' },
                      ]}
                    />
                  </Field>

                  {form.previousClientRelationship === 'YES' && (
                    <Field label="Previous Relationship Details">
                      <Input value={form.previousClientRelationshipDetails} onChange={set('previousClientRelationshipDetails')} placeholder="Past project notes..." />
                    </Field>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Existing Relationship Owner (User)">
                    <Select
                      value={form.existingRelationshipOwner}
                      onChange={set('existingRelationshipOwner')}
                      placeholder="Select Team Owner"
                      options={(users || []).map((u) => ({ value: u.id || u._id, label: `${u.name} (${u.role})` }))}
                    />
                  </Field>

                  <Field label="Relationship Owner Name (Custom)">
                    <Input value={form.existingRelationshipOwnerName} onChange={set('existingRelationshipOwnerName')} placeholder="e.g. Hitesh / Senior DCM" />
                  </Field>
                </div>
              </div>

              {/* Section 5: Requirement Summary & Attachments */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <FileText className="w-3.5 h-3.5" /> 5. Requirement Summary & General Attachments
                </h4>

                <Field label="Requirement Summary">
                  <Textarea
                    value={form.requirementSummary}
                    onChange={set('requirementSummary')}
                    placeholder="Detail window specs, fabric preferences, motorized track needs..."
                    rows={3}
                  />
                </Field>

                <div>
                  <label className="field-label flex items-center justify-between">
                    <span>Attachments (General Layouts, Documents)</span>
                    {uploading && <span className="text-xs text-brand-400 animate-pulse">Uploading files...</span>}
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-700 hover:border-brand-500 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/50 transition">
                      <Upload className="w-4 h-4 text-brand-400" />
                      <span>Upload General Attachments</span>
                      <input type="file" multiple onChange={handleFileUpload} className="hidden" disabled={uploading} />
                    </label>
                    <span className="text-[11px] text-slate-500">PDF, JPG, PNG, DOCX</span>
                  </div>

                  {form.attachments.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {form.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/60 border border-slate-800 rounded-md text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                            <span className="truncate text-slate-200">{att.filename || 'Attachment'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="text-rose-400 hover:text-rose-300 p-1 shrink-0"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SITE & MEASUREMENT */}
          {activeFormTab === 'site' && (
            <div className="space-y-6">
              {/* Section 4: Site Visit, Installer & Drawings/Renders */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <MapPin className="w-3.5 h-3.5" /> 4. Site Visit, Measurement & Technical Parameters
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Site Visit Due Date">
                    <Input type="date" value={form.siteVisitDueDate} onChange={set('siteVisitDueDate')} />
                  </Field>

                  <Field label="Actual Site Visit Date & Time">
                    <Input type="datetime-local" value={form.actualSiteVisitDateTime} onChange={set('actualSiteVisitDateTime')} />
                  </Field>

                  <Field label="Client / Architect Availability">
                    <Input value={form.clientArchitectAvailability} onChange={set('clientArchitectAvailability')} placeholder="e.g. Weekends 11 AM - 4 PM" />
                  </Field>
                </div>

                <Field label="Site Address">
                  <Textarea value={form.siteAddress} onChange={set('siteAddress')} placeholder="Enter complete site address & landmark..." rows={2} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Assigned Installer / Measurement Person">
                    <Select
                      value={form.assignedInstaller}
                      onChange={set('assignedInstaller')}
                      placeholder="Select Installer"
                      options={(users || []).map((u) => ({ value: u.id || u._id, label: `${u.name} (${u.role})` }))}
                    />
                  </Field>

                  <Field label="Custom Installer Name">
                    <Input value={form.assignedInstallerName} onChange={set('assignedInstallerName')} placeholder="e.g. Master Fitter Ramesh" />
                  </Field>

                  <Field label="Installer Availability">
                    <Select
                      value={form.installerAvailability}
                      onChange={set('installerAvailability')}
                      options={[
                        { value: 'AVAILABLE', label: '✅ Available' },
                        { value: 'BUSY', label: '⏳ Busy' },
                        { value: 'ON_SITE', label: '📍 On Site' },
                        { value: 'TENTATIVE', label: '❓ Tentative' },
                        { value: 'UNAVAILABLE', label: '❌ Unavailable' },
                      ]}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Scope">
                    <Input value={form.scope} onChange={set('scope')} placeholder="e.g. Motorized Curtains, Roman Blinds, Automation" />
                  </Field>

                  <Field label="Rooms">
                    <Input value={form.rooms} onChange={set('rooms')} placeholder="e.g. Master Bed, Living Room, Guest Suite" />
                  </Field>
                </div>

                <div>
                  <label className="field-label flex items-center justify-between">
                    <span>Drawings / Renders</span>
                    {uploading && <span className="text-xs text-brand-400 animate-pulse">Uploading files...</span>}
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-700 hover:border-brand-500 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/50 transition">
                      <Upload className="w-4 h-4 text-brand-400" />
                      <span>Upload Drawings/Renders</span>
                      <input type="file" multiple onChange={handleDrawingsUpload} className="hidden" disabled={uploading} />
                    </label>
                    <span className="text-[11px] text-slate-500">PDF, DWG, CAD, JPG, PNG</span>
                  </div>

                  {form.drawingsRenders.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {form.drawingsRenders.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/60 border border-slate-800 rounded-md text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                            <span className="truncate text-slate-200">{att.filename || 'Drawing'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDrawing(idx)}
                            className="text-rose-400 hover:text-rose-300 p-1 shrink-0"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 6: Site Visit Requirement & Measurement Scheduling */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Ruler className="w-3.5 h-3.5" /> 6. Site Visit Requirement & Measurement Scheduling
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Site Visit Required">
                    <Select
                      value={form.siteVisitRequired}
                      onChange={set('siteVisitRequired')}
                      options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]}
                    />
                  </Field>

                  <Field label="Measurement Due Date">
                    <Input type="date" value={form.measurement.dueDate} onChange={setNested('measurement', 'dueDate')} />
                  </Field>

                  <Field label="Measurement Date">
                    <Input type="date" value={form.measurement.date} onChange={setNested('measurement', 'date')} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Measured By">
                    <Select
                      value={form.measurement.measuredBy}
                      onChange={setNested('measurement', 'measuredBy')}
                      placeholder="Select Team Member"
                      options={(users || []).map((u) => ({ value: u.id || u._id, label: `${u.name} (${u.role})` }))}
                    />
                  </Field>

                  <Field label="Measurement Status">
                    <Select value={form.measurement.status} onChange={setNested('measurement', 'status')} options={MEASUREMENT_STATUSES} />
                  </Field>

                  <Field label="Site Access">
                    <Input value={form.measurement.siteAccess} onChange={setNested('measurement', 'siteAccess')} placeholder="e.g. Security gate, lift access" />
                  </Field>
                </div>
              </div>

              {/* Section 7: Measurement Details */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Ruler className="w-3.5 h-3.5" /> 7. Measurement Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Pelmet Details">
                    <Input value={form.measurement.pelmetDetails} onChange={setNested('measurement', 'pelmetDetails')} />
                  </Field>
                  <Field label="Channel Details">
                    <Input value={form.measurement.channelDetails} onChange={setNested('measurement', 'channelDetails')} />
                  </Field>
                  <Field label="Motor Details">
                    <Input value={form.measurement.motorDetails} onChange={setNested('measurement', 'motorDetails')} />
                  </Field>
                  <Field label="Wiring Details">
                    <Input value={form.measurement.wiringDetails} onChange={setNested('measurement', 'wiringDetails')} />
                  </Field>
                </div>

                <Field label="Room List">
                  <Textarea value={form.measurement.roomList} onChange={setNested('measurement', 'roomList')} rows={2} />
                </Field>

                <Field label="Measurements">
                  <Textarea value={form.measurement.notes ? form.measurement.notes : ''} onChange={setNested('measurement', 'notes')} placeholder="Detailed window-by-window measurements / notes" rows={2} />
                </Field>

                <FileListField
                  label="Site Photos / Measurement Attachments"
                  files={form.measurement.attachments}
                  uploading={uploading}
                  onUpload={handleNestedFileUpload('measurement', 'attachments')}
                  onRemove={(i) => removeNestedFile('measurement', 'attachments', i)}
                />

                <FileListField
                  label="Measurement Drawings"
                  files={form.measurement.drawings}
                  uploading={uploading}
                  onUpload={handleNestedFileUpload('measurement', 'drawings')}
                  onRemove={(i) => removeNestedFile('measurement', 'drawings', i)}
                />
              </div>
            </div>
          )}

          {/* TAB 3: STUDIO & BOQ */}
          {activeFormTab === 'studio' && (
            <div className="space-y-6">
              {/* Section 8: Studio Meeting */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <CalendarCheck2 className="w-3.5 h-3.5" /> 8. Studio Meeting
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Studio Meeting Due Date">
                    <Input type="date" value={form.studioMeeting.dueDate} onChange={setNested('studioMeeting', 'dueDate')} />
                  </Field>
                  <Field label="Meeting Date">
                    <Input type="date" value={form.studioMeeting.date} onChange={setNested('studioMeeting', 'date')} />
                  </Field>
                  <Field label="Meeting Attendees">
                    <Input value={form.studioMeeting.attendees} onChange={setNested('studioMeeting', 'attendees')} placeholder="e.g. Client, Architect, DCM" />
                  </Field>
                </div>

                <Field label="Client Feedback / Meeting Outcome">
                  <Textarea value={form.studioMeeting.feedback} onChange={setNested('studioMeeting', 'feedback')} rows={2} />
                </Field>

                <Field label="Next Action from the Meeting">
                  <Textarea value={form.studioMeeting.nextAction} onChange={setNested('studioMeeting', 'nextAction')} rows={2} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Architect Brief">
                    <Textarea value={form.studioMeeting.architectBrief} onChange={setNested('studioMeeting', 'architectBrief')} rows={2} />
                  </Field>
                  <Field label="Pricing Range">
                    <Input value={form.studioMeeting.pricingRange} onChange={setNested('studioMeeting', 'pricingRange')} />
                  </Field>
                </div>

                <FileListField
                  label="Client Drawings"
                  files={form.studioMeeting.clientDrawings}
                  uploading={uploading}
                  onUpload={handleNestedFileUpload('studioMeeting', 'clientDrawings')}
                  onRemove={(i) => removeNestedFile('studioMeeting', 'clientDrawings', i)}
                />
                <FileListField
                  label="Samples"
                  files={form.studioMeeting.samples}
                  uploading={uploading}
                  onUpload={handleNestedFileUpload('studioMeeting', 'samples')}
                  onRemove={(i) => removeNestedFile('studioMeeting', 'samples', i)}
                />
                <FileListField
                  label="Project Pictures"
                  files={form.studioMeeting.projectPictures}
                  uploading={uploading}
                  onUpload={handleNestedFileUpload('studioMeeting', 'projectPictures')}
                  onRemove={(i) => removeNestedFile('studioMeeting', 'projectPictures', i)}
                />
              </div>

              {/* Section 9: Room Readiness / Ready Size */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> 9. Room Readiness / Ready Size
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Meeting Room Readiness">
                    <Input value={form.readySize.roomReadiness} onChange={setNested('readySize', 'roomReadiness')} />
                  </Field>
                  <Field label="Ready Size Due Date">
                    <Input type="date" value={form.readySize.dueDate} onChange={setNested('readySize', 'dueDate')} />
                  </Field>
                  <Field label="Confirmation Date">
                    <Input type="date" value={form.readySize.confirmationDate} onChange={setNested('readySize', 'confirmationDate')} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Ready Size Confirmed By">
                    <Select
                      value={form.readySize.confirmedBy}
                      onChange={setNested('readySize', 'confirmedBy')}
                      placeholder="Select Team Member"
                      options={(users || []).map((u) => ({ value: u.id || u._id, label: `${u.name} (${u.role})` }))}
                    />
                  </Field>
                  <Field label="Window Size">
                    <Input value={form.readySize.windowSize} onChange={setNested('readySize', 'windowSize')} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Site Condition">
                    <Input value={form.readySize.siteCondition} onChange={setNested('readySize', 'siteCondition')} />
                  </Field>
                  <Field label="Pelmet Details">
                    <Input value={form.readySize.pelmetDetails} onChange={setNested('readySize', 'pelmetDetails')} />
                  </Field>
                  <Field label="Channel Details">
                    <Input value={form.readySize.channelDetails} onChange={setNested('readySize', 'channelDetails')} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Ready Height">
                    <Input value={form.readySize.readyHeight} onChange={setNested('readySize', 'readyHeight')} />
                  </Field>
                </div>

                <Field label="Final Measurements">
                  <Textarea value={form.readySize.finalMeasurements} onChange={setNested('readySize', 'finalMeasurements')} rows={2} />
                </Field>
              </div>

              {/* Section 10: Consumption / BOQ */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> 10. Consumption Sheet / BOQ
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Consumption Sheet Due Date">
                    <Input type="date" value={form.consumption.sheetDueDate} onChange={setNested('consumption', 'sheetDueDate')} />
                  </Field>
                  <Field label="Consumption Quantity">
                    <Input type="number" value={form.consumption.quantity} onChange={setNested('consumption', 'quantity')} />
                  </Field>
                  <Field label="Unit">
                    <Input value={form.consumption.unit} onChange={setNested('consumption', 'unit')} placeholder="e.g. Meters, Sq.Ft" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Wastage Allowance">
                    <Input value={form.consumption.wastageAllowance} onChange={setNested('consumption', 'wastageAllowance')} placeholder="e.g. 5%" />
                  </Field>
                  <Field label="BOQ / Consumption Sheet Version">
                    <Input value={form.consumption.boqVersion} onChange={setNested('consumption', 'boqVersion')} />
                  </Field>
                  <Field label="Panel Count">
                    <Input type="number" value={form.consumption.panelCount} onChange={setNested('consumption', 'panelCount')} />
                  </Field>
                </div>

                <Field label="Room List">
                  <Textarea value={form.consumption.roomList} onChange={setNested('consumption', 'roomList')} rows={2} />
                </Field>

                <Field label="Measurements">
                  <Textarea value={form.consumption.measurements} onChange={setNested('consumption', 'measurements')} rows={2} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Fabric / Design Selection">
                    <Input value={form.consumption.fabricDesignSelection} onChange={setNested('consumption', 'fabricDesignSelection')} />
                  </Field>
                  <Field label="Lining / Accessory Assumptions">
                    <Input value={form.consumption.liningAccessoryAssumptions} onChange={setNested('consumption', 'liningAccessoryAssumptions')} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROPOSALS & TOKEN */}
          {activeFormTab === 'proposals' && (
            <div className="space-y-6">
              {/* Section 11: Proposal */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <ReceiptText className="w-3.5 h-3.5" /> 11. Proposal
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Proposal Due Date">
                    <Input type="date" value={form.proposal.dueDate} onChange={setNested('proposal', 'dueDate')} />
                  </Field>
                  <Field label="Proposal No. / Version">
                    <Input value={form.proposal.noVersion} onChange={setNested('proposal', 'noVersion')} />
                  </Field>
                  <Field label="Proposal Date">
                    <Input type="date" value={form.proposal.date} onChange={setNested('proposal', 'date')} />
                  </Field>
                </div>

                <Field label="Client Brief">
                  <Textarea value={form.proposal.clientBrief} onChange={setNested('proposal', 'clientBrief')} rows={2} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Design Direction">
                    <Input value={form.proposal.designDirection} onChange={setNested('proposal', 'designDirection')} />
                  </Field>
                  <Field label="Pricing Range">
                    <Input value={form.proposal.pricingRange} onChange={setNested('proposal', 'pricingRange')} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Terms">
                    <Textarea value={form.proposal.terms} onChange={setNested('proposal', 'terms')} rows={2} />
                  </Field>
                  <Field label="Refund / Revision Clause">
                    <Textarea value={form.proposal.refundRevisionClause} onChange={setNested('proposal', 'refundRevisionClause')} rows={2} />
                  </Field>
                </div>

                <FileListField
                  label="Consumption Sheet"
                  files={form.proposal.consumptionSheet}
                  uploading={uploading}
                  onUpload={handleNestedFileUpload('proposal', 'consumptionSheet')}
                  onRemove={(i) => removeNestedFile('proposal', 'consumptionSheet', i)}
                />
              </div>

              {/* Section 12: Token / Advance */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Wallet className="w-3.5 h-3.5" /> 12. Token / Advance Discussion
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Token Discussion Due">
                    <Input type="date" value={form.token.discussionDueDate} onChange={setNested('token', 'discussionDueDate')} />
                  </Field>
                  <Field label="Token Amount (₹)">
                    <Input type="number" value={form.token.amount} onChange={setNested('token', 'amount')} />
                  </Field>
                  <Field label="Token Status">
                    <Select value={form.token.status} onChange={setNested('token', 'status')} options={TOKEN_STATUSES} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Token Received Date">
                    <Input type="date" value={form.token.receivedDate} onChange={setNested('token', 'receivedDate')} />
                  </Field>
                  <Field label="Budget Estimate (₹)">
                    <Input type="number" value={form.token.budgetEstimate} onChange={setNested('token', 'budgetEstimate')} />
                  </Field>
                  <Field label="Project Timeline">
                    <Input value={form.token.projectTimeline} onChange={setNested('token', 'projectTimeline')} placeholder="e.g. 8-10 weeks" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Client Budget Response">
                    <Input value={form.token.clientBudgetResponse} onChange={setNested('token', 'clientBudgetResponse')} />
                  </Field>
                  <Field label="Client Response">
                    <Input value={form.token.clientResponse} onChange={setNested('token', 'clientResponse')} />
                  </Field>
                </div>

                <Field label="Commercial Terms">
                  <Textarea value={form.token.commercialTerms} onChange={setNested('token', 'commercialTerms')} rows={2} />
                </Field>

                <FileListField
                  label="Proposal Attachment"
                  files={form.token.proposalAttachment}
                  uploading={uploading}
                  onUpload={handleNestedFileUpload('token', 'proposalAttachment')}
                  onRemove={(i) => removeNestedFile('token', 'proposalAttachment', i)}
                />
              </div>

              {/* Section 13: Costing */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <BadgeDollarSign className="w-3.5 h-3.5" /> 13. Costing
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Pricing Due Date">
                    <Input type="date" value={form.costing.dueDate} onChange={setNested('costing', 'dueDate')} />
                  </Field>
                  <Field label="Catalogue Cost (₹)">
                    <Input type="number" value={form.costing.catalogueCost} onChange={setNested('costing', 'catalogueCost')} />
                  </Field>
                  <Field label="Costing Version / Revision">
                    <Input value={form.costing.version} onChange={setNested('costing', 'version')} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Landed Cost (₹)">
                    <Input type="number" value={form.costing.landedCost} onChange={setNested('costing', 'landedCost')} />
                  </Field>
                  <Field label="Local Fabric Cost (₹)">
                    <Input type="number" value={form.costing.localFabricCost} onChange={setNested('costing', 'localFabricCost')} />
                  </Field>
                  <Field label="Labour Cost / Custom Cost (₹)">
                    <Input type="number" value={form.costing.labourCost} onChange={setNested('costing', 'labourCost')} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Sample Cost (₹)">
                    <Input type="number" value={form.costing.sampleCost} onChange={setNested('costing', 'sampleCost')} />
                  </Field>
                  <Field label="Margin Model">
                    <Input value={form.costing.marginModel} onChange={setNested('costing', 'marginModel')} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: QUOTATION & APPROVAL */}
          {activeFormTab === 'quotation' && (
            <div className="space-y-6">
              {/* Section 14: Quotation */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <ReceiptText className="w-3.5 h-3.5" /> 14. Quotation
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Quotation Due Date">
                    <Input type="date" value={form.quotation.dueDate} onChange={setNested('quotation', 'dueDate')} />
                  </Field>
                  <Field label="Quotation No.">
                    <Input value={form.quotation.no} onChange={setNested('quotation', 'no')} />
                  </Field>
                  <Field label="Quotation Version">
                    <Input value={form.quotation.version} onChange={setNested('quotation', 'version')} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Quotation Date">
                    <Input type="date" value={form.quotation.date} onChange={setNested('quotation', 'date')} />
                  </Field>
                  <Field label="Final Quoted Value (₹)">
                    <Input type="number" value={form.quotation.finalQuotedValue} onChange={setNested('quotation', 'finalQuotedValue')} />
                  </Field>
                  <Field label="Taxes (₹)">
                    <Input type="number" value={form.quotation.taxes} onChange={setNested('quotation', 'taxes')} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Add Subtotal (₹)">
                    <Input type="number" value={form.quotation.addSubtotal} onChange={setNested('quotation', 'addSubtotal')} />
                  </Field>
                  <Field label="Quotation Validity">
                    <Input value={form.quotation.validity} onChange={setNested('quotation', 'validity')} placeholder="e.g. 15 days" />
                  </Field>
                  <Field label="Discount Approval Status">
                    <Select value={form.quotation.discountApprovalStatus} onChange={setNested('quotation', 'discountApprovalStatus')} options={DISCOUNT_APPROVAL_STATUSES} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Fabric Selection">
                    <Input value={form.quotation.fabricSelection} onChange={setNested('quotation', 'fabricSelection')} />
                  </Field>
                  <Field label="Catalogue Price (₹)">
                    <Input type="number" value={form.quotation.cataloguePrice} onChange={setNested('quotation', 'cataloguePrice')} />
                  </Field>
                  <Field label="Labour Price (₹)">
                    <Input type="number" value={form.quotation.labourPrice} onChange={setNested('quotation', 'labourPrice')} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Sample Price (₹)">
                    <Input type="number" value={form.quotation.samplePrice} onChange={setNested('quotation', 'samplePrice')} />
                  </Field>
                  <Field label="Discount (₹)">
                    <Input type="number" value={form.quotation.discount} onChange={setNested('quotation', 'discount')} />
                  </Field>
                  <Field label="Margin Rules">
                    <Input value={form.quotation.marginRules} onChange={setNested('quotation', 'marginRules')} />
                  </Field>
                </div>

                <FileListField
                  label="BOQ"
                  files={form.quotation.boq}
                  uploading={uploading}
                  onUpload={handleNestedFileUpload('quotation', 'boq')}
                  onRemove={(i) => removeNestedFile('quotation', 'boq', i)}
                />
              </div>

              {/* Section 15: Client Approval */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> 15. Client Approval
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Planned">
                    <Input value={form.approval.planned} onChange={setNested('approval', 'planned')} />
                  </Field>
                  <Field label="Client Approval Status">
                    <Select value={form.approval.clientApprovalStatus} onChange={setNested('approval', 'clientApprovalStatus')} options={CLIENT_APPROVAL_STATUSES} />
                  </Field>
                  <Field label="Final Quotation / Proposal Version Approved">
                    <Input value={form.approval.finalApprovedVersion} onChange={setNested('approval', 'finalApprovedVersion')} />
                  </Field>
                </div>

                <FileListField
                  label="Approval Proof / Attachment"
                  files={form.approval.proofAttachment}
                  uploading={uploading}
                  onUpload={handleNestedFileUpload('approval', 'proofAttachment')}
                  onRemove={(i) => removeNestedFile('approval', 'proofAttachment', i)}
                />
              </div>

              {/* Section 16: Presentation */}
              <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <PresentationIcon className="w-3.5 h-3.5" /> 16. Presentation
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Client Selection">
                    <Input value={form.presentation.clientSelection} onChange={setNested('presentation', 'clientSelection')} />
                  </Field>
                  <Field label="Fabric Selection">
                    <Input value={form.presentation.fabricSelection} onChange={setNested('presentation', 'fabricSelection')} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Design Direction">
                    <Input value={form.presentation.designDirection} onChange={setNested('presentation', 'designDirection')} />
                  </Field>
                </div>

                <Field label="Revision Notes">
                  <Textarea value={form.presentation.revisionNotes} onChange={setNested('presentation', 'revisionNotes')} rows={2} />
                </Field>

                <FileListField
                  label="Presentation Attachment"
                  files={form.presentation.attachment}
                  uploading={uploading}
                  onUpload={handleNestedFileUpload('presentation', 'attachment')}
                  onRemove={(i) => removeNestedFile('presentation', 'attachment', i)}
                />
              </div>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
};

/** Compact label/value tile used across the Sales & Commercials detail panels. */
const InfoTile = ({ label, value }) => (
  <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
    <span className="text-slate-400 block text-[10px] uppercase">{label}</span>
    <span className="text-slate-200 text-xs">{value || value === 0 ? value : '—'}</span>
  </div>
);

/** Downloadable file badges used across the Sales & Commercials detail panels. */
const AttachmentLinks = ({ label, files }) => (
  <div className="space-y-1.5 pt-1">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
      <FileText className="w-3.5 h-3.5 text-brand-400" /> {label} ({files?.length || 0})
    </span>
    {!(files && files.length > 0) ? (
      <p className="text-xs text-slate-500 italic">None attached.</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {files.map((att, i) => (
          <a
            key={i}
            href={att.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 hover:border-brand-500/50 rounded-lg text-xs transition group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-brand-400 shrink-0" />
              <span className="truncate text-slate-300 group-hover:text-brand-300">{att.filename || `File ${i + 1}`}</span>
            </div>
            <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-200 shrink-0 ml-2" />
          </a>
        ))}
      </div>
    )}
  </div>
);

/* ------------------------------------------------------------ Lead Drawer / Detail Modal */

const LeadDetailDrawer = ({ lead, onClose, onEdit, onQualify, onAssign, onConvert }) => {
  if (!lead) return null;

  const [activeDetailTab, setActiveDetailTab] = useState('client');

  const DETAIL_TABS = [
    { id: 'client', label: 'Client & Overview', icon: User },
    { id: 'site', label: 'Site & Measurement', icon: MapPin },
    { id: 'studio', label: 'Studio & BOQ', icon: CalendarCheck2 },
    { id: 'proposals', label: 'Proposal & Token', icon: ReceiptText },
    { id: 'quotation', label: 'Quotation & Approval', icon: ShieldCheck },
  ];

  return (
    <Modal
      open={Boolean(lead)}
      onClose={onClose}
      title={`Sales Lead — ${lead.code}`}
      subtitle={`${lead.clientName} ${lead.companyName ? `(${lead.companyName})` : ''}`}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Pencil} onClick={() => { onClose(); onEdit(lead); }}>
              Edit Lead
            </Button>
            {lead.status === 'NEW' && (
              <Button variant="outline" icon={UserCheck} onClick={() => { onClose(); onAssign(lead); }}>
                Assign Owner
              </Button>
            )}
            {['NEW', 'CONTACTED'].includes(lead.status) && (
              <Button variant="outline" icon={CheckCircle2} onClick={() => { onClose(); onQualify(lead); }}>
                Qualify
              </Button>
            )}
            {lead.status === 'QUALIFIED' && (
              <Button variant="primary" icon={ArrowRightCircle} onClick={() => { onClose(); onConvert(lead); }}>
                Convert to Client
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto overflow-x-hidden pr-2">
        {/* Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div>
            <p className="text-xs text-slate-400">Current Lead Status</p>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={lead.status} />
              <Badge tone={lead.priority === 'HOT' ? 'rose' : lead.priority === 'MEDIUM' ? 'amber' : 'slate'}>
                {lead.priority} PRIORITY
              </Badge>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400">Indicative Budget</p>
            <p className="text-lg font-bold text-slate-100 numeric">
              {lead.budget ? currency(lead.budget) : 'Unspecified'}
            </p>
            <Badge tone={BUDGET_TONES[lead.budgetClassification] || 'blue'}>
              {lead.budgetClassification || 'MID_RANGE'}
            </Badge>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {DETAIL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeDetailTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDetailTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs transition-all ${isActive
                  ? 'bg-brand-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
                  }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-brand-400'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: CLIENT & OVERVIEW */}
        {activeDetailTab === 'client' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-900/30 border border-slate-800/80 rounded-lg space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400">Contact & Capture</p>
                <div className="space-y-1.5 text-xs">
                  <p><strong className="text-slate-400">Lead ID:</strong> <span className="font-mono text-brand-300">{lead.code}</span></p>
                  <p><strong className="text-slate-400">Capture Date & Time:</strong> {date(lead.captureDateTime || lead.createdAt, { time: true })}</p>
                  <p><strong className="text-slate-400">Client Name:</strong> {lead.clientName}</p>
                  <p><strong className="text-slate-400">Contact Person:</strong> {lead.contactPerson || '—'}</p>
                  <p><strong className="text-slate-400">Mobile Number:</strong> <span className="text-slate-200">{lead.phone}</span></p>
                  <p><strong className="text-slate-400">Email:</strong> {lead.email || '—'}</p>
                  <p><strong className="text-slate-400">Location:</strong> {lead.location || '—'}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-900/30 border border-slate-800/80 rounded-lg space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400">Source & Relationships</p>
                <div className="space-y-1.5 text-xs">
                  <p><strong className="text-slate-400">Lead Source:</strong> {humanise(lead.source)}</p>
                  <p><strong className="text-slate-400">Architect / Designer:</strong> {lead.architect?.name || lead.architectName || '—'}</p>
                  <p><strong className="text-slate-400">Architect Involved:</strong> {lead.architectInvolved ? 'Yes' : 'No'} {lead.architectInvolvedDetails ? `(${lead.architectInvolvedDetails})` : ''}</p>
                  <p><strong className="text-slate-400">Previous Relationship:</strong> {lead.previousClientRelationship ? 'Yes' : 'No'} {lead.previousClientRelationshipDetails ? `(${lead.previousClientRelationshipDetails})` : ''}</p>
                  <p><strong className="text-slate-400">Relationship Owner:</strong> {lead.existingRelationshipOwner?.name || lead.existingRelationshipOwnerName || lead.assignedDCM?.name || 'Unassigned'}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-lg space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400">Requirement Summary</p>
              <p className="text-xs text-slate-300 whitespace-pre-wrap">
                {lead.requirementSummary || lead.requirement || 'No specific requirement details recorded yet.'}
              </p>
            </div>

            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-lg space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center justify-between">
                <span>General Attachments ({lead.attachments?.length || 0})</span>
              </p>
              {!(lead.attachments && lead.attachments.length > 0) ? (
                <p className="text-xs text-slate-500 italic">No general files attached to this lead.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {lead.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 hover:border-brand-500/50 rounded-lg text-xs transition group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-4 h-4 text-brand-400 shrink-0" />
                        <span className="truncate text-slate-300 group-hover:text-brand-300">{att.filename || `File ${i + 1}`}</span>
                      </div>
                      <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-200 shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SITE & MEASUREMENT */}
        {activeDetailTab === 'site' && (
          <div className="space-y-4">
            {/* Site Visit, Installer & Technical Parameters Panel */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <MapPin className="w-3.5 h-3.5" /> Site Visit, Installer & Technical Specifications
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase">Site Visit Due Date</span>
                  <span className="font-semibold text-slate-200">{lead.siteVisitDueDate ? date(lead.siteVisitDueDate) : 'Not scheduled'}</span>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase">Actual Site Visit Date & Time</span>
                  <span className="font-semibold text-slate-200">{lead.actualSiteVisitDateTime ? date(lead.actualSiteVisitDateTime, { time: true }) : 'Pending visit'}</span>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase">Client / Architect Availability</span>
                  <span className="text-slate-200">{lead.clientArchitectAvailability || '—'}</span>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase">Assigned Installer / Measurement</span>
                  <span className="font-semibold text-slate-200">{lead.assignedInstaller?.name || lead.assignedInstallerName || 'Unassigned'}</span>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase">Installer Availability</span>
                  <Badge tone={lead.installerAvailability === 'AVAILABLE' ? 'emerald' : lead.installerAvailability === 'BUSY' ? 'amber' : lead.installerAvailability === 'ON_SITE' ? 'blue' : 'slate'}>
                    {lead.installerAvailability || 'AVAILABLE'}
                  </Badge>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase">Rooms</span>
                  <span className="text-slate-200">{lead.rooms || '—'}</span>
                </div>
              </div>

              {lead.siteAddress && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Site Address</span>
                  <p className="text-slate-200">{lead.siteAddress}</p>
                </div>
              )}

              {lead.scope && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Scope</span>
                  <p className="text-slate-200">{lead.scope}</p>
                </div>
              )}

              <AttachmentLinks label="Drawings / Renders" files={lead.drawingsRenders} />
            </div>

            {/* Measurement Details */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <Ruler className="w-3.5 h-3.5" /> Measurement
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <InfoTile label="Measurement Due Date" value={lead.measurement?.dueDate ? date(lead.measurement.dueDate) : null} />
                <InfoTile label="Measurement Date" value={lead.measurement?.date ? date(lead.measurement.date) : null} />
                <InfoTile label="Measured By" value={lead.measurement?.measuredBy?.name} />
                <InfoTile label="Measurement Status" value={lead.measurement?.status ? humanise(lead.measurement.status) : null} />
                <InfoTile label="Site Access" value={lead.measurement?.siteAccess} />
                <InfoTile label="Room List" value={lead.measurement?.roomList} />
                <InfoTile label="Pelmet Details" value={lead.measurement?.pelmetDetails} />
                <InfoTile label="Channel Details" value={lead.measurement?.channelDetails} />
                <InfoTile label="Motor Details" value={lead.measurement?.motorDetails} />
                <InfoTile label="Wiring Details" value={lead.measurement?.wiringDetails} />
              </div>
              {lead.measurement?.notes && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Measurements</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{lead.measurement.notes}</p>
                </div>
              )}
              <AttachmentLinks label="Site Photos / Measurement Attachments" files={lead.measurement?.attachments} />
              <AttachmentLinks label="Measurement Drawings" files={lead.measurement?.drawings} />
            </div>
          </div>
        )}

        {/* TAB 3: STUDIO & BOQ */}
        {activeDetailTab === 'studio' && (
          <div className="space-y-4">
            {/* Studio Meeting */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <CalendarCheck2 className="w-3.5 h-3.5" /> Studio Meeting
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <InfoTile label="Studio Meeting Due Date" value={lead.studioMeeting?.dueDate ? date(lead.studioMeeting.dueDate) : null} />
                <InfoTile label="Meeting Date" value={lead.studioMeeting?.date ? date(lead.studioMeeting.date) : null} />
                <InfoTile label="Meeting Attendees" value={lead.studioMeeting?.attendees} />
                <InfoTile label="Pricing Range" value={lead.studioMeeting?.pricingRange} />
              </div>
              {lead.studioMeeting?.feedback && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Client Feedback / Meeting Outcome</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{lead.studioMeeting.feedback}</p>
                </div>
              )}
              {lead.studioMeeting?.nextAction && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Next Action from the Meeting</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{lead.studioMeeting.nextAction}</p>
                </div>
              )}
              {lead.studioMeeting?.architectBrief && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Architect Brief</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{lead.studioMeeting.architectBrief}</p>
                </div>
              )}
              <AttachmentLinks label="Client Drawings" files={lead.studioMeeting?.clientDrawings} />
              <AttachmentLinks label="Samples" files={lead.studioMeeting?.samples} />
              <AttachmentLinks label="Project Pictures" files={lead.studioMeeting?.projectPictures} />
            </div>

            {/* Room Readiness / Ready Size */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <ClipboardList className="w-3.5 h-3.5" /> Room Readiness / Ready Size
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <InfoTile label="Meeting Room Readiness" value={lead.readySize?.roomReadiness} />
                <InfoTile label="Ready Size Due Date" value={lead.readySize?.dueDate ? date(lead.readySize.dueDate) : null} />
                <InfoTile label="Ready Size Confirmed By" value={lead.readySize?.confirmedBy?.name} />
                <InfoTile label="Confirmation Date" value={lead.readySize?.confirmationDate ? date(lead.readySize.confirmationDate) : null} />
                <InfoTile label="Window Size" value={lead.readySize?.windowSize} />
                <InfoTile label="Site Condition" value={lead.readySize?.siteCondition} />
                <InfoTile label="Pelmet Details" value={lead.readySize?.pelmetDetails} />
                <InfoTile label="Channel Details" value={lead.readySize?.channelDetails} />
                <InfoTile label="Ready Height" value={lead.readySize?.readyHeight} />
              </div>
              {lead.readySize?.finalMeasurements && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Final Measurements</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{lead.readySize.finalMeasurements}</p>
                </div>
              )}
            </div>

            {/* Consumption / BOQ */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <ClipboardList className="w-3.5 h-3.5" /> Consumption Sheet / BOQ
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <InfoTile label="Consumption Sheet Due" value={lead.consumption?.sheetDueDate ? date(lead.consumption.sheetDueDate) : null} />
                <InfoTile label="Consumption Quantity" value={lead.consumption?.quantity} />
                <InfoTile label="Unit" value={lead.consumption?.unit} />
                <InfoTile label="Wastage Allowance" value={lead.consumption?.wastageAllowance} />
                <InfoTile label="BOQ / Consumption Sheet Version" value={lead.consumption?.boqVersion} />
                <InfoTile label="Panel Count" value={lead.consumption?.panelCount} />
                <InfoTile label="Fabric / Design Selection" value={lead.consumption?.fabricDesignSelection} />
                <InfoTile label="Lining / Accessory Assumptions" value={lead.consumption?.liningAccessoryAssumptions} />
              </div>
              {lead.consumption?.roomList && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Room List</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{lead.consumption.roomList}</p>
                </div>
              )}
              {lead.consumption?.measurements && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Measurements</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{lead.consumption.measurements}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PROPOSALS & TOKEN */}
        {activeDetailTab === 'proposals' && (
          <div className="space-y-4">
            {/* Proposal */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <ReceiptText className="w-3.5 h-3.5" /> Proposal
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <InfoTile label="Proposal Due Date" value={lead.proposal?.dueDate ? date(lead.proposal.dueDate) : null} />
                <InfoTile label="Proposal No. / Version" value={lead.proposal?.noVersion} />
                <InfoTile label="Proposal Date" value={lead.proposal?.date ? date(lead.proposal.date) : null} />
                <InfoTile label="Design Direction" value={lead.proposal?.designDirection} />
                <InfoTile label="Pricing Range" value={lead.proposal?.pricingRange} />
              </div>
              {lead.proposal?.clientBrief && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Client Brief</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{lead.proposal.clientBrief}</p>
                </div>
              )}
              {lead.proposal?.terms && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Terms</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{lead.proposal.terms}</p>
                </div>
              )}
              {lead.proposal?.refundRevisionClause && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Refund / Revision Clause</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{lead.proposal.refundRevisionClause}</p>
                </div>
              )}
              <AttachmentLinks label="Consumption Sheet" files={lead.proposal?.consumptionSheet} />
            </div>

            {/* Token / Advance */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <Wallet className="w-3.5 h-3.5" /> Token / Advance Discussion
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <InfoTile label="Token Discussion Due" value={lead.token?.discussionDueDate ? date(lead.token.discussionDueDate) : null} />
                <InfoTile label="Token Amount" value={lead.token?.amount ? currency(lead.token.amount) : null} />
                <InfoTile label="Token Status" value={lead.token?.status ? humanise(lead.token.status) : null} />
                <InfoTile label="Token Received Date" value={lead.token?.receivedDate ? date(lead.token.receivedDate) : null} />
                <InfoTile label="Budget Estimate" value={lead.token?.budgetEstimate ? currency(lead.token.budgetEstimate) : null} />
                <InfoTile label="Project Timeline" value={lead.token?.projectTimeline} />
                <InfoTile label="Client Budget Response" value={lead.token?.clientBudgetResponse} />
                <InfoTile label="Client Response" value={lead.token?.clientResponse} />
              </div>
              {lead.token?.commercialTerms && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Commercial Terms</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{lead.token.commercialTerms}</p>
                </div>
              )}
              <AttachmentLinks label="Proposal Attachment" files={lead.token?.proposalAttachment} />
            </div>

            {/* Costing */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <BadgeDollarSign className="w-3.5 h-3.5" /> Costing
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <InfoTile label="Pricing Due Date" value={lead.costing?.dueDate ? date(lead.costing.dueDate) : null} />
                <InfoTile label="Catalogue Cost" value={lead.costing?.catalogueCost ? currency(lead.costing.catalogueCost) : null} />
                <InfoTile label="Costing Version / Revision" value={lead.costing?.version} />
                <InfoTile label="Landed Cost" value={lead.costing?.landedCost ? currency(lead.costing.landedCost) : null} />
                <InfoTile label="Local Fabric Cost" value={lead.costing?.localFabricCost ? currency(lead.costing.localFabricCost) : null} />
                <InfoTile label="Labour Cost / Custom Cost" value={lead.costing?.labourCost ? currency(lead.costing.labourCost) : null} />
                <InfoTile label="Sample Cost" value={lead.costing?.sampleCost ? currency(lead.costing.sampleCost) : null} />
                <InfoTile label="Margin Model" value={lead.costing?.marginModel} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: QUOTATION & APPROVAL */}
        {activeDetailTab === 'quotation' && (
          <div className="space-y-4">
            {/* Quotation */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <ReceiptText className="w-3.5 h-3.5" /> Quotation
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <InfoTile label="Quotation Due Date" value={lead.quotation?.dueDate ? date(lead.quotation.dueDate) : null} />
                <InfoTile label="Quotation No." value={lead.quotation?.no} />
                <InfoTile label="Quotation Version" value={lead.quotation?.version} />
                <InfoTile label="Quotation Date" value={lead.quotation?.date ? date(lead.quotation.date) : null} />
                <InfoTile label="Final Quoted Value" value={lead.quotation?.finalQuotedValue ? currency(lead.quotation.finalQuotedValue) : null} />
                <InfoTile label="Taxes" value={lead.quotation?.taxes ? currency(lead.quotation.taxes) : null} />
                <InfoTile label="Add Subtotal" value={lead.quotation?.addSubtotal ? currency(lead.quotation.addSubtotal) : null} />
                <InfoTile label="Quotation Validity" value={lead.quotation?.validity} />
                <InfoTile label="Discount Approval Status" value={lead.quotation?.discountApprovalStatus ? humanise(lead.quotation.discountApprovalStatus) : null} />
                <InfoTile label="Fabric Selection" value={lead.quotation?.fabricSelection} />
                <InfoTile label="Catalogue Price" value={lead.quotation?.cataloguePrice ? currency(lead.quotation.cataloguePrice) : null} />
                <InfoTile label="Labour Price" value={lead.quotation?.labourPrice ? currency(lead.quotation.labourPrice) : null} />
                <InfoTile label="Sample Price" value={lead.quotation?.samplePrice ? currency(lead.quotation.samplePrice) : null} />
                <InfoTile label="Discount" value={lead.quotation?.discount ? currency(lead.quotation.discount) : null} />
                <InfoTile label="Margin Rules" value={lead.quotation?.marginRules} />
              </div>
              <AttachmentLinks label="BOQ" files={lead.quotation?.boq} />
            </div>

            {/* Client Approval */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Client Approval
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <InfoTile label="Planned" value={lead.approval?.planned} />
                <InfoTile label="Client Approval Status" value={lead.approval?.clientApprovalStatus ? humanise(lead.approval.clientApprovalStatus) : null} />
                <InfoTile label="Final Quotation / Proposal Version Approved" value={lead.approval?.finalApprovedVersion} />
              </div>
              <AttachmentLinks label="Approval Proof / Attachment" files={lead.approval?.proofAttachment} />
            </div>

            {/* Presentation */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <PresentationIcon className="w-3.5 h-3.5" /> Presentation
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <InfoTile label="Client Selection" value={lead.presentation?.clientSelection} />
                <InfoTile label="Fabric Selection" value={lead.presentation?.fabricSelection} />
                <InfoTile label="Design Direction" value={lead.presentation?.designDirection} />
              </div>
              {lead.presentation?.revisionNotes && (
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Revision Notes</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{lead.presentation.revisionNotes}</p>
                </div>
              )}
              <AttachmentLinks label="Presentation Attachment" files={lead.presentation?.attachment} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------- Lead Card Component */

const LeadCard = ({ lead, onView, onEdit }) => {
  return (
    <div className="p-4 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-brand-500/40 rounded-xl space-y-3 transition shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              onClick={() => onView(lead)}
              className="font-mono text-xs font-bold text-brand-400 hover:underline cursor-pointer"
            >
              {lead.code}
            </span>
            <StatusBadge status={lead.status} />
            {lead.priority && (
              <Badge tone={lead.priority === 'HOT' ? 'rose' : lead.priority === 'MEDIUM' ? 'amber' : 'slate'}>
                {lead.priority}
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            {date(lead.captureDateTime || lead.createdAt)}
          </span>
        </div>

        <div className="space-y-0.5 mb-3">
          <div className="flex items-center justify-between gap-2">
            <h4
              onClick={() => onView(lead)}
              className="text-sm font-semibold text-slate-100 hover:text-brand-300 cursor-pointer truncate"
            >
              {lead.clientName}
            </h4>
            {lead.previousClientRelationship && <Badge tone="violet">Repeat</Badge>}
          </div>

          {lead.contactPerson && (
            <p className="text-xs text-slate-400 truncate">Contact: {lead.contactPerson}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1 font-mono text-slate-300">
              <Phone className="w-3 h-3 text-brand-400" /> {lead.phone}
            </span>
            {lead.email && (
              <span className="flex items-center gap-1 truncate text-slate-400">
                <Mail className="w-3 h-3 text-brand-400 shrink-0" /> {lead.email}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs mb-3">
          <div>
            <span className="text-[10px] uppercase text-slate-500 block">Budget & Tier</span>
            <p className="font-semibold text-slate-200 numeric">
              {lead.budget ? currency(lead.budget, { compact: true }) : '—'}
            </p>
            <Badge tone={BUDGET_TONES[lead.budgetClassification] || 'slate'} className="mt-0.5 text-[10px]">
              {lead.budgetClassification || 'MID_RANGE'}
            </Badge>
          </div>

          <div>
            <span className="text-[10px] uppercase text-slate-500 block">Location</span>
            <p className="text-slate-300 truncate" title={lead.location}>
              {lead.location || '—'}
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase text-slate-500 block">Source / Architect</span>
            <p className="text-slate-300 truncate" title={lead.architect?.name || lead.architectName}>
              {lead.architect?.name || lead.architectName || humanise(lead.source)}
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase text-slate-500 block">Rel. Owner</span>
            <p className="text-slate-300 truncate">
              {lead.existingRelationshipOwner?.name || lead.existingRelationshipOwnerName || lead.assignedDCM?.name || 'Unassigned'}
            </p>
          </div>
        </div>

        {/* Site Visit, Installer & Technical Quick Specs */}
        {(lead.siteVisitDueDate || lead.assignedInstaller || lead.assignedInstallerName || lead.scope || lead.rooms) && (
          <div className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-lg text-xs space-y-1 mb-3">
            {lead.siteVisitDueDate && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Site Visit Due:</span>
                <span className="font-medium text-brand-300">{date(lead.siteVisitDueDate)}</span>
              </div>
            )}
            {(lead.assignedInstaller?.name || lead.assignedInstallerName) && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Installer:</span>
                <span className="text-slate-200 font-medium">{lead.assignedInstaller?.name || lead.assignedInstallerName}</span>
              </div>
            )}
            {lead.installerAvailability && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Installer Status:</span>
                <Badge tone={lead.installerAvailability === 'AVAILABLE' ? 'emerald' : lead.installerAvailability === 'BUSY' ? 'amber' : 'blue'}>
                  {lead.installerAvailability}
                </Badge>
              </div>
            )}
            {lead.rooms && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Rooms:</span>
                <span className="text-slate-300 truncate max-w-[130px]" title={lead.rooms}>{lead.rooms}</span>
              </div>
            )}
            {lead.drawingsRenders && lead.drawingsRenders.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-brand-400 pt-0.5 font-medium">
                <FileText className="w-3 h-3" />
                <span>{lead.drawingsRenders.length} Drawings/Renders attached</span>
              </div>
            )}
          </div>
        )}

        {(lead.requirementSummary || lead.requirement) && (
          <p className="text-xs text-slate-400 line-clamp-2 italic mb-2">
            "{lead.requirementSummary || lead.requirement}"
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
        <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(lead)}>
          Full Details
        </Button>
        <Button size="sm" variant="secondary" icon={Pencil} onClick={() => onEdit(lead)}>
          Edit
        </Button>
      </div>
    </div>
  );
};

/* --------------------------------------------------- Spreadsheet Matrix View Component */

const SPREADSHEET_SECTIONS = [
  {
    id: 's1',
    title: 'Lead & Contact Details (Mandatory Details)',
    color: 'bg-purple-950/90 text-purple-200 border-purple-700/80',
    cols: [
      { key: 'sno', label: 'S.No.' },
      { key: 'code', label: 'Lead Code' },
      { key: 'captureDateTime', label: 'Capture Date & Time' },
      { key: 'clientName', label: 'Client Name' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'phone', label: 'Mobile No.' },
      { key: 'email', label: 'Email Id' },
      { key: 'companyName', label: 'Company Name' },
      { key: 'location', label: 'Location' },
      { key: 'projectType', label: 'Project Type' },
      { key: 'priority', label: 'Lead Priority' },
      { key: 'budget', label: 'Indicative Budget' },
      { key: 'budgetClassification', label: 'Budget Classification' },
    ]
  },
  {
    id: 's2',
    title: 'Lead Source & Relationship',
    color: 'bg-blue-950/90 text-blue-200 border-blue-700/80',
    cols: [
      { key: 'source', label: 'Lead Source' },
      { key: 'architectName', label: 'Architect / Designer Name' },
      { key: 'architectInvolved', label: 'Architect Involved' },
      { key: 'architectInvolvedDetails', label: 'Architect Involvement Notes' },
      { key: 'previousClientRelationship', label: 'Previous Client Relationship' },
      { key: 'previousClientRelationshipDetails', label: 'Previous Relationship Details' },
      { key: 'existingRelationshipOwner', label: 'Existing Relationship Owner' },
      { key: 'existingRelationshipOwnerName', label: 'Relationship Owner Name' },
      { key: 'requirementSummary', label: 'Requirement Summary' },
      { key: 'attachments', label: 'Attachments' },
    ]
  },
  {
    id: 's3',
    title: 'Site Visit (Req. Details)',
    color: 'bg-indigo-950/90 text-indigo-200 border-indigo-700/80',
    cols: [
      { key: 'siteVisitRequired', label: 'Site Visit Requirement' },
      { key: 'siteVisitDueDate', label: 'Site Visit Due Date' },
      { key: 'siteAddress', label: 'Site Address' },
      { key: 'actualSiteVisitDateTime', label: 'Actual Site Visit Date & Time' },
      { key: 'assignedInstaller', label: 'Assigned Installer' },
      { key: 'clientArchitectAvailability', label: 'Client / Architect Availability' },
      { key: 'scope', label: 'Scope' },
      { key: 'rooms', label: 'Rooms' },
      { key: 'drawingsRenders', label: 'Drawings & Renders' },
      { key: 'installerAvailability', label: 'Installer Availability' },
    ]
  },
  {
    id: 's4',
    title: 'Measurement (Site Details)',
    color: 'bg-teal-950/90 text-teal-200 border-teal-700/80',
    cols: [
      { key: 'measurement.dueDate', label: 'Measurement Due Date' },
      { key: 'measurement.date', label: 'Measurement Date' },
      { key: 'measurement.measuredBy', label: 'Measured By' },
      { key: 'measurement.status', label: 'Measurement Status' },
      { key: 'measurement.siteAccess', label: 'Site Access' },
      { key: 'measurement.attachments', label: 'Measurement Attachments' },
      { key: 'measurement.roomList', label: 'Room List' },
      { key: 'measurement.drawings', label: 'Drawings / Layouts' },
      { key: 'measurement.pelmetDetails', label: 'Pelmet Details' },
      { key: 'measurement.channelDetails', label: 'Channel Details' },
      { key: 'measurement.motorDetails', label: 'Motor Details' },
      { key: 'measurement.wiringDetails', label: 'Wiring Details' },
      { key: 'measurement.notes', label: 'Measurement Notes' },
    ]
  },
  {
    id: 's5',
    title: 'Studio Meeting',
    color: 'bg-purple-950/90 text-purple-200 border-purple-700/80',
    cols: [
      { key: 'studioMeeting.dueDate', label: 'Studio Meeting Due Date' },
      { key: 'studioMeeting.date', label: 'Studio Meeting Date' },
      { key: 'studioMeeting.attendees', label: 'Attendees' },
      { key: 'studioMeeting.clientDrawings', label: 'Client Drawings' },
      { key: 'studioMeeting.feedback', label: 'Studio Feedback' },
      { key: 'studioMeeting.nextAction', label: 'Next Action' },
      { key: 'studioMeeting.architectBrief', label: 'Architect Brief' },
      { key: 'studioMeeting.samples', label: 'Samples Shown' },
      { key: 'studioMeeting.projectPictures', label: 'Project Pictures' },
      { key: 'studioMeeting.pricingRange', label: 'Pricing Range' },
    ]
  },
  {
    id: 's6',
    title: 'Ready Size (Window/Site Details)',
    color: 'bg-blue-950/90 text-blue-200 border-blue-700/80',
    cols: [
      { key: 'readySize.roomReadiness', label: 'Room Readiness' },
      { key: 'readySize.dueDate', label: 'Ready Size Due Date' },
      { key: 'readySize.confirmedBy', label: 'Confirmed By' },
      { key: 'readySize.confirmationDate', label: 'Confirmation Date' },
      { key: 'readySize.windowSize', label: 'Window Size' },
      { key: 'readySize.siteCondition', label: 'Site Condition' },
      { key: 'readySize.pelmetDetails', label: 'Pelmet Details' },
      { key: 'readySize.channelDetails', label: 'Channel Details' },
      { key: 'readySize.readyHeight', label: 'Ready Height' },
      { key: 'readySize.finalMeasurements', label: 'Final Measurements' },
    ]
  },
  {
    id: 's7',
    title: 'Consumption / BOQ',
    color: 'bg-emerald-950/90 text-emerald-200 border-emerald-700/80',
    cols: [
      { key: 'consumption.sheetDueDate', label: 'BOQ / Consumption Sheet Due Date' },
      { key: 'consumption.measurements', label: 'Measurements' },
      { key: 'consumption.quantity', label: 'Quantity' },
      { key: 'consumption.unit', label: 'Unit' },
      { key: 'consumption.wastageAllowance', label: 'Wastage Allowance' },
      { key: 'consumption.boqVersion', label: 'BOQ Version' },
      { key: 'consumption.roomList', label: 'Room List' },
      { key: 'consumption.fabricDesignSelection', label: 'Fabric / Design Selection' },
      { key: 'consumption.panelCount', label: 'Panel Count' },
      { key: 'consumption.liningAccessoryAssumptions', label: 'Lining / Accessory Assumptions' },
    ]
  },
  {
    id: 's8',
    title: 'Proposal',
    color: 'bg-sky-950/90 text-sky-200 border-sky-700/80',
    cols: [
      { key: 'proposal.dueDate', label: 'Proposal Due Date' },
      { key: 'proposal.noVersion', label: 'Proposal No & Version' },
      { key: 'proposal.date', label: 'Proposal Date' },
      { key: 'proposal.clientBrief', label: 'Client Brief' },
      { key: 'proposal.consumptionSheet', label: 'Consumption Sheet' },
      { key: 'proposal.designDirection', label: 'Design Direction' },
      { key: 'proposal.pricingRange', label: 'Pricing Range' },
      { key: 'proposal.terms', label: 'Proposal Terms' },
      { key: 'proposal.refundRevisionClause', label: 'Refund / Revision Clause' },
    ]
  },
  {
    id: 's9',
    title: 'Token / Advance',
    color: 'bg-amber-950/90 text-amber-200 border-amber-700/80',
    cols: [
      { key: 'token.discussionDueDate', label: 'Token Discussion Due Date' },
      { key: 'token.amount', label: 'Token Amount' },
      { key: 'token.status', label: 'Token Status' },
      { key: 'token.receivedDate', label: 'Received Date' },
      { key: 'token.clientBudgetResponse', label: 'Client Budget Response' },
      { key: 'token.proposalAttachment', label: 'Proposal Attachment' },
      { key: 'token.budgetEstimate', label: 'Budget Estimate' },
      { key: 'token.clientResponse', label: 'Client Response' },
      { key: 'token.projectTimeline', label: 'Project Timeline' },
      { key: 'token.commercialTerms', label: 'Commercial Terms' },
    ]
  },
  {
    id: 's10',
    title: ' Costing',
    color: 'bg-slate-900 text-slate-200 border-slate-700/80',
    cols: [
      { key: 'costing.dueDate', label: 'Costing Due Date' },
      { key: 'costing.catalogueCost', label: 'Catalogue Cost' },
      { key: 'costing.version', label: 'Costing Version' },
      { key: 'costing.landedCost', label: 'Landed Cost' },
      { key: 'costing.localFabricCost', label: 'Local Fabric Cost' },
      { key: 'costing.labourCost', label: 'Labour Cost' },
      { key: 'costing.sampleCost', label: 'Sample Cost' },
      { key: 'costing.marginModel', label: 'Margin Model' },
    ]
  },
  {
    id: 's11',
    title: ' Quotation',
    color: 'bg-emerald-950/90 text-emerald-200 border-emerald-700/80',
    cols: [
      { key: 'quotation.dueDate', label: 'Quotation Due Date' },
      { key: 'quotation.no', label: 'Quotation No.' },
      { key: 'quotation.version', label: 'Quotation Version' },
      { key: 'quotation.date', label: 'Quotation Date' },
      { key: 'quotation.finalQuotedValue', label: 'Final Quoted Value' },
      { key: 'quotation.taxes', label: 'Taxes' },
      { key: 'quotation.addSubtotal', label: 'Add Subtotal' },
      { key: 'quotation.validity', label: 'Quotation Validity' },
      { key: 'quotation.discountApprovalStatus', label: 'Discount Approval Status' },
      { key: 'quotation.boq', label: 'BOQ Attachment' },
      { key: 'quotation.fabricSelection', label: 'Fabric Selection' },
      { key: 'quotation.cataloguePrice', label: 'Catalogue Price' },
      { key: 'quotation.labourPrice', label: 'Labour Price' },
      { key: 'quotation.samplePrice', label: 'Sample Price' },
      { key: 'quotation.discount', label: 'Discount' },
      { key: 'quotation.marginRules', label: 'Margin Rules' },
    ]
  },
  {
    id: 's12',
    title: ' Client Approval',
    color: 'bg-orange-950/90 text-orange-200 border-orange-700/80',
    cols: [
      { key: 'approval.planned', label: 'Planned Approval Date' },
      { key: 'approval.clientApprovalStatus', label: 'Client Approval Status' },
      { key: 'approval.proofAttachment', label: 'Proof Attachment' },
      { key: 'approval.finalApprovedVersion', label: 'Final Approved Version' },
    ]
  },
  {
    id: 's13',
    title: ' Presentation',
    color: 'bg-yellow-950/90 text-yellow-200 border-yellow-700/80',
    cols: [
      { key: 'presentation.attachment', label: 'Presentation Attachment' },
      { key: 'presentation.clientSelection', label: 'Client Selection' },
      { key: 'presentation.fabricSelection', label: 'Fabric Selection' },
      { key: 'presentation.designDirection', label: 'Design Direction' },
      { key: 'presentation.revisionNotes', label: 'Revision Notes' },
    ]
  }
];

const getNestedVal = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[p];
  }
  return curr;
};

const SPREADSHEET_CELL_RENDERERS = {
  sno: (lead, { sno }) => <span className="font-mono text-slate-400 font-medium">{sno}</span>,
  code: (lead, { onView }) => (
    <button
      type="button"
      onClick={() => onView(lead)}
      className="font-mono text-xs font-bold text-brand-400 hover:underline"
    >
      {lead.code}
    </button>
  ),
  clientName: (lead, { onView }) => (
    <button
      type="button"
      onClick={() => onView(lead)}
      className="font-semibold text-slate-100 hover:text-brand-300 text-left truncate block max-w-[160px]"
      title={lead.clientName}
    >
      {lead.clientName}
    </button>
  ),
  budgetClassification: (lead) => {
    const val = lead.budgetClassification || 'MID_RANGE';
    return <Badge tone={BUDGET_TONES[val] || 'blue'}>{val}</Badge>;
  },
  priority: (lead) => {
    const p = lead.priority || 'MEDIUM';
    return <Badge tone={p === 'HOT' ? 'rose' : p === 'MEDIUM' ? 'amber' : 'slate'}>{p}</Badge>;
  },
  siteVisitRequired: (lead) => (
    lead.siteVisitRequired ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>
  ),
  previousClientRelationship: (lead) => (
    lead.previousClientRelationship ? <Badge tone="violet">YES</Badge> : <Badge tone="slate">NO</Badge>
  ),
  architectInvolved: (lead) => {
    const val = lead.architectInvolved || (lead.architectInvolvedDetails ? 'YES' : 'NO');
    return <Badge tone={val === 'YES' || val === 'Yes' ? 'blue' : 'slate'}>{val}</Badge>;
  },
  architectName: (lead) => (
    <span className="truncate block max-w-[140px]" title={lead.architect?.name || lead.architectName}>
      {lead.architect?.name || lead.architectName || '—'}
    </span>
  ),
  existingRelationshipOwner: (lead) => (
    <span className="truncate block max-w-[130px]">
      {lead.existingRelationshipOwner?.name || lead.existingRelationshipOwnerName || lead.assignedDCM?.name || '—'}
    </span>
  ),
  assignedInstaller: (lead) => (
    <span className="truncate block max-w-[130px]">{lead.assignedInstaller?.name || lead.assignedInstallerName || '—'}</span>
  ),
  'measurement.measuredBy': (lead) => (
    <span className="truncate block max-w-[130px]">{lead.measurement?.measuredBy?.name || '—'}</span>
  ),
  'readySize.confirmedBy': (lead) => (
    <span className="truncate block max-w-[130px]">{lead.readySize?.confirmedBy?.name || '—'}</span>
  ),
};

const renderSpreadsheetCell = (lead, key, sno, onView, onEdit) => {
  if (SPREADSHEET_CELL_RENDERERS[key]) {
    return SPREADSHEET_CELL_RENDERERS[key](lead, { sno, onView, onEdit });
  }

  const raw = getNestedVal(lead, key);

  if (Array.isArray(raw)) {
    if (raw.length === 0) return <span className="text-slate-600">—</span>;
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-brand-400 font-medium">
        <Paperclip className="w-3 h-3 shrink-0" /> {raw.length} file(s)
      </span>
    );
  }

  if (raw instanceof Date || (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw))) {
    return <span className="text-slate-300 text-[11px] whitespace-nowrap">{date(raw, { time: String(raw).includes('T') })}</span>;
  }

  if (typeof raw === 'number') {
    const kLower = key.toLowerCase();
    if (kLower.includes('cost') || kLower.includes('budget') || kLower.includes('price') || kLower.includes('value') || kLower.includes('amount') || kLower.includes('taxes') || kLower.includes('subtotal') || kLower.includes('discount')) {
      return <span className="font-mono text-slate-200 text-xs font-semibold">{currency(raw)}</span>;
    }
    return <span className="font-mono text-slate-200 text-xs">{raw}</span>;
  }

  if (typeof raw === 'boolean') {
    return raw ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>;
  }

  if (!raw && raw !== 0) return <span className="text-slate-600">—</span>;

  return <span className="text-slate-300 truncate max-w-[180px] block" title={String(raw)}>{String(raw)}</span>;
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's1', onSectionChange }) => {

  const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's1';
  const visibleSections = SPREADSHEET_SECTIONS.filter((s) => s.id === currentSection);

  return (
    <Panel className="overflow-hidden border border-slate-800">

      {/* Excel Sheet Matrix Table Container */}
      <div className="overflow-x-auto max-h-[45vh] overflow-y-auto select-none relative">
        <table className="w-full text-left border-collapse text-xs">


          <thead>

            {/* Header Row 2: Sub-Column Field Names */}
            <tr className="sticky z-20 shadow-sm bg-slate-900">

              <th className="bg-slate-950 border-b border-r border-slate-800 p-4 text-[10px] uppercase text-center font-semibold text-slate-400 z-30">
                Code
              </th>
              {visibleSections.map((sec) =>
                sec.cols.filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
                  <th key={col.key} className="border-b border-r border-slate-800/80 p-2 text-[10px] uppercase font-semibold text-slate-300 whitespace-nowrap min-w-[130px] bg-slate-900/90">
                    {col.label}
                  </th>
                ))
              )}
              <th className="bg-slate-950 border-b border-slate-800 p-2 text-[10px] uppercase font-semibold text-slate-400 text-right sticky right-0 z-30">
                Manage
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
            {items.map((lead, idx) => (
              <tr key={lead.id || lead._id} className="hover:bg-slate-900/80 transition group ">
                <td className=" border-r border-slate-800/80 bg-slate-950 group-hover:bg-slate-900   z-10 font-mono text-brand-400 font-semibold">
                  <button type="button" onClick={() => onView(lead)} className="hover:underline truncate px-2">
                    {lead.code}
                  </button>
                </td>
                {visibleSections.map((sec) =>
                  sec.cols
                    .filter((c) => c.key !== 'sno' && c.key !== 'code')
                    .map((col) => (
                      <td key={col.key} className="p-4 border-r border-slate-800/60 whitespace-nowrap">
                        {renderSpreadsheetCell(lead, col.key, idx + 1, onView, onEdit)}
                      </td>
                    ))
                )}
                <td className="p-2 bg-slate-950 group-hover:bg-slate-900 text-right sticky right-0 z-10 border-l border-slate-800/80">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(lead)} />
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(lead)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};

/* ----------------------------------------------------------- Sales & Commercials Page */

export const SalesCommercialsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial/current values from URL search params
  const activeTab = searchParams.get('tab') || 'LEADS';
  const viewMode = searchParams.get('view') || 'SPREADSHEET'; // 'SPREADSHEET', 'GRID', or 'TABLE'
  const statusFilter = searchParams.get('status') || 'ALL';
  const budgetFilter = searchParams.get('budget') || 'ALL';
  const selectedSection = searchParams.get('section') || 's1';
  const leadIdParam = searchParams.get('leadId') || searchParams.get('lead') || '';

  const searchParam = searchParams.get('search') || '';
  const [search, setSearch] = useState(searchParam);

  const [creatingLead, setCreatingLead] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);

  // Sync local search input with URL search param
  useEffect(() => {
    setSearch(searchParam);
  }, [searchParam]);

  // Helper function to update search parameters in URL
  const updateParam = (key, value, defaultValue = 'ALL') => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === defaultValue || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
        return next;
      },
      { replace: true }
    );
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    updateParam('search', val, '');
  };

  const resetFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('status');
        next.delete('budget');
        next.delete('search');
        next.delete('section');
        return next;
      },
      { replace: true }
    );
    setSearch('');
  };

  const handleViewLead = (lead) => {
    setViewingLead(lead);
    if (lead) {
      updateParam('leadId', lead.id || lead._id || lead.code, '');
    } else {
      updateParam('leadId', '', '');
    }
  };

  const { data: leadsData, loading, error, reload } = useAsync(
    () => leadsApi.list({
      ...(statusFilter !== 'ALL' && { status: statusFilter }),
      ...(budgetFilter !== 'ALL' && { budgetClassification: budgetFilter }),
      ...(search && { search }),
      limit: 150
    }).then((r) => r.data),
    [statusFilter, budgetFilter, search]
  );

  const { data: architects } = useAsync(() => architectsApi.list({ limit: 100 }).then((r) => r.data.items), []);
  const { data: users } = useAsync(() => usersApi.list({ limit: 100 }).then((r) => r.data.items), []);

  const items = leadsData?.items || [];
  const totalLeadsCount = items.length;
  const totalPipelineVal = items.reduce((acc, l) => acc + (l.budget || 0), 0);
  const luxuryLeadsCount = items.filter((l) => ['LUXURY', 'ULTRA_LUXURY'].includes(l.budgetClassification)).length;

  // Auto-open lead detail drawer on reload if leadId URL param is present
  useEffect(() => {
    if (leadIdParam && items.length > 0 && !viewingLead) {
      const match = items.find(
        (l) => String(l.id || l._id) === String(leadIdParam) || l.code === leadIdParam
      );
      if (match) {
        setViewingLead(match);
      }
    }
  }, [leadIdParam, items]);

  const leadColumns = [
    {
      key: 'code',
      header: 'Lead ID',
      render: (lead) => (
        <button
          type="button"
          onClick={() => handleViewLead(lead)}
          className="font-mono text-xs font-semibold text-brand-400 hover:text-brand-300 hover:underline"
        >
          {lead.code}
        </button>
      ),
    },
    {
      key: 'client',
      header: 'Client & Contact',
      render: (lead) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-100">{lead.clientName}</span>
            {lead.previousClientRelationship && <Badge tone="violet">Repeat Client</Badge>}
          </div>
          {lead.contactPerson && <p className="text-[11px] text-slate-400">Contact: {lead.contactPerson}</p>}
          <p className="text-[11px] text-slate-500">{lead.phone} {lead.email ? `· ${lead.email}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source & Architect',
      render: (lead) => (
        <div>
          <p className="text-xs text-slate-300">{humanise(lead.source)}</p>
          {(lead.architect?.name || lead.architectName) && (
            <p className="text-[11px] text-brand-400">{lead.architect?.name || lead.architectName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'budget',
      header: 'Indicative Budget',
      align: 'right',
      render: (lead) => (
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-100 numeric">
            {lead.budget ? currency(lead.budget, { compact: true }) : '—'}
          </p>
          <Badge tone={BUDGET_TONES[lead.budgetClassification] || 'slate'}>
            {lead.budgetClassification || 'MID_RANGE'}
          </Badge>
        </div>
      ),
    },
    { key: 'location', header: 'Location', render: (lead) => lead.location || '—' },
    {
      key: 'siteVisit',
      header: 'Site Visit & Due',
      render: (lead) => (
        <div>
          <p className="text-xs font-medium text-slate-200">
            {lead.siteVisitDueDate ? date(lead.siteVisitDueDate) : 'TBD'}
          </p>
          {lead.actualSiteVisitDateTime && (
            <p className="text-[11px] text-emerald-400">Visited: {date(lead.actualSiteVisitDateTime, { time: true })}</p>
          )}
          {lead.clientArchitectAvailability && (
            <p className="text-[10px] text-slate-500 truncate max-w-[130px]" title={lead.clientArchitectAvailability}>
              Avail: {lead.clientArchitectAvailability}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'installer',
      header: 'Assigned Installer',
      render: (lead) => (
        <div>
          <p className="text-xs text-slate-200">{lead.assignedInstaller?.name || lead.assignedInstallerName || 'Unassigned'}</p>
          {lead.installerAvailability && (
            <Badge tone={lead.installerAvailability === 'AVAILABLE' ? 'emerald' : lead.installerAvailability === 'BUSY' ? 'amber' : 'blue'}>
              {lead.installerAvailability}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Scope & Rooms',
      render: (lead) => (
        <div>
          <p className="text-xs text-slate-300 truncate max-w-[140px]" title={lead.scope}>{lead.scope || '—'}</p>
          {lead.rooms && <p className="text-[11px] text-slate-400 truncate max-w-[140px]">Rooms: {lead.rooms}</p>}
          {lead.drawingsRenders && lead.drawingsRenders.length > 0 && (
            <p className="text-[10px] text-brand-400 font-medium">{lead.drawingsRenders.length} Drawings</p>
          )}
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Rel. Owner',
      render: (lead) => (
        <span className="text-xs text-slate-300">
          {lead.existingRelationshipOwner?.name || lead.existingRelationshipOwnerName || lead.assignedDCM?.name || '—'}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (lead) => <StatusBadge status={lead.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (lead) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" icon={Eye} onClick={() => handleViewLead(lead)} />
          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingLead(lead)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sales & Commercials Workspace"
        subtitle="End-to-end management of sales leads, budget classifications, relationship owners, and commercial quotes"
        actions={
          <Button icon={Plus} onClick={() => setCreatingLead(true)}>
            Capture Sales Lead
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatTile label="Total Sales Leads" value={totalLeadsCount} sub="In current view" icon={UserCheck} tone="blue" />
        <StatTile label="Pipeline Budget Value" value={currency(totalPipelineVal, { compact: true })} sub="Cumulative indicative budget" icon={BadgeDollarSign} tone="green" />
        <StatTile label="Luxury / Premium Leads" value={luxuryLeadsCount} sub="Luxury & Ultra Luxury Segment" icon={Sparkles} tone="brand" />
        <StatTile label="Lead Sources" value={LEAD_SOURCES.length} sub="Active acquisition channels" icon={Building2} tone="violet" />
      </div>

      {/* Workspace Controls & Tabs */}
      <Panel className="mb-4">
        <div className="px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <Tabs syncQuery={true} active={activeTab} onChange={(t) => updateParam('tab', t, 'LEADS')}
            tabs={[{ key: 'LEADS', label: 'Sales Leads Directory', count: totalLeadsCount },]} />

          <div className="flex items-center gap-2">

            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">


              <button type="button" onClick={() => updateParam('view', 'SPREADSHEET', 'SPREADSHEET')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${viewMode === 'SPREADSHEET' ? 'bg-brand-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}>
                <ClipboardList className="w-3.5 h-3.5" /> Sheet Matrix
              </button>

              <button type="button" onClick={() => updateParam('view', 'GRID', 'SPREADSHEET')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${viewMode === 'GRID' ? 'bg-brand-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}>
                <LayoutGrid className="w-3.5 h-3.5" /> Grid
              </button>

              <button type="button" onClick={() => updateParam('view', 'TABLE', 'SPREADSHEET')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${viewMode === 'TABLE' ? 'bg-brand-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}>
                <TableIcon className="w-3.5 h-3.5" /> Summary
              </button>

            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search lead code, client name, phone or location..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              <Select
                value={statusFilter}
                onChange={(e) => updateParam('status', e.target.value, 'ALL')}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'NEW', label: 'New' },
                  { value: 'CONTACTED', label: 'Contacted' },
                  { value: 'QUALIFIED', label: 'Qualified' },
                  { value: 'CONVERTED', label: 'Converted' },
                  { value: 'LOST', label: 'Lost' },
                ]}
                className="w-36 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Budget:</span>
              <Select
                value={budgetFilter}
                onChange={(e) => updateParam('budget', e.target.value, 'ALL')}
                options={[
                  { value: 'ALL', label: 'All Budget Tiers' },
                  ...BUDGET_CLASSIFICATIONS,
                ]}
                className="w-44 text-xs"
              />
            </div>

            {(statusFilter !== 'ALL' || budgetFilter !== 'ALL' || search || (selectedSection && selectedSection !== 's1')) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
        
      </Panel>

      {/* Main Content Area */}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <Panel className="p-8 text-center">
          <EmptyState
            icon={Users}
            title="No Sales Leads Found"
            hint="Try adjusting search or status filters, or capture a new lead."
            action={
              <Button icon={Plus} onClick={() => setCreatingLead(true)}>
                Capture Sales Lead
              </Button>
            }
          />
        </Panel>
      ) : viewMode === 'SPREADSHEET' ? (
        <SpreadsheetGridView
          items={items}
          onView={handleViewLead}
          onEdit={(l) => setEditingLead(l)}
          selectedSection={selectedSection}
          onSectionChange={(sec) => updateParam('section', sec, 's1')}
        />
      ) : viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((lead) => (
            <LeadCard
              key={lead.id || lead._id}
              lead={lead}
              onView={handleViewLead}
              onEdit={(l) => setEditingLead(l)}
            />
          ))}
        </div>
      ) : (
        <Panel>
          <Table columns={leadColumns} rows={items} />
        </Panel>
      )}

      {/* New Lead Modal */}
      {creatingLead && (
        <LeadFormModal
          open={creatingLead}
          onClose={() => setCreatingLead(false)}
          onSaved={reload}
          architects={architects}
          users={users}
        />
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <LeadFormModal
          open={Boolean(editingLead)}
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSaved={reload}
          architects={architects}
          users={users}
        />
      )}

      {/* View Lead Drawer */}
      {viewingLead && (
        <LeadDetailDrawer
          lead={viewingLead}
          onClose={() => handleViewLead(null)}
          onEdit={(l) => setEditingLead(l)}
          onQualify={() => navigate('/crm/leads')}
          onAssign={() => navigate('/crm/leads')}
          onConvert={() => navigate('/crm/leads')}
        />
      )}
    </div>
  );
};

export default SalesCommercialsPage;
