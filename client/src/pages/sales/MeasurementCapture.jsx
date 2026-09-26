import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search,
    Eye,
    Pencil,
    Ruler,
    Calendar,
    CheckCircle2,
    Paperclip,
    ClipboardList,
    Upload,
    Loader2,
    Trash2,
    ExternalLink,
    Zap,
    AlertCircle,
    Clock,
    FileCode,
    Grid,
} from 'lucide-react';
import { leadsApi, usersApi, uploadApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { date, getMediaUrl } from '../../utils/format';
import {
    PageHeader,
    Panel,
    Button,
    Badge,
    Input,
    Select,
    ErrorState,
    EmptyState,
    StatTile,
    Modal,
    Field,
    DelayBadge,
    ViewSwitcher,
} from '../../components/ui';
import useViewMode from '../../hooks/useViewMode';
import CardGridView from '../../components/common/CardGridView';
import SalesStageCard from '../../components/cards/SalesStageCard';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import DetailedDrawer from '../../components/sales/DetailedDrawer';
import PhysicalMeasurementSheet from '../../components/measurement/MeasurementCapture';

const SPREADSHEET_SECTIONS = [
    {
        id: 's4',
        title: 'Measurement (Physical Sheet & Site Details)',
        color: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/90 dark:text-teal-200 dark:border-teal-700/80',
        // All fields : shown in DetailedDrawer
        cols: [
            { key: 'code', label: 'Lead ID' },
            { key: 'clientName', label: 'Client Name' },
            { key: 'measurement.dueDate', label: 'Measurement Due Date' },
            { key: 'measurement.date', label: 'Measurement Actual Date' },
            { key: 'delayStatus', label: 'Delay / SLA Status' },
            { key: 'measurement.status', label: 'Measurement Status' },
            { key: 'measurement.measuredBy', label: 'Measured By / Visited By' },
            { key: 'siteAddress', label: 'Site Address' },
            { key: 'windowsCount', label: 'Windows Measured' },
            { key: 'motorizedCount', label: 'Motorized Windows' },
            { key: 'checklistStatus', label: 'Site Checklist' },
            { key: 'measurement.remarks', label: 'Remarks / Notes' },
            { key: 'measurement.attachments', label: 'Site Photos / Attachments' },
            { key: 'measurement.drawings', label: 'Measurement Drawings' },
        ],
        // Subset of cols shown in the table (prevents horizontal scrolling)
        tableCols: [
            { key: 'clientName', label: 'Client Name' },
            { key: 'measurement.dueDate', label: 'Due Date' },
            { key: 'measurement.date', label: 'Actual Date' },
            { key: 'delayStatus', label: 'SLA Status' },
            { key: 'measurement.measuredBy', label: 'Measured By' },
            { key: 'windowsCount', label: 'Windows' },
            { key: 'measurement.status', label: 'Status' },
        ]
    }
];

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'PROVISIONAL', label: 'Provisional' },
    { value: 'FINAL', label: 'Final' },
    { value: 'REVISION_REQUIRED', label: 'Revision Required' },
];

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

const resolveUserName = (measuredBy, users = []) => {
    if (!measuredBy) return '—';
    if (typeof measuredBy === 'object' && measuredBy.name) return measuredBy.name;
    if (typeof measuredBy === 'string' && users.length > 0) {
        const found = users.find((u) => u._id === measuredBy || u.id === measuredBy);
        if (found?.name) return found.name;
    }
    return typeof measuredBy === 'string' ? measuredBy : (measuredBy?.name || '—');
};

