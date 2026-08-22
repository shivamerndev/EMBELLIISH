import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, PhoneCall, UserCheck, ArrowRightCircle, ShieldCheck, Users, Pencil, Trash2, ExternalLink, Paperclip, Upload, X, FileText, Image as ImageIcon, ChevronDown, Check } from 'lucide-react';
import { leadsApi, architectsApi, usersApi, uploadApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { humanise } from '../../utils/format';
import {
  PageHeader, Panel, Button, Modal, Field, Input, Select, PhoneInput, validatePhoneNumber, EmailInput, validateEmail,
  Textarea, Loading, ErrorState, EmptyState, Tabs,
} from '../../components/ui';

const STATUS_TABS = [
  { key: 'ALL', label: 'All Leads' },
  { key: 'NEW', label: 'New' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'CONVERTED', label: 'Converted' },
  { key: 'LOST', label: 'Lost' },
];


const BudgetClassBadge = ({ value }) => {
  const styles = {
    A: 'bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
    B: 'bg-sky-200 text-sky-900 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40',
    C: 'bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
    D: 'bg-rose-200 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
  };
  return (
    <span className={`inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-md border shadow-sm ${styles[value] || styles.A}`}>
      {value || 'A'}
    </span>
  );
};

const RelationshipBadge = ({ value }) => {
  const isYes = value === true || value === 'Yes' || value === 'YES';
  return (
    <span className={`inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-md shadow-sm ${isYes
      ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-600 dark:text-emerald-100'
      : 'bg-red-700 text-white dark:bg-red-800 dark:text-white'
      }`}>
      {isYes ? 'Yes' : 'No'}
    </span>
  );
};

const ArchitectInvolvedBadge = ({ value }) => {
  if (value === 'Yes' || value === true) {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-md bg-emerald-200 text-emerald-900 dark:bg-emerald-600 dark:text-emerald-100 shadow-sm">
        Yes
      </span>
    );
  }
  if (value === 'No' || value === false) {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-md bg-red-700 text-white dark:bg-red-800 dark:text-white shadow-sm">
        No
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-md bg-sky-200 text-sky-900 dark:bg-sky-700 dark:text-sky-100 shadow-sm">
      Not Known
    </span>
  );
};

/* ------------------------------------------------------------- Add Architect Modal */

