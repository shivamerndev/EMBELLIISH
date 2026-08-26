import React, { useState, useEffect } from 'react';
import {
  X, Pencil, Check, Calendar, User, Mail, Phone, MapPin, Building, FileText,
  Paperclip, ShieldCheck, UserCheck, Clock, Tag, AlertCircle, ExternalLink, Eye,
  Upload, Trash2, ChevronDown, Plus, ArrowRight, CheckCircle2, AlertTriangle, Layers, IndianRupee
} from 'lucide-react';
import { leadsApi, architectsApi, uploadApi } from '../../api';
import { formatBudgetValue, formatBudgetDisplay } from '../../utils/format';
import {
  Field, Input, Select, PhoneInput, EmailInput, Textarea, Button, Badge
} from '../ui';

/** Safely format date string into localized DD/MM/YYYY HH:mm */
const formatDate = (val) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return String(val);
  }
};

/** Render boolean or status as a clean colored badge */
const StatusPill = ({ label, type = 'slate' }) => {
  const styles = {
    emerald: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
    sky: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40',
    amber: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
    rose: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
    slate: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    gold: 'bg-[#836444]/15 text-[#836444] border-[#836444]/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md border shadow-2xs ${styles[type] || styles.slate}`}>
      {label || '—'}
    </span>
  );
};

/** Formats values cleanly in detail cards */
const FieldTile = ({ label, value, icon: Icon, pill, fullWidth = false, children }) => {
  return (
    <div className={`p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-2xs flex flex-col justify-between ${fullWidth ? 'col-span-full' : ''}`}>
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />}
          {label}
        </span>
      </div>
      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 break-words mt-0.5">
        {children ? children : pill ? pill : (value !== undefined && value !== null && value !== '' ? String(value) : '—')}
      </div>
    </div>
  );
};

/** Section Header Component */
const SectionTitle = ({ title, icon: Icon, badge }) => (
  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-slate-800/80">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-[#836444] dark:text-amber-400" />}
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
        {title}
      </h4>
    </div>
    {badge && <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">{badge}</span>}
  </div>
);

