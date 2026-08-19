import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, ShieldCheck, Calendar, Paperclip, Pencil, FileCheck, CheckCircle2, Clock, Upload, X } from 'lucide-react';
import { date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
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
  'Other Document'
];

const SPREADSHEET_SECTIONS = [
  {
    id: 's14',
    title: 'KYC Verification',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-700/80',
    cols: [
      { key: 'kyc.dueDate', label: 'KYC Due Date' },
      { key: 'kyc.actualDate', label: 'KYC Actual Date' },
      { key: 'kyc.status', label: 'KYC Status' },
      { key: 'kyc.verifiedDocuments', label: 'Verified Document List' },
      { key: 'kyc.documentTypes', label: 'Document Types' },
      { key: 'kyc.verifiedBy', label: 'Verified By' },
      { key: 'kyc.remarks', label: 'Verification Remarks' },
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
  sno: (lead, { sno }) => <span className="font-mono text-slate-500 dark:text-slate-400 font-medium">{sno}</span>,
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
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold">
        <FileCheck className="w-3 h-3 shrink-0 text-emerald-600" /> {docs.length} verified doc(s)
      </span>
    );
  },
  'kyc.documentTypes': (lead) => {
    const types = lead.kyc?.documentTypes || [];
    if (types.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
    return (
      <div className="flex flex-wrap gap-1 max-w-[180px]">
        {types.map((t, i) => (
          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium truncate">
            {t}
          </span>
        ))}
      </div>
    );
  }
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
    return <span className="text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap">{date(raw, { time: String(raw).includes('T') })}</span>;
  }

  if (typeof raw === 'boolean') {
    return raw ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>;
  }

  if (!raw && raw !== 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;

  return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block" title={String(raw)}>{String(raw)}</span>;
};

/* ------------------------------------------------------------- Edit KYC Verification Modal */
const KycEditModal = ({ item, onClose, onDone }) => {
  const kycData = item?.kyc || {};

  const [form, setForm] = useState({
    dueDate: kycData.dueDate ? String(kycData.dueDate).slice(0, 10) : '',
    actualDate: kycData.actualDate ? String(kycData.actualDate).slice(0, 10) : '',
    status: kycData.status || 'PENDING',
    verifiedBy: kycData.verifiedBy || '',
    remarks: kycData.remarks || '',
  });

  const [verifiedDocs, setVerifiedDocs] = useState(kycData.verifiedDocuments || []);
  const [selectedDocTypes, setSelectedDocTypes] = useState(kycData.documentTypes || []);
  const [activeDocType, setActiveDocType] = useState('PAN Card');
  const [uploading, setUploading] = useState(false);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleDocTypeToggle = (type) => {
    setSelectedDocTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));

      const res = await uploadApi.upload(formData);
      const uploadedFiles = (res.data || []).map((file) => ({
        url: file.url,
        filename: file.filename || file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: file.uploadedAt || new Date().toISOString(),
        storage: file.storage || 's3',
        docType: activeDocType,
      }));

      setVerifiedDocs((prev) => [...prev, ...uploadedFiles]);

      if (!selectedDocTypes.includes(activeDocType)) {
        setSelectedDocTypes((prev) => [...prev, activeDocType]);
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveDoc = (index) => {
    setVerifiedDocs((prev) => prev.filter((_, i) => i !== index));
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
    execute({
      dueDate: form.dueDate || undefined,
      actualDate: form.actualDate || undefined,
      status: form.status,
      verifiedDocuments: verifiedDocs,
      documentTypes: selectedDocTypes,
      verifiedBy: form.verifiedBy || undefined,
      remarks: form.remarks || undefined,
    });
  };

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title={`KYC Verification — ${item?.clientName || item?.code}`}
      subtitle="Manage KYC due date, actual completion date, verified document attachments, and document types."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={pending}
            onClick={handleSubmit}
          >
            Save KYC Details
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-xs text-rose-500 font-medium">{error.message}</p>}

        <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5" /> Client Identity & Document Verification
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="KYC Due Date *">
            <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
          </Field>
          <Field label="KYC Actual Date">
            <Input type="date" value={form.actualDate} onChange={set('actualDate')} />
          </Field>
          <Field label="KYC Verification Status">
            <Select
              value={form.status}
              onChange={set('status')}
              options={[
                { value: 'PENDING', label: 'Pending Verification' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'VERIFIED', label: 'Verified' },
                { value: 'REJECTED', label: 'Rejected / Disapproved' },
                { value: 'NOT_REQUIRED', label: 'Not Required' },
              ]}
            />
          </Field>
        </div>

        <Field label="Verified Document Types (Select all that apply)">
          <div className="flex flex-wrap gap-1.5 pt-1">
            {KYC_DOC_TYPES.map((type) => {
              const isChecked = selectedDocTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleDocTypeToggle(type)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${isChecked
                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40 dark:text-emerald-300 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  {isChecked && <CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-600" />}
                  {type}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Verified Document Attachments (Upload files & attachments)">
          <div className="space-y-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-48">
                <Select
                  value={activeDocType}
                  onChange={(e) => setActiveDocType(e.target.value)}
                  options={KYC_DOC_TYPES.map((t) => ({ value: t, label: t }))}
                />
              </div>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Uploading...' : `Upload Document (${activeDocType})`}
                <input
                  type="file"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {verifiedDocs.length > 0 ? (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Verified Document List ({verifiedDocs.length} file(s))
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {verifiedDocs.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-slate-800 dark:text-slate-200 hover:underline truncate block"
                          >
                            {doc.filename || doc.name || 'Verified Document'}
                          </a>
                          {doc.docType && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold">
                              {doc.docType}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(i)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Remove Document"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                No verified KYC documents attached yet. Upload PAN, Aadhar, GST, or address proof files above.
              </p>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Verified By (Staff / DCM Name)">
            <Input value={form.verifiedBy} onChange={set('verifiedBy')} placeholder="e.g. Rahul Sharma" />
          </Field>
          <Field label="Verification Remarks">
            <Textarea rows={2} value={form.remarks} onChange={set('remarks')} placeholder="Enter verification notes, document validity details..." />
          </Field>
        </div>
      </form>
    </Modal>
  );
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's14', onSectionChange }) => {
  const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's14';
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
                sec.cols.filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
                  <th key={col.key} className="border-b border-r border-amber-300/40 dark:border-slate-800/80 p-2 text-[10px] uppercase font-semibold text-amber-50 dark:text-slate-300 whitespace-nowrap min-w-[130px] bg-[#836444] dark:bg-slate-900/90">
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
                  sec.cols.filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
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
      navigate(`/crm/sales-commercials/leads/${lead.code}`);
    }
  };

  const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

  const filteredLeads = rawLeads.filter((lead) => {
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

  const totalCount = rawLeads.length;
  const verifiedCount = rawLeads.filter((l) => l.kyc?.status === 'VERIFIED').length;
  const pendingCount = rawLeads.filter((l) => l.kyc?.status === 'PENDING' || !l.kyc?.status).length;
  const docAttachedCount = rawLeads.filter((l) => (l.kyc?.verifiedDocuments?.length || 0) > 0).length;

  return (
    <div>
      <PageHeader
        title="KYC Verification Workspace"
        subtitle="Track client identity verification, manage KYC due dates, actual completion dates, and verified document attachments."
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
          <EmptyState icon={ShieldCheck} title="No KYC Verification Records Found" hint="Try adjusting search parameters." />
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