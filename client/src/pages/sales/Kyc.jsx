import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Eye,
  ShieldCheck,
  Calendar,
  Paperclip,
  Pencil,
  FileCheck,
  CheckCircle2,
  Clock,
  Upload,
  X,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { date, dateTime } from '../../utils/format';
import {
  PageHeader,
  Panel,
  Button,
  Badge,
  Input,
  Select,
  Textarea,
  Loading,
  ErrorState,
  EmptyState,
  StatTile,
  Modal,
  Field,
} from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi, uploadApi } from '../../api';
import { useAction } from '../../hooks/useAsync';

const KYC_DOC_TYPES = [
  'PAN Card',
  'GST Certificate',
  'Aadhar Card',
  'Address Proof',
  'Company Incorporation',
  'Trade License',
  'Cancelled Cheque',
  'Bank Statement',
  'Other Document',
];

const STANDARD_KYC_PRESETS = [
  { docType: 'PAN Card', documentName: 'PAN Card', status: 'PENDING' },
  { docType: 'GST Certificate', documentName: 'GST Certificate', status: 'PENDING' },
  { docType: 'Aadhar Card', documentName: 'Aadhar Card / Identity Proof', status: 'PENDING' },
  { docType: 'Address Proof', documentName: 'Registered Address Proof', status: 'PENDING' },
  { docType: 'Cancelled Cheque', documentName: 'Cancelled Cheque / Bank Details', status: 'PENDING' },
];

const SPREADSHEET_SECTIONS = [
  {
    id: 's14',
    title: 'KYC Verification',
    color:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-700/80',
    cols: [
      { key: 'kyc.dueDate', label: 'KYC Due Date' },
      { key: 'kyc.actualDate', label: 'KYC Actual Date' },
      { key: 'kyc.status', label: 'KYC Status' },
      { key: 'kyc.verifiedDocuments', label: 'Verified Document List' },
      { key: 'kyc.verifiedBy', label: 'Verified By' },
      { key: 'kyc.remarks', label: 'Verification Remarks' },
    ],
  },
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
  sno: (lead, { sno }) => (
    <span className="font-mono text-slate-500 dark:text-slate-400 font-medium">{sno}</span>
  ),
  code: (lead, { onView }) => (
    <button
      type="button"
      onClick={() => onView(lead)}
      className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
    >
      {lead.code}
    </button>
  ),
  clientName: (lead, { onView }) => (
    <button
      type="button"
      onClick={() => onView(lead)}
      className="font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-300 text-left truncate block max-w-[160px]"
      title={lead.clientName}
    >
      {lead.clientName}
    </button>
  ),
  'kyc.dueDate': (lead) => {
    const d = lead.kyc?.dueDate;
    if (!d) return <span className="text-slate-400 dark:text-slate-600">—</span>;
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-700 dark:text-slate-300">
        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
        {date(d)}
      </span>
    );
  },
  'kyc.actualDate': (lead) => {
    const d = lead.kyc?.actualDate;
    if (!d) return <span className="text-slate-400 dark:text-slate-600 text-[11px] italic">Not Completed</span>;
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
        <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
        {dateTime(d)}
      </span>
    );
  },
  'kyc.status': (lead) => {
    const st = lead.kyc?.status || 'PENDING';
    const toneMap = {
      VERIFIED: 'emerald',
      IN_PROGRESS: 'amber',
      PENDING: 'slate',
      REJECTED: 'rose',
      NOT_REQUIRED: 'blue',
    };
    return <Badge tone={toneMap[st] || 'slate'}>{st.replace('_', ' ')}</Badge>;
  },
  'kyc.verifiedDocuments': (lead) => {
    const docs = lead.kyc?.verifiedDocuments || [];
    if (docs.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
    const verifiedCount = docs.filter((d) => d.status === 'VERIFIED').length;
    const totalCount = docs.length;

    return (
      <div className="flex flex-col gap-1 items-start">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
            verifiedCount === totalCount && totalCount > 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
          }`}
        >
          <FileCheck className="w-3 h-3 shrink-0" />
          {verifiedCount}/{totalCount} Verified
        </span>
        <div className="flex flex-wrap gap-1 max-w-[220px]">
          {docs.slice(0, 3).map((d, i) => (
            <span
              key={i}
              className={`text-[9px] px-1.5 py-0.2 rounded border font-medium truncate ${
                d.status === 'VERIFIED'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : d.status === 'REJECTED'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title={`${d.docType || d.documentName || 'Doc'} (${d.status || 'PENDING'})`}
            >
              {d.docType || d.documentName || 'Doc'}
            </span>
          ))}
          {docs.length > 3 && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
              +{docs.length - 3} more
            </span>
          )}
        </div>
      </div>
    );
  },
  'kyc.verifiedBy': (lead) => {
    const by = lead.kyc?.verifiedBy;
    if (!by) return <span className="text-slate-400 dark:text-slate-600">—</span>;
    return <span className="text-slate-700 dark:text-slate-300 text-xs truncate max-w-[140px] block">{by}</span>;
  },
};