const SPREADSHEET_CELL_RENDERERS = {
    delayStatus: (lead) => (
        <DelayBadge
            dueDate={lead.measurement?.dueDate || lead.measurementDueDate}
            isCompleted={Boolean(lead.measurement?.date || lead.measurementCompleted || lead.measurement?.status === 'Final' || lead.measurement?.status === 'FINAL')}
        />
    ),
    sno: (lead, { sno }) => <span className="  text-slate-500 dark:text-slate-400 font-medium">{sno}</span>,
    code: (lead, { onView }) => (
        <button
            type="button"
            onClick={() => onView(lead)}
            className="  text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
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
    siteAddress: (lead) => {
        const val = lead.measurement?.header?.siteAddress || lead.siteAddress || '—';
        return <span className="text-slate-700 dark:text-slate-300 text-xs truncate max-w-[160px] block" title={val}>{val}</span>;
    },
    'measurement.dueDate': (lead) => {
        const val = lead.measurement?.dueDate;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 text-[11px]   whitespace-nowrap">{date(val)}</span>;
    },
    'measurement.date': (lead) => {
        const val = lead.measurement?.date || lead.measurement?.header?.date || lead.actualSiteVisitDateTime;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 text-[11px]   whitespace-nowrap">{date(val)}</span>;
    },
    'measurement.measuredBy': (lead, { users = [] } = {}) => {
        const mb = lead.measurement?.measuredBy || lead.measurement?.header?.siteVisitedBy;
        return (
            <span className="truncate block max-w-[130px] text-slate-700 dark:text-slate-300 font-medium">
                {resolveUserName(mb, users)}
            </span>
        );
    },
    'measurement.status': (lead) => {
        const st = lead.measurement?.status || 'PROVISIONAL';
        const norm = String(st).toUpperCase();
        let tone = 'slate';
        let label = st;

        if (norm === 'FINAL') { tone = 'emerald'; label = 'Final'; }
        else if (norm === 'PROVISIONAL') { tone = 'blue'; label = 'Provisional'; }
        else if (norm === 'PENDING') { tone = 'amber'; label = 'Pending'; }
        else if (norm === 'REVISION_REQUIRED' || norm === 'RE_MEASUREMENT_REQUIRED') { tone = 'rose'; label = 'Revision Required'; }

        return <Badge tone={tone}>{label}</Badge>;
    },
    windowsCount: (lead) => {
        const rows = safeParseArray(lead.measurement?.rows || lead.measurement?.notes).filter((r) => {
            return Boolean(
                (r.area && String(r.area).trim()) ||
                (r.room && String(r.room).trim()) ||
                r.outToOutWidth || r.outToOutHeight ||
                r.frameToFrameWidth || r.frameToFrameHeight ||
                r.width || r.height
            );
        });
        if (!rows.length) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 whitespace-nowrap">
                <Ruler className="w-3 h-3 shrink-0" /> {rows.length} Window{rows.length > 1 ? 's' : ''}
            </span>
        );
    },
    motorizedCount: (lead) => {
        const rows = safeParseArray(lead.measurement?.rows || lead.measurement?.notes);
        const motorized = rows.filter((r) => Boolean(r.wire || r.wireLeft || r.wireRight)).length;
        if (!motorized) return <span className="text-slate-400 dark:text-slate-600">None</span>;
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 whitespace-nowrap">
                <Zap className="w-3 h-3 shrink-0" /> {motorized} Motorized
            </span>
        );
    },
    checklistStatus: (lead) => {
        const cl = lead.measurement?.checklist || {};
        const keys = ['photo', 'video', 'flooring', 'ceiling', 'height'];
        const completed = keys.filter((k) => Boolean(cl[k])).length;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${completed === 5
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : completed > 0
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                <CheckCircle2 className="w-3 h-3 shrink-0" /> {completed}/5 Checked
            </span>
        );
    },
    'measurement.remarks': (lead) => {
        const rem = lead.measurement?.remarks;
        if (!rem) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 text-xs truncate max-w-[200px] block italic" title={rem}>{rem}</span>;
    },
    'measurement.attachments': (lead) => {
        const atts = lead.measurement?.attachments || [];
        if (!atts.length) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[220px] py-1">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 font-medium shrink-0">
                    <Paperclip className="w-3 h-3 shrink-0" /> {atts.length} file(s)
                </span>
                {atts.slice(0, 2).map((att, i) => (
                    <a
                        key={i}
                        href={getMediaUrl(att.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 hover:underline max-w-[90px] truncate"
                        title={att.filename || `File ${i + 1}`}
                    >
                        <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                        <span className="truncate">{att.filename || `File ${i + 1}`}</span>
                    </a>
                ))}
            </div>
        );
    },
    'measurement.drawings': (lead) => {
        const dwgs = lead.measurement?.drawings || [];
        if (!dwgs.length) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[220px] py-1">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-400 font-medium shrink-0">
                    <FileCode className="w-3 h-3 shrink-0" /> {dwgs.length} drawing(s)
                </span>
                {dwgs.slice(-2).map((dwg, i) => (
                    <a
                        key={i}
                        href={getMediaUrl(dwg.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 hover:underline shrink-0"
                    >
                        <span className="px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950   font-bold text-[9px]">
                            {dwg.version ? `v${dwg.version}` : `v${i + 1}`}
                        </span>
                        <span className="truncate max-w-[80px]">{dwg.filename || 'Drawing'}</span>
                    </a>
                ))}
            </div>
        );
    },
};

const renderSpreadsheetCell = (lead, key, sno, onView, onEdit, users = []) => {
    if (SPREADSHEET_CELL_RENDERERS[key]) {
        return SPREADSHEET_CELL_RENDERERS[key](lead, { sno, onView, onEdit, users });
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

/* ------------------------------------------------------------- Edit Measurement Modal */
const EditMeasurementModal = ({ item, onClose, onDone, users = [] }) => {
    const [form, setForm] = useState({
        dueDate: item?.measurement?.dueDate ? new Date(item.measurement.dueDate).toISOString().slice(0, 10) : '',
        date: item?.measurement?.date ? new Date(item.measurement.date).toISOString().slice(0, 10) : (item?.measurement?.header?.date || ''),
        measuredBy: item?.measurement?.measuredBy?._id || item?.measurement?.measuredBy || '',
        status: item?.measurement?.status || 'PROVISIONAL',
        siteAccess: item?.measurement?.siteAccess || 'Available',
    });

    const [attachments, setAttachments] = useState(item?.measurement?.attachments || []);
    const [drawings, setDrawings] = useState(item?.measurement?.drawings || []);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    const [uploadingDrawings, setUploadingDrawings] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [showMediaSection, setShowMediaSection] = useState(false);

    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item.id || item._id, { measurement: payload }),
        {
            onSuccess: () => {
                onDone();
                onClose();
            }
        }
    );

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    // File Upload Handler for Attachments
    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setUploadingAttachments(true);
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

            setAttachments((prev) => [...prev, ...formattedAttachments]);
        } catch (err) {
            console.error('Failed to upload media:', err);
            setUploadError(err?.message || 'Failed to upload media to S3');
        } finally {
            setUploadingAttachments(false);
            e.target.value = '';
        }
    };

    // File Upload Handler for Drawings
    const handleDrawingUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setUploadingDrawings(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            files.forEach((file) => formData.append('files', file));

            const res = await uploadApi.upload(formData);
            const uploadedFiles = res.data || [];

            setDrawings((prev) => {
                const startVersion = prev.length + 1;
                const formattedDrawings = uploadedFiles.map((file, idx) => ({
                    url: file.url,
                    filename: file.filename || file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    uploadedAt: new Date().toISOString(),
                    storage: file.storage || 's3',
                    version: startVersion + idx,
                }));
                return [...prev, ...formattedDrawings];
            });
        } catch (err) {
            console.error('Failed to upload drawing:', err);
            setUploadError(err?.message || 'Failed to upload drawing file');
        } finally {
            setUploadingDrawings(false);
            e.target.value = '';
        }
    };

    // Save handler from PhysicalMeasurementSheet
    const handleSaveSheet = (sheetData) => {
        let measuredById = form.measuredBy;
        if (typeof measuredById === 'object' && measuredById !== null) {
            measuredById = measuredById._id || measuredById.id || '';
        }
        if (typeof measuredById === 'string') {
            measuredById = measuredById.trim();
        }

        const validRows = (sheetData.rows || []).filter((r) => {
            return Boolean(
                (r.area && String(r.area).trim()) ||
                (r.room && String(r.room).trim()) ||
                r.outToOutWidth || r.outToOutHeight ||
                r.frameToFrameWidth || r.frameToFrameHeight ||
                r.pelmetOutOutWidth || r.pelmetFrameFrameWidth ||
                (r.lWindowDetail && String(r.lWindowDetail).trim()) ||
                (r.remarks && String(r.remarks).trim()) ||
                r.width || r.height
            );
        });

        const payload = {
            header: sheetData.header,
            rows: validRows,
            checklist: sheetData.checklist,
            remarks: sheetData.remarks,
            dueDate: form.dueDate || undefined,
            date: sheetData.header?.date || form.date || undefined,
            measuredBy: measuredById || undefined,
            status: form.status || 'PROVISIONAL',
            siteAccess: form.siteAccess || 'Available',
            attachments,
            drawings,
            notes: validRows, // Backward compatibility for downstream stages
        };

        execute(payload);
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Physical Measurement Sheet : ${item?.clientName || ''}`}
            size="full"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>Lead: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{item?.code}</strong></span>
                        <span>Client: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{item?.clientName}</strong></span>
                        <span>Status: <strong className="text-brand-600 dark:text-brand-400 font-semibold">{form.status}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
                            Close
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Schedule & Technician Config Bar */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <Field label="Measurement Due Date">
                            <Input
                                type="date"
                                value={form.dueDate}
                                onChange={set('dueDate')}
                                className="text-xs"
                            />
                        </Field>
                        <Field label="Measured By (Technician)">
                            <Select
                                value={form.measuredBy}
                                onChange={set('measuredBy')}
                                options={[
                                    { value: '', label: '— Select Technician —' },
                                    ...(users || []).map((u) => ({ value: u._id || u.id, label: u.name || u.email })),
                                ]}
                                className="text-xs"
                            />
                        </Field>
                        <Field label="Measurement Status">
                            <Select
                                value={form.status}
                                onChange={set('status')}
                                options={STATUS_OPTIONS}
                                className="text-xs"
                            />
                        </Field>
                        <div className="flex items-end">
                            <Button
                                type="button"
                                variant={showMediaSection ? 'primary' : 'outline'}
                                size="sm"
                                icon={Paperclip}
                                onClick={() => setShowMediaSection(!showMediaSection)}
                                className="w-full text-xs"
                            >
                                {showMediaSection ? 'Hide Attachments' : `Site Media (${attachments.length + drawings.length})`}
                            </Button>
                        </div>
                    </div>

                    {/* Collapsible Site Photos & Drawings */}
                    {showMediaSection && (
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Site Photos */}
                            <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Site Photos</span>
                                    <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium">
                                        <Upload className="w-3 h-3" />
                                        <span>Upload Photos</span>
                                        <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {attachments.map((att, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs">
                                            <a href={getMediaUrl(att.url)} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline truncate max-w-[120px]">
                                                {att.filename || `Photo ${idx + 1}`}
                                            </a>
                                            <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-500">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {attachments.length === 0 && <span className="text-xs text-slate-400 italic">No photos uploaded yet</span>}
                                </div>
                            </div>

                            {/* Blueprints / Drawings */}
                            <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Drawings & History</span>
                                    <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800">
                                        <Upload className="w-3 h-3" />
                                        <span>Upload Drawing</span>
                                        <input type="file" multiple accept=".dwg,.dxf,.pdf,image/*" className="hidden" onChange={handleDrawingUpload} />
                                    </label>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {drawings.map((dwg, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded text-xs">
                                            <span className="  text-[10px] font-bold text-purple-700">v{dwg.version || idx + 1}</span>
                                            <a href={getMediaUrl(dwg.url)} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline truncate max-w-[120px]">
                                                {dwg.filename || `Drawing ${idx + 1}`}
                                            </a>
                                            <button type="button" onClick={() => setDrawings(drawings.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-500">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {drawings.length === 0 && <span className="text-xs text-slate-400 italic">No blueprints uploaded yet</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {uploadError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                        {uploadError}
                    </div>
                )}
                {error && (
                    <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                        {error?.message || 'Failed to save measurement changes.'}
                    </div>
                )}

                {/* Primary Physical Measurement Sheet View */}
                <PhysicalMeasurementSheet
                    lead={item}
                    preSiteVisitRooms={safeParseArray(item?.rooms)}
                    onSave={handleSaveSheet}
                />
            </div>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, onRowClick, selectedSection = 's4', onSectionChange, users = [] }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's4';
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
                            <tr onClick={() => onRowClick ? onRowClick(lead) : onView(lead)} key={lead.id || lead._id || idx} className="hover:bg-amber-500/5 dark:hover:bg-slate-900/80 transition group cursor-pointer">
                                <td className="border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 z-10   text-brand-600 dark:text-brand-400 font-semibold">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); onView(lead); }} className="hover:underline truncate px-2">
                                        {lead.code}
                                    </button>
                                </td>
                                {visibleSections.map((sec) =>
                                    (sec.tableCols || sec.cols).filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
                                        <td key={col.key} className="p-4 border-r border-slate-200 dark:border-slate-800/60 whitespace-nowrap">
                                            {renderSpreadsheetCell(lead, col.key, idx + 1, onView, onEdit, users)}
                                        </td>
                                    ))
                                )}
                                <td className="p-2 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 text-right sticky right-0 z-10 border-l border-slate-200 dark:border-slate-800/80">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); onView(lead); }} title="View Details" />
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={(e) => { e.stopPropagation(); onEdit(lead); }} title="Capture / Edit Sheet" />
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

const MeasurementCapture = ({ items: itemsProp = [] }) => {
    const [viewMode, setViewMode] = useViewMode('table');
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleFetchLeads } = useSales();
    const salesLeads = useSelector((state) => state.sales?.leads);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingLead, setEditingLead] = useState(null);
    const [drawerLead, setDrawerLead] = useState(null);

    const { data: usersData } = useAsync(() => usersApi.list({ limit: 100 }).then((r) => r.data?.items || r.data || []), []);

    const reload = () => {
        setLoading(true);
        setError(null);
        handleFetchLeads()
            .catch((err) => setError(err?.message || 'Failed to fetch measurement data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'ALL';
    const selectedSection = searchParams.get('section') || 's4';

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=measurement`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);
    const visitedLeads = rawLeads.filter((lead) => Boolean(lead.actualSiteVisitDateTime));

    const filteredLeads = visitedLeads.filter((lead) => {
        const mStatus = lead.measurement?.status || 'PROVISIONAL';
        if (statusFilter !== 'ALL' && mStatus !== statusFilter) return false;

        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const siteAddress = String(lead.siteAddress || lead.measurement?.header?.siteAddress || '').toLowerCase();
            const measuredBy = resolveUserName(lead.measurement?.measuredBy || lead.measurement?.header?.siteVisitedBy, usersData).toLowerCase();
            const remarks = String(lead.measurement?.remarks || '').toLowerCase();
            const rows = safeParseArray(lead.measurement?.rows || lead.measurement?.notes);
            const areas = rows.map((r) => String(r.area || r.room || '')).join(' ').toLowerCase();

            if (!code.includes(q) && !clientName.includes(q) && !siteAddress.includes(q) && !measuredBy.includes(q) && !remarks.includes(q) && !areas.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = visitedLeads.length;
    const completedCount = visitedLeads.filter((l) => l.measurement?.status === 'FINAL' || l.measurement?.status === 'COMPLETED' || l.measurement?.date).length;
    const pendingCount = visitedLeads.filter((l) => l.measurement?.status === 'PENDING' || l.measurement?.status === 'PROVISIONAL' || l.measurement?.status === 'REVISIT_REQUIRED').length;
    const withWindowsCount = visitedLeads.filter((l) => safeParseArray(l.measurement?.rows || l.measurement?.notes).length > 0).length;

    return (
        <div className="space-y-4">
            <PageHeader
                title="Measurement Capture Workspace"
                subtitle="Physical measurement sheet specifications, handwritten reference sheet layout, window dimensions, and site specifications"
            />

            {/* Context Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                <StatTile label="Total Measurement Leads" value={totalCount} sub="Active site pipeline" icon={Ruler} tone="teal" />
                <StatTile label="Completed Measurements" value={completedCount} sub="Site data captured" icon={CheckCircle2} tone="green" />
                <StatTile label="Pending Schedules" value={pendingCount} sub="Awaiting site visit" icon={Calendar} tone="amber" />
                <StatTile label="Sheets with Windows" value={withWindowsCount} sub="Dimensions recorded" icon={Grid} tone="blue" />
            </div>

            {/* Filter & View Control Bar */}
            <Panel className="mb-2">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                value={search}
                                onChange={(e) => updateParam('search', e.target.value, '')}
                                placeholder="Search client code, name, or room..."
                                className="pl-9 text-xs"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Status:</span>
                            <Select
                                value={statusFilter}
                                onChange={(e) => updateParam('status', e.target.value, 'ALL')}
                                options={[
                                    { value: 'ALL', label: 'All Statuses' },
                                    ...STATUS_OPTIONS
                                ]}
                                className="w-40 text-xs"
                            />
                        </div>

                        <ViewSwitcher view={viewMode} onViewChange={setViewMode} />
                    </div>
                </div>
            </Panel>

            {/* --- MAIN MEASUREMENT WORKSPACE AREA --- */}
            {loading ? (
                <Panel className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    <p className="text-xs">Loading measurement pipeline data...</p>
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={Ruler} title="No Measurement Records Found" hint="Try adjusting search or status filters." />
                </Panel>
            ) : viewMode === 'cards' ? (
                <CardGridView
                    items={filteredLeads}
                    renderCard={(lead) => (
                        <SalesStageCard
                            lead={lead}
                            stageKey="measurement"
                            onView={handleViewLead}
                            onEdit={(l) => setEditingLead(l)}
                            onRowClick={(l) => setDrawerLead(l)}
                        />
                    )}
                    empty={
                        <Panel className="p-8 text-center">
                            <EmptyState icon={Ruler} title="No Measurement Records Found" hint="Try adjusting search or status filters." />
                        </Panel>
                    }
                />
            ) : (
                <div className="space-y-2">
                    <SpreadsheetGridView
                        items={filteredLeads}
                        onView={handleViewLead}
                        onEdit={(lead) => setEditingLead(lead)}
                        onRowClick={(lead) => setDrawerLead(lead)}
                        users={usersData}
                        selectedSection={selectedSection}
                        onSectionChange={(sec) => updateParam('section', sec, 's4')}
                    />
                </div>
            )}

            {/* Full Site Physical Measurement Sheet Modal */}
            {editingLead && (
                <EditMeasurementModal
                    item={editingLead}
                    onClose={() => setEditingLead(null)}
                    onDone={reload}
                    users={usersData || []}
                />
            )}

            {/* Lead Summary Drawer */}
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

export default MeasurementCapture;
