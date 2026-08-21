import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, CheckCircle2, Calendar, Paperclip, ShieldCheck, Pencil, History, RotateCcw, AlertTriangle, ShieldAlert, Clock } from 'lucide-react';
import { date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi, uploadApi } from '../../api';
import { useAction } from '../../hooks/useAsync';

const SPREADSHEET_SECTIONS = [
    {
        id: 's12',
        title: ' Client Approval',
        color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/90 dark:text-orange-200 dark:border-orange-700/80',
        cols: [
            { key: 'approval.planned', label: 'Approval Due Date' },
            { key: 'approval.clientApprovalDate', label: 'Client Approval Date' },
            { key: 'approval.clientApprovalStatus', label: 'Client Approval Status' },
            { key: 'approval.revisions', label: 'Revision Control History' },
            { key: 'approval.proofAttachment', label: 'Approval Proof / Attachment' },
            { key: 'approval.finalApprovedVersion', label: 'Final Quotation / Proposal Version Approved' },
            { key: 'presentation.attachment', label: 'Presentation' },
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
    'approval.clientApprovalStatus': (lead) => {
        const st = lead.approval?.clientApprovalStatus || 'PENDING';
        const revCount = lead.approval?.revisions?.length || 0;
        const tone = st === 'APPROVED' ? 'emerald' : st === 'REJECTED' ? 'rose' : st === 'REVISION_REQUESTED' ? 'amber' : 'slate';
        return (
            <div className="flex items-center justify-center gap-1">
                <Badge tone={tone}>{st}</Badge>
                {revCount > 0 && (
                    <Badge tone="amber">
                        <RotateCcw className="w-2.5 h-2.5 inline mr-0.5" /> Rev {revCount}
                    </Badge>
                )}
            </div>
        );
    },
    'approval.revisions': (lead) => {
        const revs = lead.approval?.revisions || [];
        if (revs.length === 0) return <span className="text-slate-400 dark:text-slate-600">Base Rev (0)</span>;
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-semibold">
                <RotateCcw className="w-3 h-3 shrink-0" /> {revs.length} Change(s)
            </span>
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

import { getLocalDate } from '../../utils/format';

const ClientApprovalEditModal = ({ item, onClose, onDone }) => {
    const wasApproved = item?.approval?.clientApprovalStatus === 'APPROVED';

    const [form, setForm] = useState({
        planned: item?.approval?.planned ? new Date(item.approval.planned).toISOString().slice(0, 10) : getLocalDate(),
        clientApprovalDate: item?.approval?.clientApprovalDate ? new Date(item.approval.clientApprovalDate).toISOString().slice(0, 10) : getLocalDate(),
        clientApprovalStatus: item?.approval?.clientApprovalStatus || 'PENDING',
        finalApprovedVersion: item?.approval?.finalApprovedVersion || '',
        clientSelection: item?.presentation?.clientSelection || '',
        fabricSelection: item?.presentation?.fabricSelection || '',
        designDirection: item?.presentation?.designDirection || '',
        revisionNotes: item?.presentation?.revisionNotes || '',
    });

    const [proofAttachments, setProofAttachments] = useState(item?.approval?.proofAttachment || []);
    const [presentationAttachments, setPresentationAttachments] = useState(item?.presentation?.attachment || []);
    const [uploading, setUploading] = useState(null);

    // Revision / Change-Control state
    const [revisionReason, setRevisionReason] = useState('');
    const [validationError, setValidationError] = useState('');
    const [showRevisionsHistory, setShowRevisionsHistory] = useState(false);

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    // Check if selection/approval fields have been modified compared to initial state
    const isSelectionAltered = () => {
        if (!wasApproved) return false;
        const initPlanned = item?.approval?.planned || '';
        const initDate = item?.approval?.clientApprovalDate || '';
        const initStatus = item?.approval?.clientApprovalStatus || 'PENDING';
        const initVersion = item?.approval?.finalApprovedVersion || '';
        const initClientSel = item?.presentation?.clientSelection || '';
        const initFabricSel = item?.presentation?.fabricSelection || '';
        const initDesignDir = item?.presentation?.designDirection || '';
        const initProofStr = JSON.stringify(item?.approval?.proofAttachment || []);

        return (
            form.planned !== initPlanned ||
            form.clientApprovalDate !== initDate ||
            form.clientApprovalStatus !== initStatus ||
            form.finalApprovedVersion !== initVersion ||
            form.clientSelection !== initClientSel ||
            form.fabricSelection !== initFabricSel ||
            form.designDirection !== initDesignDir ||
            JSON.stringify(proofAttachments) !== initProofStr
        );
    };

    const changesInEffect = isSelectionAltered();

    const handleFileUpload = async (e, type) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setUploading(type);
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
            }));

            if (type === 'proof') {
                setProofAttachments((prev) => [...prev, ...uploadedFiles]);
            } else {
                setPresentationAttachments((prev) => [...prev, ...uploadedFiles]);
            }
        } catch (err) {
            console.error('Failed to upload file:', err);
        } finally {
            setUploading(null);
            e.target.value = '';
        }
    };

    const handleRemoveAttachment = (type, index) => {
        if (type === 'proof') {
            setProofAttachments((prev) => prev.filter((_, i) => i !== index));
        } else {
            setPresentationAttachments((prev) => prev.filter((_, i) => i !== index));
        }
    };

    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item._id || item.id, payload),
        {
            onSuccess: () => {
                onDone();
                onClose();
            },
        }
    );

    const handleSubmit = (e) => {
        if (e) e.preventDefault();

        // Enforce change-control / revision reason if an approved selection was modified
        if (wasApproved && changesInEffect) {
            if (!revisionReason.trim()) {
                setValidationError('A Revision Reason / Change-Control Description is required when modifying an approved selection.');
                return;
            }
        }

        setValidationError('');

        const existingRevisions = Array.isArray(item?.approval?.revisions) ? item.approval.revisions : [];
        let updatedRevisions = existingRevisions;
        let finalStatus = form.clientApprovalStatus;
        let finalNotes = form.revisionNotes;

        if (wasApproved && changesInEffect) {
            const revNum = existingRevisions.length + 1;
            const revisionSnapshot = {
                revisionNumber: revNum,
                clientApprovalStatus: item?.approval?.clientApprovalStatus || 'APPROVED',
                finalApprovedVersion: item?.approval?.finalApprovedVersion || 'v1',
                clientSelection: item?.presentation?.clientSelection || '',
                fabricSelection: item?.presentation?.fabricSelection || '',
                designDirection: item?.presentation?.designDirection || '',
                revisionNotes: item?.presentation?.revisionNotes || '',
                changeReason: revisionReason.trim(),
                revisedAt: new Date().toISOString(),
                proofAttachment: item?.approval?.proofAttachment || [],
            };

            updatedRevisions = [...existingRevisions, revisionSnapshot];

            // If user hasn't explicitly set another status, transition to REVISION_REQUESTED
            if (finalStatus === 'APPROVED') {
                finalStatus = 'REVISION_REQUESTED';
            }

            const revHeader = `[Rev #${revNum} - ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}]: ${revisionReason.trim()}`;
            finalNotes = form.revisionNotes ? `${revHeader}\n\n${form.revisionNotes}` : revHeader;
        }

        execute({
            approval: {
                ...(item?.approval || {}),
                planned: form.planned || undefined,
                clientApprovalDate: form.clientApprovalDate || undefined,
                clientApprovalStatus: finalStatus,
                proofAttachment: proofAttachments,
                finalApprovedVersion: form.finalApprovedVersion || undefined,
                revisions: updatedRevisions,
            },
            presentation: {
                ...(item?.presentation || {}),
                clientSelection: form.clientSelection || undefined,
                fabricSelection: form.fabricSelection || undefined,
                designDirection: form.designDirection || undefined,
                revisionNotes: finalNotes || undefined,
                attachment: presentationAttachments,
            },
        });
    };

    const revisionsList = item?.approval?.revisions || [];

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Edit Client Approval & Presentation — ${item?.clientName || item?.code}`}
            subtitle="Update client approval dates, status, proof attachments, final approved versions, presentation details, and fabric selections."
            size="lg"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        loading={pending}
                        onClick={handleSubmit}
                    >
                        {wasApproved && changesInEffect ? 'Trigger Revision & Save' : 'Save Details'}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {(error || validationError) && (
                    <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
                        {error?.message || validationError}
                    </div>
                )}

                {/* Change Control Warning Banner */}
                {wasApproved && (
                    <div className={`p-3.5 rounded-lg border transition-all space-y-2.5 ${changesInEffect
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold text-xs">
                                {changesInEffect ? (
                                    <>
                                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
                                        <span className="text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider text-[11px]">
                                            Approved Selection Under Change Control
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider text-[11px]">
                                            Selection Approved & Locked
                                        </span>
                                    </>
                                )}
                            </div>
                            <Badge tone={changesInEffect ? 'amber' : 'emerald'}>
                                {changesInEffect ? 'REVISION PENDING' : 'LOCKED'}
                            </Badge>
                        </div>

                        <p className="text-xs opacity-90 leading-relaxed">
                            {changesInEffect
                                ? 'Modifications to an approved selection will trigger a formal revision entry and archive the current selection snapshot into audit history.'
                                : 'This selection was previously approved. Any changes made below will require a change-control reason and log a new revision.'}
                        </p>

                        {changesInEffect && (
                            <Field label="Revision Reason / Change Description *" hint="Required for change-control auditing">
                                <Input
                                    value={revisionReason}
                                    onChange={(e) => {
                                        setRevisionReason(e.target.value);
                                        if (validationError) setValidationError('');
                                    }}
                                    placeholder="e.g. Client requested fabric change from Linen Sheer to Velvet Navy after initial signoff..."
                                    className="border-amber-400 dark:border-amber-600 focus:border-amber-500 bg-white/70 dark:bg-slate-900/80"
                                />
                            </Field>
                        )}
                    </div>
                )}

                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> Client Approval Details
                    </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Approval Due Date">
                        <Input type="date" value={form.planned} onChange={set('planned')} />
                    </Field>
                    <Field label="Client Approval Date">
                        <Input type="date" value={form.clientApprovalDate} onChange={set('clientApprovalDate')} />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Client Approval Status">
                        <Select
                            value={form.clientApprovalStatus}
                            onChange={set('clientApprovalStatus')}
                            options={[
                                { value: 'PENDING', label: 'Pending Approval' },
                                { value: 'APPROVED', label: 'Approved' },
                                { value: 'REVISION_REQUESTED', label: 'Revision Requested' },
                                { value: 'REJECTED', label: 'Rejected' },
                            ]}
                        />
                    </Field>
                    <Field label="Final Approved Version" hint="e.g. QUOT-2026-v2">
                        <Input value={form.finalApprovedVersion} onChange={set('finalApprovedVersion')} placeholder="e.g. QUOT-2026-v2" />
                    </Field>
                </div>

                <Field label="Approval Proof / Attachment">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors">
                                <Paperclip className="w-3.5 h-3.5" />
                                {uploading === 'proof' ? 'Uploading...' : 'Upload Proof / Attachment'}
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    disabled={uploading === 'proof'}
                                    onChange={(e) => handleFileUpload(e, 'proof')}
                                />
                            </label>
                        </div>
                        {proofAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {proofAttachments.map((file, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                        <Paperclip className="w-3 h-3 text-slate-500" />
                                        <span className="truncate max-w-[150px]">{file.filename || file.name || 'Attachment'}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAttachment('proof', i)}
                                            className="text-slate-400 hover:text-rose-500 ml-1 font-bold"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Field>

                <div className="border-b border-slate-200 dark:border-slate-800 pb-2 pt-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Presentation & Selection Details
                    </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Client Selection">
                        <Input value={form.clientSelection} onChange={set('clientSelection')} placeholder="e.g. Option B Sheers & Blackout" />
                    </Field>
                    <Field label="Fabric Selection">
                        <Input value={form.fabricSelection} onChange={set('fabricSelection')} placeholder="e.g. Linen Sheer White / Velvet Navy" />
                    </Field>
                </div>

                <Field label="Design Direction">
                    <Input value={form.designDirection} onChange={set('designDirection')} placeholder="e.g. Modern Minimalist Motorized Tracks" />
                </Field>

                <Field label="Revision Notes">
                    <Textarea rows={3} value={form.revisionNotes} onChange={set('revisionNotes')} placeholder="Enter any revision notes or client feedback..." />
                </Field>

                <Field label="Presentation Attachment">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors">
                                <Paperclip className="w-3.5 h-3.5" />
                                {uploading === 'presentation' ? 'Uploading...' : 'Upload Presentation File'}
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    disabled={uploading === 'presentation'}
                                    onChange={(e) => handleFileUpload(e, 'presentation')}
                                />
                            </label>
                        </div>
                        {presentationAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {presentationAttachments.map((file, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                        <Paperclip className="w-3 h-3 text-slate-500" />
                                        <span className="truncate max-w-[150px]">{file.filename || file.name || 'Presentation Deck'}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAttachment('presentation', i)}
                                            className="text-slate-400 hover:text-rose-500 ml-1 font-bold"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Field>

                {/* Revision & Change Control Audit Log */}
                {revisionsList.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowRevisionsHistory(!showRevisionsHistory)}
                            className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 py-1"
                        >
                            <span className="flex items-center gap-1.5">
                                <History className="w-3.5 h-3.5 text-amber-500" />
                                Revision & Change-Control Audit Trail ({revisionsList.length} revision(s))
                            </span>
                            <span className="text-[11px] text-brand-600 dark:text-brand-400 font-medium hover:underline">
                                {showRevisionsHistory ? 'Hide Audit Log' : 'Show Audit Log'}
                            </span>
                        </button>

                        {showRevisionsHistory && (
                            <div className="mt-2 space-y-2 max-h-52 overflow-y-auto pr-1">
                                {revisionsList.slice().reverse().map((rev, idx) => (
                                    <div key={idx} className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                                        <div className="flex items-center justify-between font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <Badge tone="amber">
                                                    Rev #{rev.revisionNumber || (revisionsList.length - idx)}
                                                </Badge>
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {date(rev.revisedAt, { time: true })}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                                {rev.finalApprovedVersion ? `Ver: ${rev.finalApprovedVersion}` : 'No version tag'}
                                            </span>
                                        </div>

                                        {rev.changeReason && (
                                            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                                                <strong className="font-semibold">Reason for Revision:</strong> {rev.changeReason}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
                                            <div><strong className="text-slate-700 dark:text-slate-300">Client Selection:</strong> {rev.clientSelection || '—'}</div>
                                            <div><strong className="text-slate-700 dark:text-slate-300">Fabric Selection:</strong> {rev.fabricSelection || '—'}</div>
                                            <div><strong className="text-slate-700 dark:text-slate-300">Design Direction:</strong> {rev.designDirection || '—'}</div>
                                            <div><strong className="text-slate-700 dark:text-slate-300">Prior Status:</strong> {rev.clientApprovalStatus || 'APPROVED'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's12', onSectionChange }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's12';
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
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(lead)} title="Edit Approval & Presentation" />
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

const ClientApproval = ({ items: itemsProp = [] }) => {
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
            .catch((err) => setError(err?.message || 'Failed to fetch client approval data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const selectedSection = searchParams.get('section') || 's12';

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=client-approval`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const quotationReadyLeads = rawLeads.filter((lead) => {
        const q = lead.quotation || {};
        return Boolean(
            q.no ||
            q.finalQuotedValue ||
            q.date ||
            q.dueDate ||
            q.version ||
            (Array.isArray(q.boq) && q.boq.length > 0) ||
            q.discountApprovalStatus === 'APPROVED' ||
            lead.approval?.finalApprovedVersion ||
            lead.quotationNo
        );
    });

    const filteredLeads = quotationReadyLeads.filter((lead) => {
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const version = String(lead.approval?.finalApprovedVersion || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !version.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = quotationReadyLeads.length;
    const approvedCount = quotationReadyLeads.filter((l) => l.approval?.clientApprovalStatus === 'APPROVED').length;
    const pendingCount = quotationReadyLeads.filter((l) => l.approval?.planned && l.approval?.clientApprovalStatus !== 'APPROVED').length;
    const revisionsLoggedCount = quotationReadyLeads.filter((l) => (l.approval?.revisions?.length || 0) > 0).length;

    return (
        <div>
            <PageHeader
                title="Client Approval Workspace"
                subtitle="Track planned approval dates, client approval statuses, proof of signoff attachments, and final approved versions"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Approval Pipeline" value={totalCount} sub="Leads awaiting signoff" icon={ShieldCheck} tone="orange" />
                <StatTile label="Approved Quotes" value={approvedCount} sub="Client signoffs secured" icon={CheckCircle2} tone="green" />
                <StatTile label="Pending Approvals" value={pendingCount} sub="Due for client decision" icon={Calendar} tone="amber" />
                <StatTile label="Revisions Logged" value={revisionsLoggedCount} sub="Under change control" icon={RotateCcw} tone="blue" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, approved version..."
                            className="pl-9"
                        />
                    </div>

                    {(search || selectedSection !== 's12') && (
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
                    <Loading text="Loading Client Approval Details..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={ShieldCheck} title="No Client Approval Records Found" hint="Try adjusting search parameters." />
                </Panel>
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingLead(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's12')}
                />
            )}

            {editingLead && (
                <ClientApprovalEditModal
                    item={editingLead}
                    onClose={() => setEditingLead(null)}
                    onDone={reload}
                />
            )}
        </div>
    );
};

export default ClientApproval;