const AddArchitectModal = ({ open, onClose, onCreated }) => {
  const [newForm, setNewForm] = useState({
    name: '',
    firm: '',
    phone: '',
    email: '',
  });

  const { execute, pending, error } = useAction(
    (payload) => architectsApi.create(payload),
    {
      onSuccess: (res) => {
        const createdObj = res?.data?.item || res?.data || { name: newForm.name, firm: newForm.firm };
        onCreated(createdObj);
        onClose();
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newForm.name.trim()) return;
    execute(newForm);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Architect / Designer"
      subtitle="Create a new member record in CRM"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={pending}>Save Member</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error.message}</p>}
        <Field label="Architect / Designer Name" required>
          <Input
            value={newForm.name}
            onChange={(e) => setNewForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. John Doe / Studio Design"
            required
            autoFocus
          />
        </Field>
        <Field label="Firm Name">
          <Input
            value={newForm.firm}
            onChange={(e) => setNewForm((prev) => ({ ...prev, firm: e.target.value }))}
            placeholder="e.g. Wintek Designs"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile Number">
            <PhoneInput
              value={newForm.phone}
              onChange={(e) => setNewForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <EmailInput
              value={newForm.email}
              onChange={(e) => setNewForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="e.g. architect@example.com"
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------- Searchable Architect Select */

const SearchableArchitectSelect = ({ value, onChange, architects = [], onArchitectCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredArchitects = (architects || []).filter((arch) => {
    const name = arch.name || arch.firm || arch.architectName || '';
    const firm = arch.firm || '';
    const phone = arch.phone || '';
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || firm.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
  });

  const handleSelect = (archName) => {
    onChange(archName);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative w-full">
        <input
          type="text"
          className="field-input pr-8 cursor-pointer"
          value={isOpen ? search : (value || '')}
          placeholder={isOpen ? "Type to search..." : (value || "Select or search Architect / Designer...")}
          onFocus={() => {
            setIsOpen(true);
            setSearch(value || '');
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none text-slate-400">
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setShowAddModal(true);
            }}
            className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold border-b border-slate-200 dark:border-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Add New Member</span>
          </button>

          {filteredArchitects.length === 0 ? (
            <div className="px-3 py-2.5 text-slate-400 text-center italic">
              {search ? `No architect found matching "${search}"` : 'No architects available'}
            </div>
          ) : (
            filteredArchitects.map((arch, idx) => {
              const archName = arch.name || arch.firm || arch.architectName || `Architect ${idx + 1}`;
              const subInfo = [arch.firm, arch.phone].filter(Boolean).join(' • ');
              const isSelected = value === archName;

              return (
                <button
                  key={arch._id || arch.id || idx}
                  type="button"
                  onClick={() => handleSelect(archName)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                    isSelected ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 font-semibold' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{archName}</div>
                    {subInfo && <div className="text-[10px] text-slate-400">{subInfo}</div>}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                </button>
              );
            })
          )}
        </div>
      )}

      {showAddModal && (
        <AddArchitectModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onCreated={(newArch) => {
            if (onArchitectCreated) onArchitectCreated();
            const createdName = newArch?.name || newArch?.firm || '';
            if (createdName) {
              onChange(createdName);
            }
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------- New Lead Modal */

const NewLeadModal = ({ open, onClose, onCreated, architects, onReloadArchitects }) => {
  const [form, setForm] = useState({
    code: '',
    contactPerson: '',
    phone: '',
    email: '',
    source: 'Architect Referral',
    clientName: '',
    architectName: '',
    indicativeBudget: '',
    budgetClassification: 'A',
    location: '',
    previousClientRelationship: 'NO',
    existingRelationshipOwner: 'NA',
    requirementSummary: '',
    architectInvolved: 'Yes',
    attachmentUrl: '',
    attachments: [],
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const { execute, pending, error } = useAction(
    (payload) => leadsApi.create(payload),
    { onSuccess: () => { onCreated(); onClose(); } }
  );

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

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

  const submit = (event) => {
    event.preventDefault();
    execute({
      ...form,
      previousClientRelationship: form.previousClientRelationship === 'YES' || form.previousClientRelationship === 'Yes',
      companyName: form.clientName,
      budget: form.indicativeBudget ? Number(form.indicativeBudget.replace(/[^0-9.]/g, '')) || undefined : undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Capture New Lead"
      subtitle="Step 1 — Lead Capture sheet entry form"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={pending}>Save Lead Record</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4 pr-1">
        {error && <p className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error.message}</p>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Client Name" required>
            <Input value={form.clientName} onChange={set('clientName')} placeholder="e.g. D-table Analytics" required />
          </Field>
          <Field label="Contact Person" required>
            <Input value={form.contactPerson} onChange={set('contactPerson')} placeholder="e.g. Saskhi" required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Mobile Number" required>
            <PhoneInput value={form.phone} onChange={set('phone')} required />
          </Field>
          <Field label="Email">
            <EmailInput value={form.email} onChange={set('email')} placeholder="e.g. client@example.com" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Lead Source">
            <Select
              value={form.source}
              onChange={set('source')}
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
            <SearchableArchitectSelect
              value={form.architectName}
              onChange={(val) => setForm((prev) => ({ ...prev, architectName: val }))}
              architects={architects}
              onArchitectCreated={onReloadArchitects}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Indicative Budget">
            <Input value={form.indicativeBudget} onChange={set('indicativeBudget')} placeholder="e.g. 15 L or 1 Cr" />
          </Field>
          <Field label="Budget Classification">
            <Select
              value={form.budgetClassification}
              onChange={set('budgetClassification')}
              options={[
                { value: 'A', label: 'A (High Priority/Budget)' },
                { value: 'B', label: 'B (Medium-High)' },
                { value: 'C', label: 'C (Standard)' },
                { value: 'D', label: 'D (Basic)' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Project Location">
            <Input value={form.location} onChange={set('location')} placeholder="e.g. Aurangabad / Mumbai / Pune" />
          </Field>
          <Field label="Previous Client Relationship">
            <Select
              value={form.previousClientRelationship}
              onChange={set('previousClientRelationship')}
              options={[
                { value: 'NO', label: 'No' },
                { value: 'YES', label: 'Yes' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Existing Relationship Owner">
            <Input value={form.existingRelationshipOwner} onChange={set('existingRelationshipOwner')} placeholder="e.g. Sakshi or NA" />
          </Field>
          <Field label="Architect / Designer Involved">
            <Select
              value={form.architectInvolved}
              onChange={set('architectInvolved')}
              options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
                { value: 'Not Known', label: 'Not Known' },
              ]}
            />
          </Field>
        </div>

        <Field label="Requirement Summary">
          <Textarea value={form.requirementSummary} onChange={set('requirementSummary')} placeholder="As per given document..." />
        </Field>

        {/* Upload Multiple Images / Documents Option */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
            Multiple Images & Document Uploads
          </label>

          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700/80 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/50 text-center relative hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors">
            <input
              type="file"
              id="new-lead-file-upload"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <label
              htmlFor="new-lead-file-upload"
              className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-1"
            >
              <Upload className={`w-5 h-5 text-slate-500 dark:text-slate-400 ${uploading ? 'animate-bounce' : ''}`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {uploading ? 'Uploading files...' : 'Click to Upload Multiple Images or Documents'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Supports JPG, PNG, WEBP, PDF, DOCX, XLSX
              </span>
            </label>
            {uploadError && (
              <p className="mt-1 text-[11px] text-rose-500 font-medium">{uploadError}</p>
            )}
          </div>

          {/* Uploaded File List / Thumbnails */}
          {form.attachments && form.attachments.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Uploaded Files ({form.attachments.length}):
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {form.attachments.map((file, idx) => {
                  const isImg = file.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.url || file.filename || '');
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-xs"
                    >
                      {isImg ? (
                        <img
                          src={file.url}
                          alt={file.filename || 'Uploaded preview'}
                          className="w-8 h-8 object-cover rounded bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 truncate block text-[11px]"
                          title={file.filename || file.url}
                        >
                          {file.filename || `File ${idx + 1}`}
                        </a>
                        <span className="text-[10px] text-slate-400 block uppercase">
                          {isImg ? 'Image' : 'Document'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Attachment Link */}
        <Field label="Attachment Link (Google Drive / Web URL)">
          <Input value={form.attachmentUrl} onChange={set('attachmentUrl')} placeholder="https://drive.google.com/open?id=..." />
        </Field>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------- Edit Lead Modal */

const EditLeadModal = ({ lead, onClose, onDone, architects, onReloadArchitects }) => {
  const getInitialForm = (l) => ({
    clientName: l?.clientName || '',
    contactPerson: l?.contactPerson || '',
    phone: l?.phone || '',
    email: l?.email || '',
    source: l?.source || 'Architect Referral',
    architectName: l?.architectName || (typeof l?.architect === 'object' ? l?.architect?.name : l?.architect) || '',
    indicativeBudget: l?.indicativeBudget || (l?.budget ? `${l.budget}` : ''),
    budgetClassification: l?.budgetClassification || 'A',
    location: l?.location || '',
    previousClientRelationship: l?.previousClientRelationship ? 'YES' : 'NO',
    existingRelationshipOwner: l?.existingRelationshipOwner || 'NA',
    requirementSummary: l?.requirementSummary || l?.requirement || '',
    architectInvolved: l?.architectInvolved || 'Yes',
    attachmentUrl: l?.attachmentUrl || '',
    attachments: l?.attachments || [],
  });

  const [form, setForm] = useState(() => getInitialForm(lead));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    if (lead) {
      setForm(getInitialForm(lead));
    }
  }, [lead]);

  const { execute, pending, error } = useAction(
    (payload) => leadsApi.update(lead.id || lead._id, payload),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

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

  const submit = (event) => {
    event.preventDefault();
    execute({
      ...form,
      previousClientRelationship: form.previousClientRelationship === 'YES' || form.previousClientRelationship === 'Yes',
    });
  };

  return (
    <Modal
      open={Boolean(lead)}
      onClose={onClose}
      title={`Edit Lead — ${lead?.code || ''}`}
      subtitle={`Update capture details for ${lead?.clientName || ''}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={pending}>Save Changes</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4 pr-1">
        {error && <p className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error.message}</p>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Client Name" required>
            <Input value={form.clientName} onChange={set('clientName')} required />
          </Field>
          <Field label="Contact Person">
            <Input value={form.contactPerson} onChange={set('contactPerson')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Mobile Number" required>
            <PhoneInput value={form.phone} onChange={set('phone')} required />
          </Field>
          <Field label="Email">
            <EmailInput value={form.email} onChange={set('email')} placeholder="e.g. client@example.com" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Lead Source">
            <Select
              value={form.source}
              onChange={set('source')}
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
            <SearchableArchitectSelect
              value={form.architectName}
              onChange={(val) => setForm((prev) => ({ ...prev, architectName: val }))}
              architects={architects}
              onArchitectCreated={onReloadArchitects}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Indicative Budget">
            <Input value={form.indicativeBudget} onChange={set('indicativeBudget')} />
          </Field>
          <Field label="Budget Classification">
            <Select
              value={form.budgetClassification}
              onChange={set('budgetClassification')}
              options={[
                { value: 'A', label: 'A' },
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
                { value: 'D', label: 'D' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Project Location">
            <Input value={form.location} onChange={set('location')} />
          </Field>
          <Field label="Previous Client Relationship">
            <Select
              value={form.previousClientRelationship}
              onChange={set('previousClientRelationship')}
              options={[
                { value: 'NO', label: 'No' },
                { value: 'YES', label: 'Yes' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Existing Relationship Owner">
            <Input value={form.existingRelationshipOwner} onChange={set('existingRelationshipOwner')} />
          </Field>
          <Field label="Architect / Designer Involved">
            <Select
              value={form.architectInvolved}
              onChange={set('architectInvolved')}
              options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
                { value: 'Not Known', label: 'Not Known' },
              ]}
            />
          </Field>
        </div>

        <Field label="Requirement Summary">
          <Textarea value={form.requirementSummary} onChange={set('requirementSummary')} />
        </Field>

        {/* Upload Multiple Images / Documents Option */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
            Multiple Images & Document Uploads
          </label>

          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700/80 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/50 text-center relative hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors">
            <input
              type="file"
              id="edit-lead-file-upload"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <label
              htmlFor="edit-lead-file-upload"
              className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-1"
            >
              <Upload className={`w-5 h-5 text-slate-500 dark:text-slate-400 ${uploading ? 'animate-bounce' : ''}`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {uploading ? 'Uploading files...' : 'Click to Upload Multiple Images or Documents'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Supports JPG, PNG, WEBP, PDF, DOCX, XLSX
              </span>
            </label>
            {uploadError && (
              <p className="mt-1 text-[11px] text-rose-500 font-medium">{uploadError}</p>
            )}
          </div>

          {/* Uploaded File List / Thumbnails */}
          {form.attachments && form.attachments.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Uploaded Files ({form.attachments.length}):
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {form.attachments.map((file, idx) => {
                  const isImg = file.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.url || file.filename || '');
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-xs"
                    >
                      {isImg ? (
                        <img
                          src={file.url}
                          alt={file.filename || 'Uploaded preview'}
                          className="w-8 h-8 object-cover rounded bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 truncate block text-[11px]"
                          title={file.filename || file.url}
                        >
                          {file.filename || `File ${idx + 1}`}
                        </a>
                        <span className="text-[10px] text-slate-400 block uppercase">
                          {isImg ? 'Image' : 'Document'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Attachment Link */}
        <Field label="Attachment Link">
          <Input value={form.attachmentUrl} onChange={set('attachmentUrl')} />
        </Field>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------- Delete Lead Modal */

const DeleteLeadModal = ({ lead, onClose, onDone }) => {
  const { execute, pending, error } = useAction(
    () => leadsApi.remove(lead.id || lead._id),
    { onSuccess: () => { onDone(); onClose(); } }
  );

  return (
    <Modal
      open={Boolean(lead)}
      onClose={onClose}
      title="Delete Lead Record"
      subtitle={`Remove lead ${lead?.code || ''}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={pending} onClick={() => execute()}>Delete</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Are you sure you want to delete lead <strong className="text-slate-900 dark:text-slate-100">{lead?.code}</strong> ({lead?.clientName})?
        </p>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------- Main Page Component */

export const LeadsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, loading, error, reload } = useAsync(
    () => leadsApi.list({ ...(tab !== 'ALL' && { status: tab }), ...(search && { search }), limit: 100 }).then((r) => r.data),
    [tab, search]
  );

  const { data: architects, reload: reloadArchitects } = useAsync(() => architectsApi.list({ limit: 100 }).then((r) => r.data?.items || []), []);

  // Merge server records with fallback initial sample rows if server returns empty list
  const apiItems = data?.items || [];
  const leadsList = apiItems || []

  const filteredLeads = leadsList.filter((lead) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      lead.code?.toLowerCase().includes(q) ||
      lead.clientName?.toLowerCase().includes(q) ||
      lead.contactPerson?.toLowerCase().includes(q) ||
      lead.phone?.includes(q) ||
      lead.location?.toLowerCase().includes(q) ||
      lead.architectName?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="CRM — Lead Capture"
        subtitle="Manage, track, and qualify leads recorded through Architects, Interior Designers, or Direct Channels"
        actions={
          <>
            <Button icon={Plus} onClick={() => setCreating(true)}>New Lead</Button>
            <Link to="/crm/dcm-assignments">
              <Button variant="secondary" icon={UserCheck}>DCM Assignments</Button>
            </Link>
            <Link to="/crm/qualification">
              <Button variant="secondary" icon={ShieldCheck}>Qualification</Button>
            </Link>
            <Link to="/crm/follow-ups">
              <Button variant="secondary" icon={PhoneCall}>Follow-ups</Button>
            </Link>
            <Link to="/crm/clients">
              <Button variant="secondary" icon={Users}>Clients</Button>
            </Link>
          </>
        }
      />

      <Panel className="mb-4">
        <div className="px-4 pt-1">
          <Tabs
            tabs={STATUS_TABS}
            active={tab}
            onChange={setTab}
          />
        </div>
        <div className="p-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Lead ID, Client, Contact, Location..."
              className="pl-9"
            />
          </div>
        </div>
      </Panel>

      {/* Main 16-Column Sheet Table */}
      <Panel className="overflow-hidden">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-[2300px] w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#836444] text-white font-bold border-b border-amber-300 dark:border-amber-500/30 uppercase tracking-wider whitespace-nowrap">
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Lead ID</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Capture Date & Time</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Contact Person</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Mobile Number</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Email</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Lead Source</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Client Name</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Architect / Designer Name</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Indicative Budget</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Budget Classification</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Project Location</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Previous Client Relationship</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Existing Relationship Owner</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Requirement Summary</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20 text-center">Architect / Designer Involved</th>
                  <th className="p-2.5 px-3 border-r border-amber-300/40 dark:border-amber-500/20">Attachment</th>
                  <th className="p-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="p-8 text-center text-slate-500">
                      No leads match your filter or search query.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((row) => {
                    const formattedDate = row.captureDateTime || (row.createdAt ? new Date(row.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
                    const archName = row.architectName || (typeof row.architect === 'object' ? (row.architect?.name || row.architect?.firm || row.architect?.architectName) : row.architect) || '—';
                    const clientNameVal = row.clientName || row.companyName || row.name || '—';
                    const contactPersonVal = row.contactPerson || row.contactName || '—';
                    const sourceVal = row.source || row.leadSource || '—';

                    return (
                      <tr key={row._id || row.id} className="hover:bg-amber-500/10 dark:hover:bg-amber-500/15 transition-colors border-b border-slate-200 dark:border-slate-800">
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.code || '—'}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{formattedDate}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">{contactPersonVal}</td>
                        <td className="p-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.phone || '—'}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.email || '—'}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-sm">
                            {sourceVal}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-amber-900 dark:text-amber-200 whitespace-nowrap text-sm">{clientNameVal}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">{archName}</td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{row.indicativeBudget || (row.budget ? `₹${row.budget}` : '—')}</td>
                        <td className="p-3 text-center">
                          <BudgetClassBadge value={row.budgetClassification || 'A'} />
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.location || '—'}</td>
                        <td className="p-3 text-center">
                          <RelationshipBadge value={row.previousClientRelationship} />
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{row.existingRelationshipOwner || 'NA'}</td>
                        <td className="p-3 max-w-[180px] truncate text-slate-600 dark:text-slate-400" title={row.requirementSummary || row.requirement || '—'}>
                          {row.requirementSummary || row.requirement || '—'}
                        </td>
                        <td className="p-3 text-center">
                          <ArchitectInvolvedBadge value={row.architectInvolved} />
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1 max-w-[200px]">
                            {Array.isArray(row.attachments) && row.attachments.length > 0 ? (
                              <div className="flex flex-wrap gap-1 items-center">
                                {row.attachments.map((att, i) => (
                                  <a
                                    key={i}
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium truncate max-w-[170px]"
                                    title={att.filename || att.url}
                                  >
                                    <Paperclip className="w-3 h-3 shrink-0 text-slate-500 dark:text-slate-400" />
                                    <span className="truncate">{att.filename || `File ${i + 1}`}</span>
                                  </a>
                                ))}
                              </div>
                            ) : null}

                            {row.attachmentUrl ? (
                              <a
                                href={row.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline max-w-[180px] truncate"
                                title={row.attachmentUrl}
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{row.attachmentUrl}</span>
                              </a>
                            ) : null}

                            {(!row.attachments || row.attachments.length === 0) && !row.attachmentUrl && (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={UserCheck}
                              onClick={() => navigate(`/crm/dcm-assignments?search=${encodeURIComponent(row.code || '')}&assign=true`)}
                              title={`Assign DCM manager for lead ${row.code}`}
                              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs font-semibold"
                            >
                              Assign DCM
                            </Button>
                            <button
                              type="button"
                              onClick={() => setEditing(row)}
                              title="Edit lead"
                              className="p-1.5 text-slate-600 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(row)}
                              title="Delete lead"
                              className="p-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <NewLeadModal open={creating} onClose={() => setCreating(false)} onCreated={reload} architects={architects} onReloadArchitects={reloadArchitects} />
      {editing && <EditLeadModal lead={editing} onClose={() => setEditing(null)} onDone={reload} architects={architects} onReloadArchitects={reloadArchitects} />}
      {deleting && <DeleteLeadModal lead={deleting} onClose={() => setDeleting(null)} onDone={reload} />}
    </div>
  );
};

export default LeadsPage;
