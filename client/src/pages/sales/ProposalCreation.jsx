import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, FileText, Calendar, CheckCircle2, Paperclip, Send, Pencil, Sparkles,
    ShieldCheck, Lock, Unlock, AlertCircle, Plus, Trash2, Link as LinkIcon, Upload,
    Loader2, ExternalLink, History, RefreshCw, Layers, Tag, Check, HelpCircle
} from 'lucide-react';
import { date, getMediaUrl } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi, settingsApi, uploadApi } from '../../api';
import { useAction } from '../../hooks/useAsync';
import DetailedDrawer from '../../components/sales/DetailedDrawer';

const SPREADSHEET_SECTIONS = [
    {
        id: 's8',
        title: 'Proposal Creation',
        color: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/90 dark:text-sky-200 dark:border-sky-700/80',
        cols: [
            { key: 'proposal.dueDate', label: 'Proposal Due Date' },
            { key: 'proposal.noVersion', label: 'Proposal No. / Version' },
            { key: 'proposal.date', label: 'Proposal Date' },
            { key: 'proposal.approvalStatus', label: 'Approval Status' },
            { key: 'proposal.clientBrief', label: 'Client Brief' },
            { key: 'proposal.consumptionSheet', label: 'Consumption Sheet' },
            { key: 'proposal.designDirection', label: 'Design Direction' },
            { key: 'proposal.pricingRange', label: 'Pricing Range' },
            { key: 'proposal.terms', label: 'Terms' },
            { key: 'proposal.refundRevisionClause', label: 'Refund / Revision Clause' },
        ]
    }
];

const DEFAULT_MASTER_TERMS = `1. Validity: Proposal pricing is valid for 15 days from issue date.
2. Payment Split: 10% token on order confirmation, 60% advance before production, 30% balance before site installation.
3. Custom Orders: Made-to-measure drapes & blinds cannot be cancelled once fabric cutting commences.
4. Measurements: Final dimensions confirmed via site measurement sign-off by Project Coordinator (PC) / Senior DCM.`;

const DEFAULT_MASTER_REFUND_CLAUSE = `1. Revision Policy: Up to 2 minor design & fabric revision rounds are included prior to BOQ freeze. Further revisions incur standard re-drafting fees.
2. Refund Policy: Token deposit is refundable within 7 days of payment prior to site measurement. Post-measurement or upon custom fabric procurement, advance is non-refundable.
3. Approval Requirement: All proposals require PC / Senior DCM review and Hitesh (Admin) approval sign-off.`;

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

const formatCurrencyINR = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};

const parseAttachmentsOrLinks = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) { }
    if (typeof raw === 'string' && raw.trim()) {
        return raw.split(',').map((s) => ({
            url: s.trim(),
            filename: s.trim(),
            mimetype: s.includes('http') || s.includes('www.') ? 'link' : 'file'
        }));
    }
    return [];
};