export const LeadDetailsModal = ({
  open,
  leadId,
  leadData,
  onClose,
  onUpdated,
  architects = [],
  onReloadArchitects,
}) => {
  const [lead, setLead] = useState(leadData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Fetch full lead object whenever modal opens or leadId changes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      return;
    }

    const currentId = leadId || leadData?._id || leadData?.id;
    if (currentId) {
      setLoading(true);
      setError(null);
      leadsApi.get(currentId)
        .then((res) => {
          const item = res.data?.item || res.data || leadData;
          setLead(item);
        })
        .catch((err) => {
          console.error('Failed to fetch lead details:', err);
          if (leadData) setLead(leadData);
          else setError(err?.message || 'Failed to load lead details');
        })
        .finally(() => setLoading(false));
    } else if (leadData) {
      setLead(leadData);
    }
  }, [open, leadId, leadData]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isEditing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, isEditing, onClose]);

  if (!open) return null;

  // Initialize edit form with full existing lead details
  const startEditing = () => {
    const l = lead || {};
    setForm({
      clientName: l.clientName || l.companyName || '',
      contactPerson: l.contactPerson || '',
      phone: l.phone || '',
      email: l.email || '',
      source: l.source || 'Architect Referral',
      architectName: l.architectName || (typeof l.architect === 'object' ? l.architect?.name : l.architect) || '',
      indicativeBudget: l.indicativeBudget ? formatBudgetValue(l.indicativeBudget) : (l.budget ? formatBudgetValue(l.budget) : ''),
      budgetClassification: l.budgetClassification || 'A',
      location: l.location || '',
      priority: l.priority || 'MEDIUM',
      projectType: l.projectType || 'VILLA',
      roomCount: l.roomCount !== undefined ? String(l.roomCount) : '',
      previousClientRelationship: (l.previousClientRelationship === true || l.previousClientRelationship === 'YES' || l.previousClientRelationship === 'Yes') ? 'YES' : 'NO',
      existingRelationshipOwner: l.existingRelationshipOwner || 'NA',
      requirementSummary: l.requirementSummary || l.requirement || '',
      architectInvolved: l.architectInvolved || 'Yes',
      attachmentUrl: l.attachmentUrl || '',
      attachments: Array.isArray(l.attachments) ? [...l.attachments] : [],
      status: l.status || 'NEW',
      nextAction: l.nextAction || '',
      nextActionDueDate: l.nextActionDueDate ? new Date(l.nextActionDueDate).toISOString().split('T')[0] : '',
    });
    setIsEditing(true);
  };

  const setFormKey = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));

      const res = await uploadApi.upload(formData);
      const uploadedFiles = (res.data || []).map((file) => ({
        url: file.url,
        filename: file.filename || file.originalname || 'document',
        mimetype: file.mimetype,
        size: file.size,
      }));

      setForm((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...uploadedFiles],
      }));
    } catch (err) {
      console.error('Failed to upload file(s):', err);
      setUploadError(err?.message || 'Failed to upload document/image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (index) => {
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, i) => i !== index),
    }));
  };

  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    const currentId = lead?._id || lead?.id;
    if (!currentId) return;

    try {
      setLoading(true);
      const payload = {
        ...form,
        companyName: form.clientName,
        previousClientRelationship: form.previousClientRelationship === 'YES' || form.previousClientRelationship === 'Yes',
        budget: form.indicativeBudget ? Number(form.indicativeBudget.replace(/[^0-9.]/g, '')) || undefined : undefined,
        roomCount: form.roomCount ? Number(form.roomCount) : undefined,
      };

      const res = await leadsApi.update(currentId, payload);
      const updatedItem = res.data?.item || res.data || { ...lead, ...payload };

      setLead(updatedItem);
      setIsEditing(false);
      if (onUpdated) onUpdated(updatedItem);
    } catch (err) {
      console.error('Failed to update lead:', err);
      setError(err?.message || 'Failed to save lead updates');
    } finally {
      setLoading(false);
    }
  };

  // Helper getters for lead fields
  const l = lead || {};
  const codeVal = l.code || 'LEAD-DETAILS';
  const clientNameVal = l.clientName || l.companyName || '—';
  const contactPersonVal = l.contactPerson || '—';
  const phoneVal = l.phone || '—';
  const emailVal = l.email || '—';
  const sourceVal = l.source || '—';
  const statusVal = l.status || 'NEW';
  const priorityVal = l.priority || 'MEDIUM';
  const archNameVal = l.architectName || (typeof l.architect === 'object' ? (l.architect?.name || l.architect?.firm) : l.architect) || '—';
  const budgetVal = formatBudgetDisplay(l.indicativeBudget || l.budget);
  const budgetClassVal = l.budgetClassification || 'A';
  const locationVal = l.location || '—';
  const requirementVal = l.requirementSummary || l.requirement || '—';
  const prevRelVal = l.previousClientRelationship ? 'Yes' : 'No';
  const relOwnerVal = l.existingRelationshipOwner || 'NA';
  const archInvolvedVal = l.architectInvolved || 'Not Known';

  // Assignment Info
  const assignedDcm = l.assignedDcmName || (typeof l.assignedDCM === 'object' ? l.assignedDCM?.name : l.assignedDCM) || 'Unassigned';
  const assignDueDate = formatDate(l.assignmentDueDate);
  const assignDateTime = formatDate(l.assignmentDateTime || l.assignedAt);
  const dcmCapacity = l.dcmCapacityStatus || 'AVAILABLE';
  const dcmActiveCount = l.dcmActiveProjectCount !== undefined ? l.dcmActiveProjectCount : '0';

  // Qualification Info
  const qualDueDate = formatDate(l.qualificationDueDate);
  const reqVerified = l.requirementVerified || 'PENDING';
  const budgetVerified = l.budgetPricingVerified || 'PENDING';
  const timelineConfirmed = l.timelineConfirmed || 'PENDING';
  const decisionMaker = l.decisionMakerIdentified || 'PENDING';
  const qualDecision = l.qualificationDecision || 'PENDING';
  const decisionDateTime = formatDate(l.decisionDateTime || l.qualifiedAt);
  const rejectionReason = l.rejectionHoldReason || l.lostReason || l.qualificationNotes || '—';

  // Follow up Info
  const nextAction = l.nextAction || '—';
  const nextActionDueDate = formatDate(l.nextActionDueDate);
  const overallStatus = l.overallLeadStatus || statusVal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Semi-transparent Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs transition-opacity duration-200"
        onClick={() => {
          if (!isEditing) onClose();
        }}
      />

      {/* Main Responsive Enterprise Modal */}
      <div className="relative w-full max-w-[1300px] w-[92vw] max-h-[88vh] my-auto bg-white dark:bg-[#1a1512] rounded-2xl shadow-2xl border border-amber-900/20 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-200 z-10">

        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200/80 dark:border-slate-800 bg-[#FAF7F4] dark:bg-[#171310] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#836444]/10 dark:bg-amber-500/15 text-[#836444] dark:text-amber-400 border border-[#836444]/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isEditing ? `Edit Lead — ${codeVal}` : 'Lead Details'}
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-md bg-[#836444] text-white dark:bg-amber-600 dark:text-white shadow-2xs">
                  {codeVal}
                </span>
                <StatusPill
                  label={statusVal}
                  type={statusVal === 'CONVERTED' ? 'emerald' : statusVal === 'QUALIFIED' ? 'sky' : statusVal === 'LOST' ? 'rose' : 'gold'}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Client: <strong className="text-slate-800 dark:text-slate-200">{clientNameVal}</strong></span>
                <span>•</span>
                <span>Captured: {formatDate(l.captureDateTime || l.createdAt)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="secondary"
                icon={Pencil}
                onClick={startEditing}
                className="bg-[#836444]/10 hover:bg-[#836444]/20 text-[#836444] dark:text-amber-300 border-[#836444]/30 font-semibold text-xs"
              >
                Edit Lead
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setIsEditing(false)}
                className="text-xs font-semibold"
              >
                Cancel Editing
              </Button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-[#1a1512]">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="underline text-[11px]">Dismiss</button>
            </div>
          )}

          {!isEditing ? (
            /* ================= VIEW MODE ================= */
            <div className="space-y-6">

              {/* Top Highlights Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-300/40 dark:border-amber-800/30">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Contact Person</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{contactPersonVal}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Mobile Phone</span>
                  <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">{phoneVal}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Indicative Budget</span>
                  <span className="text-sm font-bold text-amber-900 dark:text-amber-300">{budgetVal}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Budget Class</span>
                  <StatusPill label={`Class ${budgetClassVal}`} type="gold" />
                </div>
              </div>

              {/* Section 1: Lead & Contact Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Lead Information */}
                <div>
                  <SectionTitle title="Lead Information" icon={Tag} />
                  <div className="grid grid-cols-2 gap-2.5">
                    <FieldTile label="Lead ID Code" value={codeVal} icon={Tag} />
                    <FieldTile label="Capture Date & Time" value={formatDate(l.captureDateTime || l.createdAt)} icon={Clock} />
                    <FieldTile label="Lead Source" value={sourceVal} icon={Layers} />
                    <FieldTile label="Lead Status" pill={<StatusPill label={statusVal} type="sky" />} />
                    <FieldTile label="Priority" pill={<StatusPill label={priorityVal} type={priorityVal === 'HIGH' ? 'rose' : 'amber'} />} />
                    <FieldTile label="Project Type" value={l.projectType || 'VILLA'} />
                    <FieldTile label="Indicative Budget" value={budgetVal} />
                    <FieldTile label="Budget Classification" pill={<StatusPill label={`Class ${budgetClassVal}`} type="gold" />} />
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <SectionTitle title="Contact Information" icon={User} />
                  <div className="grid grid-cols-2 gap-2.5">
                    <FieldTile label="Contact Person" value={contactPersonVal} icon={User} />
                    <FieldTile label="Client / Company Name" value={clientNameVal} icon={Building} />
                    <FieldTile label="Mobile Number" value={phoneVal} icon={Phone} />
                    <FieldTile label="Email Address" value={emailVal} icon={Mail} />
                    <FieldTile label="Location" value={locationVal} icon={MapPin} fullWidth />
                  </div>
                </div>
              </div>

              {/* Section 2: Architect & Project Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Architect / Designer Information */}
                <div>
                  <SectionTitle title="Architect / Designer Information" icon={UserCheck} />
                  <div className="grid grid-cols-2 gap-2.5">
                    <FieldTile label="Architect / Designer Name" value={archNameVal} icon={User} fullWidth />
                    <FieldTile label="Architect Involved" pill={<StatusPill label={archInvolvedVal} type={archInvolvedVal === 'Yes' ? 'emerald' : 'slate'} />} />
                    <FieldTile label="Previous Relationship" pill={<StatusPill label={prevRelVal} type={prevRelVal === 'Yes' ? 'emerald' : 'slate'} />} />
                    <FieldTile label="Existing Relationship Owner" value={relOwnerVal} fullWidth />
                  </div>
                </div>

                {/* Project Information */}
                <div>
                  <SectionTitle title="Project Information" icon={Building} />
                  <div className="grid grid-cols-2 gap-2.5">
                    <FieldTile label="Project Location" value={locationVal} icon={MapPin} />
                    <FieldTile label="Room Count" value={l.roomCount !== undefined ? String(l.roomCount) : '—'} />
                    <FieldTile label="Requirement Summary" value={requirementVal} icon={FileText} fullWidth />
                  </div>
                </div>
              </div>

              {/* Section 3: Assignment & Qualification Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Assignment Information */}
                <div>
                  <SectionTitle title="Assignment Information" icon={ShieldCheck} />
                  <div className="grid grid-cols-2 gap-2.5">
                    <FieldTile label="Assigned DCM / Manager" value={assignedDcm} icon={UserCheck} />
                    <FieldTile label="Assignment Due Date" value={assignDueDate} icon={Calendar} />
                    <FieldTile label="Assignment Date & Time" value={assignDateTime} icon={Clock} />
                    <FieldTile label="DCM Capacity Status" pill={<StatusPill label={dcmCapacity} type={dcmCapacity === 'AVAILABLE' ? 'emerald' : 'amber'} />} />
                    <FieldTile label="DCM Active Projects" value={String(dcmActiveCount)} />
                    <FieldTile label="Reassignment Required" pill={<StatusPill label={l.reassignmentRequired ? 'Yes' : 'No'} type={l.reassignmentRequired ? 'amber' : 'slate'} />} />
                    {l.reassignedToName && <FieldTile label="Reassigned To" value={l.reassignedToName} />}
                    {l.reassignmentReason && <FieldTile label="Reassignment Reason" value={l.reassignmentReason} fullWidth />}
                  </div>
                </div>

                {/* Qualification Information */}
                <div>
                  <SectionTitle title="Qualification Information" icon={CheckCircle2} />
                  <div className="grid grid-cols-2 gap-2.5">
                    <FieldTile label="Qualification Decision" pill={<StatusPill label={qualDecision} type={qualDecision === 'APPROVED' ? 'emerald' : qualDecision === 'REJECTED' ? 'rose' : 'amber'} />} />
                    <FieldTile label="Decision Date & Time" value={decisionDateTime} icon={Clock} />
                    <FieldTile label="Requirement Verified" pill={<StatusPill label={reqVerified} type={reqVerified === 'YES' ? 'emerald' : 'slate'} />} />
                    <FieldTile label="Budget Verified" pill={<StatusPill label={budgetVerified} type={budgetVerified === 'YES' ? 'emerald' : 'slate'} />} />
                    <FieldTile label="Timeline Confirmed" pill={<StatusPill label={timelineConfirmed} type={timelineConfirmed === 'YES' ? 'emerald' : 'slate'} />} />
                    <FieldTile label="Decision Maker Identified" pill={<StatusPill label={decisionMaker} type={decisionMaker === 'YES' ? 'emerald' : 'slate'} />} />
                    <FieldTile label="Rejection / Hold Reason" value={rejectionReason} fullWidth />
                  </div>
                </div>
              </div>

              {/* Section 4: Follow-up Information & Attachments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Follow-Up Information */}
                <div>
                  <SectionTitle title="Follow-Up Information" icon={Calendar} />
                  <div className="grid grid-cols-2 gap-2.5">
                    <FieldTile label="Next Action" value={nextAction} icon={ArrowRight} fullWidth />
                    <FieldTile label="Next Action Due Date" value={nextActionDueDate} icon={Calendar} />
                    <FieldTile label="Overall Lead Status" pill={<StatusPill label={overallStatus} type="gold" />} />
                  </div>
                </div>

                {/* Attachments Section */}
                <div>
                  <SectionTitle title="Attachments & Documents" icon={Paperclip} badge={Array.isArray(l.attachments) ? `${l.attachments.length} files` : '0 files'} />
                  <div className="space-y-3">
                    {/* Attachment Link */}
                    {l.attachmentUrl && (
                      <div className="p-3 rounded-lg border border-amber-300/60 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 text-xs">
                        <span className="font-bold text-amber-900 dark:text-amber-300 block mb-1">Web / Google Drive Attachment Link</span>
                        <a
                          href={l.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5 font-medium break-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span>{l.attachmentUrl}</span>
                        </a>
                      </div>
                    )}

                    {/* Files list */}
                    {Array.isArray(l.attachments) && l.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {l.attachments.map((file, idx) => {
                          const isImg = file.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.url || file.filename || '');
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-xs"
                            >
                              {isImg ? (
                                <img
                                  src={file.url}
                                  alt={file.filename || 'Preview'}
                                  className="w-10 h-10 object-cover rounded bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-slate-900 dark:text-slate-100 hover:text-amber-700 dark:hover:text-amber-400 truncate block"
                                  title={file.filename || file.url}
                                >
                                  {file.filename || `Document ${idx + 1}`}
                                </a>
                                <span className="text-[10px] text-slate-400 block uppercase">
                                  {isImg ? 'Image File' : 'Document'}
                                </span>
                              </div>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
                                title="Open file"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    ) : !l.attachmentUrl ? (
                      <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 text-xs italic">
                        No uploaded attachments or files available for this lead.
                      </div>
                    ) : null}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* ================= EDIT MODE (INSIDE MODAL) ================= */
            <form onSubmit={handleSaveEdit} className="space-y-6">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center gap-2">
                <Pencil className="w-4 h-4 shrink-0" />
                <span>You are currently editing Lead details for <strong>{codeVal}</strong>. Changes will update immediately.</span>
              </div>

              {/* Primary Fields Grid */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 border-b pb-1">
                  Lead & Contact Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Client / Company Name" required>
                    <Input value={form.clientName} onChange={setFormKey('clientName')} required />
                  </Field>
                  <Field label="Contact Person" required>
                    <Input value={form.contactPerson} onChange={setFormKey('contactPerson')} required />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Mobile Number" required>
                    <PhoneInput value={form.phone} onChange={setFormKey('phone')} required />
                  </Field>
                  <Field label="Email Address">
                    <EmailInput value={form.email} onChange={setFormKey('email')} placeholder="client@example.com" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Lead Source">
                    <Select
                      value={form.source}
                      onChange={setFormKey('source')}
                      options={[
                        { value: 'Architect Referral', label: 'Architect Referral' },
                        { value: 'Direct Client', label: 'Direct Client' },
                        { value: 'Existing Client', label: 'Existing Client' },
                        { value: 'Social Media', label: 'Social Media' },
                        { value: 'Other Referral', label: 'Other Referral' },
                      ]}
                    />
                  </Field>
                  <Field label="Architect / Designer Name">
                    <Input
                      value={form.architectName}
                      onChange={setFormKey('architectName')}
                      placeholder="Search or enter architect name..."
                    />
                  </Field>
                </div>
              </div>

              {/* Project & Budget Fields */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 border-b pb-1">
                  Project & Budget Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Indicative Budget">
                    <div className="relative flex items-center">
                      <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <IndianRupee className="w-4 h-4" />
                      </div>
                      <Input
                        className="pl-9"
                        value={form.indicativeBudget}
                        onChange={(e) => setFormKey('indicativeBudget')({ target: { value: formatBudgetValue(e.target.value) } })}
                        placeholder="e.g. 10,000"
                      />
                    </div>
                  </Field>
                  <Field label="Budget Classification">
                    <Select
                      value={form.budgetClassification}
                      onChange={setFormKey('budgetClassification')}
                      options={[
                        { value: 'A', label: 'Class A (High Priority/Budget)' },
                        { value: 'B', label: 'Class B (Medium-High)' },
                        { value: 'C', label: 'Class C (Standard)' },
                        { value: 'D', label: 'Class D (Basic)' },
                      ]}
                    />
                  </Field>
                  <Field label="Lead Priority">
                    <Select
                      value={form.priority}
                      onChange={setFormKey('priority')}
                      options={[
                        { value: 'HIGH', label: 'High Priority' },
                        { value: 'MEDIUM', label: 'Medium Priority' },
                        { value: 'LOW', label: 'Low Priority' },
                      ]}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Project Location">
                    <Input value={form.location} onChange={setFormKey('location')} placeholder="Location..." />
                  </Field>
                  <Field label="Project Type">
                    <Select
                      value={form.projectType}
                      onChange={setFormKey('projectType')}
                      options={[
                        { value: 'VILLA', label: 'Villa' },
                        { value: 'APARTMENT', label: 'Apartment' },
                        { value: 'BUNGALOW', label: 'Bungalow' },
                        { value: 'FARMHOUSE', label: 'Farmhouse' },
                        { value: 'HOTEL', label: 'Hotel' },
                        { value: 'OFFICE', label: 'Office' },
                        { value: 'RETAIL', label: 'Retail' },
                        { value: 'OTHER', label: 'Other' },
                      ]}
                    />
                  </Field>
                  <Field label="Room Count">
                    <Input type="number" value={form.roomCount} onChange={setFormKey('roomCount')} placeholder="e.g. 4" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Architect / Designer Involved">
                    <Select
                      value={form.architectInvolved}
                      onChange={setFormKey('architectInvolved')}
                      options={[
                        { value: 'Yes', label: 'Yes' },
                        { value: 'No', label: 'No' },
                        { value: 'Not Known', label: 'Not Known' },
                      ]}
                    />
                  </Field>
                  <Field label="Previous Client Relationship">
                    <Select
                      value={form.previousClientRelationship}
                      onChange={setFormKey('previousClientRelationship')}
                      options={[
                        { value: 'NO', label: 'No' },
                        { value: 'YES', label: 'Yes' },
                      ]}
                    />
                  </Field>
                  <Field label="Existing Relationship Owner">
                    <Input value={form.existingRelationshipOwner} onChange={setFormKey('existingRelationshipOwner')} placeholder="e.g. Sakshi or NA" />
                  </Field>
                </div>

                <Field label="Requirement Summary">
                  <Textarea value={form.requirementSummary} onChange={setFormKey('requirementSummary')} rows={3} placeholder="Summarize client requirements..." />
                </Field>
              </div>

              {/* Status & Follow-up Fields */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 border-b pb-1">
                  Status & Follow-Up
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Lead Status">
                    <Select
                      value={form.status}
                      onChange={setFormKey('status')}
                      options={[
                        { value: 'NEW', label: 'New' },
                        { value: 'CONTACTED', label: 'Contacted' },
                        { value: 'QUALIFIED', label: 'Qualified' },
                        { value: 'CONVERTED', label: 'Converted' },
                        { value: 'LOST', label: 'Lost' },
                      ]}
                    />
                  </Field>
                  <Field label="Next Action">
                    <Input value={form.nextAction} onChange={setFormKey('nextAction')} placeholder="e.g. Call client for drawing details" />
                  </Field>
                  <Field label="Next Action Due Date">
                    <Input type="date" value={form.nextActionDueDate} onChange={setFormKey('nextActionDueDate')} />
                  </Field>
                </div>
              </div>

              {/* Attachments Upload */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 border-b pb-1">
                  Attachments & Files
                </h4>

                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700/80 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/50 text-center relative hover:bg-slate-100/70 transition-colors">
                  <input
                    type="file"
                    id="modal-lead-file-upload"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <label htmlFor="modal-lead-file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-1">
                    <Upload className={`w-5 h-5 text-slate-500 dark:text-slate-400 ${uploading ? 'animate-bounce' : ''}`} />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {uploading ? 'Uploading files...' : 'Upload Images or Documents'}
                    </span>
                  </label>
                  {uploadError && <p className="mt-1 text-[11px] text-rose-500 font-medium">{uploadError}</p>}
                </div>

                {form.attachments && form.attachments.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {form.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                        <span className="truncate font-medium">{file.filename || `File ${idx + 1}`}</span>
                        <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-rose-500 hover:text-rose-700 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Field label="Attachment Web / Google Drive URL">
                  <Input value={form.attachmentUrl} onChange={setFormKey('attachmentUrl')} placeholder="https://drive.google.com/..." />
                </Field>
              </div>
            </form>
          )}
        </div>

        {/* Fixed Footer Actions (Only in Edit Mode) */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-amber-200/80 dark:border-slate-800 bg-[#FAF7F4] dark:bg-[#171310] shrink-0">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              loading={loading}
              className="bg-[#836444] hover:bg-[#6e5338] text-white font-semibold"
            >
              Save Changes
            </Button>
          </div>
        )}

      </div>
    </div>
  );
};

export default LeadDetailsModal;
