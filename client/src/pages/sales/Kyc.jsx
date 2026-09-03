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
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { date, dateTime } from '../../utils/format';
import DetailedDrawer from '../../components/sales/DetailedDrawer';
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
  DelayBadge,
  ViewSwitcher,
  PhoneInput,
  validatePhoneNumber,
} from '../../components/ui';
import useViewMode from '../../hooks/useViewMode';
import CardGridView from '../../components/common/CardGridView';
import SalesStageCard from '../../components/cards/SalesStageCard';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi, uploadApi } from '../../api';
import { useAction } from '../../hooks/useAsync';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir',
  'Ladakh', 'Other'
];

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
  { docType: 'PAN Card', documentName: 'PAN Card', status: 'Pending' },
  { docType: 'GST Certificate', documentName: 'GST Certificate', status: 'Pending' },
  { docType: 'Aadhar Card', documentName: 'Aadhar Card / Identity Proof', status: 'Pending' },
  { docType: 'Address Proof', documentName: 'Registered Address Proof', status: 'Pending' },
  { docType: 'Cancelled Cheque', documentName: 'Cancelled Cheque / Bank Details', status: 'Pending' },
];

const SPREADSHEET_SECTIONS = [
  {
    id: 's14',
    title: 'KYC & Customer Conversion',
    color:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-700/80',
    cols: [
      { key: 'kyc.customerType', label: 'Customer Type' },
      { key: 'kyc.billingLegalName', label: 'Billing / Legal Name' },
      { key: 'kyc.gstin', label: 'GSTIN' },
      { key: 'kyc.status', label: 'KYC Status' },
      { key: 'kyc.verifiedBy', label: 'Verified By' },
      { key: 'kyc.verificationDate', label: 'Verification Date' },
      { key: 'kyc.verifiedDocuments', label: 'Verified Document List' },
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
  delayStatus: (lead) => (
    <DelayBadge
      dueDate={lead.kyc?.dueDate}
      isCompleted={Boolean(['Completed', 'Approved', 'Verified', 'VERIFIED'].includes(lead.kyc?.status) || lead.kyc?.verificationDate || lead.kyc?.actualDate)}
    />
  ),
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
  'kyc.customerType': (lead) => {
    const val = lead.kyc?.customerType || 'Individual';
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        {val}
      </span>
    );
  },
  'kyc.billingLegalName': (lead) => {
    const val = lead.kyc?.billingLegalName || lead.clientName || '—';
    return <span className="font-medium text-slate-900 dark:text-slate-100 text-xs truncate max-w-[160px] block">{val}</span>;
  },
  'kyc.gstin': (lead) => {
    const isRegistered = lead.kyc?.gstRegistered === 'Yes';
    const gstin = lead.kyc?.gstin;
    if (!isRegistered) {
      return <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono">No (Not Reg.)</span>;
    }
    return <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">{gstin || '—'}</span>;
  },
  'kyc.verificationDate': (lead) => {
    const d = lead.kyc?.verificationDate || lead.kyc?.actualDate;
    if (!d) return <span className="text-slate-400 dark:text-slate-600 text-[11px] italic">Not Verified</span>;
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
        <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
        {dateTime(d)}
      </span>
    );
  },
  'kyc.status': (lead) => {
    const st = lead.kyc?.status || 'Pending';
    const toneMap = {
      Verified: 'emerald',
      VERIFIED: 'emerald',
      'Correction Required': 'amber',
      CORRECTION_REQUIRED: 'amber',
      Pending: 'blue',
      PENDING: 'blue',
      IN_PROGRESS: 'amber',
      REJECTED: 'rose',
      NOT_REQUIRED: 'slate',
    };
    return <Badge tone={toneMap[st] || 'slate'}>{st.replace('_', ' ')}</Badge>;
  },
  'kyc.verifiedDocuments': (lead) => {
    const docs = lead.kyc?.verifiedDocuments || [];
    if (docs.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
    const verifiedCount = docs.filter((d) => d.status === 'Verified' || d.status === 'VERIFIED').length;
    const totalCount = docs.length;

    return (
      <div className="flex flex-col gap-1 items-start">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${verifiedCount === totalCount && totalCount > 0
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
              className={`text-[9px] px-1.5 py-0.2 rounded border font-medium truncate ${d.status === 'Verified' || d.status === 'VERIFIED'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : d.status === 'REJECTED'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              title={`${d.docType || d.documentName || 'Doc'} (${d.status || 'Pending'})`}
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
export const KycEditModal = ({ item, onClose, onDone }) => {
  const currentUser = useSelector((state) => state.auth?.user);
  const currentUserName = currentUser?.name || currentUser?.email || 'System User';

  const kycData = item?.kyc || {};

  // Form State initialized with KYC data, or pre-populated from lead defaults if empty
  const [form, setForm] = useState({
    customerType: kycData.customerType || 'Individual',
    billingLegalName: kycData.billingLegalName || item?.companyName || item?.clientName || '',
    primaryContactPerson: kycData.primaryContactPerson || item?.contactPerson || item?.clientName || '',
    mobileNumber: kycData.mobileNumber || item?.phone || '',
    email: kycData.email || item?.email || '',
    billingAddress: kycData.billingAddress || item?.address?.street || item?.location || '',
    state: kycData.state || item?.address?.state || 'Maharashtra',
    pinCode: kycData.pinCode || item?.pinCode || item?.pincode || item?.address?.pincode || '',
    sameAsBillingAddress: kycData.sameAsBillingAddress || 'Yes',
    siteDeliveryAddress: kycData.siteDeliveryAddress || item?.siteAddress || item?.address?.street || '',
    siteContactPerson: kycData.siteContactPerson || kycData.primaryContactPerson || item?.contactPerson || item?.clientName || '',
    siteContactNumber: kycData.siteContactNumber || kycData.mobileNumber || item?.phone || '',
    gstRegistered: kycData.gstRegistered || 'No',
    gstin: kycData.gstin || '',
    pan: kycData.pan || '',
    poRequired: kycData.poRequired || 'No',
    clientPoNumber: kycData.clientPoNumber || '',
    billingInstructions: kycData.billingInstructions || '',
    status: kycData.status || 'Pending',
    verifiedBy: kycData.verifiedBy || '',
    verificationDate: kycData.verificationDate || kycData.actualDate || '',
    dueDate: kycData.dueDate ? String(kycData.dueDate).slice(0, 10) : '',
  });

  const [validationError, setValidationError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Repeatable Document Checklist State
  const initialDocs = (kycData.verifiedDocuments || []).map((doc, idx) => ({
    id: doc.id || `doc_${idx}_${Date.now()}`,
    docType: doc.docType || doc.caption || 'PAN Card',
    documentName: doc.documentName || doc.docType || doc.filename || `Document #${idx + 1}`,
    status: doc.status || (doc.url ? 'Verified' : 'Pending'),
    verifiedBy: doc.verifiedBy || kycData.verifiedBy || currentUserName,
    url: doc.url || '',
    filename: doc.filename || doc.name || '',
    mimetype: doc.mimetype || '',
    size: doc.size || 0,
    uploading: false,
  }));

  const [docs, setDocs] = useState(initialDocs);

  const set = (key) => (e) => {
    const val = e.target.value;
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
    if (validationError) {
      setValidationError('');
    }
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      // Keep site address fields synced if sameAsBillingAddress === 'Yes'
      if (key === 'sameAsBillingAddress' && val === 'Yes') {
        next.siteDeliveryAddress = prev.billingAddress;
        next.siteContactPerson = prev.primaryContactPerson;
        next.siteContactNumber = prev.mobileNumber;
      }
      if (key === 'billingAddress' && prev.sameAsBillingAddress === 'Yes') {
        next.siteDeliveryAddress = val;
      }
      if (key === 'primaryContactPerson' && prev.sameAsBillingAddress === 'Yes') {
        next.siteContactPerson = val;
      }
      if (key === 'mobileNumber' && prev.sameAsBillingAddress === 'Yes') {
        next.siteContactNumber = val;
      }
      return next;
    });
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setForm((prev) => ({
      ...prev,
      status: newStatus,
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
        status: preset?.status || 'Pending',
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
      status: 'Pending',
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
      if (field === 'status' && (value === 'Verified' || value === 'VERIFIED') && !next[index].verifiedBy) {
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
            status: 'Verified',
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
        status: 'Verified',
        verifiedBy: d.verifiedBy || currentUserName,
      }))
    );
    setForm((prev) => ({
      ...prev,
      status: 'Verified',
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

  const validateForm = () => {
    setValidationError('');
    setFieldErrors({});

    if (!form.customerType) {
      return { field: 'customerType', message: 'Customer Type is required' };
    }
    if (!form.billingLegalName?.trim()) {
      return { field: 'billingLegalName', message: 'Billing / Legal Name is required' };
    }
    if (!form.primaryContactPerson?.trim()) {
      return { field: 'primaryContactPerson', message: 'Primary Contact Person is required' };
    }
    
    const mobileCheck = validatePhoneNumber(form.mobileNumber, '+91', true);
    if (!mobileCheck.isValid) {
      return {
        field: 'mobileNumber',
        message: mobileCheck.error ? `Mobile Number: ${mobileCheck.error}` : 'Mobile Number is required and must be valid',
      };
    }

    if (!form.email?.trim()) {
      return { field: 'email', message: 'Email ID is required' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      return { field: 'email', message: 'Please enter a valid Email ID (e.g. client@domain.com)' };
    }

    if (!form.billingAddress?.trim()) {
      return { field: 'billingAddress', message: 'Billing Address is required' };
    }
    if (!form.state?.trim()) {
      return { field: 'state', message: 'State is required' };
    }
    if (!form.pinCode?.trim()) {
      return { field: 'pinCode', message: 'PIN Code is required' };
    }
    if (!form.gstRegistered) {
      return { field: 'gstRegistered', message: 'GST Registered selection is required' };
    }

    if (form.gstRegistered === 'Yes' && !form.gstin?.trim()) {
      return { field: 'gstin', message: 'GSTIN is required when GST Registered is Yes' };
    }

    if (form.sameAsBillingAddress === 'No') {
      if (!form.siteDeliveryAddress?.trim()) {
        return { field: 'siteDeliveryAddress', message: 'Site / Delivery Address is required when address is different from Billing Address' };
      }
      if (!form.siteContactPerson?.trim()) {
        return { field: 'siteContactPerson', message: 'Site Contact Person is required when address is different from Billing Address' };
      }
      
      const siteMobileCheck = validatePhoneNumber(form.siteContactNumber, '+91', true);
      if (!siteMobileCheck.isValid) {
        return {
          field: 'siteContactNumber',
          message: siteMobileCheck.error ? `Site Contact Number: ${siteMobileCheck.error}` : 'Site Contact Number is required and must be valid',
        };
      }
    }

    if (form.poRequired === 'Yes' && !form.clientPoNumber?.trim()) {
      return { field: 'clientPoNumber', message: 'Client PO Number is required when PO is required from client' };
    }

    return null;
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    const err = validateForm();
    if (err) {
      setValidationError(err.message);
      setFieldErrors({ [err.field]: err.message });

      // Auto-scroll and focus on the invalid input field
      setTimeout(() => {
        const el = document.getElementById(`kyc_${err.field}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof el.focus === 'function') {
            el.focus();
          }
        }
      }, 50);
      return;
    }

    const docTypes = Array.from(new Set(docs.map((d) => d.docType).filter(Boolean)));

    const payloadDocs = docs.map((d) => ({
      docType: d.docType,
      documentName: d.documentName || d.docType,
      status: d.status || 'Pending',
      verifiedBy: d.verifiedBy || undefined,
      verifiedAt: d.status === 'Verified' || d.status === 'VERIFIED' ? new Date().toISOString() : undefined,
      url: d.url || undefined,
      filename: d.filename || undefined,
      mimetype: d.mimetype || undefined,
      size: d.size || undefined,
    }));

    execute({
      customerType: form.customerType,
      billingLegalName: form.billingLegalName,
      primaryContactPerson: form.primaryContactPerson,
      mobileNumber: String(form.mobileNumber),
      email: form.email,
      billingAddress: form.billingAddress,
      state: form.state,
      pinCode: String(form.pinCode),
      sameAsBillingAddress: form.sameAsBillingAddress,
      siteDeliveryAddress: form.sameAsBillingAddress === 'Yes' ? form.billingAddress : form.siteDeliveryAddress,
      siteContactPerson: form.sameAsBillingAddress === 'Yes' ? form.primaryContactPerson : form.siteContactPerson,
      siteContactNumber: form.sameAsBillingAddress === 'Yes' ? String(form.mobileNumber) : String(form.siteContactNumber),
      gstRegistered: form.gstRegistered,
      gstin: form.gstRegistered === 'Yes' ? form.gstin : undefined,
      pan: form.pan || undefined,
      poRequired: form.poRequired,
      clientPoNumber: form.poRequired === 'Yes' ? form.clientPoNumber : undefined,
      billingInstructions: form.billingInstructions || undefined,
      status: form.status,
      dueDate: form.dueDate || undefined,
      verifiedDocuments: payloadDocs,
      documentTypes: docTypes,
    });
  };

  const verifiedCount = docs.filter((d) => d.status === 'Verified' || d.status === 'VERIFIED').length;
  const totalCount = docs.length;

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title={`KYC & Customer Conversion — ${item?.clientName || item?.code}`}
      subtitle="Complete client identity, billing, tax, site, and document verification details."
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={pending} onClick={handleSubmit}>
            Save KYC & Conversion Details
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {(error || validationError) && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError || error?.message}</span>
          </div>
        )}

        <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Client Identity & Customer Conversion Fields
          </h4>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Lead Code: <strong className="text-slate-800 dark:text-slate-200">{item?.code}</strong>
          </span>
        </div>

        {/* SECTION 1: Customer Identity */}
        <div className="space-y-3 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
            <User className="w-4 h-4 text-brand-600" /> 1. Customer Identity
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Customer Type *" error={fieldErrors.customerType}>
              <Select
                id="kyc_customerType"
                value={form.customerType}
                onChange={set('customerType')}
                className={fieldErrors.customerType ? '!border-rose-500 focus:!ring-rose-500/30' : ''}
                options={[
                  { value: 'Individual', label: 'Individual' },
                  { value: 'Company', label: 'Company' },
                  { value: 'LLP', label: 'LLP' },
                  { value: 'Partnership', label: 'Partnership' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
            </Field>

            <Field label="Billing / Legal Name *" error={fieldErrors.billingLegalName}>
              <Input
                id="kyc_billingLegalName"
                value={form.billingLegalName}
                onChange={set('billingLegalName')}
                placeholder="Official billing / legal name"
                className={fieldErrors.billingLegalName ? '!border-rose-500 focus:!ring-rose-500/30' : ''}
              />
            </Field>

            <Field label="Primary Contact Person *" error={fieldErrors.primaryContactPerson}>
              <Input
                id="kyc_primaryContactPerson"
                value={form.primaryContactPerson}
                onChange={set('primaryContactPerson')}
                placeholder="Primary contact name"
                className={fieldErrors.primaryContactPerson ? '!border-rose-500 focus:!ring-rose-500/30' : ''}
              />
            </Field>

            <Field label="Mobile Number *" error={fieldErrors.mobileNumber}>
              <PhoneInput
                id="kyc_mobileNumber"
                value={form.mobileNumber}
                onChange={set('mobileNumber')}
                placeholder="e.g. 9876543210"
                error={fieldErrors.mobileNumber}
                required
              />
            </Field>

            <Field label="Email ID *" error={fieldErrors.email}>
              <Input
                id="kyc_email"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="e.g. client@domain.com"
                className={fieldErrors.email ? '!border-rose-500 focus:!ring-rose-500/30' : ''}
              />
            </Field>
          </div>
        </div>

        {/* SECTION 2: Address & Location */}
        <div className="space-y-3 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
            <MapPin className="w-4 h-4 text-brand-600" /> 2. Address & Location
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <Field label="Billing Address *" error={fieldErrors.billingAddress}>
                <Textarea
                  id="kyc_billingAddress"
                  rows={2}
                  value={form.billingAddress}
                  onChange={set('billingAddress')}
                  placeholder="Complete registered billing address..."
                  className={fieldErrors.billingAddress ? '!border-rose-500 focus:!ring-rose-500/30' : ''}
                />
              </Field>
            </div>

            <Field label="State *" error={fieldErrors.state}>
              <Select
                id="kyc_state"
                value={form.state}
                onChange={set('state')}
                options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                className={fieldErrors.state ? '!border-rose-500 focus:!ring-rose-500/30' : ''}
              />
            </Field>

            <Field label="PIN Code *" error={fieldErrors.pinCode}>
              <Input
                id="kyc_pinCode"
                type="text"
                value={form.pinCode}
                onChange={set('pinCode')}
                placeholder="e.g. 400001"
                className={fieldErrors.pinCode ? '!border-rose-500 focus:!ring-rose-500/30' : ''}
              />
            </Field>

            <Field label="Site Address Same as Billing?">
              <Select
                id="kyc_sameAsBillingAddress"
                value={form.sameAsBillingAddress}
                onChange={set('sameAsBillingAddress')}
                options={[
                  { value: 'Yes', label: 'Yes (Same Address)' },
                  { value: 'No', label: 'No (Different Site Address)' },
                ]}
              />
            </Field>
          </div>

          {form.sameAsBillingAddress === 'No' && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-amber-500/5 p-3 rounded-lg border border-amber-500/20">
              <div className="sm:col-span-3">
                <Field label="Site / Delivery Address *" error={fieldErrors.siteDeliveryAddress}>
                  <Textarea
                    id="kyc_siteDeliveryAddress"
                    rows={2}
                    value={form.siteDeliveryAddress}
                    onChange={set('siteDeliveryAddress')}
                    placeholder="Enter different site/delivery address..."
                    className={fieldErrors.siteDeliveryAddress ? '!border-rose-500 focus:!ring-rose-500/30' : ''}
                  />
                </Field>
              </div>

              <Field label="Site Contact Person *" error={fieldErrors.siteContactPerson}>
                <Input
                  id="kyc_siteContactPerson"
                  value={form.siteContactPerson}
                  onChange={set('siteContactPerson')}
                  placeholder="Site contact person name"
                  className={fieldErrors.siteContactPerson ? '!border-rose-500 focus:!ring-rose-500/30' : ''}
                />
              </Field>

              <Field label="Site Contact Number *" error={fieldErrors.siteContactNumber}>
                <PhoneInput
                  id="kyc_siteContactNumber"
                  value={form.siteContactNumber}
                  onChange={set('siteContactNumber')}
                  placeholder="Site contact phone number"
                  error={fieldErrors.siteContactNumber}
                  required
                />
              </Field>
            </div>
          )}
        </div>

        {/* SECTION 3: Tax & Commercials */}
        <div className="space-y-3 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
            <FileText className="w-4 h-4 text-brand-600" /> 3. Tax & Commercials
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="GST Registered *">
              <Select
                id="kyc_gstRegistered"
                value={form.gstRegistered}
                onChange={set('gstRegistered')}
                options={[
                  { value: 'Yes', label: 'Yes' },
                  { value: 'No', label: 'No' },
                ]}
              />
            </Field>

            {form.gstRegistered === 'Yes' && (
              <Field label="GSTIN *" error={fieldErrors.gstin}>
                <Input
                  id="kyc_gstin"
                  value={form.gstin}
                  onChange={set('gstin')}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className={fieldErrors.gstin ? '!border-rose-500 focus:!ring-rose-500/30' : ''}
                />
              </Field>
            )}

            <Field label={`PAN ${['Company', 'LLP', 'Partnership'].includes(form.customerType) ? '*' : '(Optional)'}`}>
              <Input
                id="kyc_pan"
                value={form.pan}
                onChange={set('pan')}
                placeholder="e.g. ABCDE1234F"
              />
            </Field>

            <Field label={`PO Required from Client ${['Company', 'LLP', 'Partnership'].includes(form.customerType) ? '*' : ''}`}>
              <Select
                id="kyc_poRequired"
                value={form.poRequired}
                onChange={set('poRequired')}
                options={[
                  { value: 'Yes', label: 'Yes' },
                  { value: 'No', label: 'No' },
                ]}
              />
            </Field>

            {form.poRequired === 'Yes' && (
              <Field label="Client PO Number *" error={fieldErrors.clientPoNumber}>
                <Input
                  id="kyc_clientPoNumber"
                  value={form.clientPoNumber}
                  onChange={set('clientPoNumber')}
                  placeholder="Enter Client Purchase Order No."
                  className={fieldErrors.clientPoNumber ? '!border-rose-500 focus:!ring-rose-500/30' : ''}
                />
              </Field>
            )}

            <div className="sm:col-span-2">
              <Field label="Billing Instructions / Name on Invoice (Optional)">
                <Input
                  value={form.billingInstructions}
                  onChange={set('billingInstructions')}
                  placeholder="Special instructions or specific invoice name..."
                />
              </Field>
            </div>
          </div>
        </div>

        {/* SECTION 4: Documents */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
            <div>
              <h5 className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5 uppercase tracking-wide">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                4. KYC / GST Document Upload Checklist
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Upload KYC & GST documents. File references will be persisted under customer conversion records.
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
                  Load Preset Checklist
                </Button>
              )}
              <Button type="button" size="sm" icon={Plus} onClick={() => handleAddDocRow()}>
                Add Document Item
              </Button>
            </div>
          </div>

          {docs.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 space-y-2">
              <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                No items in the document upload checklist yet.
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
            <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
              {docs.map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2 transition hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                        Document Type & Name
                      </label>
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

                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                        Verification Status
                      </label>
                      <Select
                        value={doc.status || 'Pending'}
                        onChange={(e) => updateDocItem(idx, 'status', e.target.value)}
                        options={[
                          { value: 'Pending', label: '⏳ Pending' },
                          { value: 'Verified', label: '✅ Verified' },
                          { value: 'Correction Required', label: '⚠️ Correction Required' },
                          { value: 'REJECTED', label: '❌ Rejected' },
                          { value: 'NOT_REQUIRED', label: '⚪ Not Required' },
                        ]}
                      />
                    </div>

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

        {/* SECTION 5: System Verification Audit */}
        <div className="space-y-3 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> 5. Verification Status & System Audit
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="KYC Status *">
              <Select
                value={form.status}
                onChange={handleStatusChange}
                options={[
                  { value: 'Pending', label: '⏳ Pending' },
                  { value: 'Verified', label: '✅ Verified' },
                  { value: 'Correction Required', label: '⚠️ Correction Required' },
                ]}
              />
            </Field>

            <Field label="KYC Verified By (System Controlled)">
              <div className="p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                {form.verifiedBy || (form.status === 'Verified' ? currentUserName : 'System / Admin (Recorded on verification)')}
              </div>
            </Field>

            <Field label="KYC Verification Date (System Generated)">
              <div className="p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                {form.verificationDate ? dateTime(form.verificationDate) : (form.status === 'Verified' ? 'Auto-recorded on save' : 'Not Verified')}
              </div>
            </Field>
          </div>
        </div>
      </form>
    </Modal>
  );
};

const SpreadsheetGridView = ({ items, onView, onEdit, onRowClick, selectedSection = 's14', onSectionChange }) => {
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
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${currentSection === sec.id
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
              <tr onClick={() => onRowClick ? onRowClick(lead) : onView(lead)} key={lead.id || lead._id || idx} className="hover:bg-amber-500/5 dark:hover:bg-slate-900/80 transition group cursor-pointer">
                <td className="border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 z-10 font-mono text-brand-600 dark:text-brand-400 font-semibold">
                  <button type="button" onClick={(e) => { e.stopPropagation(); onView(lead); }} className="hover:underline truncate px-2">
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
                    <Button size="sm" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); onView(lead); }} title="View Details" />
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={(e) => { e.stopPropagation(); onEdit(lead); }} title="Edit KYC Details" />
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
  const [viewMode, setViewMode] = useViewMode('table');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { handleFetchLeads } = useSales();
  const salesLeads = useSelector((state) => state.sales?.leads);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [drawerLead, setDrawerLead] = useState(null);

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

  // Filter leads with completed Client Approval or having KYC details
  const approvedLeads = rawLeads.filter(
    (lead) => lead.approval?.clientApprovalStatus === 'APPROVED' || lead.clientApprovalStatus === 'APPROVED' || lead.kyc?.status
  );

  const filteredLeads = approvedLeads.filter((lead) => {
    if (search) {
      const q = search.toLowerCase();
      const code = String(lead.code || '').toLowerCase();
      const clientName = String(lead.clientName || lead.kyc?.billingLegalName || '').toLowerCase();
      const status = String(lead.kyc?.status || '').toLowerCase();
      const gstin = String(lead.kyc?.gstin || '').toLowerCase();
      if (!code.includes(q) && !clientName.includes(q) && !status.includes(q) && !gstin.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const totalCount = approvedLeads.length;
  const verifiedCount = approvedLeads.filter((l) => l.kyc?.status === 'Verified' || l.kyc?.status === 'VERIFIED').length;
  const pendingCount = approvedLeads.filter((l) => !l.kyc?.status || l.kyc?.status === 'Pending' || l.kyc?.status === 'PENDING').length;
  const docAttachedCount = approvedLeads.filter((l) => (l.kyc?.verifiedDocuments?.length || 0) > 0 || (l.kyc?.documents?.length || 0) > 0).length;

  return (
    <div>
      <PageHeader
        title="KYC & Customer Conversion Workspace"
        subtitle="Manage client legal identity, billing & site addresses, GST/tax credentials, client PO numbers, and document verification."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatTile label="Total Conversion Pipeline" value={totalCount} sub="Clients requiring KYC conversion" icon={ShieldCheck} tone="blue" />
        <StatTile label="Verified KYC" value={verifiedCount} sub="Identity & tax verified" icon={CheckCircle2} tone="green" />
        <StatTile label="Pending Verification" value={pendingCount} sub="Awaiting approval/correction" icon={Clock} tone="amber" />
        <StatTile label="Documents Attached" value={docAttachedCount} sub="Verification files on record" icon={FileCheck} tone="brand" />
      </div>

      <Panel className="mb-4">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => updateParam('search', e.target.value, '')}
              placeholder="Search code, billing name, GSTIN, status..."
              className="pl-9"
            />
          </div>

          <ViewSwitcher view={viewMode} onViewChange={setViewMode} />

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
          <Loading text="Loading KYC & Conversion Details..." />
        </Panel>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : filteredLeads.length === 0 ? (
        <Panel className="p-8 text-center">
          <EmptyState
            icon={ShieldCheck}
            title="No KYC & Customer Conversion Records Found"
            hint="Try adjusting search filters or completing Client Approval for leads."
          />
        </Panel>
      ) : viewMode === 'cards' ? (
        <CardGridView
          items={filteredLeads}
          renderCard={(lead) => (
            <SalesStageCard
              lead={lead}
              stageKey="kyc"
              onView={handleViewLead}
              onEdit={(l) => setEditingLead(l)}
              onRowClick={(l) => setDrawerLead(l)}
            />
          )}
          empty={
            <Panel className="p-8 text-center">
              <EmptyState
                icon={ShieldCheck}
                title="No KYC Conversion Records Found"
                hint="No records matching current filter."
              />
            </Panel>
          }
        />
      ) : (
        <SpreadsheetGridView
          items={filteredLeads}
          onView={handleViewLead}
          onEdit={(lead) => setEditingLead(lead)}
          onRowClick={(lead) => setDrawerLead(lead)}
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

      <DetailedDrawer
        open={Boolean(drawerLead)}
        lead={drawerLead}
        onClose={() => setDrawerLead(null)}
        onViewFull={handleViewLead}
      />
    </div>
  );
};

export default Kyc;