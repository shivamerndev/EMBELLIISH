import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, Users, Calendar, Sparkles, Paperclip, CheckCircle2, Pen, Upload, Loader2,
    Trash2, ExternalLink, Image as ImageIcon, FileText, Link as LinkIcon, Plus, X, AlertTriangle, Check, Tag,
    Layers, Home, Copy
} from 'lucide-react';
import { date, getMediaUrl } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field, DelayBadge, ViewSwitcher } from '../../components/ui';
import useViewMode from '../../hooks/useViewMode';
import CardGridView from '../../components/common/CardGridView';
import SalesStageCard from '../../components/cards/SalesStageCard';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi, uploadApi, fabricsApi } from '../../api';
import { useAction } from '../../hooks/useAsync';
import DetailedDrawer from '../../components/sales/DetailedDrawer';

const SPREADSHEET_SECTIONS = [
    {
        id: 's5',
        title: 'Studio Meeting',
        color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/90 dark:text-purple-200 dark:border-purple-700/80',
        // All fields : shown in DetailedDrawer
        cols: [
            { key: 'studioMeeting.dueDate', label: 'Studio Meeting Due Date' },
            { key: 'delayStatus', label: 'Delay / SLA Status' },
            { key: 'studioMeeting.date', label: 'Actual Meeting Date & Time' },
            { key: 'studioMeeting.attendees', label: 'Meeting Attendees' },
            { key: 'studioMeeting.clientDrawings', label: 'Client Drawings' },
            { key: 'studioMeeting.feedback', label: 'Internal Notes' },
            { key: 'studioMeeting.architectBrief', label: 'Architect Brief' },
            { key: 'studioMeeting.samples', label: 'Samples' },
            { key: 'studioMeeting.projectPictures', label: 'Project Pictures' },
        ],
        // Subset shown in table : prevents horizontal scrolling
        tableCols: [
            { key: 'studioMeeting.dueDate', label: 'Due Date' },
            { key: 'delayStatus', label: 'SLA Status' },
            // { key: 'studioMeeting.date', label: 'Meeting Date' },
            { key: 'studioMeeting.attendees', label: 'Meeting Attendees' },
            { key: 'studioMeeting.feedback', label: 'Internal Notes' },
            { key: 'studioMeeting.architectBrief', label: 'External Notes' },
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

const safeParseArray = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'object' && raw !== null) return Object.values(raw).filter(Boolean);
    if (typeof raw === 'string') {
        let current = raw.trim();
        let depth = 0;
        while (typeof current === 'string' && depth < 5) {
            const trimmed = current.trim();
            if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
                try {
                    current = JSON.parse(trimmed);
                    depth++;
                } catch {
                    break;
                }
            } else {
                break;
            }
        }
        if (Array.isArray(current)) return current.filter(Boolean);
        if (typeof current === 'object' && current !== null) return Object.values(current).filter(Boolean);
        if (typeof current === 'string' && current.length > 0) {
            return current.split(',').map((s) => s.trim()).filter(Boolean);
        }
    }
    return [];
};

/** Extracts rooms configured during Pre-Site Visit (`lead.rooms`, `lead.preSiteVisit?.rooms`, etc.) */
const getPreSiteVisitRooms = (lead) => {
    if (!lead) return [];
    // 1. From lead.rooms (primary pre-site visit rooms field saved in PreSiteVisit.jsx)
    const fromRooms = safeParseArray(lead.rooms);
    if (fromRooms.length > 0) {
        return Array.from(new Set(fromRooms.map((r) => (typeof r === 'string' ? r.trim() : String(r?.name || r))).filter(Boolean)));
    }

    // 2. From lead.preSiteVisit?.rooms or lead.preSiteVisit?.roomsSelected or lead.roomsSelected
    const fromPreSite = safeParseArray(lead.preSiteVisit?.rooms || lead.preSiteVisit?.roomsSelected || lead.roomsSelected);
    if (fromPreSite.length > 0) {
        return Array.from(new Set(fromPreSite.map((r) => (typeof r === 'string' ? r.trim() : String(r?.name || r))).filter(Boolean)));
    }

    // 3. Fallback from lead.measurement?.roomList
    const fromMeasurement = safeParseArray(lead.measurement?.roomList);
    if (fromMeasurement.length > 0) {
        return Array.from(new Set(fromMeasurement.map((r) => (typeof r === 'string' ? r.trim() : String(r?.name || r))).filter(Boolean)));
    }

    return [];
};

const parseAttachmentsOrLinks = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === 'object' && parsed !== null) {
            const list = [];
            Object.entries(parsed).forEach(([rm, items]) => {
                const subList = Array.isArray(items) ? items : [items];
                subList.forEach((it) => {
                    if (typeof it === 'string') {
                        list.push({ room: rm, filename: it, url: it, mimetype: 'sample/text' });
                    } else if (it && typeof it === 'object') {
                        list.push({ ...it, room: it.room || rm });
                    }
                });
            });
            return list;
        }
    } catch { }
    if (typeof raw === 'object' && raw !== null) {
        const list = [];
        Object.entries(raw).forEach(([rm, items]) => {
            const subList = Array.isArray(items) ? items : [items];
            subList.forEach((it) => {
                if (typeof it === 'string') {
                    list.push({ room: rm, filename: it, url: it, mimetype: 'sample/text' });
                } else if (it && typeof it === 'object') {
                    list.push({ ...it, room: it.room || rm });
                }
            });
        });
        return list;
    }
    if (typeof raw === 'string' && raw.trim()) {
        return raw.split(',').map((s) => ({
            url: s.trim(),
            filename: s.trim(),
            mimetype: s.includes('http') || s.includes('www.') ? 'link' : 'file'
        }));
    }
    return [];
};