/* ------------------------------------------------------------- File & Link Uploader Component */
const AttachmentAndLinkUploader = ({ label, attachments = [], onUpdate, idPrefix = 'att' }) => {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            files.forEach((file) => formData.append('files', file));

            const res = await uploadApi.upload(formData);
            const uploadedFiles = res.data || [];

            const formatted = uploadedFiles.map((file) => ({
                url: file.url,
                filename: file.filename || file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                uploadedAt: file.uploadedAt || new Date().toISOString(),
                storage: file.storage || 's3',
            }));

            onUpdate([...attachments, ...formatted]);
        } catch (err) {
            console.error('Failed to upload files:', err);
            setUploadError(err?.message || 'Failed to upload file(s)');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleAddLink = () => {
        if (!linkUrl.trim()) return;
        const title = linkTitle.trim() || linkUrl.trim();
        const newLink = {
            url: linkUrl.trim(),
            filename: title,
            mimetype: 'link/url',
            uploadedAt: new Date().toISOString(),
            isLink: true
        };
        onUpdate([...attachments, newLink]);
        setLinkUrl('');
        setLinkTitle('');
        setShowLinkInput(false);
    };

    const handleRemove = (index) => {
        const updated = attachments.filter((_, idx) => idx !== index);
        onUpdate(updated);
    };

    return (
        <div className="space-y-2">
            {label && <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</label>}

            <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition border border-slate-200 dark:border-slate-700">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" /> : <Upload className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{uploading ? 'Uploading...' : 'Upload Attachments'}</span>
                    <input
                        id={`${idPrefix}-file-input`}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                </label>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={LinkIcon}
                    onClick={() => setShowLinkInput(!showLinkInput)}
                    className="text-xs"
                >
                    Add Reference Link
                </Button>
            </div>

            {uploadError && <p className="text-[11px] text-rose-500">{uploadError}</p>}

            {showLinkInput && (
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2">
                    <Input
                        placeholder="Link Title (e.g. Design Reference / Pinterest / CAD)"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                        className="text-xs"
                    />
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="https://..."
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            className="text-xs flex-1"
                        />
                        <Button type="button" size="sm" onClick={handleAddLink} disabled={!linkUrl.trim()}>
                            Add
                        </Button>
                    </div>
                </div>
            )}

            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {attachments.map((item, idx) => {
                        const fileUrl = getMediaUrl(item.url || item.filename);
                        const isLink = item.isLink || item.mimetype === 'link/url';
                        return (
                            <div
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 max-w-[220px]"
                            >
                                {isLink ? <LinkIcon className="w-3 h-3 text-sky-500 shrink-0" /> : <Paperclip className="w-3 h-3 text-brand-500 shrink-0" />}
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="truncate hover:underline text-[11px]"
                                    title={item.filename || item.url}
                                >
                                    {item.filename || item.url}
                                </a>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(idx)}
                                    className="text-slate-400 hover:text-rose-500 p-0.5 rounded"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
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
    'proposal.dueDate': (lead) => {
        const val = lead.proposal?.dueDate;
        if (!val) return <span className="text-rose-500 dark:text-rose-400 font-medium text-[11px]">Required *</span>;
        const isOverdue = !lead.proposal?.date && new Date(val) < new Date();
        return (
            <div className="flex items-center gap-1 justify-center">
                <span className={`text-[11px] font-mono whitespace-nowrap ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {date(val)}
                </span>
                {isOverdue && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Proposal Preparation Overdue" />}
            </div>
        );
    },
    'proposal.noVersion': (lead) => {
        const noVer = lead.proposal?.noVersion;
        const revCount = Array.isArray(lead.proposal?.revisionHistory) ? lead.proposal.revisionHistory.length : 0;
        if (!noVer) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-col items-center justify-center gap-0.5">
                <span className="font-mono text-[11px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20 whitespace-nowrap">
                    {noVer}
                </span>
                {revCount > 0 && (
                    <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                        <History className="w-2.5 h-2.5" /> {revCount} rev(s)
                    </span>
                )}
            </div>
        );
    },
    'proposal.date': (lead) => {
        const val = lead.proposal?.date;
        if (!val) return <Badge tone="slate" className="text-[10px]">UNISSUED</Badge>;
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap justify-center">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                {date(val)}
            </span>
        );
    },
    'proposal.approvalStatus': (lead) => {
        const st = lead.proposal?.approvalStatus || 'PENDING';
        switch (st) {
            case 'APPROVED':
                return <Badge tone="emerald">APPROVED</Badge>;
            case 'REVISION_REQUESTED':
                return <Badge tone="sky">REVISION REQ</Badge>;
            case 'REJECTED':
                return <Badge tone="rose">REJECTED</Badge>;
            default:
                return <Badge tone="amber">PENDING APPROVAL</Badge>;
        }
    },
    'proposal.clientBrief': (lead) => {
        const val = lead.proposal?.clientBrief || lead.studioMeeting?.feedback || lead.preSiteVisit?.clientRequirements;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex items-center gap-1 max-w-[200px] mx-auto" title={val}>
                <span className="truncate text-xs text-slate-700 dark:text-slate-300">{val}</span>
            </div>
        );
    },
    'proposal.consumptionSheet': (lead) => {
        const propSheets = parseAttachmentsOrLinks(lead.proposal?.consumptionSheet);
        const boqVer = lead.proposal?.selectedBoqVersion || lead.consumption?.boqVersion || (propSheets.length > 0 ? 'BOQ Linked' : null);
        if (!boqVer && propSheets.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-col items-center gap-0.5 justify-center">
                {boqVer && (
                    <Badge tone="purple" className="text-[10px] font-mono">
                        <Layers className="w-2.5 h-2.5 mr-1" /> {boqVer}
                    </Badge>
                )}
                {propSheets.length > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-500">
                        <Paperclip className="w-2.5 h-2.5" /> {propSheets.length} file(s)
                    </span>
                )}
            </div>
        );
    },
    'proposal.designDirection': (lead) => {
        const text = lead.proposal?.designDirection;
        const atts = parseAttachmentsOrLinks(lead.proposal?.designDirectionAttachments);
        if (!text && atts.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-col items-center justify-center gap-0.5 max-w-[180px] mx-auto">
                {text && <span className="truncate text-xs text-slate-700 dark:text-slate-300 block w-full" title={text}>{text}</span>}
                {atts.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-brand-600 dark:text-brand-400 bg-brand-500/10 px-1 py-0.2 rounded border border-brand-500/20 font-medium">
                        <Paperclip className="w-2.5 h-2.5" /> {atts.length} media asset(s)
                    </span>
                )}
            </div>
        );
    },
    'proposal.pricingRange': (lead) => {
        const minP = lead.proposal?.minPricing;
        const maxP = lead.proposal?.maxPricing;
        const rawRange = lead.proposal?.pricingRange;

        if ((minP !== undefined && minP !== null && minP > 0) || (maxP !== undefined && maxP !== null && maxP > 0)) {
            const minStr = minP ? formatCurrencyINR(minP) : '₹0';
            const maxStr = maxP ? formatCurrencyINR(maxP) : '—';
            return (
                <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                    {minStr} - {maxStr}
                </span>
            );
        }

        if (rawRange) {
            return (
                <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                    {rawRange}
                </span>
            );
        }

        return <span className="text-slate-400 dark:text-slate-600">—</span>;
    },
    'proposal.terms': (lead) => {
        const terms = lead.proposal?.terms;
        if (!terms) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex items-center gap-1 max-w-[180px] mx-auto" title={terms}>
                <Badge tone="indigo" className="text-[9px] shrink-0">Master Lookup</Badge>
                <span className="truncate text-[11px] text-slate-600 dark:text-slate-400">{terms}</span>
            </div>
        );
    },
    'proposal.refundRevisionClause': (lead) => {
        const clause = lead.proposal?.refundRevisionClause;
        const isLocked = lead.proposal?.isRefundClauseLocked !== false;
        if (!clause) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex items-center gap-1 max-w-[190px] mx-auto" title={clause}>
                {isLocked ? (
                    <Badge tone="rose" className="text-[9px] shrink-0 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Restricted
                    </Badge>
                ) : (
                    <Badge tone="amber" className="text-[9px] shrink-0 flex items-center gap-0.5">
                        <Unlock className="w-2.5 h-2.5" /> Custom
                    </Badge>
                )}
                <span className="truncate text-[11px] text-slate-600 dark:text-slate-400">{clause}</span>
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

    return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block mx-auto text-xs" title={String(raw)}>{String(raw)}</span>;
};

const SpreadsheetGridView = ({ items, onView, onEdit, onRowClick, selectedSection = 's8', onSectionChange }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's8';
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
                                    <th key={col.key} className="border-b border-r border-amber-300/40 dark:border-slate-800/80 p-2 text-[10px] uppercase font-semibold text-amber-50 dark:text-slate-300 whitespace-nowrap min-w-[140px] bg-[#836444] dark:bg-slate-900/90">
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
                                    sec.cols.filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
                                        <td key={col.key} className="p-4 border-r border-slate-200 dark:border-slate-800/60 whitespace-nowrap">
                                            {renderSpreadsheetCell(lead, col.key, idx + 1, onView, onEdit)}
                                        </td>
                                    ))
                                )}
                                <td className="p-2 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 text-right sticky right-0 z-10 border-l border-slate-200 dark:border-slate-800/80">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); onView(lead); }} title="View Details" />
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={(e) => { e.stopPropagation(); onEdit(lead); }} title="Edit Proposal & Terms" />
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

import { getLocalDate } from '../../utils/format';

const EditProposalModal = ({ item, onClose, onDone }) => {
    const prop = item?.proposal || {};

    const [form, setForm] = useState({
        dueDate: prop.dueDate ? String(prop.dueDate).slice(0, 10) : getLocalDate(),
        noVersion: prop.noVersion || '',
        date: prop.date ? String(prop.date).slice(0, 10) : '',
        clientBrief: prop.clientBrief || item?.studioMeeting?.feedback || item?.preSiteVisit?.clientRequirements || '',
        selectedBoqVersion: prop.selectedBoqVersion || item?.consumption?.boqVersion || 'BOQ-v1.0 (Approved)',
        consumptionSheet: parseAttachmentsOrLinks(prop.consumptionSheet),
        designDirection: prop.designDirection || '',
        designDirectionAttachments: parseAttachmentsOrLinks(prop.designDirectionAttachments),
        minPricing: prop.minPricing !== undefined ? prop.minPricing : '',
        maxPricing: prop.maxPricing !== undefined ? prop.maxPricing : '',
        pricingRange: prop.pricingRange || '',
        terms: prop.terms || '',
        refundRevisionClause: prop.refundRevisionClause || '',
        isRefundClauseLocked: prop.isRefundClauseLocked !== false,
        approvalStatus: prop.approvalStatus || 'PENDING',
        approvedBy: prop.approvedBy || 'Hitesh / Senior DCM',
    });

    const [validationError, setValidationError] = useState(null);
    const [loadingMasters, setLoadingMasters] = useState(false);
    const [masterTerms, setMasterTerms] = useState(DEFAULT_MASTER_TERMS);
    const [masterRefundClause, setMasterRefundClause] = useState(DEFAULT_MASTER_REFUND_CLAUSE);

    useEffect(() => {
        setLoadingMasters(true);
        settingsApi.get()
            .then((res) => {
                const comp = res?.data?.company || {};
                if (comp.termsAndConditions) {
                    setMasterTerms(comp.termsAndConditions);
                }
                if (comp.refundRevisionClause) {
                    setMasterRefundClause(comp.refundRevisionClause);
                }

                // If lead proposal terms / refund clause are empty, auto-fill from approved masters!
                setForm((prev) => ({
                    ...prev,
                    terms: prev.terms || comp.termsAndConditions || DEFAULT_MASTER_TERMS,
                    refundRevisionClause: prev.refundRevisionClause || comp.refundRevisionClause || DEFAULT_MASTER_REFUND_CLAUSE,
                }));
            })
            .catch(() => {
                setForm((prev) => ({
                    ...prev,
                    terms: prev.terms || DEFAULT_MASTER_TERMS,
                    refundRevisionClause: prev.refundRevisionClause || DEFAULT_MASTER_REFUND_CLAUSE,
                }));
            })
            .finally(() => setLoadingMasters(false));
    }, []);

    // Auto-generate proposal number if empty
    const handleGeneratePropNo = () => {
        const leadCode = item?.code || 'LD';
        const dateStr = new Date().getFullYear();
        const existingVer = form.noVersion;

        if (existingVer && existingVer.includes('-v')) {
            const parts = existingVer.split('-v');
            const currentVerNum = parseFloat(parts[1]) || 1.0;
            const nextVer = (currentVerNum + 0.1).toFixed(1);
            setForm((p) => ({ ...p, noVersion: `${parts[0]}-v${nextVer}` }));
        } else {
            setForm((p) => ({ ...p, noVersion: `PROP-${leadCode}-${dateStr}-v1.0` }));
        }
    };

    // Auto-fill today's date when proposal is issued
    const handleSetTodayDate = () => {
        setForm((p) => ({ ...p, date: new Date().toISOString().slice(0, 10) }));
    };

    // Pull from approved client/meeting brief
    const handlePullClientBrief = () => {
        const brief = item?.studioMeeting?.feedback || item?.studioMeeting?.architectBrief || item?.preSiteVisit?.clientRequirements;
        if (brief) {
            setForm((p) => ({ ...p, clientBrief: brief }));
        } else {
            setValidationError('No approved client/meeting brief found on lead record.');
            setTimeout(() => setValidationError(null), 3000);
        }
    };

    // Auto-fetch approved master terms
    const handlePullMasterTerms = () => {
        setForm((prev) => ({ ...prev, terms: masterTerms }));
    };

    // Auto-fetch approved master refund clause
    const handlePullMasterRefundClause = () => {
        setForm((prev) => ({ ...prev, refundRevisionClause: masterRefundClause, isRefundClauseLocked: true }));
    };

    const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

    const { execute, pending, error: apiError } = useAction(
        (payload) => leadsApi.update(item._id || item.id, { proposal: payload }),
        {
            onSuccess: () => {
                onDone();
                onClose();
            },
        }
    );

    const handleSubmit = () => {
        setValidationError(null);

        // Validation Rule 1: Proposal Due Date is required when proposal preparation begins
        if (!form.dueDate) {
            setValidationError('Proposal Due Date is required when proposal preparation begins.');
            return;
        }

        // Validation Rule 7: Minimum price cannot be greater than maximum price
        if (form.minPricing !== '' && form.maxPricing !== '' && Number(form.minPricing) > Number(form.maxPricing)) {
            setValidationError('Minimum Price (₹) cannot be greater than Maximum Price (₹).');
            return;
        }

        // Format Pricing Range string
        let formattedPricingRange = form.pricingRange;
        if (form.minPricing !== '' || form.maxPricing !== '') {
            const minStr = form.minPricing !== '' ? formatCurrencyINR(form.minPricing) : '₹0';
            const maxStr = form.maxPricing !== '' ? formatCurrencyINR(form.maxPricing) : '—';
            formattedPricingRange = `${minStr} - ${maxStr}`;
        }

        const payload = {
            ...form,
            minPricing: form.minPricing !== '' ? Number(form.minPricing) : undefined,
            maxPricing: form.maxPricing !== '' ? Number(form.maxPricing) : undefined,
            pricingRange: formattedPricingRange,
        };

        execute(payload);
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Proposal Creation & Commercial Terms — ${item?.clientName || item?.code}`}
            subtitle="Configure proposal dates, versions, client brief, linked BOQ, design direction, pricing range, and master template terms."
            size="xl"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        icon={Send}
                        loading={pending}
                        onClick={handleSubmit}
                    >
                        Save Proposal
                    </Button>
                </>
            }
        >
            <div className="space-y-5">
                {/* Error Alert */}
                {(validationError || apiError) && (
                    <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{validationError || apiError?.message}</span>
                    </div>
                )}

                {/* Master Template Notice Bar */}
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-sky-900 dark:text-sky-200">Company Master Policy Controls</p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">All standard terms & revision clauses auto-sync from approved company masters with restricted editing controls.</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={Sparkles}
                        loading={loadingMasters}
                        onClick={() => {
                            handlePullMasterTerms();
                            handlePullMasterRefundClause();
                        }}
                        className="text-xs shrink-0"
                    >
                        Fetch Approved Masters
                    </Button>
                </div>

                {/* Section 1: Proposal Details & Key Dates */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3.5">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                        <Calendar className="w-4 h-4 text-brand-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Proposal Details & Key Dates
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label="Proposal Due Date *" hint="Required when preparation begins">
                            <Input
                                type="date"
                                value={form.dueDate}
                                onChange={set('dueDate')}
                                required
                                className={!form.dueDate ? 'border-amber-400 dark:border-amber-500/50' : ''}
                            />
                        </Field>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="field-label mb-0">Proposal No. / Version</label>
                                <button
                                    type="button"
                                    onClick={handleGeneratePropNo}
                                    className="text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                                    title="Auto-generate or bump version"
                                >
                                    <RefreshCw className="w-3 h-3" />Generate
                                </button>
                            </div>
                            <Input
                                value={form.noVersion}
                                onChange={set('noVersion')}
                                placeholder="PROP-2026-v1.0"
                                className="font-mono text-xs"
                            />
                            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Unique number with revision history</p>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="field-label mb-0">Proposal Date</label>
                                <button
                                    type="button"
                                    onClick={handleSetTodayDate}
                                    className="text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                                    title="Set current date"
                                >
                                    <Calendar className="w-3 h-3" /> Today
                                </button>
                            </div>
                            <Input
                                type="date"
                                value={form.date}
                                onChange={set('date')}
                            />
                            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Captured when proposal is issued</p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Client Brief & Linked Consumption BOQ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Client Brief */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60 mb-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-brand-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Client Brief
                                    </h4>
                                </div>
                        
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                                Source: Studio Meeting / Pre-Site Visit
                            </p>
                            <Textarea
                                rows={4}
                                value={form.clientBrief}
                                onChange={set('clientBrief')}
                                placeholder="Client requirements, preferences, drape styles, motorization details..."
                            />
                        </div>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Pull from approved client/meeting brief</p>
                    </div>

                    {/* Consumption Sheet */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800/60 mb-3">
                                <Layers className="w-4 h-4 text-purple-500" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Consumption Sheet
                                </h4>
                            </div>

                            <div className="space-y-2.5">
                                <Select
                                    value={form.selectedBoqVersion}
                                    onChange={set('selectedBoqVersion')}
                                    options={[
                                        { value: item?.consumption?.boqVersion || 'BOQ-v1.0 (Approved)', label: `${item?.consumption?.boqVersion || 'BOQ-v1.0'} (Approved)` },
                                        { value: 'BOQ-v1.1 (Draft)', label: 'BOQ-v1.1 (Draft Revision)' },
                                        { value: 'BOQ-v2.0 (Final)', label: 'BOQ-v2.0 (Final Sign-off)' },
                                    ]}
                                />

                                {item?.consumption && (
                                    <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 text-[11px] text-purple-900 dark:text-purple-300 space-y-0.5">
                                        <p className="font-semibold flex items-center gap-1">
                                            <Layers className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Linked BOQ: {item.consumption.boqVersion || 'v1.0'}
                                        </p>
                                        <p>Prepared By: {item.consumption.boqPreparedBy || 'DCM Team'} • Qty: {item.consumption.quantity || '—'} {item.consumption.unit || 'sqft'}</p>
                                        {item.consumption.fabricDesignSelection && (
                                            <p className="truncate">Fabric: {item.consumption.fabricDesignSelection}</p>
                                        )}
                                    </div>
                                )}

                                <AttachmentAndLinkUploader
                                    label="Attached BOQ / Consumption Records"
                                    attachments={form.consumptionSheet}
                                    onUpdate={(atts) => setForm((p) => ({ ...p, consumptionSheet: atts }))}
                                    idPrefix="boq-att"
                                />
                            </div>
                        </div>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Select approved consumption-sheet / BOQ version</p>
                    </div>
                </div>

                {/* Section 3: Design Direction */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3.5">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Design Direction
                        </h4>
                    </div>

                    <Field label="Design Direction Vision">
                        <Textarea
                            rows={3}
                            value={form.designDirection}
                            onChange={set('designDirection')}
                            placeholder="Describe aesthetic themes, fabric textures, pleat styles, motorization & track specifications..."
                        />
                    </Field>

                    <AttachmentAndLinkUploader
                        label="Design Direction Attachments & Moodboard Links"
                        attachments={form.designDirectionAttachments}
                        onUpdate={(atts) => setForm((p) => ({ ...p, designDirectionAttachments: atts }))}
                        idPrefix="design-att"
                    />
                </div>

                {/* Section 4: Pricing Range */}
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                        <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                                    Pricing Range (₹)
                                </h4>
                            </div>
                        </div>

                        {(form.minPricing !== '' || form.maxPricing !== '') && (
                            <Badge tone="green" className="font-mono text-xs px-2.5 py-1">
                                Estimate: {formatCurrencyINR(form.minPricing) || '₹0'} - {formatCurrencyINR(form.maxPricing) || '—'}
                            </Badge>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Minimum Estimate (₹)">
                            <Input
                                type="number"
                                min="0"
                                placeholder="e.g. 250000"
                                value={form.minPricing}
                                onChange={set('minPricing')}
                            />
                        </Field>
                        <Field label="Maximum Estimate (₹)">
                            <Input
                                type="number"
                                min="0"
                                placeholder="e.g. 350000"
                                value={form.maxPricing}
                                onChange={set('maxPricing')}
                            />
                        </Field>
                    </div>
                </div>

                {/* Section 5: Standard Terms */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-indigo-500" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                 Terms
                            </h4>
                        </div>
                        <button
                            type="button"
                            onClick={handlePullMasterTerms}
                            className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                        >
                            Re-fetch Master Terms
                        </button>
                    </div>

                    <Textarea
                        rows={4}
                        value={form.terms}
                        onChange={set('terms')}
                        placeholder="Standard payment split, validity, and measurement sign-off terms..."
                    />
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Auto-fetched approved standard commercial terms</p>
                </div>

                {/* Section 6: Refund & Revision Policy */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-amber-500" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Refund & Revision Policy
                            </h4>
                            {form.isRefundClauseLocked ? (
                                <Badge tone="rose" className="text-[10px] py-0 px-1.5 flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" /> Locked
                                </Badge>
                            ) : (
                                <Badge tone="amber" className="text-[10px] py-0 px-1.5 flex items-center gap-0.5">
                                    <Unlock className="w-2.5 h-2.5" /> Editing Unlocked
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handlePullMasterRefundClause}
                                className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                            >
                                Re-fetch
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm((p) => ({ ...p, isRefundClauseLocked: !p.isRefundClauseLocked }))}
                                className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline"
                            >
                                {form.isRefundClauseLocked ? 'Unlock Edit' : 'Lock Clause'}
                            </button>
                        </div>
                    </div>

                    <Textarea
                        rows={4}
                        value={form.refundRevisionClause}
                        onChange={set('refundRevisionClause')}
                        disabled={form.isRefundClauseLocked}
                        className={form.isRefundClauseLocked ? 'bg-slate-100 dark:bg-slate-900/80 cursor-not-allowed opacity-90' : ''}
                        placeholder="Approved refund & revision policy clause..."
                    />
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Auto-fetched approved clause; restricted manual override</p>
                </div>
                
            </div>
        </Modal>
    );
};

const ProposalCreation = ({ items: itemsProp = [] }) => {
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
            .catch((err) => setError(err?.message || 'Failed to fetch proposal data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const selectedSection = searchParams.get('section') || 's8';

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=proposal`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const filteredLeads = rawLeads.filter((lead) => {
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const propNo = String(lead.proposal?.noVersion || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !propNo.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = rawLeads.length;
    const generatedProposals = rawLeads.filter((l) => Boolean(l.proposal?.noVersion || l.proposal?.date)).length;
    const approvedProposals = rawLeads.filter((l) => l.proposal?.approvalStatus === 'APPROVED').length;
    const masterTermsSynced = rawLeads.filter((l) => Boolean(l.proposal?.terms && l.proposal?.refundRevisionClause)).length;

    return (
        <div>
            <PageHeader
                title="Proposal Creation & Management"
                subtitle="Draft, version, and manage commercial proposals, client briefs, design direction, terms, and refund clauses with Hitesh / PC / Senior DCM sign-off"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Total Proposal Pipeline" value={totalCount} sub="Active leads pipeline" icon={FileText} tone="sky" />
                <StatTile label="Proposals Generated" value={generatedProposals} sub="Active proposal versions" icon={CheckCircle2} tone="blue" />
                <StatTile label="Approved Proposals" value={approvedProposals} sub="Hitesh / Sr DCM approved" icon={ShieldCheck} tone="green" />
                <StatTile label="Master Terms Synced" value={masterTermsSynced} sub="Standard templates loaded" icon={Send} tone="indigo" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, proposal no..."
                            className="pl-9"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Commercial Proposal Records ({filteredLeads.length})
                        </span>
                        {(search || selectedSection !== 's8') && (
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
                </div>
            </Panel>

            {loading ? (
                <Panel className="p-12 text-center">
                    <Loading text="Loading Proposal Data..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={FileText} title="No Proposal Records Found" hint="Try adjusting search parameters." />
                </Panel>
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingLead(lead)}
                    onRowClick={(lead) => setDrawerLead(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's8')}
                />
            )}

            {editingLead && (
                <EditProposalModal
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

export default ProposalCreation;