const renderSpreadsheetCell = (lead, key, sno, onView, onEdit) => {
  if (SPREADSHEET_CELL_RENDERERS[key]) {
    return SPREADSHEET_CELL_RENDERERS[key](lead, { sno, onView, onEdit });
  }

  const raw = getNestedVal(lead, key);

  if (Array.isArray(raw)) {
    if (raw.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-brand-500/10 border border-brand-500/30 text-brand-700 dark:text-brand-400 font-medium">
        <Paperclip className="w-3 h-3 shrink-0" /> {raw.length} item(s)
      </span>
    );
  }

  if (raw instanceof Date || (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw))) {
    return (
      <span className="text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap">
        {date(raw, { time: String(raw).includes('T') })}
      </span>
    );
  }

  if (typeof raw === 'boolean') {
    return raw ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>;
  }

  if (!raw && raw !== 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;

  return (
    <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block" title={String(raw)}>
      {String(raw)}
    </span>
  );
};

/* ------------------------------------------------------------- Edit KYC Verification Modal */
const KycEditModal = ({ item, onClose, onDone }) => {
  const currentUser = useSelector((state) => state.auth?.user);
  const currentUserName = currentUser?.name || currentUser?.email || 'System User';

  const kycData = item?.kyc || {};

  // Form State
  const [form, setForm] = useState({
    dueDate: kycData.dueDate ? String(kycData.dueDate).slice(0, 10) : '',
    actualDate: kycData.actualDate ? String(kycData.actualDate) : '',
    status: kycData.status || 'PENDING',
    verifiedBy: kycData.verifiedBy || currentUserName,
    remarks: kycData.remarks || '',
  });

  // Repeatable Document Checklist State
  const initialDocs = (kycData.verifiedDocuments || []).map((doc, idx) => ({
    id: doc.id || `doc_${idx}_${Date.now()}`,
    docType: doc.docType || doc.caption || 'PAN Card',
    documentName: doc.documentName || doc.docType || doc.filename || `Document #${idx + 1}`,
    status: doc.status || (doc.url ? 'VERIFIED' : 'PENDING'),
    verifiedBy: doc.verifiedBy || kycData.verifiedBy || currentUserName,
    url: doc.url || '',
    filename: doc.filename || doc.name || '',
    mimetype: doc.mimetype || '',
    size: doc.size || 0,
    uploading: false,
  }));

  const [docs, setDocs] = useState(initialDocs);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // KYC Actual Date is System-generated when KYC status is set to VERIFIED
  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setForm((prev) => ({
      ...prev,
      status: newStatus,
      actualDate: newStatus === 'VERIFIED' ? (prev.actualDate || new Date().toISOString()) : prev.actualDate,
    }));
  };

  const handleCaptureCurrentTimestamp = () => {
    setForm((prev) => ({
      ...prev,
      actualDate: new Date().toISOString(),
    }));
  };

  // Checklist Item Helpers
  const handleAddDocRow = (preset) => {
    setDocs((prev) => [
      ...prev,
      {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        docType: preset?.docType || 'PAN Card',
        documentName: preset?.documentName || preset?.docType || 'PAN Card',
        status: preset?.status || 'PENDING',
        verifiedBy: currentUserName,
        url: '',
        filename: '',
        size: 0,
        uploading: false,
      },
    ]);
  };

  const handleLoadStandardPreset = () => {
    const presetItems = STANDARD_KYC_PRESETS.map((p, idx) => ({
      id: `doc_preset_${idx}_${Date.now()}`,
      docType: p.docType,
      documentName: p.documentName,
      status: 'PENDING',
      verifiedBy: currentUserName,
      url: '',
      filename: '',
      size: 0,
      uploading: false,
    }));
    setDocs(presetItems);
  };

  const updateDocItem = (index, field, value) => {
    setDocs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'status' && value === 'VERIFIED' && !next[index].verifiedBy) {
        next[index].verifiedBy = currentUserName;
      }
      return next;
    });
  };

  const handleItemFileUpload = async (index, file) => {
    if (!file) return;
    updateDocItem(index, 'uploading', true);
    try {
      const formData = new FormData();
      formData.append('files', file);
      const res = await uploadApi.upload(formData);
      const uploaded = (res.data || [])[0];
      if (uploaded) {
        setDocs((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            url: uploaded.url,
            filename: uploaded.filename || uploaded.originalname,
            mimetype: uploaded.mimetype,
            size: uploaded.size,
            status: 'VERIFIED',
            verifiedBy: next[index].verifiedBy || currentUserName,
            uploading: false,
          };
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to upload document file:', err);
      updateDocItem(index, 'uploading', false);
    }
  };

  const handleRemoveDocRow = (index) => {
    setDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMarkAllVerified = () => {
    setDocs((prev) =>
      prev.map((d) => ({
        ...d,
        status: 'VERIFIED',
        verifiedBy: d.verifiedBy || currentUserName,
      }))
    );
    setForm((prev) => ({
      ...prev,
      status: 'VERIFIED',
      actualDate: prev.actualDate || new Date().toISOString(),
    }));
  };

  const { execute, pending, error } = useAction(
    (payload) => leadsApi.update(item._id || item.id, { kyc: payload }),
    {
      onSuccess: () => {
        onDone();
        onClose();
      },
    }
  );

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    // Compile document types
    const docTypes = Array.from(new Set(docs.map((d) => d.docType).filter(Boolean)));

    // Auto-update system actualDate if overall status is VERIFIED
    let actualDateVal = form.actualDate;
    if (form.status === 'VERIFIED' && !actualDateVal) {
      actualDateVal = new Date().toISOString();
    }

    const payloadDocs = docs.map((d) => ({
      docType: d.docType,
      documentName: d.documentName || d.docType,
      status: d.status,
      verifiedBy: d.verifiedBy || form.verifiedBy || currentUserName,
      verifiedAt: d.status === 'VERIFIED' ? new Date().toISOString() : undefined,
      url: d.url || undefined,
      filename: d.filename || undefined,
      mimetype: d.mimetype || undefined,
      size: d.size || undefined,
    }));

    execute({
      dueDate: form.dueDate || undefined,
      actualDate: actualDateVal || undefined,
      status: form.status,
      verifiedDocuments: payloadDocs,
      documentTypes: docTypes,
      verifiedBy: form.verifiedBy || currentUserName,
      remarks: form.remarks || undefined,
    });
  };

  const verifiedCount = docs.filter((d) => d.status === 'VERIFIED').length;
  const totalCount = docs.length;

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title={`KYC Verification — ${item?.clientName || item?.code}`}
      subtitle="Manage KYC due date, system-generated actual completion date, and repeatable document checklist."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={pending} onClick={handleSubmit}>
            Save KYC Details
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="text-xs text-rose-500 font-medium">{error.message}</p>}

        <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Client Identity & KYC Configuration
          </h4>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Client: <strong className="text-slate-800 dark:text-slate-200">{item?.clientName}</strong> ({item?.code})
          </span>
        </div>

        {/* Top Field Controls: KYC Due Date, KYC Actual Date, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          {/* Field 1: KYC Due Date (Date picker) */}
          <Field label="KYC Due Date (Date picker) *">
            <div className="relative">
              <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
              Target due date for completing client KYC verification
            </span>
          </Field>

          {/* Field 2: KYC Actual Date (System-generated date and time) */}
          <Field label="KYC Actual Date (System-generated)">
            <div className="flex items-center gap-2 p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {form.actualDate ? (
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-[11px] truncate">
                  {dateTime(form.actualDate)}
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                  Pending completion...
                </span>
              )}
              {form.status === 'VERIFIED' && (
                <button
                  type="button"
                  onClick={handleCaptureCurrentTimestamp}
                  title="Update system timestamp to now"
                  className="ml-auto p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
              Captured automatically when KYC is completed
            </span>
          </Field>

          {/* Overall KYC Verification Status */}
          <Field label="KYC Verification Status">
            <Select
              value={form.status}
              onChange={handleStatusChange}
              options={[
                { value: 'PENDING', label: 'Pending Verification' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'VERIFIED', label: 'Verified (Completed)' },
                { value: 'REJECTED', label: 'Rejected / Disapproved' },
                { value: 'NOT_REQUIRED', label: 'Not Required' },
              ]}
            />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
              Overall client verification status
            </span>
          </Field>
        </div>

        {/* Field 3: Verified Document List (Repeatable Document Checklist) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
            <div>
              <h5 className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5 uppercase tracking-wide">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Verified Document List (Repeatable Document Checklist)
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Record document name, verification status, file attachment, and verified-by user for each document.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60 shadow-sm">
                {verifiedCount} / {totalCount} Verified
              </span>
              <Button type="button" size="sm" variant="outline" icon={CheckCircle2} onClick={handleMarkAllVerified}>
                Mark All Verified
              </Button>
              {totalCount === 0 && (
                <Button type="button" size="sm" variant="secondary" onClick={handleLoadStandardPreset}>
                  Load Standard Checklist
                </Button>
              )}
              <Button type="button" size="sm" icon={Plus} onClick={() => handleAddDocRow()}>
                Add Document Item
              </Button>
            </div>
          </div>

          {/* Repeatable Checklist Items Table / List */}
          {docs.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 space-y-2">
              <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                No items in the verified document checklist yet.
              </p>
              <div className="flex justify-center gap-2 pt-1">
                <Button type="button" size="sm" variant="outline" onClick={handleLoadStandardPreset}>
                  Load Standard 5-Doc KYC Set
                </Button>
                <Button type="button" size="sm" icon={Plus} onClick={() => handleAddDocRow()}>
                  Add Custom Document Item
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
              {docs.map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2 transition hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    {/* Column 1: Document Type & Name */}
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                        Document Type & Name
                      </label>
                      <div className="flex gap-1">
                        <div className="w-full">
                          <Select
                            value={doc.docType}
                            onChange={(e) => {
                              updateDocItem(idx, 'docType', e.target.value);
                              if (!doc.documentName || KYC_DOC_TYPES.includes(doc.documentName)) {
                                updateDocItem(idx, 'documentName', e.target.value);
                              }
                            }}
                            options={KYC_DOC_TYPES.map((t) => ({ value: t, label: t }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Verification Status */}
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                        Verification Status
                      </label>
                      <Select
                        value={doc.status || 'PENDING'}
                        onChange={(e) => updateDocItem(idx, 'status', e.target.value)}
                        options={[
                          { value: 'PENDING', label: '⏳ Pending' },
                          { value: 'VERIFIED', label: '✅ Verified' },
                          { value: 'REJECTED', label: '❌ Rejected' },
                          { value: 'NOT_REQUIRED', label: '⚪ Not Required' },
                        ]}
                      />
                    </div>

                    {/* Column 3: Verified-By User */}
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                        Verified-By User
                      </label>
                      <Input
                        value={doc.verifiedBy || ''}
                        onChange={(e) => updateDocItem(idx, 'verifiedBy', e.target.value)}
                        placeholder="e.g. Staff Name"
                      />
                    </div>

                    {/* Column 4: Row Action (Delete) */}
                    <div className="sm:col-span-2 flex items-center justify-end pt-4">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => handleRemoveDocRow(idx)}
                        className="text-slate-400 hover:text-rose-500"
                        title="Remove Document Item"
                      />
                    </div>
                  </div>

                  {/* Attachment Row Control */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                        Attachment:
                      </span>
                      {doc.url ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 truncate">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline font-mono text-[11px] truncate max-w-[200px]"
                          >
                            {doc.filename || 'Attached File'}
                          </a>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-brand-600 p-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No document attached yet</span>
                      )}
                    </div>

                    <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      {doc.uploading ? 'Uploading...' : doc.url ? 'Replace File' : 'Upload File'}
                      <input
                        type="file"
                        className="hidden"
                        disabled={doc.uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleItemFileUpload(idx, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overall Verified By & Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <Field label="Overall Verified By (Lead Verifier)">
            <Input value={form.verifiedBy} onChange={set('verifiedBy')} placeholder="e.g. Staff / DCM Name" />
          </Field>
          <Field label="Verification Remarks">
            <Textarea
              rows={2}
              value={form.remarks}
              onChange={set('remarks')}
              placeholder="Enter verification notes, document validity details..."
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's14', onSectionChange }) => {
  const currentSection =
    selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection) ? selectedSection : 's14';
  const visibleSections = SPREADSHEET_SECTIONS.filter((s) => s.id === currentSection);

  return (
    <Panel className="overflow-hidden border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1.5 overflow-x-auto p-2 bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        {SPREADSHEET_SECTIONS.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => onSectionChange && onSectionChange(sec.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              currentSection === sec.id
                ? `${sec.color} font-semibold shadow-sm ring-1 ring-black/5 dark:ring-white/10`
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-200/50 dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {sec.title}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto max-h-[55vh] overflow-y-auto select-none relative">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="sticky top-0 z-20 text-center shadow-sm bg-[#836444] text-white font-bold border-b border-amber-300 dark:border-amber-500/30">
              <th className="bg-[#6b5240] dark:bg-slate-950 border-b border-r border-amber-300/40 dark:border-slate-800 p-4 text-[10px] uppercase text-center font-semibold text-amber-100 dark:text-slate-400 z-30">
                Code
              </th>
              {visibleSections.map((sec) =>
                sec.cols
                  .filter((c) => c.key !== 'sno' && c.key !== 'code')
                  .map((col) => (
                    <th
                      key={col.key}
                      className="border-b border-r border-amber-300/40 dark:border-slate-800/80 p-2 text-[10px] uppercase font-semibold text-amber-50 dark:text-slate-300 whitespace-nowrap min-w-[130px] bg-[#836444] dark:bg-slate-900/90"
                    >
                      {col.label}
                    </th>
                  ))
              )}
              <th className="bg-[#6b5240] dark:bg-slate-950 border-b border-amber-300/40 dark:border-slate-800 p-2 text-[10px] uppercase font-semibold text-amber-100 dark:text-slate-400 text-center sticky right-0 z-30">
                Manage
              </th>
            </tr>
          </thead>
          <tbody className="divide-y text-center divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-200">
            {items.map((lead, idx) => (
              <tr key={lead.id || lead._id || idx} className="hover:bg-amber-500/5 dark:hover:bg-slate-900/80 transition group">
                <td className="border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 z-10 font-mono text-brand-600 dark:text-brand-400 font-semibold">
                  <button type="button" onClick={() => onView(lead)} className="hover:underline truncate px-2">
                    {lead.code}
                  </button>
                </td>
                {visibleSections.map((sec) =>
                  sec.cols
                    .filter((c) => c.key !== 'sno' && c.key !== 'code')
                    .map((col) => (
                      <td key={col.key} className="p-4 border-r border-slate-200 dark:border-slate-800/60 whitespace-nowrap">
                        {renderSpreadsheetCell(lead, col.key, idx + 1, onView, onEdit)}
                      </td>
                    ))
                )}
                <td className="p-2 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 text-right sticky right-0 z-10 border-l border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(lead)} title="View Details" />
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(lead)} title="Edit KYC Details" />
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

const Kyc = ({ items: itemsProp = [] }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { handleFetchLeads } = useSales();
  const salesLeads = useSelector((state) => state.sales?.leads);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingLead, setEditingLead] = useState(null);

  const reload = () => {
    setLoading(true);
    setError(null);
    handleFetchLeads()
      .catch((err) => setError(err?.message || 'Failed to fetch KYC verification data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const search = searchParams.get('search') || '';
  const selectedSection = searchParams.get('section') || 's14';

  const updateParam = (key, value, defaultValue) => {
    const newParams = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  };

  const handleViewLead = (lead) => {
    if (lead?.code) {
      navigate(`/crm/sales-commercials/leads/${lead.code}?tab=kyc`);
    }
  };

  const rawLeads = itemsProp && itemsProp.length > 0 ? itemsProp : Array.isArray(salesLeads) ? salesLeads : [];

  // Filter only leads whose client approval completed
  const approvedLeads = rawLeads.filter(
    (lead) => lead.approval?.clientApprovalStatus === 'APPROVED' || lead.clientApprovalStatus === 'APPROVED'
  );

  const filteredLeads = approvedLeads.filter((lead) => {
    if (search) {
      const q = search.toLowerCase();
      const code = String(lead.code || '').toLowerCase();
      const clientName = String(lead.clientName || '').toLowerCase();
      const status = String(lead.kyc?.status || '').toLowerCase();
      if (!code.includes(q) && !clientName.includes(q) && !status.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const totalCount = approvedLeads.length;
  const verifiedCount = approvedLeads.filter((l) => l.kyc?.status === 'VERIFIED').length;
  const pendingCount = approvedLeads.filter((l) => l.kyc?.status === 'PENDING' || !l.kyc?.status).length;
  const docAttachedCount = approvedLeads.filter((l) => (l.kyc?.verifiedDocuments?.length || 0) > 0).length;

  return (
    <div>
      <PageHeader
        title="KYC Verification Workspace"
        subtitle="Track client identity verification, manage KYC due dates, system-generated completion dates, and repeatable document checklists."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatTile label="Total Pipeline Leads" value={totalCount} sub="Clients requiring verification" icon={ShieldCheck} tone="blue" />
        <StatTile label="Verified KYC" value={verifiedCount} sub="Documents & identity confirmed" icon={CheckCircle2} tone="green" />
        <StatTile label="Pending Verification" value={pendingCount} sub="Awaiting KYC completion" icon={Clock} tone="amber" />
        <StatTile label="Documents Attached" value={docAttachedCount} sub="Identity docs on file" icon={FileCheck} tone="brand" />
      </div>

      <Panel className="mb-4">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => updateParam('search', e.target.value, '')}
              placeholder="Search code, client name, status..."
              className="pl-9"
            />
          </div>

          {(search || selectedSection !== 's14') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchParams({})}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </Panel>

      {loading ? (
        <Panel className="p-12 text-center">
          <Loading text="Loading KYC Verification Details..." />
        </Panel>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : filteredLeads.length === 0 ? (
        <Panel className="p-8 text-center">
          <EmptyState
            icon={ShieldCheck}
            title="No KYC Verification Records Found"
            hint="Only leads with completed Client Approval appear here. Try adjusting search parameters or completing Client Approval for leads."
          />
        </Panel>
      ) : (
        <SpreadsheetGridView
          items={filteredLeads}
          onView={handleViewLead}
          onEdit={(lead) => setEditingLead(lead)}
          selectedSection={selectedSection}
          onSectionChange={(sec) => updateParam('section', sec, 's14')}
        />
      )}

      {editingLead && (
        <KycEditModal
          item={editingLead}
          onClose={() => setEditingLead(null)}
          onDone={reload}
        />
      )}
    </div>
  );
};

export default Kyc;