const SPREADSHEET_CELL_RENDERERS = {
    delayStatus: (lead) => (
        <DelayBadge
            dueDate={lead.studioMeeting?.dueDate}
            isCompleted={Boolean(lead.studioMeeting?.date || lead.studioMeeting?.status === 'Completed')}
        />
    ),
    sno: (_, { sno }) => <span className="font-mono text-slate-500 dark:text-slate-400 font-medium">{sno}</span>,
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
    'studioMeeting.dueDate': (lead) => {
        const val = lead.studioMeeting?.dueDate;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const isOverdue = !lead.studioMeeting?.date && new Date(val) < new Date();
        return (
            <div className="flex items-center gap-1 justify-center">
                <span className={`text-[11px] font-mono whitespace-nowrap ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {date(val)}
                </span>
                {isOverdue && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Overdue" />}
            </div>
        );
    },
    'studioMeeting.date': (lead) => {
        const val = lead.studioMeeting?.date;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap justify-center">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                {date(val, { time: true })}
            </span>
        );
    },
    'studioMeeting.attendees': (lead) => {
        const val = lead.studioMeeting?.attendees;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const list = typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : Array.isArray(val) ? val : [];
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-wrap gap-1 max-w-[180px] justify-center" title={list.join(', ')}>
                {list.slice(0, 2).map((item, idx) => (
                    <Badge key={idx} tone="purple" className="text-[10px] max-w-[100px] truncate">
                        {item}
                    </Badge>
                ))}
                {list.length > 2 && <Badge tone="slate" className="text-[9px]">+{list.length - 2}</Badge>}
            </div>
        );
    },
    'studioMeeting.clientDrawings': (lead) => {
        const list = parseAttachmentsOrLinks(lead.studioMeeting?.clientDrawings);
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;

        const roomCounts = {};
        list.forEach((s) => {
            const rm = s.room || 'General';
            roomCounts[rm] = (roomCounts[rm] || 0) + 1;
        });
        const roomKeys = Object.keys(roomCounts);
        const tooltip = roomKeys.map((rm) => `${rm}: ${roomCounts[rm]}`).join(' | ');

        return (
            <div className="flex flex-col items-center gap-0.5 justify-center" title={tooltip}>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-brand-500/10 border border-brand-500/30 text-brand-700 dark:text-brand-400 font-medium whitespace-nowrap">
                    <Paperclip className="w-3 h-3 shrink-0" /> {list.length} file/link(s)
                </span>
                {roomKeys.length > 0 && roomKeys[0] !== 'General' && (
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                        {roomKeys.slice(0, 2).join(', ')}{roomKeys.length > 2 ? ` +${roomKeys.length - 2}` : ''}
                    </span>
                )}
            </div>
        );
    },
    'studioMeeting.feedback': (lead) => {
        const val = lead.studioMeeting?.feedback;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block mx-auto text-xs" title={val}>
                {val}
            </span>
        );
    },
    'studioMeeting.nextAction': (lead) => {
        const val = lead.studioMeeting?.nextAction;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <Badge tone="indigo" className="max-w-[160px] truncate" title={val}>
                {val}
            </Badge>
        );
    },
    'studioMeeting.architectBrief': (lead) => {
        const val = lead.studioMeeting?.architectBrief;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block mx-auto text-xs" title={val}>
                {val}
            </span>
        );
    },
    'studioMeeting.samples': (lead) => {
        const val = lead.studioMeeting?.samples;
        const list = parseAttachmentsOrLinks(val);
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;

        const roomCounts = {};
        list.forEach((s) => {
            const rm = s.room || 'General';
            roomCounts[rm] = (roomCounts[rm] || 0) + 1;
        });
        const roomKeys = Object.keys(roomCounts);
        const tooltip = roomKeys.map((rm) => `${rm}: ${roomCounts[rm]}`).join(' | ');

        return (
            <div className="flex flex-col items-center gap-0.5 justify-center" title={tooltip}>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-medium whitespace-nowrap">
                    <Sparkles className="w-3 h-3 shrink-0" /> {list.length} item(s)
                </span>
                {roomKeys.length > 0 && roomKeys[0] !== 'General' && (
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                        {roomKeys.slice(0, 2).join(', ')}{roomKeys.length > 2 ? ` +${roomKeys.length - 2}` : ''}
                    </span>
                )}
            </div>
        );
    },
    'studioMeeting.projectPictures': (lead) => {
        const list = parseAttachmentsOrLinks(lead.studioMeeting?.projectPictures);
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;

        const roomCounts = {};
        list.forEach((s) => {
            const rm = s.room || 'General';
            roomCounts[rm] = (roomCounts[rm] || 0) + 1;
        });
        const roomKeys = Object.keys(roomCounts);
        const tooltip = roomKeys.map((rm) => `${rm}: ${roomCounts[rm]}`).join(' | ');

        return (
            <div className="flex flex-col items-center gap-0.5 justify-center" title={tooltip}>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium whitespace-nowrap">
                    <ImageIcon className="w-3 h-3 shrink-0" /> {list.length} image(s)
                </span>
                {roomKeys.length > 0 && roomKeys[0] !== 'General' && (
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                        {roomKeys.slice(0, 2).join(', ')}{roomKeys.length > 2 ? ` +${roomKeys.length - 2}` : ''}
                    </span>
                )}
            </div>
        );
    },
    'studioMeeting.pricingRange': (lead) => {
        const val = lead.studioMeeting?.pricingRange;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                {val}
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

    return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block mx-auto text-xs" title={String(raw)}>{String(raw)}</span>;
};

/* ------------------------------------------------------------- File & Link Uploader Component */
const AttachmentAndLinkUploader = ({ label, allowLinks = true, allowImagesOnly = false, attachments = [], onUpdate, idPrefix }) => {
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

            const formattedAttachments = uploadedFiles.map((file) => ({
                url: file.url,
                filename: file.filename || file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                uploadedAt: file.uploadedAt || new Date().toISOString(),
                storage: file.storage || 's3',
            }));

            onUpdate([...attachments, ...formattedAttachments]);
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

    const handleRemove = (indexToRemove) => {
        onUpdate(attachments.filter((_, idx) => idx !== indexToRemove));
    };

    return (
        <div className="space-y-2.5 p-3.5 bg-stone-50/50 dark:bg-stone-900/40 border border-brand-200/60 dark:border-brand-900/40 rounded-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-semibold text-slate-800 dark:text-stone-200 flex items-center gap-1.5">
                    {allowImagesOnly ? (
                        <ImageIcon className="w-4 h-4 text-emerald-500" />
                    ) : (
                        <Paperclip className="w-4 h-4 text-brand-500" />
                    )}
                    <span>{label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-100/80 dark:bg-brand-950 text-brand-800 dark:text-brand-300 font-bold border border-brand-200/60 dark:border-brand-800/60">
                        {attachments.length}
                    </span>
                </label>
                <div className="flex items-center gap-1.5">
                    {allowLinks && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            icon={LinkIcon}
                            onClick={() => setShowLinkInput(!showLinkInput)}
                            className="text-xs"
                        >
                            {showLinkInput ? 'Close Link' : 'Add Link'}
                        </Button>
                    )}
                    <label
                        htmlFor={`file-upload-${idPrefix}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white cursor-pointer transition-all shadow-xs ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-3.5 h-3.5" />
                                <span>{allowImagesOnly ? 'Upload Photos' : 'Upload Files'}</span>
                            </>
                        )}
                    </label>
                    <input
                        id={`file-upload-${idPrefix}`}
                        type="file"
                        multiple
                        accept={allowImagesOnly ? 'image/*' : 'image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx'}
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                </div>
            </div>

            {showLinkInput && allowLinks && (
                <div className="p-3 bg-white dark:bg-stone-900 border border-brand-200/80 dark:border-brand-800/80 rounded-xl space-y-2 shadow-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                            size="sm"
                            placeholder="Link Title (e.g. Google Drive, Figma, Render)"
                            value={linkTitle}
                            onChange={(e) => setLinkTitle(e.target.value)}
                        />
                        <Input
                            size="sm"
                            placeholder="https://drive.google.com/..."
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" type="button" onClick={() => setShowLinkInput(false)}>Cancel</Button>
                        <Button size="sm" variant="secondary" type="button" icon={Plus} onClick={handleAddLink}>Attach Link</Button>
                    </div>
                </div>
            )}

            {uploadError && (
                <div className="p-2 text-[11px] bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-md">
                    {uploadError}
                </div>
            )}

            {attachments.length === 0 ? (
                <p className="text-[11px] text-slate-400 dark:text-stone-500 italic py-1">No {label.toLowerCase()} added yet.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                    {attachments.map((att, i) => {
                        const isLink = att.isLink || att.mimetype === 'link/url' || (att.url && (att.url.startsWith('http') || att.url.startsWith('www')));
                        const mediaUrl = isLink ? att.url : getMediaUrl(att.url);
                        const isImage = !isLink && (att.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.filename || att.url || ''));

                        return (
                            <div
                                key={i}
                                className="flex items-center justify-between p-2.5 bg-white dark:bg-stone-900 border border-slate-200/80 dark:border-stone-800 rounded-lg group hover:border-brand-400 dark:hover:border-brand-600 transition-all text-xs shadow-2xs"
                            >
                                <div className="flex items-center gap-2 overflow-hidden mr-1 min-w-0">
                                    {isLink ? (
                                        <div className="w-6 h-6 rounded-md bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center shrink-0">
                                            <LinkIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                    ) : isImage ? (
                                        <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                                            <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-md bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center shrink-0">
                                            <FileText className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                                        </div>
                                    )}
                                    <a
                                        href={mediaUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] font-medium text-slate-800 dark:text-stone-200 hover:text-brand-600 dark:hover:text-brand-400 truncate"
                                        title={att.filename || `Item ${i + 1}`}
                                    >
                                        {att.filename || `Item ${i + 1}`}
                                    </a>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <a
                                        href={mediaUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition"
                                        title="View/Open"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(i)}
                                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ------------------------------------------------------------- Edit Studio Meeting Modal */
const EditStudioMeetingModal = ({ item, onClose, onDone, fabricsList = [] }) => {
    const isMeetingInitiallyPlanned = Boolean(item?.studioMeeting?.dueDate);

    // Initial Attendees parse
    const initialAttendees = (() => {
        const raw = item?.studioMeeting?.attendees;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
    })();

    const [isPlanned, setIsPlanned] = useState(isMeetingInitiallyPlanned || true);
    const [dueDate, setDueDate] = useState(item?.studioMeeting?.dueDate ? new Date(item.studioMeeting.dueDate).toISOString().slice(0, 10) : '');
    const [actualDate, setActualDate] = useState(item?.studioMeeting?.date ? new Date(item.studioMeeting.date).toISOString().slice(0, 16) : '');
    const [attendees, setAttendees] = useState(initialAttendees);
    const [customAttendeeInput, setCustomAttendeeInput] = useState('');

    const [feedback, setFeedback] = useState(item?.studioMeeting?.feedback || '');
    const [architectBrief, setArchitectBrief] = useState(item?.studioMeeting?.architectBrief || '');

    // Extract Rooms selected at Pre-Site Visit
    const preSiteRooms = useMemo(() => getPreSiteVisitRooms(item), [item]);

    // Initial Rooms list: Pre-Site Visit rooms + any rooms already in existing samples, drawings, or pictures
    const initialRoomsList = useMemo(() => {
        const existingSampleRooms = (parseAttachmentsOrLinks(item?.studioMeeting?.samples) || [])
            .map((s) => s?.room)
            .filter(Boolean);
        const existingDrawingRooms = (parseAttachmentsOrLinks(item?.studioMeeting?.clientDrawings) || [])
            .map((d) => d?.room)
            .filter(Boolean);
        const existingPicRooms = (parseAttachmentsOrLinks(item?.studioMeeting?.projectPictures) || [])
            .map((p) => p?.room)
            .filter(Boolean);
        const combined = Array.from(new Set([
            ...preSiteRooms,
            ...existingSampleRooms,
            ...existingDrawingRooms,
            ...existingPicRooms
        ]));
        if (combined.length > 0) return combined;
        return ['Living Room', 'Master Bedroom'];
    }, [preSiteRooms, item]);

    const [roomsList, setRoomsList] = useState(initialRoomsList);
    const [activeRoom, setActiveRoom] = useState(initialRoomsList[0] || 'Living Room');
    const [customRoomInput, setCustomRoomInput] = useState('');
    const [showAddRoomInput, setShowAddRoomInput] = useState(false);
    const [copySourceRoom, setCopySourceRoom] = useState('');
    const [copyTargetRoom, setCopyTargetRoom] = useState('');
    const [showCopySection, setShowCopySection] = useState(false);
    const [activeAssetTab, setActiveAssetTab] = useState('samples');

    // Initial Samples parse ensuring room tagging
    const initialSamples = useMemo(() => {
        const parsed = parseAttachmentsOrLinks(item?.studioMeeting?.samples);
        const defaultRoom = initialRoomsList[0] || 'Living Room';
        return parsed.map((s) => ({
            ...s,
            room: s.room || defaultRoom
        }));
    }, [item, initialRoomsList]);

    // Initial Client Drawings parse ensuring room tagging
    const initialClientDrawings = useMemo(() => {
        const parsed = parseAttachmentsOrLinks(item?.studioMeeting?.clientDrawings);
        const defaultRoom = initialRoomsList[0] || 'Living Room';
        return parsed.map((d) => ({
            ...d,
            room: d.room || defaultRoom
        }));
    }, [item, initialRoomsList]);

    // Initial Project Pictures parse ensuring room tagging
    const initialProjectPictures = useMemo(() => {
        const parsed = parseAttachmentsOrLinks(item?.studioMeeting?.projectPictures);
        const defaultRoom = initialRoomsList[0] || 'Living Room';
        return parsed.map((p) => ({
            ...p,
            room: p.room || defaultRoom
        }));
    }, [item, initialRoomsList]);

    // Samples, Drawings & Pictures states
    const [samples, setSamples] = useState(initialSamples);
    const [sampleSearch, setSampleSearch] = useState('');
    const [customSampleInput, setCustomSampleInput] = useState('');

    const [clientDrawings, setClientDrawings] = useState(initialClientDrawings);
    const [projectPictures, setProjectPictures] = useState(initialProjectPictures);

    const [validationError, setValidationError] = useState('');

    const { execute, pending, error: apiError } = useAction(
        (payload) => leadsApi.update(item.id || item._id, payload),
        {
            onSuccess: () => {
                onDone();
                onClose();
            }
        }
    );

    // Toggle Attendee
    const toggleAttendee = (name) => {
        setAttendees((prev) => {
            if (prev.includes(name)) return prev.filter((x) => x !== name);
            return [...prev, name];
        });
    };

    const handleAddCustomAttendee = () => {
        const val = customAttendeeInput.trim();
        if (!val) return;
        if (!attendees.includes(val)) {
            setAttendees((prev) => [...prev, val]);
        }
        setCustomAttendeeInput('');
    };

    const handleAddRoom = (rName) => {
        const name = (rName || customRoomInput).trim();
        if (!name) return;
        if (!roomsList.includes(name)) {
            setRoomsList((prev) => [...prev, name]);
        }
        setActiveRoom(name);
        setCustomRoomInput('');
        setShowAddRoomInput(false);
    };

    const handleAddSampleTag = (sampleName, targetRoom = activeRoom) => {
        const title = sampleName.trim();
        if (!title) return;
        const exists = samples.some(
            (s) => (s.room || roomsList[0]) === targetRoom && (s.filename || s.url) === title
        );
        if (!exists) {
            setSamples((prev) => [
                ...prev,
                { room: targetRoom, filename: title, url: title, mimetype: 'sample/text' }
            ]);
        }
        setCustomSampleInput('');
    };

    const handleToggleSampleTag = (sampleName, targetRoom = activeRoom) => {
        const isSelected = samples.some(
            (s) => (s.room || roomsList[0]) === targetRoom && (s.filename || s.url) === sampleName
        );
        if (isSelected) {
            setSamples((prev) =>
                prev.filter(
                    (s) => !((s.room || roomsList[0]) === targetRoom && (s.filename || s.url) === sampleName)
                )
            );
        } else {
            handleAddSampleTag(sampleName, targetRoom);
        }
    };

    const handleRemoveSample = (sampleToRemove) => {
        setSamples((prev) => prev.filter((s) => s !== sampleToRemove));
    };

    const handleUpdateActiveRoomAttachments = (updatedAttachments) => {
        const tagged = updatedAttachments.map((att) => ({
            ...att,
            room: activeRoom
        }));
        setSamples((prev) => {
            const otherRoomsSamples = prev.filter((s) => (s.room || roomsList[0]) !== activeRoom);
            const currentRoomTags = prev.filter(
                (s) => (s.room || roomsList[0]) === activeRoom && s.mimetype === 'sample/text'
            );
            return [...otherRoomsSamples, ...currentRoomTags, ...tagged];
        });
    };

    const handleCopySamples = (fromRoom, toRoom) => {
        if (!fromRoom || !toRoom || fromRoom === toRoom) return;

        // 1. Copy Samples
        const sourceSamples = samples.filter((s) => (s.room || roomsList[0]) === fromRoom);
        if (sourceSamples.length > 0) {
            setSamples((prev) => {
                const targetExistingNames = new Set(
                    prev.filter((s) => (s.room || roomsList[0]) === toRoom).map((s) => s.filename || s.url)
                );
                const toAdd = sourceSamples
                    .filter((s) => !targetExistingNames.has(s.filename || s.url))
                    .map((s) => ({ ...s, room: toRoom }));
                return [...prev, ...toAdd];
            });
        }

        // 2. Copy Client Drawings
        const sourceDrawings = clientDrawings.filter((d) => (d.room || roomsList[0]) === fromRoom);
        if (sourceDrawings.length > 0) {
            setClientDrawings((prev) => {
                const targetExistingUrls = new Set(
                    prev.filter((d) => (d.room || roomsList[0]) === toRoom).map((d) => d.url)
                );
                const toAdd = sourceDrawings
                    .filter((d) => !targetExistingUrls.has(d.url))
                    .map((d) => ({ ...d, room: toRoom }));
                return [...prev, ...toAdd];
            });
        }

        // 3. Copy Project Pictures
        const sourcePictures = projectPictures.filter((p) => (p.room || roomsList[0]) === fromRoom);
        if (sourcePictures.length > 0) {
            setProjectPictures((prev) => {
                const targetExistingUrls = new Set(
                    prev.filter((p) => (p.room || roomsList[0]) === toRoom).map((p) => p.url)
                );
                const toAdd = sourcePictures
                    .filter((p) => !targetExistingUrls.has(p.url))
                    .map((p) => ({ ...p, room: toRoom }));
                return [...prev, ...toAdd];
            });
        }

        setShowCopySection(false);
    };

    const submit = (e) => {
        e.preventDefault();
        setValidationError('');

        // 1. Studio Meeting Due Date: Required once a studio meeting is planned
        if (isPlanned && !dueDate) {
            setValidationError('Studio Meeting Due Date is required once a studio meeting is planned.');
            return;
        }

        // 2. Business Rule: Actual Meeting Date & Time MUST NOT be earlier than Studio Meeting Due Date
        if (dueDate && actualDate) {
            const dueDateStr = dueDate.split('T')[0];
            const actualDateStr = actualDate.split('T')[0];
            if (actualDateStr < dueDateStr) {
                setValidationError('Actual Meeting Date & Time cannot be earlier than the Studio Meeting Due Date.');
                return;
            }
        }

        // Attendees string
        const attendeesString = attendees.join(', ');

        execute({
            studioMeeting: {
                ...(item?.studioMeeting || {}),
                dueDate: isPlanned ? (dueDate || undefined) : undefined,
                date: actualDate || undefined,
                attendees: attendeesString || undefined,
                feedback: feedback || undefined,
                architectBrief: architectBrief || undefined,
                clientDrawings,
                samples,
                projectPictures,
            }
        });
    };

    // Sample lookup candidate options
    const fabricOptions = (fabricsList || []).map((f) => f.name || f.code || f.title).filter(Boolean);
    const candidateSamples = Array.from(new Set([...fabricOptions, 'Silk Velvet Swatch', 'Motorized Sheer Track', 'Blackout Roller Blind', 'Linen Sheer Sample', 'Acoustic Panel Sample']));

    const filteredCandidateSamples = candidateSamples.filter((s) => {
        if (!sampleSearch) return true;
        return s.toLowerCase().includes(sampleSearch.toLowerCase());
    });

    const activeRoomSamples = useMemo(() => {
        return samples.filter((s) => (s.room || roomsList[0]) === activeRoom);
    }, [samples, activeRoom, roomsList]);

    const activeRoomDrawings = useMemo(() => {
        return clientDrawings.filter((d) => (d.room || roomsList[0]) === activeRoom);
    }, [clientDrawings, activeRoom, roomsList]);

    const activeRoomPictures = useMemo(() => {
        return projectPictures.filter((p) => (p.room || roomsList[0]) === activeRoom);
    }, [projectPictures, activeRoom, roomsList]);

    const handleUpdateActiveRoomDrawings = (updatedDrawings) => {
        const tagged = updatedDrawings.map((att) => ({
            ...att,
            room: activeRoom
        }));
        setClientDrawings((prev) => {
            const otherRooms = prev.filter((d) => (d.room || roomsList[0]) !== activeRoom);
            return [...otherRooms, ...tagged];
        });
    };

    const handleUpdateActiveRoomPictures = (updatedPictures) => {
        const tagged = updatedPictures.map((att) => ({
            ...att,
            room: activeRoom
        }));
        setProjectPictures((prev) => {
            const otherRooms = prev.filter((p) => (p.room || roomsList[0]) !== activeRoom);
            return [...otherRooms, ...tagged];
        });
    };

    const dueDateOnly = dueDate ? dueDate.split('T')[0] : '';
    const actualDateOnly = actualDate ? actualDate.split('T')[0] : '';
    const isActualDateBeforeDueDate = Boolean(
        dueDateOnly && actualDateOnly && actualDateOnly < dueDateOnly
    );

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Studio Meeting Details : ${item?.clientName || ''}`}
            size="xl"
        >
            <form onSubmit={submit} className="space-y-6">
                {(validationError || apiError) && (
                    <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{validationError || (apiError?.errors?.[0]?.message || apiError?.message || String(apiError))}</span>
                    </div>
                )}

                {/* Section 1: Dates & Readiness */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                    <div className="md:col-span-3 flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isPlanned}
                                onChange={(e) => setIsPlanned(e.target.checked)}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span>Studio Meeting Planned</span>
                        </label>
                    </div>

                    <Field label="Studio Meeting Due Date" required={isPlanned}>
                        <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            disabled={!isPlanned}
                        />
                    </Field>

                    <Field
                        label="Actual Meeting Date & Time"
                        error={isActualDateBeforeDueDate ? 'Actual date cannot be before Studio Meeting Due Date' : undefined}
                    >
                        <Input
                            type="datetime-local"
                            value={actualDate}
                            onChange={(e) => setActualDate(e.target.value)}
                            min={dueDateOnly ? `${dueDateOnly}T00:00` : undefined}
                            className={isActualDateBeforeDueDate ? 'border-rose-500 text-rose-600 focus:ring-rose-500 bg-rose-50/20' : ''}
                        />
                        {isActualDateBeforeDueDate && (
                            <div className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2 font-medium">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                                <div>
                                    <span className="font-bold text-rose-700 dark:text-rose-300">Remark:</span> Actual Meeting Date & Time cannot be earlier than Studio Meeting Due Date ({date(dueDateOnly)}).
                                </div>
                            </div>
                        )}
                    </Field>

                </div>

                {/* Section 2: Meeting Attendees (Multi-select) */}
                <Field label="Meeting Attendees" >
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                        {/* Selected Attendees Badges */}
                        {attendees.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                {attendees.map((name) => (
                                    <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                        <Users className="w-3 h-3 text-purple-500 shrink-0" />
                                        <span>{name}</span>
                                        <button type="button" onClick={() => toggleAttendee(name)} className="text-purple-400 hover:text-rose-500">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 max-w-md">
                            <Input
                                size="sm"
                                value={customAttendeeInput}
                                onChange={(e) => setCustomAttendeeInput(e.target.value)}
                                placeholder="Add attendee name (e.g. Client, Architect, Designer)..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCustomAttendee();
                                    }
                                }}
                            />
                            {customAttendeeInput && <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={handleAddCustomAttendee}>Add</Button>}
                        </div>

                    </div>
                </Field>

                {/* Section 4: Samples Presented (Room-Wise) */}
                <Field label="Samples Presented">
                    <div className="px-2 py-4 rounded-2xl bg-stone-50 dark:bg-stone-900/40 border border-brand-200/80 dark:border-brand-900/60 space-y-4 shadow-2xs">
                        {/* Room Selection Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-brand-200/60 dark:border-brand-900/40">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <div className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-950/80 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
                                    <Layers className="w-4 h-4" />
                                </div>
                                <div>

                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-stone-200">
                                        Room-Wise Presentation
                                    </span>

                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                                {roomsList.length > 1 && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={showCopySection ? 'primary' : 'secondary'}
                                        icon={Copy}
                                        onClick={() => {
                                            setCopySourceRoom(activeRoom);
                                            setCopyTargetRoom(roomsList.find((r) => r !== activeRoom) || '');
                                            setShowCopySection(!showCopySection);
                                            if (showAddRoomInput) setShowAddRoomInput(false);
                                        }}
                                        className="text-xs"
                                        title="Copy samples from this room to another room"
                                    >
                                        Copy to Room
                                    </Button>
                                )}

                                <Button
                                    type="button"
                                    size="sm"
                                    variant={showAddRoomInput ? 'primary' : 'secondary'}
                                    icon={Plus}
                                    onClick={() => {
                                        setShowAddRoomInput(!showAddRoomInput);
                                        if (showCopySection) setShowCopySection(false);
                                    }}
                                    className="text-xs"
                                >
                                    Add Room
                                </Button>
                            </div>
                        </div>

                        {/* Inline Add Room Box */}
                        {showAddRoomInput && (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-white dark:bg-stone-900 border border-brand-300 dark:border-brand-800 rounded-xl shadow-xs animate-in fade-in duration-150">
                                <div className="flex-1">
                                    <Input
                                        size="sm"
                                        value={customRoomInput}
                                        onChange={(e) => setCustomRoomInput(e.target.value)}
                                        placeholder="Enter room name (e.g. Foyer, Balcony, Study, Powder Room)..."
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddRoom();
                                            }
                                        }}
                                        className="text-xs"
                                    />
                                </div>
                                <div className="flex items-center gap-2 justify-end">
                                    <Button size="sm" variant="primary" type="button" onClick={() => handleAddRoom()}>
                                        Add Room
                                    </Button>
                                    <Button size="sm" variant="ghost" type="button" onClick={() => setShowAddRoomInput(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Inline Copy Samples Box */}
                        {showCopySection && (
                            <div className="flex flex-wrap items-center gap-2.5 p-3 bg-white dark:bg-stone-900 border border-brand-300 dark:border-brand-800 rounded-xl text-xs shadow-xs animate-in fade-in duration-150">
                                <span className="font-semibold text-slate-800 dark:text-stone-200">
                                    Copy samples & files from <span className="text-brand-600 dark:text-brand-400 font-bold">{copySourceRoom}</span> to:
                                </span>
                                <select
                                    value={copyTargetRoom}
                                    onChange={(e) => setCopyTargetRoom(e.target.value)}
                                    className="field-input py-1 px-2.5 max-w-xs text-xs"
                                >
                                    <option value="">Select target room...</option>
                                    {roomsList.filter((r) => r !== copySourceRoom).map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                                <div className="flex items-center gap-1.5 ml-auto">
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        type="button"
                                        disabled={!copyTargetRoom}
                                        onClick={() => handleCopySamples(copySourceRoom, copyTargetRoom)}
                                    >
                                        Copy Now
                                    </Button>
                                    <Button size="sm" variant="ghost" type="button" onClick={() => setShowCopySection(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Room Selector Tabs Bar */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                            {roomsList.map((roomName) => {
                                const isActive = activeRoom === roomName;
                                const roomSampleCount = samples.filter((s) => (s.room || roomsList[0]) === roomName).length;
                                const roomDrawingCount = clientDrawings.filter((d) => (d.room || roomsList[0]) === roomName).length;
                                const roomPictureCount = projectPictures.filter((p) => (p.room || roomsList[0]) === roomName).length;
                                const roomTotalCount = roomSampleCount + roomDrawingCount + roomPictureCount;

                                return (
                                    <button
                                        key={roomName}
                                        type="button"
                                        onClick={() => setActiveRoom(roomName)}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${isActive
                                            ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-sm ring-2 ring-brand-400/50 shadow-brand-900/20'
                                            : 'bg-white dark:bg-stone-900/90 text-slate-700 dark:text-stone-300 border border-slate-200/90 dark:border-stone-800 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/50 dark:hover:bg-brand-950/30'
                                            }`}                                    >
                                        <div className="relative">
                                            <Home className={`w-3.5 h-3.5 ${isActive ? 'text-brand-200' : 'text-slate-400 dark:text-stone-500'}`} />
                                        </div>
                                        <span>{roomName}</span>
                                        <span
                                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${isActive
                                                ? 'bg-brand-800 text-brand-100'
                                                : roomTotalCount > 0
                                                    ? 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 border border-brand-200/70 dark:border-brand-800/60'
                                                    : 'bg-slate-100 dark:bg-stone-800 text-slate-400 dark:text-stone-500'
                                                }`}                                        >
                                            {roomTotalCount}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Active Room Workspace */}
                        <div className=" rounded-2xl border border-brand-200/90 dark:border-brand-900/70 shadow-xs space-y-4">


                            {/* Section A: Catalogue Sample Master & Custom Tags */}
                            <div className="space-y-3 p-3.5 bg-stone-50/70 dark:bg-stone-900/40 ">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-stone-300 flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5 text-brand-500" />
                                        Samples & Catalogue Tags ({activeRoomSamples.filter((s) => s.mimetype === 'sample/text').length})
                                    </span>

                                </div>

                                {/* Search & Custom Input row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <Input
                                            size="sm"
                                            value={sampleSearch}
                                            onChange={(e) => setSampleSearch(e.target.value)}
                                            placeholder={`Search catalogue master for ${activeRoom}...`}
                                            className="pl-8 text-xs"
                                        />
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            size="sm"
                                            value={customSampleInput}
                                            onChange={(e) => setCustomSampleInput(e.target.value)}
                                            placeholder={`Add custom sample tag to ${activeRoom}...`}
                                            className="text-xs"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddSampleTag(customSampleInput);
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            icon={Plus}
                                            onClick={() => handleAddSampleTag(customSampleInput)}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                </div>

                                {/* Catalogue Master Badges Cloud */}
                                <div>
                                    <div className="text-[10px] font-semibold text-slate-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
                                        Quick Select from Master Catalogue:
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-lg bg-white dark:bg-stone-900 border border-slate-200/90 dark:border-stone-800 scrollbar-thin">
                                        {filteredCandidateSamples.map((samp) => {
                                            const isSelected = activeRoomSamples.some((s) => (s.filename || s.url) === samp);
                                            return (
                                                <button
                                                    key={samp}
                                                    type="button"
                                                    onClick={() => handleToggleSampleTag(samp)}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1 ${isSelected
                                                        ? 'bg-brand-600 text-white shadow-xs ring-1 ring-brand-400'
                                                        : 'bg-stone-50 dark:bg-stone-800 text-slate-700 dark:text-stone-300 border border-slate-200 dark:border-stone-700 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/50 dark:hover:bg-brand-950/40'
                                                        }`}
                                                >
                                                    {isSelected ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-slate-400" />}
                                                    <span>{samp}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>


                            </div>

                            {/* Section B: Room Files & Media (Tabbed / Organized) */}
                            <div className="space-y-3 px-3.5 pb-4   rounded-xl bg-stone-50/70 dark:bg-stone-900/40  border-slate-200/80 dark:border-stone-800 ">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-stone-300 flex items-center gap-1.5">
                                        <Paperclip className="w-3.5 h-3.5 text-brand-500" />
                                        Room Media, Drawings & Pictures ({activeRoomSamples.filter((s) => s.mimetype !== 'sample/text').length + activeRoomDrawings.length + activeRoomPictures.length})
                                    </span>

                                    {/* Asset category filter tabs */}
                                    <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-0.5 rounded-lg border border-slate-200 dark:border-stone-800 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setActiveAssetTab('samples')}
                                            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${activeAssetTab === 'samples'
                                                ? 'bg-white dark:bg-stone-800 text-brand-700 dark:text-brand-300 shadow-xs font-semibold'
                                                : 'text-slate-600 dark:text-stone-400 hover:text-slate-900 dark:hover:text-stone-200'
                                                }`}
                                        >
                                            <span>Swatches & Links</span>
                                            <span className="text-[10px] opacity-75">({activeRoomSamples.filter((s) => s.mimetype !== 'sample/text').length})</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveAssetTab('drawings')}
                                            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${activeAssetTab === 'drawings'
                                                ? 'bg-white dark:bg-stone-800 text-brand-700 dark:text-brand-300 shadow-xs font-semibold'
                                                : 'text-slate-600 dark:text-stone-400 hover:text-slate-900 dark:hover:text-stone-200'
                                                }`}
                                        >
                                            <span>Drawings</span>
                                            <span className="text-[10px] opacity-75">({activeRoomDrawings.length})</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveAssetTab('pictures')}
                                            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${activeAssetTab === 'pictures'
                                                ? 'bg-white dark:bg-stone-800 text-brand-700 dark:text-brand-300 shadow-xs font-semibold'
                                                : 'text-slate-600 dark:text-stone-400 hover:text-slate-900 dark:hover:text-stone-200'
                                                }`}
                                        >
                                            <span>Pictures</span>
                                            <span className="text-[10px] opacity-75">({activeRoomPictures.length})</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Render the uploaders based on activeAssetTab */}
                                <div className="space-y-3">
                                    {(activeAssetTab === 'all' || activeAssetTab === 'samples') && (
                                        <AttachmentAndLinkUploader
                                            label={`Swatches, Photos & Links (${activeRoom})`}
                                            attachments={activeRoomSamples.filter((s) => s.mimetype !== 'sample/text')}
                                            onUpdate={handleUpdateActiveRoomAttachments}
                                            idPrefix={`samples-upload-${activeRoom.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
                                            allowLinks={true}
                                        />
                                    )}

                                    {(activeAssetTab === 'all' || activeAssetTab === 'drawings') && (
                                        <AttachmentAndLinkUploader
                                            label={`Client Drawings (${activeRoom})`}
                                            attachments={activeRoomDrawings}
                                            onUpdate={handleUpdateActiveRoomDrawings}
                                            idPrefix={`drawings-${activeRoom.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
                                            allowLinks={true}
                                        />
                                    )}

                                    {(activeAssetTab === 'all' || activeAssetTab === 'pictures') && (
                                        <AttachmentAndLinkUploader
                                            label={`Project Pictures (${activeRoom})`}
                                            allowImagesOnly={true}
                                            attachments={activeRoomPictures}
                                            onUpdate={handleUpdateActiveRoomPictures}
                                            idPrefix={`pictures-${activeRoom.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
                                            allowLinks={true}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                </Field>


                {/* Section 5: Long Free Text Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Internal Notes">
                        <Textarea
                            rows={4}
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Enter detailed client feedback, meeting outcomes, product preferences, decisions reached..."
                        />
                    </Field>

                    <Field label="External Notes">
                        <Textarea
                            rows={4}
                            value={architectBrief}
                            onChange={(e) => setArchitectBrief(e.target.value)}
                            placeholder="Enter detailed architect specifications, drawing notes, design guidance, structural constraints..."
                        />
                    </Field>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                    <Button variant="primary" type="submit" loading={pending}>Save Studio Meeting</Button>
                </div>
            </form>
        </Modal>
    );
};

/* ------------------------------------------------------------- Spreadsheet Grid View */
const SpreadsheetGridView = ({ items, onView, onEdit, onRowClick, selectedSection = 's5', onSectionChange }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's5';
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
                                        <Button size="sm" variant="ghost" icon={Pen} onClick={(e) => { e.stopPropagation(); onEdit(lead); }} title="Edit Studio Meeting" />
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

/* ------------------------------------------------------------- Main Component */
const StudioMeeting = ({ items: itemsProp = [] }) => {
    const [viewMode, setViewMode] = useViewMode('table');
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleFetchLeads } = useSales();
    const salesLeads = useSelector((state) => state.sales?.leads);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingLead, setEditingLead] = useState(null);
    const [drawerLead, setDrawerLead] = useState(null);

    const [fabricsList, setFabricsList] = useState([]);

    const reload = () => {
        setLoading(true);
        setError(null);

        Promise.all([
            handleFetchLeads(),
            fabricsApi.list({ limit: 100 }).then((res) => res.data?.items || res.data || []).catch(() => [])
        ])
            .then(([_, fabrics]) => {
                setFabricsList(fabrics);
            })
            .catch((err) => setError(err?.message || 'Failed to fetch studio meeting data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const selectedSection = searchParams.get('section') || 's5';

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=studio-meeting`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const measuredLeads = rawLeads.filter((lead) => {
        if (!lead?.measurement) return false;
        const m = lead.measurement;
        const status = String(m.status || '').toUpperCase();
        return Boolean(
            m.date ||
            m.measuredBy ||
            (status && status !== 'PENDING' && status !== 'SCHEDULED') ||
            m.roomList ||
            m.notes ||
            m.pelmetDetails ||
            m.channelDetails ||
            m.motorDetails ||
            m.wiringDetails ||
            (Array.isArray(m.attachments) && m.attachments.length > 0) ||
            (Array.isArray(m.drawings) && m.drawings.length > 0) ||
            lead.studioMeeting?.dueDate ||
            lead.studioMeeting?.date
        );
    });

    const filteredLeads = measuredLeads.filter((lead) => {
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const attendees = String(lead.studioMeeting?.attendees || '').toLowerCase();
            const nextAction = String(lead.studioMeeting?.nextAction || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !attendees.includes(q) && !nextAction.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = measuredLeads.length;
    const completedMeetings = measuredLeads.filter((l) => l.studioMeeting?.date).length;
    const scheduledMeetings = measuredLeads.filter((l) => l.studioMeeting?.dueDate && !l.studioMeeting?.date).length;
    const samplesShown = measuredLeads.filter((l) => parseAttachmentsOrLinks(l.studioMeeting?.samples).length > 0).length;

    return (
        <div>
            <PageHeader
                title="Studio Meeting Management"
                subtitle="Manage client & architect studio sessions, attendees, client drawings, studio feedback, sample presentations, and pricing guidance"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Total Studio Pipeline" value={totalCount} sub="Leads in studio workflow" icon={Users} tone="violet" />
                <StatTile label="Completed Meetings" value={completedMeetings} sub="Sessions held" icon={CheckCircle2} tone="green" />
                <StatTile label="Scheduled Meetings" value={scheduledMeetings} sub="Upcoming studio visits" icon={Calendar} tone="amber" />
                <StatTile label="Samples Presented" value={samplesShown} sub="Material samples shown" icon={Sparkles} tone="blue" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, attendees, next action..."
                            className="pl-9"
                        />
                    </div>

                    <ViewSwitcher view={viewMode} onViewChange={setViewMode} />

                    {(search || selectedSection !== 's5') && (
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
                    <Loading text="Loading Studio Meetings..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={Users} title="No Studio Meeting Records Found" hint="Try adjusting search parameters." />
                </Panel>
            ) : viewMode === 'cards' ? (
                <CardGridView
                    items={filteredLeads}
                    renderCard={(lead) => (
                        <SalesStageCard
                            lead={lead}
                            stageKey="studio"
                            onView={handleViewLead}
                            onEdit={(l) => setEditingLead(l)}
                            onRowClick={(l) => setDrawerLead(l)}
                        />
                    )}
                    empty={
                        <Panel className="p-8 text-center">
                            <EmptyState icon={Users} title="No Studio Meeting Records Found" hint="Try adjusting search parameters." />
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
                    onSectionChange={(sec) => updateParam('section', sec, 's5')}
                />
            )}

            {editingLead && (
                <EditStudioMeetingModal
                    key={editingLead.id || editingLead._id}
                    item={editingLead}
                    onClose={() => setEditingLead(null)}
                    onDone={reload}
                    fabricsList={fabricsList}
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

export default StudioMeeting;


