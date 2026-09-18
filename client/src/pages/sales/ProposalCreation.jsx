import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, FileText, Calendar, CheckCircle2, Paperclip, Send, Pencil, Sparkles,
    ShieldCheck, Lock, Unlock, AlertCircle, Plus, Trash2, Link as LinkIcon, Upload,
    Loader2, ExternalLink, History, RefreshCw, Layers, Tag, Check, HelpCircle, Printer, RotateCcw
} from 'lucide-react';
import { date, getMediaUrl, getLocalDate } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field, DelayBadge, ViewSwitcher } from '../../components/ui';
import useViewMode from '../../hooks/useViewMode';
import CardGridView from '../../components/common/CardGridView';
import SalesStageCard from '../../components/cards/SalesStageCard';
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
        // All fields : shown in DetailedDrawer
        cols: [
            { key: 'proposal.dueDate', label: 'Proposal Due Date' },
            { key: 'delayStatus', label: 'Delay / SLA Status' },
            { key: 'proposal.noVersion', label: 'Proposal No. / Version' },
            { key: 'proposal.date', label: 'Proposal Date' },
            { key: 'proposal.approvalStatus', label: 'Approval Status' },
            { key: 'proposal.clientBrief', label: 'Client Brief' },
            { key: 'proposal.consumptionSheet', label: 'Consumption Sheet' },
            { key: 'proposal.designDirection', label: 'Design Direction' },
            { key: 'proposal.pricingRange', label: 'Pricing Range' },
            { key: 'proposal.terms', label: 'Terms' },
            { key: 'proposal.refundRevisionClause', label: 'Refund / Revision Clause' },
        ],
        // Subset shown in table : prevents horizontal scrolling
        tableCols: [
            { key: 'proposal.dueDate', label: 'Due Date' },
            { key: 'delayStatus', label: 'SLA Status' },
            { key: 'proposal.noVersion', label: 'Proposal No.' },
            { key: 'proposal.approvalStatus', label: 'Approval Status' },
            { key: 'proposal.pricingRange', label: 'Pricing Range' },
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
    delayStatus: (lead) => (
        <DelayBadge
            dueDate={lead.proposal?.dueDate}
            isCompleted={Boolean(['Approved', 'Completed', 'Submitted', 'Sent'].includes(lead.proposal?.approvalStatus || lead.proposal?.status) || lead.proposal?.date)}
        />
    ),
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
                                (sec.tableCols || sec.cols).filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
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
                                    (sec.tableCols || sec.cols).filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
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



const parseNumber = (val) => {
    if (!val) return 0;
    const clean = String(val).replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
};

const formatIndianNumber = (num) => {
    if (isNaN(num) || num === null || num === undefined) return '';
    const parts = num.toString().split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1] ? `.${parts[1]}` : '';
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    if (otherNumbers !== '') {
        integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    }
    return integerPart + decimalPart;
};

const ProposalLetterModal = ({ item, onClose, onDone }) => {
    const prop = item?.proposal || {};
    const initialLetter = prop.letterData || {};

    const [dateVal, setDateVal] = useState(initialLetter.date || '10.11.2025');
    const [clientName, setClientName] = useState(initialLetter.clientName || item?.clientName || 'Mr. Rakesh Jain');

    const [rooms, setRooms] = useState(initialLetter.rooms || [
        { srNo: '1.', area: 'Living Area' },
        { srNo: '2.', area: 'Mandir Area' },
        { srNo: '3.', area: 'Guest Room' },
        { srNo: '4.', area: 'Rakesh Room' },
        { srNo: '5.', area: 'Rishabh Room' },
        { srNo: '6.', area: 'Rishabh Walking Room' },
        { srNo: '7.', area: 'Servant Room' },
        { srNo: '8.', area: 'Kitchen' },
        { srNo: '9.', area: 'Abhit Room' },
        { srNo: '10.', area: 'Kids Room' },
    ]);

    const [opt1, setOpt1] = useState(initialLetter.opt1 || {
        curtainQty: '748',
        curtainRate: '3000.00',
        curtainAmount: '22,44,000/-',
        blackoutQty: '368',
        blackoutRate: '395.00',
        blackoutAmount: '1,45,360/-',
        stitchingCurtainMft: '370',
        stitchingLeadMft: '370',
        stitchingRateCurtain: '850.00',
        stitchingRateLead: '125.00',
        stitchingAmountCurtain: '3,14,500/-',
        stitchingAmountLead: '46,250/-',
        total: '27,50,110/-'
    });

    const [opt2, setOpt2] = useState(initialLetter.opt2 || {
        curtainQty: '748',
        curtainRate: '4000.00',
        curtainAmount: '29,92,000/-',
        blackoutQty: '368',
        blackoutRate: '395.00',
        blackoutAmount: '1,45,360/-',
        stitchingCurtainMft: '370',
        stitchingLeadMft: '370',
        stitchingRateCurtain: '850.00',
        stitchingRateLead: '125.00',
        stitchingAmountCurtain: '3,14,500/-',
        stitchingAmountLead: '46,250/-',
        total: '34,98,110/-'
    });

    const [depositAmount, setDepositAmount] = useState(initialLetter.depositAmount || '4,00,000');

    const roomListContainerRef = useRef(null);
    const roomTableRef = useRef(null);
    const roomInputsRef = useRef([]);
    const [newlyAddedIdx, setNewlyAddedIdx] = useState(null);

    const updateRoom = (index, field, value) => {
        const updated = [...rooms];
        updated[index] = { ...updated[index], [field]: value };
        setRooms(updated);
    };

    const handleAddRoom = () => {
        const nextIndex = rooms.length;
        const nextNo = `${nextIndex + 1}.`;
        const newRoom = { srNo: nextNo, area: 'New Area' };
        setRooms((prev) => [...prev, newRoom]);
        setNewlyAddedIdx(nextIndex);

        setTimeout(() => {
            if (roomListContainerRef.current) {
                roomListContainerRef.current.scrollTo({
                    top: roomListContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
            if (roomInputsRef.current[nextIndex]) {
                roomInputsRef.current[nextIndex].focus();
                roomInputsRef.current[nextIndex].select();
            }
            if (roomTableRef.current) {
                roomTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 50);

        setTimeout(() => {
            setNewlyAddedIdx(null);
        }, 2500);
    };

    const handleRemoveRoom = (index) => {
        const updated = rooms.filter((_, idx) => idx !== index);
        const renumbered = updated.map((r, i) => ({ ...r, srNo: `${i + 1}.` }));
        setRooms(renumbered);
    };

    const handleReset = () => {
        setDateVal('10.11.2025');
        setClientName(item?.clientName || 'Mr. Rakesh Jain');
        setRooms([
            { srNo: '1.', area: 'Living Area' },
            { srNo: '2.', area: 'Mandir Area' },
            { srNo: '3.', area: 'Guest Room' },
            { srNo: '4.', area: 'Rakesh Room' },
            { srNo: '5.', area: 'Rishabh Room' },
            { srNo: '6.', area: 'Rishabh Walking Room' },
            { srNo: '7.', area: 'Servant Room' },
            { srNo: '8.', area: 'Kitchen' },
            { srNo: '9.', area: 'Abhit Room' },
            { srNo: '10.', area: 'Kids Room' },
        ]);
        setOpt1({
            curtainQty: '748',
            curtainRate: '3000.00',
            curtainAmount: '22,44,000/-',
            blackoutQty: '368',
            blackoutRate: '395.00',
            blackoutAmount: '1,45,360/-',
            stitchingCurtainMft: '370',
            stitchingLeadMft: '370',
            stitchingRateCurtain: '850.00',
            stitchingRateLead: '125.00',
            stitchingAmountCurtain: '3,14,500/-',
            stitchingAmountLead: '46,250/-',
            total: '27,50,110/-'
        });
        setOpt2({
            curtainQty: '748',
            curtainRate: '4000.00',
            curtainAmount: '29,92,000/-',
            blackoutQty: '368',
            blackoutRate: '395.00',
            blackoutAmount: '1,45,360/-',
            stitchingCurtainMft: '370',
            stitchingLeadMft: '370',
            stitchingRateCurtain: '850.00',
            stitchingRateLead: '125.00',
            stitchingAmountCurtain: '3,14,500/-',
            stitchingAmountLead: '46,250/-',
            total: '34,98,110/-'
        });
        setDepositAmount('4,00,000');
    };

    const updateOpt1 = (field, val) => {
        setOpt1((prev) => {
            const next = { ...prev, [field]: val };
            if (field === 'curtainQty' || field === 'curtainRate') {
                const qty = parseNumber(field === 'curtainQty' ? val : prev.curtainQty);
                const rate = parseNumber(field === 'curtainRate' ? val : prev.curtainRate);
                if (qty && rate) {
                    next.curtainAmount = `${formatIndianNumber(qty * rate)}/-`;
                }
            }
            if (field === 'blackoutQty' || field === 'blackoutRate') {
                const qty = parseNumber(field === 'blackoutQty' ? val : prev.blackoutQty);
                const rate = parseNumber(field === 'blackoutRate' ? val : prev.blackoutRate);
                if (qty && rate) {
                    next.blackoutAmount = `${formatIndianNumber(qty * rate)}/-`;
                }
            }
            if (field === 'stitchingCurtainMft' || field === 'stitchingRateCurtain') {
                const qty = parseNumber(field === 'stitchingCurtainMft' ? val : prev.stitchingCurtainMft);
                const rate = parseNumber(field === 'stitchingRateCurtain' ? val : prev.stitchingRateCurtain);
                if (qty && rate) {
                    next.stitchingAmountCurtain = `${formatIndianNumber(qty * rate)}/-`;
                }
            }
            if (field === 'stitchingLeadMft' || field === 'stitchingRateLead') {
                const qty = parseNumber(field === 'stitchingLeadMft' ? val : prev.stitchingLeadMft);
                const rate = parseNumber(field === 'stitchingRateLead' ? val : prev.stitchingRateLead);
                if (qty && rate) {
                    next.stitchingAmountLead = `${formatIndianNumber(qty * rate)}/-`;
                }
            }

            const amt1 = parseNumber(next.curtainAmount);
            const amt2 = parseNumber(next.blackoutAmount);
            const amt3 = parseNumber(next.stitchingAmountCurtain);
            const amt4 = parseNumber(next.stitchingAmountLead);
            const calcTotal = amt1 + amt2 + amt3 + amt4;
            if (calcTotal > 0 && field !== 'total') {
                next.total = `${formatIndianNumber(calcTotal)}/-`;
            }
            return next;
        });
    };

    const updateOpt2 = (field, val) => {
        setOpt2((prev) => {
            const next = { ...prev, [field]: val };
            if (field === 'curtainQty' || field === 'curtainRate') {
                const qty = parseNumber(field === 'curtainQty' ? val : prev.curtainQty);
                const rate = parseNumber(field === 'curtainRate' ? val : prev.curtainRate);
                if (qty && rate) {
                    next.curtainAmount = `${formatIndianNumber(qty * rate)}/-`;
                }
            }
            if (field === 'blackoutQty' || field === 'blackoutRate') {
                const qty = parseNumber(field === 'blackoutQty' ? val : prev.blackoutQty);
                const rate = parseNumber(field === 'blackoutRate' ? val : prev.blackoutRate);
                if (qty && rate) {
                    next.blackoutAmount = `${formatIndianNumber(qty * rate)}/-`;
                }
            }
            if (field === 'stitchingCurtainMft' || field === 'stitchingRateCurtain') {
                const qty = parseNumber(field === 'stitchingCurtainMft' ? val : prev.stitchingCurtainMft);
                const rate = parseNumber(field === 'stitchingRateCurtain' ? val : prev.stitchingRateCurtain);
                if (qty && rate) {
                    next.stitchingAmountCurtain = `${formatIndianNumber(qty * rate)}/-`;
                }
            }
            if (field === 'stitchingLeadMft' || field === 'stitchingRateLead') {
                const qty = parseNumber(field === 'stitchingLeadMft' ? val : prev.stitchingLeadMft);
                const rate = parseNumber(field === 'stitchingRateLead' ? val : prev.stitchingRateLead);
                if (qty && rate) {
                    next.stitchingAmountLead = `${formatIndianNumber(qty * rate)}/-`;
                }
            }

            const amt1 = parseNumber(next.curtainAmount);
            const amt2 = parseNumber(next.blackoutAmount);
            const amt3 = parseNumber(next.stitchingAmountCurtain);
            const amt4 = parseNumber(next.stitchingAmountLead);
            const calcTotal = amt1 + amt2 + amt3 + amt4;
            if (calcTotal > 0 && field !== 'total') {
                next.total = `${formatIndianNumber(calcTotal)}/-`;
            }
            return next;
        });
    };

    const { execute, pending } = useAction(
        (payload) => leadsApi.update(item._id || item.id, { proposal: payload }),
        {
            onSuccess: () => {
                onDone();
                onClose();
            },
        }
    );

    const handleSave = () => {
        const letterData = {
            date: dateVal,
            clientName,
            rooms,
            opt1,
            opt2,
            depositAmount
        };
        execute({
            ...prop,
            date: dateVal,
            clientName,
            pricingRange: `₹${opt1.total} - ₹${opt2.total}`,
            letterData
        });
    };

    const roomPairs = useMemo(() => {
        const pairs = [];
        for (let i = 0; i < rooms.length; i += 2) {
            const left = rooms[i] ? { ...rooms[i], srNo: `${i + 1}.`, originalIdx: i } : null;
            const right = rooms[i + 1] ? { ...rooms[i + 1], srNo: `${i + 2}.`, originalIdx: i + 1 } : null;
            pairs.push({ left, right, leftIndex: i, rightIndex: i + 1 });
        }
        return pairs;
    }, [rooms]);

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Proposal Editor & Live Preview — ${clientName || item?.code}`}
            subtitle="Make edits on the left panel and view real-time document changes on the right."
            size="full"
            footer={
                <div className="flex items-center justify-between w-full no-print">
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
                            Print / Download PDF
                        </Button>
                        <Button variant="ghost" icon={RotateCcw} onClick={handleReset}>
                            Reset Defaults
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button icon={Send} loading={pending} onClick={handleSave}>
                            Save Proposal
                        </Button>
                    </div>
                </div>
            }
        >
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 12mm 15mm;
                    }

                    html, body, #root {
                        height: auto !important;
                        min-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                    }

                    div, section, main, article {
                        max-height: none !important;
                        height: auto !important;
                        overflow: visible !important;
                    }

                    .fixed, [role="dialog"], .panel, [class*="max-h-"], [class*="overflow-"] {
                        position: static !important;
                        display: block !important;
                        flex: none !important;
                        align-items: stretch !important;
                        justify-content: flex-start !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: transparent !important;
                        max-width: none !important;
                        max-height: none !important;
                        width: 100% !important;
                    }

                    body * {
                        visibility: hidden !important;
                    }

                    .no-print,
                    header,
                    nav,
                    aside,
                    button,
                    [class*="backdrop"] {
                        display: none !important;
                    }

                    .proposal-letter-document,
                    .proposal-letter-document * {
                        visibility: visible !important;
                    }

                    .proposal-letter-document {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                    }

                    .page-break {
                        page-break-before: always !important;
                        break-before: page !important;
                        margin-top: 0 !important;
                        padding-top: 20px !important;
                    }
                }
            `}</style>

            <div className="flex flex-col lg:flex-row gap-6 h-full max-h-[82vh] overflow-hidden">
                {/* LEFT EDIT PANEL */}
                <div className="w-full lg:w-5/12 xl:w-4/12 space-y-4 overflow-y-auto pr-2 no-print shrink-0">
                    {/* General Details */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-brand-500" /> Letter Details
                        </h4>
                        <div className="space-y-3">
                            <Field label="Client Name">
                                <Input
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="e.g. Mr. Rakesh Jain"
                                />
                            </Field>
                            <Field label="Proposal Date">
                                <Input
                                    value={dateVal}
                                    onChange={(e) => setDateVal(e.target.value)}
                                    placeholder="e.g. 10.11.2025"
                                />
                            </Field>
                        </div>
                    </div>

                    {/* Rooms List */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-purple-500" /> Rooms ({rooms.length})
                            </h4>
                            <Button size="sm" variant="ghost" icon={Plus} onClick={handleAddRoom}>
                                Add Room
                            </Button>
                        </div>
                        <div ref={roomListContainerRef} className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                            {rooms.map((room, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-lg border transition-all duration-300 ${newlyAddedIdx === idx
                                            ? 'border-purple-500 ring-2 ring-purple-500/30 dark:ring-purple-400/40 bg-purple-50/40 dark:bg-purple-950/20'
                                            : 'border-slate-200/60 dark:border-slate-700/60'
                                        }`}
                                >
                                    <input
                                        type="text"
                                        value={room.srNo}
                                        onChange={(e) => updateRoom(idx, 'srNo', e.target.value)}
                                        className="w-10 text-xs font-bold text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-1"
                                    />
                                    <input
                                        ref={(el) => (roomInputsRef.current[idx] = el)}
                                        type="text"
                                        value={room.area}
                                        onChange={(e) => updateRoom(idx, 'area', e.target.value)}
                                        className="flex-1 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                        placeholder="Area name..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveRoom(idx)}
                                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                                        title="Remove Room"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}

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
                    </div>

                    {/* Option 1 Commercials */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                            <Tag className="w-4 h-4" /> Option - 1 Commercials
                        </h4>
                        <div className="space-y-2.5 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                                <Field label="Curtain Main Qty">
                                    <Input value={opt1.curtainQty} onChange={(e) => updateOpt1('curtainQty', e.target.value)} className="text-xs" />
                                </Field>
                                <Field label="Curtain Main Rate">
                                    <Input value={opt1.curtainRate} onChange={(e) => updateOpt1('curtainRate', e.target.value)} className="text-xs" />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Field label="Blackout Qty">
                                    <Input value={opt1.blackoutQty} onChange={(e) => updateOpt1('blackoutQty', e.target.value)} className="text-xs" />
                                </Field>
                                <Field label="Blackout Rate">
                                    <Input value={opt1.blackoutRate} onChange={(e) => updateOpt1('blackoutRate', e.target.value)} className="text-xs" />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Field label="Stitching Rate (Curtain)">
                                    <Input value={opt1.stitchingRateCurtain} onChange={(e) => updateOpt1('stitchingRateCurtain', e.target.value)} className="text-xs" />
                                </Field>
                                <Field label="Stitching Rate (Lead)">
                                    <Input value={opt1.stitchingRateLead} onChange={(e) => updateOpt1('stitchingRateLead', e.target.value)} className="text-xs" />
                                </Field>
                            </div>
                            <Field label="Option 1 Total (Rs.)">
                                <Input value={opt1.total} onChange={(e) => updateOpt1('total', e.target.value)} className="text-xs font-bold" />
                            </Field>
                        </div>
                    </div>

                    {/* Option 2 Commercials */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                            <Tag className="w-4 h-4" /> Option - 2 Commercials
                        </h4>
                        <div className="space-y-2.5 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                                <Field label="Curtain Main Qty">
                                    <Input value={opt2.curtainQty} onChange={(e) => updateOpt2('curtainQty', e.target.value)} className="text-xs" />
                                </Field>
                                <Field label="Curtain Main Rate">
                                    <Input value={opt2.curtainRate} onChange={(e) => updateOpt2('curtainRate', e.target.value)} className="text-xs" />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Field label="Blackout Qty">
                                    <Input value={opt2.blackoutQty} onChange={(e) => updateOpt2('blackoutQty', e.target.value)} className="text-xs" />
                                </Field>
                                <Field label="Blackout Rate">
                                    <Input value={opt2.blackoutRate} onChange={(e) => updateOpt2('blackoutRate', e.target.value)} className="text-xs" />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Field label="Stitching Rate (Curtain)">
                                    <Input value={opt2.stitchingRateCurtain} onChange={(e) => updateOpt2('stitchingRateCurtain', e.target.value)} className="text-xs" />
                                </Field>
                                <Field label="Stitching Rate (Lead)">
                                    <Input value={opt2.stitchingRateLead} onChange={(e) => updateOpt2('stitchingRateLead', e.target.value)} className="text-xs" />
                                </Field>
                            </div>
                            <Field label="Option 2 Total (Rs.)">
                                <Input value={opt2.total} onChange={(e) => updateOpt2('total', e.target.value)} className="text-xs font-bold" />
                            </Field>
                        </div>
                    </div>

                    {/* Deposit */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-amber-500" /> Deposit Amount
                        </h4>
                        <Field label="Deposit Required (Rs.)">
                            <Input
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                placeholder="e.g. 4,00,000"
                                className="font-bold text-xs"
                            />
                        </Field>
                    </div>
                </div>

                {/* RIGHT LIVE PREVIEW PANEL */}
                <div className="w-full lg:w-7/12 xl:w-8/12 bg-slate-200/60 dark:bg-slate-950 p-4 sm:p-6 overflow-y-auto rounded-xl border border-slate-300 dark:border-slate-800 flex justify-center items-start flex-1">
                    <div className="proposal-letter-document bg-white text-black font-serif p-8 sm:p-12 shadow-xl w-full max-w-3xl space-y-10 border border-slate-300 rounded-sm min-h-full h-auto">
                        {/* PAGE 1 */}
                        <div className="space-y-6">
                            {/* Header: Logo & Date */}
                            <div className="flex items-start justify-between border-b border-transparent pb-4">
                                <div className="flex flex-col">
                                    <span className="font-serif text-3xl font-normal tracking-wide text-black lowercase">
                                        embellish
                                    </span>
                                    <span className="font-serif text-[11px] tracking-wider text-black font-medium mt-0.5">
                                        Punctuating Spaces <span className="text-black">•</span>
                                    </span>
                                </div>

                                <div className="text-right pt-2 font-serif font-bold text-sm text-black border-b border-black">
                                    {dateVal}
                                </div>
                            </div>

                            {/* Salutation */}
                            <div className="space-y-1 pt-2 font-serif text-sm text-black">
                                <p className="font-medium">To,</p>
                                <p className="font-bold border-b border-slate-300 inline-block min-w-[200px]">{clientName}</p>
                            </div>

                            {/* Body Paragraphs */}
                            <div className="space-y-3 font-serif text-xs text-black leading-relaxed">
                                <p>
                                    Embellish Studio is delighted to have the opportunity to respond to your requirement for custom designed curtains that will add great value to your fabulously designed residence.
                                </p>
                                <p>
                                    The accompanying proposal provides tentative ideas and budgets in response to all of the requirements which would enable us to provide you with exclusively custom designed curtains for your residence.
                                </p>
                                <p>
                                    Until we meet next time to present the main points of the proposal to you in person, here is a quick overview of the proposal's content:
                                </p>
                            </div>

                            {/* Section Header */}
                            <div className="pt-2">
                                <h4 className="font-serif text-xs font-bold underline text-black flex items-center justify-between">
                                    <span>Rooms which require custom design curtains</span>
                                </h4>
                            </div>

                            {/* Table 1: Rooms Table */}
                            <div ref={roomTableRef} className="transition-all duration-300">
                                <table className="w-full border-collapse border border-black font-serif text-xs">
                                    <thead>
                                        <tr className="border-b border-black text-left font-bold bg-slate-50/50">
                                            <th className="border-r border-black p-1.5 w-16 text-center">Sr. No.</th>
                                            <th className="border-r border-black p-1.5 w-1/2">Areas</th>
                                            <th className="border-r border-black p-1.5 w-16 text-center">Sr. No.</th>
                                            <th className="p-1.5 w-1/2">Areas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roomPairs.length === 0 ? (
                                            <tr className="border-b border-black">
                                                <td colSpan={4} className="p-3 text-center text-slate-500 italic">
                                                    No rooms added yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            roomPairs.map((pair, idx) => {
                                                const isLeftNew = pair.left && pair.leftIndex === newlyAddedIdx;
                                                const isRightNew = pair.right && pair.rightIndex === newlyAddedIdx;
                                                return (
                                                    <tr key={idx} className="border-b border-black">
                                                        <td className={`border-r border-black p-1 text-center font-bold transition-colors duration-500 ${isLeftNew ? 'bg-amber-200 text-amber-950 font-extrabold' : ''}`}>
                                                            {pair.left ? pair.left.srNo : ''}
                                                        </td>
                                                        <td className={`border-r border-black p-1 font-semibold transition-colors duration-500 ${isLeftNew ? 'bg-amber-200 text-amber-950 font-extrabold' : ''}`}>
                                                            {pair.left ? (pair.left.area || <span className="text-slate-400 italic font-normal">Unassigned Area</span>) : ''}
                                                        </td>
                                                        <td className={`border-r border-black p-1 text-center font-bold transition-colors duration-500 ${isRightNew ? 'bg-amber-200 text-amber-950 font-extrabold' : ''}`}>
                                                            {pair.right ? pair.right.srNo : ''}
                                                        </td>
                                                        <td className={`p-1 font-semibold transition-colors duration-500 ${isRightNew ? 'bg-amber-200 text-amber-950 font-extrabold' : ''}`}>
                                                            {pair.right ? (pair.right.area || <span className="text-slate-400 italic font-normal">Unassigned Area</span>) : ''}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paragraphs under Table 1 */}
                            <div className="space-y-3 font-serif text-xs text-black leading-relaxed pt-2">
                                <p>
                                    The quantities are just indicative, final consumption can only be derived once we have the designs finalised for individual rooms.
                                </p>
                                <p>
                                    To be able to start custom designing curtains for the rooms we need to have an idea of an approximate budget. This enables us to design accordingly and saves time, energy and resources. The budget is derived through calculating the meter/sqft quantity of the fabrics required as per the sizes of the window, which have provided.
                                </p>
                            </div>
                        </div>

                        {/* PAGE BREAK FOR PRINTING */}
                        <div className="page-break border-t border-slate-200 dark:border-slate-800 pt-10 space-y-6">
                            {/* Header: Logo Page 2 */}
                            <div className="flex items-start justify-between pb-2">
                                <div className="flex flex-col">
                                    <span className="font-serif text-3xl font-normal tracking-wide text-black lowercase">
                                        embellish
                                    </span>
                                    <span className="font-serif text-[11px] tracking-wider text-black font-medium mt-0.5">
                                        Punctuating Spaces <span className="text-black">•</span>
                                    </span>
                                </div>
                            </div>

                            {/* OPTION - 1 */}
                            <div className="space-y-2">
                                <h4 className="font-serif text-xs font-bold text-black">
                                    Option - 1
                                </h4>

                                <table className="w-full border-collapse border border-black font-serif text-xs">
                                    <thead>
                                        <tr className="border-b border-black text-center font-bold">
                                            <th rowSpan={2} className="border-r border-black p-1 text-left w-1/3">Type</th>
                                            <th colSpan={2} className="border-r border-black p-1">Fabric Qty</th>
                                            <th rowSpan={2} className="border-r border-black p-1 w-24">Rate</th>
                                            <th rowSpan={2} className="p-1 w-32">Amount<br />(Rs.)</th>
                                        </tr>
                                        <tr className="border-b border-black text-center font-bold">
                                            <th className="border-r border-black p-1 w-16">Mtr</th>
                                            <th className="border-r border-black p-1">Sqft/Rnft</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-black">
                                            <td className="border-r border-black p-1 font-semibold">Curtain – Main / sheer</td>
                                            <td className="border-r border-black p-1 text-center font-semibold">Mtrs</td>
                                            <td className="border-r border-black p-1 text-center font-bold">{opt1.curtainQty}</td>
                                            <td className="border-r border-black p-1 text-right font-bold">{opt1.curtainRate}</td>
                                            <td className="p-1 text-right font-bold">{opt1.curtainAmount}</td>
                                        </tr>

                                        <tr className="border-b border-black">
                                            <td className="border-r border-black p-1 font-semibold">Blackout Fabric</td>
                                            <td className="border-r border-black p-1 text-center font-semibold">mtrs</td>
                                            <td className="border-r border-black p-1 text-center font-bold">{opt1.blackoutQty}</td>
                                            <td className="border-r border-black p-1 text-right font-bold">{opt1.blackoutRate}</td>
                                            <td className="p-1 text-right font-bold">{opt1.blackoutAmount}</td>
                                        </tr>

                                        <tr className="border-b border-black">
                                            <td className="border-r border-black p-1 font-semibold align-top">Stitching, lead bands</td>
                                            <td className="border-r border-black p-1 text-center font-semibold align-top">
                                                Rnft<br />rnft
                                            </td>
                                            <td className="border-r border-black p-1 text-center font-bold align-top space-y-1">
                                                <div>Curtain – {opt1.stitchingCurtainMft} mft</div>
                                                <div>Lead bands – {opt1.stitchingLeadMft} mft</div>
                                            </td>
                                            <td className="border-r border-black p-1 text-right font-bold align-top space-y-1">
                                                <div>{opt1.stitchingRateCurtain}</div>
                                                <div>{opt1.stitchingRateLead}</div>
                                            </td>
                                            <td className="p-1 text-right font-bold align-top space-y-1">
                                                <div>{opt1.stitchingAmountCurtain}</div>
                                                <div>{opt1.stitchingAmountLead}</div>
                                            </td>
                                        </tr>

                                        <tr className="border-b border-black h-4">
                                            <td className="border-r border-black"></td>
                                            <td className="border-r border-black"></td>
                                            <td className="border-r border-black"></td>
                                            <td className="border-r border-black"></td>
                                            <td></td>
                                        </tr>

                                        <tr className="font-bold">
                                            <td className="border-r border-black p-1 text-left">Total</td>
                                            <td className="border-r border-black p-1"></td>
                                            <td className="border-r border-black p-1"></td>
                                            <td className="border-r border-black p-1"></td>
                                            <td className="p-1 text-right">{opt1.total}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* OPTION - 2 */}
                            <div className="space-y-2 pt-2">
                                <h4 className="font-serif text-xs font-bold text-black">
                                    Option - 2
                                </h4>

                                <table className="w-full border-collapse border border-black font-serif text-xs">
                                    <thead>
                                        <tr className="border-b border-black text-center font-bold">
                                            <th rowSpan={2} className="border-r border-black p-1 text-left w-1/3">Type</th>
                                            <th colSpan={2} className="border-r border-black p-1">Fabric Qty</th>
                                            <th rowSpan={2} className="border-r border-black p-1 w-24">Rate</th>
                                            <th rowSpan={2} className="p-1 w-32">Amount<br />(Rs.)</th>
                                        </tr>
                                        <tr className="border-b border-black text-center font-bold">
                                            <th className="border-r border-black p-1 w-16">Mtr</th>
                                            <th className="border-r border-black p-1">Sqft/Rnft</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-black">
                                            <td className="border-r border-black p-1 font-semibold">Curtain – Main / sheer</td>
                                            <td className="border-r border-black p-1 text-center font-semibold">Mtrs</td>
                                            <td className="border-r border-black p-1 text-center font-bold">{opt2.curtainQty}</td>
                                            <td className="border-r border-black p-1 text-right font-bold">{opt2.curtainRate}</td>
                                            <td className="p-1 text-right font-bold">{opt2.curtainAmount}</td>
                                        </tr>

                                        <tr className="border-b border-black">
                                            <td className="border-r border-black p-1 font-semibold">Blackout Fabric</td>
                                            <td className="border-r border-black p-1 text-center font-semibold">mtrs</td>
                                            <td className="border-r border-black p-1 text-center font-bold">{opt2.blackoutQty}</td>
                                            <td className="border-r border-black p-1 text-right font-bold">{opt2.blackoutRate}</td>
                                            <td className="p-1 text-right font-bold">{opt2.blackoutAmount}</td>
                                        </tr>

                                        <tr className="border-b border-black">
                                            <td className="border-r border-black p-1 font-semibold align-top">Stitching, lead bands</td>
                                            <td className="border-r border-black p-1 text-center font-semibold align-top">
                                                Rnft<br />rnft
                                            </td>
                                            <td className="border-r border-black p-1 text-center font-bold align-top space-y-1">
                                                <div>Curtain – {opt2.stitchingCurtainMft} mft</div>
                                                <div>Lead bands – {opt2.stitchingLeadMft} mft</div>
                                            </td>
                                            <td className="border-r border-black p-1 text-right font-bold align-top space-y-1">
                                                <div>{opt2.stitchingRateCurtain}</div>
                                                <div>{opt2.stitchingRateLead}</div>
                                            </td>
                                            <td className="p-1 text-right font-bold align-top space-y-1">
                                                <div>{opt2.stitchingAmountCurtain}</div>
                                                <div>{opt2.stitchingAmountLead}</div>
                                            </td>
                                        </tr>

                                        <tr className="border-b border-black h-4">
                                            <td className="border-r border-black"></td>
                                            <td className="border-r border-black"></td>
                                            <td className="border-r border-black"></td>
                                            <td className="border-r border-black"></td>
                                            <td></td>
                                        </tr>

                                        <tr className="font-bold">
                                            <td className="border-r border-black p-1 text-left">Total</td>
                                            <td className="border-r border-black p-1"></td>
                                            <td className="border-r border-black p-1"></td>
                                            <td className="border-r border-black p-1"></td>
                                            <td className="p-1 text-right">{opt2.total}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Note */}
                            <p className="font-serif text-xs font-bold italic text-black pt-1">
                                Note: GST, Transportation & Installation charges Not Included
                            </p>

                            {/* Design Paragraph */}
                            <div className="font-serif text-xs leading-relaxed text-black pt-1 space-y-1">
                                <p className="font-bold">Design:</p>
                                <p>
                                    Since we design our custom made curtains we need to go through a rigorous exercise of the conceptualization, mood boards, samplings and the other forms of presentation. This will give you a visual idea of how your drapes will look after installation and what embellishments will be used to achieve the world class look. In order for us to begin the designing process we would kindly request you to release a deposit of Rs.{' '}
                                    <span className="font-bold border-b border-black px-1 text-center inline-block">{depositAmount}/-</span>
                                    {' '}which will be adjusted towards your final billing.
                                </p>
                            </div>

                            {/* Closing & Signoff */}
                            <div className="font-serif text-xs leading-relaxed text-black pt-3 space-y-3">
                                <p>
                                    We hope you find the above in order, looking forward to work on this project with you. Thanking you in anticipation.
                                </p>
                                <p>
                                    For any clarification or discussion on the proposal letter, please get in touch with us.
                                </p>
                                <div className="pt-2 space-y-0.5">
                                    <p className="font-medium">Kind Regards,</p>
                                    <br />
                                    <p className="font-semibold">Arisha Arisha</p>
                                    <p>E : <a href="mailto:arisha@embelliish.com" className="underline">arisha@embelliish.com</a></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
          
        </Modal>
    );
};

const ProposalCreation = ({ items: itemsProp = [] }) => {
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

    const eligibleProposalLeads = rawLeads.filter((lead) => {
        const p = lead.proposal;
        const hasProposalData = Boolean(
            p?.noVersion ||
            p?.date ||
            p?.dueDate ||
            (p?.approvalStatus && p?.approvalStatus !== 'PENDING') ||
            p?.selectedBoqVersion ||
            (Array.isArray(p?.consumptionSheet) && p.consumptionSheet.length > 0) ||
            p?.clientBrief ||
            p?.minPricing ||
            p?.maxPricing
        );
        if (hasProposalData) return true;

        const hasStudioCompleted = Boolean(
            lead.studioMeeting?.date ||
            lead.studioMeeting?.feedback ||
            lead.studioMeeting?.nextAction ||
            lead.studioMeeting?.attendees ||
            lead.studioMeeting?.pricingRange
        );

        const hasBoqOrReadySize = Boolean(
            lead.consumption?.boqVersion ||
            lead.consumption?.fabricDesignSelection ||
            lead.readySize?.confirmationDate ||
            lead.readySize?.confirmedBy ||
            lead.readySize?.readyHeight ||
            lead.readySize?.status === 'Confirmed'
        );

        return hasStudioCompleted || hasBoqOrReadySize;
    });

    const filteredLeads = eligibleProposalLeads.filter((lead) => {
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

    const totalCount = eligibleProposalLeads.length;
    const generatedProposals = eligibleProposalLeads.filter((l) => Boolean(l.proposal?.noVersion || l.proposal?.date)).length;
    const approvedProposals = eligibleProposalLeads.filter((l) => l.proposal?.approvalStatus === 'APPROVED').length;
    const masterTermsSynced = eligibleProposalLeads.filter((l) => Boolean(l.proposal?.terms && l.proposal?.refundRevisionClause)).length;

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

                    <ViewSwitcher view={viewMode} onViewChange={setViewMode} />

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
            ) : viewMode === 'cards' ? (
                <CardGridView
                    items={filteredLeads}
                    renderCard={(lead) => (
                        <SalesStageCard
                            lead={lead}
                            stageKey="proposal"
                            onView={handleViewLead}
                            onEdit={(l) => setEditingLead(l)}
                            onRowClick={(l) => setDrawerLead(l)}
                        />
                    )}
                    empty={
                        <Panel className="p-8 text-center">
                            <EmptyState icon={FileText} title="No Proposal Records Found" hint="Try adjusting search parameters." />
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
                    onSectionChange={(sec) => updateParam('section', sec, 's8')}
                />
            )}

            {editingLead && (
                <ProposalLetterModal
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
                pageName={SPREADSHEET_SECTIONS[0].title}
                pageFields={SPREADSHEET_SECTIONS[0].cols}
            />
        </div>
    );
};

export default ProposalCreation;
