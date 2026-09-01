import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, Pencil, Ruler, Calendar, CheckCircle2, Paperclip, ClipboardList,
    Upload, Loader2, Trash2, ExternalLink, Image as ImageIcon, FileText, Plus, X,
    Layers, Zap, Settings, Grid, AlertCircle, Clock, ShieldAlert, FileCode,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { leadsApi, usersApi, uploadApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { date, getMediaUrl } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field, DelayBadge, ViewSwitcher } from '../../components/ui';
import useViewMode from '../../hooks/useViewMode';
import CardGridView from '../../components/common/CardGridView';
import SalesStageCard from '../../components/cards/SalesStageCard';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import DetailedDrawer from '../../components/sales/DetailedDrawer';

const SPREADSHEET_SECTIONS = [
    {
        id: 's4',
        title: 'Measurement (Site Details)',
        color: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/90 dark:text-teal-200 dark:border-teal-700/80',
        cols: [
            { key: 'actualSiteVisitDateTime', label: 'Actual Visit Time' },
            { key: 'measurement.dueDate', label: 'Measurement Due Date' },
            { key: 'delayStatus', label: 'Delay / SLA Status' },
            { key: 'measurement.date', label: 'Measurement Date' },
            { key: 'measurement.measuredBy', label: 'Measured By' },
            { key: 'measurement.status', label: 'Measurement Status' },
            { key: 'measurement.siteAccess', label: 'Site Access' },
            { key: 'measurement.attachments', label: 'Site Photos / Attachments' },
            { key: 'measurement.roomList', label: 'Room List' },
            { key: 'measurement.drawings', label: 'Drawings & History' },
            { key: 'measurement.pelmetDetails', label: 'Pelmet Details' },
            { key: 'measurement.channelDetails', label: 'Channel Details' },
            { key: 'measurement.motorDetails', label: 'Motor Details' },
            { key: 'measurement.wiringDetails', label: 'Wiring Details' },
            { key: 'measurement.notes', label: 'Measurements Grid' },
        ]
    }
];

const STANDARD_ROOMS = [
    'Living Room', 'Master Bedroom', 'Bedroom 1', 'Bedroom 2', 'Guest Room',
    'Dining Room', 'Kitchen', 'Balcony', 'Home Office', 'Pooja Room', 'Passage'
];

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'PROVISIONAL', label: 'Provisional' },
    { value: 'FINAL', label: 'Final' },
    { value: 'REVISION_REQUIRED', label: 'Revision Required' },
];

const SITE_ACCESS_OPTIONS = [
    { value: 'Available', label: 'Available' },
    { value: 'Restricted', label: 'Restricted' },
    { value: 'Not Available', label: 'Not Available' },
];

const safeParseArray = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object' && raw !== null) return [raw];
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
        if (Array.isArray(current)) return current;
        if (typeof current === 'object' && current !== null) return [current];
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
            isCompleted={Boolean(lead.measurement?.date || lead.measurementCompleted || lead.measurement?.status === 'Completed')}
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
    actualSiteVisitDateTime: (lead) => {
        const val = lead.actualSiteVisitDateTime;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 text-[11px] font-mono whitespace-nowrap">{date(val, { time: true })}</span>;
    },
    'measurement.dueDate': (lead) => {
        const val = lead.measurement?.dueDate;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 text-[11px] font-mono whitespace-nowrap">{date(val)}</span>;
    },
    'measurement.date': (lead) => {
        const val = lead.measurement?.date;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 text-[11px] font-mono whitespace-nowrap">{date(val, { time: true })}</span>;
    },
    'measurement.measuredBy': (lead, { users = [] } = {}) => (
        <span className="truncate block max-w-[130px] text-slate-700 dark:text-slate-300 font-medium">
            {resolveUserName(lead.measurement?.measuredBy, users)}
        </span>
    ),
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
    'measurement.siteAccess': (lead) => {
        const sa = lead.measurement?.siteAccess || '—';
        if (sa === '—' || !sa) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        let tone = 'slate';
        if (sa === 'Available') tone = 'emerald';
        else if (sa === 'Restricted') tone = 'amber';
        else if (sa === 'Not Available') tone = 'rose';

        return <Badge tone={tone}>{sa}</Badge>;
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
                        <span className="px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950 font-mono font-bold text-[9px]">
                            {dwg.version ? `v${dwg.version}` : `v${i + 1}`}
                        </span>
                        <span className="truncate max-w-[80px]">{dwg.filename || 'Drawing'}</span>
                    </a>
                ))}
            </div>
        );
    },
    'measurement.roomList': (lead) => {
        const rooms = safeParseArray(lead.measurement?.roomList);
        if (!rooms.length) {
            const raw = lead.measurement?.roomList;
            if (!raw) {
                const preRooms = safeParseArray(lead.rooms);
                if (preRooms.length) {
                    return (
                        <div className="flex items-center gap-1 flex-wrap max-w-[200px]" title="From Pre-Site Visit">
                            {preRooms.slice(0, 3).map((r, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200/80 dark:border-indigo-800/60">
                                    {r}
                                </span>
                            ))}
                            {preRooms.length > 3 && (
                                <span className="text-[10px] text-indigo-400 font-medium">+{preRooms.length - 3}</span>
                            )}
                        </div>
                    );
                }
                return <span className="text-slate-400 dark:text-slate-600">—</span>;
            }
            return <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[180px] block">{raw}</span>;
        }
        return (
            <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
                {rooms.slice(0, 3).map((r, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                        {r}
                    </span>
                ))}
                {rooms.length > 3 && (
                    <span className="text-[10px] text-slate-400 font-medium">+{rooms.length - 3}</span>
                )}
            </div>
        );
    },
    'measurement.pelmetDetails': (lead) => {
        const pelmets = safeParseArray(lead.measurement?.pelmetDetails);
        if (!pelmets.length) {
            const raw = lead.measurement?.pelmetDetails;
            if (!raw) return <span className="text-slate-400 dark:text-slate-600">—</span>;
            return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block">{raw}</span>;
        }
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-medium">
                <Layers className="w-3 h-3 shrink-0" /> {pelmets.length} pelmet(s)
            </span>
        );
    },
    'measurement.channelDetails': (lead) => {
        const channels = safeParseArray(lead.measurement?.channelDetails);
        if (!channels.length) {
            const raw = lead.measurement?.channelDetails;
            if (!raw) return <span className="text-slate-400 dark:text-slate-600">—</span>;
            return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block">{raw}</span>;
        }
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-400 font-medium">
                <Settings className="w-3 h-3 shrink-0" /> {channels.length} channel(s)
            </span>
        );
    },
    'measurement.motorDetails': (lead) => {
        const motors = safeParseArray(lead.measurement?.motorDetails);
        if (!motors.length) {
            const raw = lead.measurement?.motorDetails;
            if (!raw) return <span className="text-slate-400 dark:text-slate-600">—</span>;
            return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block">{raw}</span>;
        }
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-400 font-medium">
                <Zap className="w-3 h-3 shrink-0" /> {motors.length} motor(s)
            </span>
        );
    },
    'measurement.wiringDetails': (lead) => {
        const wirings = safeParseArray(lead.measurement?.wiringDetails);
        if (!wirings.length) {
            const raw = lead.measurement?.wiringDetails;
            if (!raw) return <span className="text-slate-400 dark:text-slate-600">—</span>;
            return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block">{raw}</span>;
        }
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium">
                <Zap className="w-3 h-3 shrink-0" /> {wirings.length} wiring spec(s)
            </span>
        );
    },
    'measurement.notes': (lead) => {
        const grid = safeParseArray(lead.measurement?.notes);
        if (!grid.length) {
            const raw = lead.measurement?.notes;
            if (!raw) return <span className="text-slate-400 dark:text-slate-600">—</span>;
            return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px] block italic" title={raw}>{raw}</span>;
        }
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 font-medium">
                <Grid className="w-3 h-3 shrink-0" /> {grid.length} window row(s)
            </span>
        );
    }
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

import { getLocalDate } from '../../utils/format';

/* ------------------------------------------------------------- Edit Measurement Modal */
const EditMeasurementModal = ({ item, onClose, onDone, users = [] }) => {
    const [form, setForm] = useState({
        dueDate: item?.measurement?.dueDate ? new Date(item.measurement.dueDate).toISOString().slice(0, 10) : '',
        date: item?.measurement?.date ? new Date(item.measurement.date).toISOString().slice(0, 16) : '',
        measuredBy: item?.measurement?.measuredBy?._id || item?.measurement?.measuredBy || '',
        status: item?.measurement?.status || 'PROVISIONAL',
        siteAccess: item?.measurement?.siteAccess || 'Available',
    });

    // File attachments & drawings state
    const [attachments, setAttachments] = useState(item?.measurement?.attachments || []);
    const [drawings, setDrawings] = useState(item?.measurement?.drawings || []);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    const [uploadingDrawings, setUploadingDrawings] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    // Extract rooms selected during Pre-Site Visit
    const preSiteVisitRooms = safeParseArray(item?.rooms);

    // Repeatable Room List
    const [roomList, setRoomList] = useState(() => {
        const parsed = safeParseArray(item?.measurement?.roomList);
        if (parsed.length) return parsed;
        const raw = item?.measurement?.roomList;
        if (raw) return typeof raw === 'string' ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [raw];
        return preSiteVisitRooms;
    });
    const [newRoomInput, setNewRoomInput] = useState('');

    // Consolidated Repeatable Measurements Grid
    const [gridMeasurements, setGridMeasurements] = useState(() => {
        const parsedGrid = safeParseArray(item?.measurement?.notes);
        const topPelmets = safeParseArray(item?.measurement?.pelmetDetails);
        const topChannels = safeParseArray(item?.measurement?.channelDetails);
        const topMotors = safeParseArray(item?.measurement?.motorDetails);
        const topWirings = safeParseArray(item?.measurement?.wiringDetails);

        if (!parsedGrid.length) {
            return [];
        }

        return parsedGrid.map((row, idx) => {
            const windowId = row.windowId || row.label || `W-0${idx + 1}`;
            const room = row.room || 'Living Room';

            const rowPelmets = safeParseArray(row.pelmetDetails);
            const initialPelmets = rowPelmets.length > 0 ? rowPelmets : topPelmets.filter((p) => (!p.roomWindow || p.roomWindow === windowId || p.roomWindow === room));

            const rowChannels = safeParseArray(row.channelDetails);
            const initialChannels = rowChannels.length > 0 ? rowChannels : topChannels.filter((c) => (!c.roomWindow || c.roomWindow === windowId || c.roomWindow === room));

            const rowMotors = safeParseArray(row.motorDetails);
            const initialMotors = rowMotors.length > 0 ? rowMotors : topMotors.filter((m) => (!m.roomWindow || m.roomWindow === windowId || m.roomWindow === room));

            const rowWirings = safeParseArray(row.wiringDetails);
            const initialWirings = rowWirings.length > 0 ? rowWirings : (idx === 0 ? topWirings : []);

            return {
                id: row.id || `win-${Date.now()}-${idx}`,
                room: room,
                windowId: windowId,
                frameToFrameWidth: row.frameToFrameWidth ?? row.width ?? '',
                frameToFrameHeight: row.frameToFrameHeight ?? row.height ?? '',
                outToOutWidth: row.outToOutWidth ?? '',
                outToOutHeight: row.outToOutHeight ?? '',
                curtainReturnLeft: row.curtainReturnLeft ?? '',
                curtainReturnRight: row.curtainReturnRight ?? '',
                quantity: row.quantity ?? row.qty ?? 1,
                unit: row.unit || 'mm',
                width: row.width ?? row.frameToFrameWidth ?? '',
                height: row.height ?? row.frameToFrameHeight ?? '',
                pelmetDetails: initialPelmets,
                channelDetails: initialChannels,
                motorDetails: initialMotors,
                wiringDetails: initialWirings,
            };
        });
    });

    const [expandedRowIndex, setExpandedRowIndex] = useState(null);
    const [validationError, setValidationError] = useState(null);
    const [activeTab, setActiveTab] = useState('basic');

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

    // File Upload Handler for Drawings (With Version History)
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

    // Room List Helpers
    const addRoom = (roomName) => {
        const r = roomName.trim();
        if (!r || roomList.includes(r)) return;
        setRoomList([...roomList, r]);
        setNewRoomInput('');
    };

    const removeRoom = (index) => {
        setRoomList(roomList.filter((_, i) => i !== index));
    };

    // Measurement Grid Helpers
    const addGridRow = () => {
        const newWinId = `W-0${gridMeasurements.length + 1}`;
        const newRow = {
            id: `win-${Date.now()}-${gridMeasurements.length}`,
            room: roomList[0] || 'Living Room',
            windowId: newWinId,
            frameToFrameWidth: '',
            frameToFrameHeight: '',
            outToOutWidth: '',
            outToOutHeight: '',
            curtainReturnLeft: '',
            curtainReturnRight: '',
            quantity: 1,
            unit: 'mm',
            width: '',
            height: '',
            pelmetDetails: [],
            channelDetails: [],
            motorDetails: [],
            wiringDetails: [],
        };
        setGridMeasurements((prev) => [...prev, newRow]);
        setExpandedRowIndex(gridMeasurements.length);
    };

    const updateGridRowField = (idx, key, val) => {
        setGridMeasurements((prev) => prev.map((row, i) => i === idx ? { ...row, [key]: val } : row));
    };

    const removeGridRow = (idx) => {
        setGridMeasurements((prev) => prev.filter((_, i) => i !== idx));
        if (expandedRowIndex === idx) setExpandedRowIndex(null);
        else if (expandedRowIndex > idx) setExpandedRowIndex(expandedRowIndex - 1);
    };

    // Repeatable Subform Helpers inside Window Record
    const addPelmetToWindow = (winIdx) => {
        setGridMeasurements((prev) => prev.map((row, i) => {
            if (i !== winIdx) return row;
            const newPelmet = { roomWindow: row.windowId || row.room, pelmetType: 'Wooden Box', dimensions: '', notes: '' };
            return { ...row, pelmetDetails: [...(row.pelmetDetails || []), newPelmet] };
        }));
    };
    const updatePelmetInWindow = (winIdx, pelIdx, key, val) => {
        setGridMeasurements((prev) => prev.map((row, i) => {
            if (i !== winIdx) return row;
            const updatedPelmets = (row.pelmetDetails || []).map((p, pIdx) => pIdx === pelIdx ? { ...p, [key]: val } : p);
            return { ...row, pelmetDetails: updatedPelmets };
        }));
    };
    const removePelmetFromWindow = (winIdx, pelIdx) => {
        setGridMeasurements((prev) => prev.map((row, i) => {
            if (i !== winIdx) return row;
            return { ...row, pelmetDetails: (row.pelmetDetails || []).filter((_, pIdx) => pIdx !== pelIdx) };
        }));
    };

    const addChannelToWindow = (winIdx) => {
        setGridMeasurements((prev) => prev.map((row, i) => {
            if (i !== winIdx) return row;
            const newChannel = { roomWindow: row.windowId || row.room, channelType: 'Single Track', quantity: 1, dimensions: '' };
            return { ...row, channelDetails: [...(row.channelDetails || []), newChannel] };
        }));
    };
    const updateChannelInWindow = (winIdx, chIdx, key, val) => {
        setGridMeasurements((prev) => prev.map((row, i) => {
            if (i !== winIdx) return row;
            const updatedChannels = (row.channelDetails || []).map((c, cIdx) => cIdx === chIdx ? { ...c, [key]: val } : c);
            return { ...row, channelDetails: updatedChannels };
        }));
    };
    const removeChannelFromWindow = (winIdx, chIdx) => {
        setGridMeasurements((prev) => prev.map((row, i) => {
            if (i !== winIdx) return row;
            return { ...row, channelDetails: (row.channelDetails || []).filter((_, cIdx) => cIdx !== chIdx) };
        }));
    };

    const addMotorToWindow = (winIdx) => {
        setGridMeasurements((prev) => prev.map((row, i) => {
            if (i !== winIdx) return row;
            const newMotor = { motorType: 'Somfy WireFree', quantity: 1, specification: '', notes: '' };
            return { ...row, motorDetails: [...(row.motorDetails || []), newMotor] };
        }));
    };
    const updateMotorInWindow = (winIdx, mIdx, key, val) => {
        setGridMeasurements((prev) => prev.map((row, i) => {
            if (i !== winIdx) return row;
            const updatedMotors = (row.motorDetails || []).map((m, idx) => idx === mIdx ? { ...m, [key]: val } : m);
            return { ...row, motorDetails: updatedMotors };
        }));
    };
    const removeMotorFromWindow = (winIdx, mIdx) => {
        setGridMeasurements((prev) => prev.map((row, i) => {
            if (i !== winIdx) return row;
            return { ...row, motorDetails: (row.motorDetails || []).filter((_, idx) => idx !== mIdx) };
        }));
    };

    const addWiringToWindow = (winIdx) => {
        setGridMeasurements((prev) => prev.map((row, i) => {
            if (i !== winIdx) return row;
            const newWiring = { wiringAvailability: 'Available', location: '', powerRequirement: '230V AC', notes: '' };
            return { ...row, wiringDetails: [...(row.wiringDetails || []), newWiring] };
        }));
    };
    const updateWiringInWindow = (winIdx, wIdx, key, val) => {
        setGridMeasurements((prev) => prev.map((row, i) => {
            if (i !== winIdx) return row;
            const updatedWirings = (row.wiringDetails || []).map((w, idx) => idx === wIdx ? { ...w, [key]: val } : w);
            return { ...row, wiringDetails: updatedWirings };
        }));
    };
    const removeWiringFromWindow = (winIdx, wIdx) => {
        setGridMeasurements((prev) => prev.map((row, i) => {
            if (i !== winIdx) return row;
            return { ...row, wiringDetails: (row.wiringDetails || []).filter((_, idx) => idx !== wIdx) };
        }));
    };

    // Validation & Submission
    const submit = (e) => {
        e.preventDefault();
        setValidationError(null);

        if (form.measuredBy && !form.dueDate) {
            setValidationError('Measurement Due Date is required once a Measured By technician/installer is assigned.');
            setActiveTab('basic');
            return;
        }

        const processedGrid = gridMeasurements.map((row) => ({
            ...row,
            width: row.frameToFrameWidth || row.outToOutWidth || row.width || 0,
            height: row.frameToFrameHeight || row.outToOutHeight || row.height || 0,
        }));

        const aggregatedPelmets = processedGrid.flatMap((row) =>
            (row.pelmetDetails || []).map((p) => ({ ...p, roomWindow: p.roomWindow || row.windowId || row.room }))
        );
        const aggregatedChannels = processedGrid.flatMap((row) =>
            (row.channelDetails || []).map((c) => ({ ...c, roomWindow: c.roomWindow || row.windowId || row.room }))
        );
        const aggregatedMotors = processedGrid.flatMap((row) =>
            (row.motorDetails || []).map((m) => ({ ...m, roomWindow: m.roomWindow || row.windowId || row.room }))
        );
        const aggregatedWirings = processedGrid.flatMap((row) =>
            (row.wiringDetails || []).map((w) => ({ ...w, roomWindow: w.roomWindow || row.windowId || row.room }))
        );

        const payload = {
            ...form,
            dueDate: form.dueDate || undefined,
            date: form.date || undefined,
            measuredBy: form.measuredBy || undefined,
            attachments,
            drawings,
            roomList: roomList,
            pelmetDetails: aggregatedPelmets,
            channelDetails: aggregatedChannels,
            motorDetails: aggregatedMotors,
            wiringDetails: aggregatedWirings,
            notes: processedGrid,
        };

        execute(payload);
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Capture Measurement Details — ${item?.code || ''}`}
            subtitle={`Update site measurement configuration, grid records, and drawings for ${item?.clientName || ''}`}
            size="xl"
        >
            <form onSubmit={submit} className="space-y-4">
                {(error || validationError) && (
                    <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>{validationError || error?.message || String(error)}</span>
                    </div>
                )}

                {/* Tab Navigation (4 Tabs) */}
                <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('basic')}
                        className={`px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'basic' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Calendar className="w-3.5 h-3.5" /> Basic Info & Access
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('rooms')}
                        className={`px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'rooms' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Layers className="w-3.5 h-3.5" /> Room List ({roomList.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('grid')}
                        className={`px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'grid' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Grid className="w-3.5 h-3.5" /> Measurements Grid ({gridMeasurements.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('files')}
                        className={`px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'files' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Paperclip className="w-3.5 h-3.5" /> Photos & Drawings History ({attachments.length + drawings.length})
                    </button>
                </div>

                {/* TAB 1: BASIC INFO & SITE ACCESS */}
                {activeTab === 'basic' && (
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Measured By">
                                <Select
                                    value={form.measuredBy}
                                    onChange={set('measuredBy')}
                                    options={[
                                        { value: '', label: 'Select Employee / Installer...' },
                                        ...users.map((u) => ({ value: u._id || u.id, label: `${u.name || u.email} (${u.role || 'Installer'})` }))
                                    ]}
                                />
                            </Field>

                            <Field label={<span>Measurement Due Date {form.measuredBy ? <span className="text-rose-500 font-bold">*</span> : ''}</span>}>
                                <Input
                                    type="date"
                                    value={form.dueDate}
                                    onChange={set('dueDate')}
                                    className={form.measuredBy && !form.dueDate ? 'border-rose-400 focus:ring-rose-400' : ''}
                                />
                                {form.measuredBy && !form.dueDate && (
                                    <p className="text-[10px] text-rose-500 mt-1">Required once installer is assigned</p>
                                )}
                            </Field>

                            <Field label="Actual Measurement Date & Time">
                                <Input type="datetime-local" value={form.date} onChange={set('date')} />
                            </Field>

                            <Field label="Measurement Status">
                                <Select
                                    value={form.status}
                                    onChange={set('status')}
                                    options={STATUS_OPTIONS}
                                />
                            </Field>

                            <Field label="Site Access">
                                <Select
                                    value={form.siteAccess}
                                    onChange={set('siteAccess')}
                                    options={SITE_ACCESS_OPTIONS}
                                />
                            </Field>
                        </div>
                    </div>
                )}

                {/* TAB 2: REPEATABLE ROOM LIST */}
                {activeTab === 'rooms' && (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Repeatable Room Selection</h4>
                                <p className="text-[11px] text-slate-500">Select or create each room separately for measurement tracking</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Input
                                value={newRoomInput}
                                onChange={(e) => setNewRoomInput(e.target.value)}
                                placeholder="Type room name (e.g. Guest Bedroom 2, Study)..."
                                className="text-xs"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addRoom(newRoomInput);
                                    }
                                }}
                            />
                            <Button type="button" size="sm" onClick={() => addRoom(newRoomInput)} icon={Plus}>Add Room</Button>
                        </div>

                        {preSiteVisitRooms.length > 0 && (
                            <div className="space-y-2 p-3 bg-green-50/60 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                        Pre-Site Visit Selected Rooms ({preSiteVisitRooms.length})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const combined = Array.from(new Set([...roomList, ...preSiteVisitRooms]));
                                            setRoomList(combined);
                                        }}
                                        className="text-[11px] font-semibold text-green-600 dark:text-green-400 hover:underline"
                                    >
                                        + Add All Pre-Site Visit Rooms
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {preSiteVisitRooms.map((rm) => {
                                        const selected = roomList.includes(rm);
                                        return (
                                            <button
                                                key={rm}
                                                type="button"
                                                onClick={() => selected ? setRoomList(roomList.filter((r) => r !== rm)) : addRoom(rm)}
                                                className={`px-2.5 py-1 rounded-full text-xs transition border ${selected
                                                        ? 'bg-green-600 text-white border-green-600 font-semibold shadow-sm'
                                                        : 'bg-white dark:bg-slate-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:border-green-500'
                                                    }`}
                                            >
                                                {selected ? '✓ ' : '+ '}{rm}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quick Suggestions:</label>
                            <div className="flex flex-wrap gap-1.5">
                                {Array.from(new Set([...preSiteVisitRooms, ...STANDARD_ROOMS])).map((std) => {
                                    const selected = roomList.includes(std);
                                    return (
                                        <button
                                            key={std}
                                            type="button"
                                            onClick={() => selected ? setRoomList(roomList.filter((r) => r !== std)) : addRoom(std)}
                                            className={`px-2.5 py-1 rounded-full text-xs transition border ${selected
                                                    ? 'bg-brand-500/15 text-brand-700 border-brand-500/40 dark:text-brand-300 font-semibold'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-brand-300'
                                                }`}
                                        >
                                            {selected ? '✓ ' : '+ '}{std}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg min-h-[100px]">
                            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">Selected Rooms ({roomList.length})</label>
                            {roomList.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No rooms added yet. Click suggestions or type above.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {roomList.map((room, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg shadow-sm"
                                        >
                                            <span className="font-medium">{room}</span>
                                            <button type="button" onClick={() => removeRoom(idx)} className="text-slate-400 hover:text-rose-500 transition">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: CONSOLIDATED MEASUREMENTS GRID */}
                {activeTab === 'grid' && (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Measurements Grid — Room & Window Records</h4>
                                <p className="text-[11px] text-slate-500">
                                    Manage Frame to Frame, Out to Out, Curtain Returns (inches), and associated Pelmet, Channel, Motor & Wiring details per window.
                                </p>
                            </div>
                            <Button type="button" size="sm" icon={Plus} onClick={addGridRow}>+ Add Window Measurement</Button>
                        </div>

                        {gridMeasurements.length === 0 ? (
                            <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                                <Grid className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-xs text-slate-500">No measurement rows added yet.</p>
                                <Button type="button" size="sm" variant="outline" className="mt-2" onClick={addGridRow}>+ Add First Window</Button>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                                {gridMeasurements.map((row, idx) => {
                                    const isExpanded = expandedRowIndex === idx;
                                    const pelmetCount = row.pelmetDetails?.length || 0;
                                    const channelCount = row.channelDetails?.length || 0;
                                    const motorCount = row.motorDetails?.length || 0;
                                    const wiringCount = row.wiringDetails?.length || 0;

                                    return (
                                        <div key={row.id || idx} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 transition shadow-sm">
                                            {/* Summary Row Bar */}
                                            <div
                                                onClick={() => setExpandedRowIndex(isExpanded ? null : idx)}
                                                className={`p-3 flex items-center justify-between cursor-pointer transition ${isExpanded ? 'bg-brand-500/5 dark:bg-brand-950/20 border-b border-slate-200 dark:border-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
                                            >
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20">
                                                            {row.windowId || `W-0${idx + 1}`}
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                            {row.room || 'Living Room'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                                                        <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded font-mono">
                                                            <strong className="text-slate-700 dark:text-slate-300">F2F:</strong> {row.frameToFrameWidth || '—'}×{row.frameToFrameHeight || '—'} {row.unit}
                                                        </span>
                                                        <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded font-mono">
                                                            <strong className="text-slate-700 dark:text-slate-300">O2O:</strong> {row.outToOutWidth || '—'}×{row.outToOutHeight || '—'} {row.unit}
                                                        </span>
                                                        <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-mono">
                                                            <strong>Return:</strong> L: {row.curtainReturnLeft || 0} in | R: {row.curtainReturnRight || 0} in
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {pelmetCount > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                                                <Layers className="w-3 h-3" /> {pelmetCount} Pelmet
                                                            </span>
                                                        )}
                                                        {channelCount > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
                                                                <Settings className="w-3 h-3" /> {channelCount} Channel
                                                            </span>
                                                        )}
                                                        {motorCount > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30">
                                                                <Zap className="w-3 h-3" /> {motorCount} Motor
                                                            </span>
                                                        )}
                                                        {wiringCount > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                                                <Zap className="w-3 h-3" /> {wiringCount} Wiring
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); removeGridRow(idx); }}
                                                        className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                                                        title="Delete Window Measurement"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded Window Detail Form */}
                                            {isExpanded && (
                                                <div className="p-4 space-y-5 bg-slate-50/60 dark:bg-slate-900/40">
                                                    {/* Section 1: Basic Window Identifiers & Quantities */}
                                                    <div>
                                                        <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Basic Window Details</h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                                            <Field label="Room">
                                                                <Select
                                                                    value={row.room}
                                                                    onChange={(e) => updateGridRowField(idx, 'room', e.target.value)}
                                                                    options={Array.from(new Set([...roomList, 'Living Room', 'Master Bedroom', 'Bedroom 1', 'Guest Room', 'Dining Room'])).map((r) => ({ value: r, label: r }))}
                                                                />
                                                            </Field>

                                                            <Field label="Window ID">
                                                                <Input
                                                                    value={row.windowId}
                                                                    onChange={(e) => updateGridRowField(idx, 'windowId', e.target.value)}
                                                                    placeholder="e.g. W-01"
                                                                    className="font-mono"
                                                                />
                                                            </Field>

                                                            <Field label="Qty">
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    value={row.quantity}
                                                                    onChange={(e) => updateGridRowField(idx, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                                                                />
                                                            </Field>

                                                            <Field label="Unit">
                                                                <Select
                                                                    value={row.unit}
                                                                    onChange={(e) => updateGridRowField(idx, 'unit', e.target.value)}
                                                                    options={[
                                                                        { value: 'mm', label: 'mm' },
                                                                        { value: 'cm', label: 'cm' },
                                                                        { value: 'in', label: 'inches' },
                                                                        { value: 'ft', label: 'ft' },
                                                                    ]}
                                                                />
                                                            </Field>
                                                        </div>
                                                    </div>

                                                    {/* Section 2: Dimension Categories (Frame to Frame & Out to Out) */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {/* Frame to Frame */}
                                                        <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                                                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                                                                <span>Frame to Frame</span>
                                                                <span className="text-[10px] font-normal text-slate-400">Actual measured opening</span>
                                                            </label>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <Field label={`F2F Width (${row.unit})`}>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="e.g. 1800"
                                                                        value={row.frameToFrameWidth}
                                                                        onChange={(e) => updateGridRowField(idx, 'frameToFrameWidth', e.target.value)}
                                                                        className="text-xs font-mono"
                                                                    />
                                                                </Field>
                                                                <Field label={`F2F Height (${row.unit})`}>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="e.g. 2400"
                                                                        value={row.frameToFrameHeight}
                                                                        onChange={(e) => updateGridRowField(idx, 'frameToFrameHeight', e.target.value)}
                                                                        className="text-xs font-mono"
                                                                    />
                                                                </Field>
                                                            </div>
                                                        </div>

                                                        {/* Out to Out */}
                                                        <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                                                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                                                                <span>Out to Out</span>
                                                                <span className="text-[10px] font-normal text-slate-400">Track / pelmet outer span</span>
                                                            </label>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <Field label={`O2O Width (${row.unit})`}>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="e.g. 1900"
                                                                        value={row.outToOutWidth}
                                                                        onChange={(e) => updateGridRowField(idx, 'outToOutWidth', e.target.value)}
                                                                        className="text-xs font-mono"
                                                                    />
                                                                </Field>
                                                                <Field label={`O2O Height (${row.unit})`}>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="e.g. 2500"
                                                                        value={row.outToOutHeight}
                                                                        onChange={(e) => updateGridRowField(idx, 'outToOutHeight', e.target.value)}
                                                                        className="text-xs font-mono"
                                                                    />
                                                                </Field>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Section 3: Curtain Returns (Required in Inches) */}
                                                    <div className="p-3 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 rounded-lg space-y-2">
                                                        <label className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                                                            <span>Curtain Return Measurements</span>
                                                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Unit: Inches (in)</span>
                                                        </label>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <Field label="Curtain Return — Left (inches)">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="e.g. 6"
                                                                    value={row.curtainReturnLeft}
                                                                    onChange={(e) => updateGridRowField(idx, 'curtainReturnLeft', e.target.value)}
                                                                    className="text-xs font-mono"
                                                                />
                                                            </Field>
                                                            <Field label="Curtain Return — Right (inches)">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="e.g. 6"
                                                                    value={row.curtainReturnRight}
                                                                    onChange={(e) => updateGridRowField(idx, 'curtainReturnRight', e.target.value)}
                                                                    className="text-xs font-mono"
                                                                />
                                                            </Field>
                                                        </div>
                                                    </div>

                                                    {/* Section 4: Associated Pelmet Details Subform */}
                                                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-950 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                                <Layers className="w-4 h-4 text-amber-500" /> Pelmet Details ({row.pelmetDetails?.length || 0})
                                                            </h5>
                                                            <Button type="button" size="sm" variant="outline" icon={Plus} onClick={() => addPelmetToWindow(idx)}>+ Add Pelmet</Button>
                                                        </div>
                                                        {(!row.pelmetDetails || row.pelmetDetails.length === 0) ? (
                                                            <p className="text-xs text-slate-400 italic">No pelmet specified for this window.</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {row.pelmetDetails.map((pel, pIdx) => (
                                                                    <div key={pIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
                                                                        <Select
                                                                            value={pel.pelmetType}
                                                                            onChange={(e) => updatePelmetInWindow(idx, pIdx, 'pelmetType', e.target.value)}
                                                                            options={[
                                                                                { value: 'Wooden Box', label: 'Wooden Box' },
                                                                                { value: 'Recessed', label: 'Recessed Pelmet' },
                                                                                { value: 'Fabric Covered', label: 'Fabric Covered' },
                                                                                { value: 'Plasterboard', label: 'Plasterboard Coving' },
                                                                                { value: 'Metal', label: 'Metal Concealed' },
                                                                            ]}
                                                                            className="text-xs"
                                                                        />
                                                                        <Input
                                                                            placeholder="Dimensions (W x H x D)"
                                                                            value={pel.dimensions}
                                                                            onChange={(e) => updatePelmetInWindow(idx, pIdx, 'dimensions', e.target.value)}
                                                                            className="text-xs"
                                                                        />
                                                                        <div className="flex items-center gap-1">
                                                                            <Input
                                                                                placeholder="Notes"
                                                                                value={pel.notes}
                                                                                onChange={(e) => updatePelmetInWindow(idx, pIdx, 'notes', e.target.value)}
                                                                                className="text-xs flex-1"
                                                                            />
                                                                            <button type="button" onClick={() => removePelmetFromWindow(idx, pIdx)} className="p-1.5 text-slate-400 hover:text-rose-500">
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Section 5: Associated Channel Details Subform */}
                                                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-950 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                                <Settings className="w-4 h-4 text-indigo-500" /> Channel Details ({row.channelDetails?.length || 0})
                                                            </h5>
                                                            <Button type="button" size="sm" variant="outline" icon={Plus} onClick={() => addChannelToWindow(idx)}>+ Add Channel</Button>
                                                        </div>
                                                        {(!row.channelDetails || row.channelDetails.length === 0) ? (
                                                            <p className="text-xs text-slate-400 italic">No channel specified for this window.</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {row.channelDetails.map((ch, cIdx) => (
                                                                    <div key={cIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
                                                                        <Select
                                                                            value={ch.channelType}
                                                                            onChange={(e) => updateChannelInWindow(idx, cIdx, 'channelType', e.target.value)}
                                                                            options={[
                                                                                { value: 'Single Track', label: 'Single Track' },
                                                                                { value: 'Double Track', label: 'Double Track' },
                                                                                { value: 'Ceiling Recessed', label: 'Ceiling Recessed' },
                                                                                { value: 'Slimline', label: 'Slimline Track' },
                                                                                { value: 'Heavy Duty', label: 'Heavy Duty Motorised Track' },
                                                                            ]}
                                                                            className="text-xs"
                                                                        />
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="Qty"
                                                                            value={ch.quantity}
                                                                            onChange={(e) => updateChannelInWindow(idx, cIdx, 'quantity', Number(e.target.value))}
                                                                            className="text-xs"
                                                                        />
                                                                        <div className="flex items-center gap-1">
                                                                            <Input
                                                                                placeholder="Dimensions / Length"
                                                                                value={ch.dimensions}
                                                                                onChange={(e) => updateChannelInWindow(idx, cIdx, 'dimensions', e.target.value)}
                                                                                className="text-xs flex-1"
                                                                            />
                                                                            <button type="button" onClick={() => removeChannelFromWindow(idx, cIdx)} className="p-1.5 text-slate-400 hover:text-rose-500">
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Section 6: Associated Motor Details Subform */}
                                                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-950 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                                <Zap className="w-4 h-4 text-sky-500" /> Motor Details ({row.motorDetails?.length || 0})
                                                            </h5>
                                                            <Button type="button" size="sm" variant="outline" icon={Plus} onClick={() => addMotorToWindow(idx)}>+ Add Motor</Button>
                                                        </div>
                                                        {(!row.motorDetails || row.motorDetails.length === 0) ? (
                                                            <p className="text-xs text-slate-400 italic">No motor specified for this window.</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {row.motorDetails.map((m, mIdx) => (
                                                                    <div key={mIdx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
                                                                        <Select
                                                                            value={m.motorType}
                                                                            onChange={(e) => updateMotorInWindow(idx, mIdx, 'motorType', e.target.value)}
                                                                            options={[
                                                                                { value: 'Somfy WireFree', label: 'Somfy WireFree (Battery)' },
                                                                                { value: 'Somfy RTS 230V', label: 'Somfy RTS (230V AC)' },
                                                                                { value: 'Somfy Glydea', label: 'Somfy Glydea' },
                                                                                { value: 'Tuya Smart', label: 'Tuya / Zigbee Motor' },
                                                                                { value: 'Manual Control', label: 'Manual (No Motor)' },
                                                                            ]}
                                                                            className="text-xs"
                                                                        />
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="Qty"
                                                                            value={m.quantity}
                                                                            onChange={(e) => updateMotorInWindow(idx, mIdx, 'quantity', Number(e.target.value))}
                                                                            className="text-xs"
                                                                        />
                                                                        <Input
                                                                            placeholder="Specification"
                                                                            value={m.specification}
                                                                            onChange={(e) => updateMotorInWindow(idx, mIdx, 'specification', e.target.value)}
                                                                            className="text-xs"
                                                                        />
                                                                        <div className="flex items-center gap-1">
                                                                            <Input
                                                                                placeholder="Notes"
                                                                                value={m.notes}
                                                                                onChange={(e) => updateMotorInWindow(idx, mIdx, 'notes', e.target.value)}
                                                                                className="text-xs flex-1"
                                                                            />
                                                                            <button type="button" onClick={() => removeMotorFromWindow(idx, mIdx)} className="p-1.5 text-slate-400 hover:text-rose-500">
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Section 7: Associated Wiring Details Subform */}
                                                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-950 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                                <Zap className="w-4 h-4 text-emerald-500" /> Wiring Details ({row.wiringDetails?.length || 0})
                                                            </h5>
                                                            <Button type="button" size="sm" variant="outline" icon={Plus} onClick={() => addWiringToWindow(idx)}>+ Add Wiring Spec</Button>
                                                        </div>
                                                        {(!row.wiringDetails || row.wiringDetails.length === 0) ? (
                                                            <p className="text-xs text-slate-400 italic">No wiring details specified for this window.</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {row.wiringDetails.map((w, wIdx) => (
                                                                    <div key={wIdx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
                                                                        <Select
                                                                            value={w.wiringAvailability}
                                                                            onChange={(e) => updateWiringInWindow(idx, wIdx, 'wiringAvailability', e.target.value)}
                                                                            options={[
                                                                                { value: 'Available', label: 'Wiring Available' },
                                                                                { value: 'Restricted', label: 'Work In Progress' },
                                                                                { value: 'Not Available', label: 'Wiring Not Available' },
                                                                            ]}
                                                                            className="text-xs"
                                                                        />
                                                                        <Input
                                                                            placeholder="Location"
                                                                            value={w.location}
                                                                            onChange={(e) => updateWiringInWindow(idx, wIdx, 'location', e.target.value)}
                                                                            className="text-xs"
                                                                        />
                                                                        <Select
                                                                            value={w.powerRequirement}
                                                                            onChange={(e) => updateWiringInWindow(idx, wIdx, 'powerRequirement', e.target.value)}
                                                                            options={[
                                                                                { value: '230V AC', label: '230V AC Power Point' },
                                                                                { value: '24V DC', label: '24V DC Transformer' },
                                                                                { value: 'Battery/Solar', label: 'Battery / Solar Rechargeable' },
                                                                            ]}
                                                                            className="text-xs"
                                                                        />
                                                                        <div className="flex items-center gap-1">
                                                                            <Input
                                                                                placeholder="Notes"
                                                                                value={w.notes}
                                                                                onChange={(e) => updateWiringInWindow(idx, wIdx, 'notes', e.target.value)}
                                                                                className="text-xs flex-1"
                                                                            />
                                                                            <button type="button" onClick={() => removeWiringFromWindow(idx, wIdx)} className="p-1.5 text-slate-400 hover:text-rose-500">
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: SITE PHOTOS, DRAWINGS & VERSION HISTORY */}
                {activeTab === 'files' && (
                    <div className="space-y-6 pt-2">
                        {/* Section 1: Site Photos & Attachments */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Paperclip className="w-4 h-4 text-brand-500" />
                                    Site Photos / Measurement Attachments ({attachments.length})
                                </label>
                                <label
                                    htmlFor="measurement-file-upload"
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-brand-600 hover:bg-brand-700 text-white cursor-pointer transition ${uploadingAttachments ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    {uploadingAttachments ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-3.5 h-3.5" />
                                            <span>Upload Media / Photos</span>
                                        </>
                                    )}
                                </label>
                                <input
                                    id="measurement-file-upload"
                                    type="file"
                                    multiple
                                    accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={uploadingAttachments}
                                />
                            </div>

                            {attachments.length === 0 ? (
                                <p className="text-xs text-slate-400 italic p-3 text-center">No site photos uploaded.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                                    {attachments.map((att, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                                            <div className="flex items-center gap-2 truncate">
                                                <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                                <a href={getMediaUrl(att.url)} target="_blank" rel="noreferrer" className="truncate hover:underline font-medium text-slate-700 dark:text-slate-300">
                                                    {att.filename || `File ${i + 1}`}
                                                </a>
                                            </div>
                                            <button type="button" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Section 2: Drawings (Multiple files; retain version history) */}
                        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <FileCode className="w-4 h-4 text-purple-500" />
                                        Drawings / Blueprints (Version History Tracking) ({drawings.length})
                                    </label>
                                    <p className="text-[10px] text-slate-400">Multiple drawing versions retained automatically upon upload</p>
                                </div>
                                <label
                                    htmlFor="drawing-file-upload"
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-purple-600 hover:bg-purple-700 text-white cursor-pointer transition ${uploadingDrawings ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    {uploadingDrawings ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-3.5 h-3.5" />
                                            <span>Upload New Version</span>
                                        </>
                                    )}
                                </label>
                                <input
                                    id="drawing-file-upload"
                                    type="file"
                                    multiple
                                    accept="image/*,application/pdf,.dwg,.dxf"
                                    className="hidden"
                                    onChange={handleDrawingUpload}
                                    disabled={uploadingDrawings}
                                />
                            </div>

                            {drawings.length === 0 ? (
                                <p className="text-xs text-slate-400 italic p-3 text-center">No layout drawings uploaded.</p>
                            ) : (
                                <div className="space-y-2 max-h-44 overflow-y-auto">
                                    {drawings.map((dwg, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-lg text-xs">
                                            <div className="flex items-center gap-2 truncate">
                                                <Badge tone="purple">v{dwg.version || i + 1}</Badge>
                                                <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                                                <div className="truncate">
                                                    <a href={getMediaUrl(dwg.url)} target="_blank" rel="noreferrer" className="truncate hover:underline font-semibold text-purple-900 dark:text-purple-200 block">
                                                        {dwg.filename || `Drawing Version ${i + 1}`}
                                                    </a>
                                                    {dwg.uploadedAt && (
                                                        <span className="text-[9px] text-slate-400">{date(dwg.uploadedAt, { time: true })}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <a href={getMediaUrl(dwg.url)} target="_blank" rel="noreferrer" className="p-1 text-purple-600 hover:text-purple-800">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                                <button type="button" onClick={() => setDrawings(drawings.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                    <Button variant="primary" type="submit" loading={pending}>Save Changes</Button>
                </div>
            </form>
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
                            <tr onClick={() => onRowClick ? onRowClick(lead) : onView(lead)} key={lead.id || lead._id || idx} className="hover:bg-amber-500/5 dark:hover:bg-slate-900/80 transition group cursor-pointer">
                                <td className="border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 z-10 font-mono text-brand-600 dark:text-brand-400 font-semibold">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); onView(lead); }} className="hover:underline truncate px-2">
                                        {lead.code}
                                    </button>
                                </td>
                                {visibleSections.map((sec) =>
                                    sec.cols.filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
                                        <td key={col.key} className="p-4 border-r border-slate-200 dark:border-slate-800/60 whitespace-nowrap">
                                            {renderSpreadsheetCell(lead, col.key, idx + 1, onView, onEdit, users)}
                                        </td>
                                    ))
                                )}
                                <td className="p-2 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 text-right sticky right-0 z-10 border-l border-slate-200 dark:border-slate-800/80">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); onView(lead); }} />
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={(e) => { e.stopPropagation(); onEdit(lead); }} />
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
            const measuredBy = resolveUserName(lead.measurement?.measuredBy, usersData).toLowerCase();
            const roomList = String(lead.measurement?.roomList || '').toLowerCase();
            const motorDetails = String(lead.measurement?.motorDetails || '').toLowerCase();
            const wiringDetails = String(lead.measurement?.wiringDetails || '').toLowerCase();
            const notes = String(lead.measurement?.notes || '').toLowerCase();

            if (!code.includes(q) && !clientName.includes(q) && !measuredBy.includes(q) && !roomList.includes(q) && !motorDetails.includes(q) && !wiringDetails.includes(q) && !notes.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = visitedLeads.length;
    const completedCount = visitedLeads.filter((l) => l.measurement?.status === 'FINAL' || l.measurement?.status === 'COMPLETED' || l.measurement?.date).length;
    const pendingCount = visitedLeads.filter((l) => l.measurement?.status === 'PENDING' || l.measurement?.status === 'PROVISIONAL' || l.measurement?.status === 'REVISIT_REQUIRED').length;
    const siteAccessReady = visitedLeads.filter((l) => l.measurement?.siteAccess === 'Available').length;

    return (
        <div>
            <PageHeader
                title="Measurement Capture (Site Details)"
                subtitle="Track on-site measurement schedules, measured-by assignments, site access, pelmet/channel/motor details, versioned drawings, and measurement grids"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Total Measurement Leads" value={totalCount} sub="Active site pipeline" icon={Ruler} tone="teal" />
                <StatTile label="Completed Measurements" value={completedCount} sub="Site data captured" icon={CheckCircle2} tone="green" />
                <StatTile label="Pending Schedules" value={pendingCount} sub="Awaiting site visit" icon={Calendar} tone="amber" />
                <StatTile label="Site Access Available" value={siteAccessReady} sub="Ready for technician" icon={ClipboardList} tone="blue" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client name, measured by..."
                            className="pl-9"
                        />
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
                                className="w-48 text-xs"
                            />
                        </div>

                        <ViewSwitcher view={viewMode} onViewChange={setViewMode} />

                        {(statusFilter !== 'ALL' || search || selectedSection !== 's4') && (
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
                    <Loading text="Loading Measurement Details..." />
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
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingLead(lead)}
                    onRowClick={(lead) => setDrawerLead(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's4')}
                    users={usersData}
                />
            )}

            {editingLead && (
                <EditMeasurementModal
                    item={editingLead}
                    onClose={() => setEditingLead(null)}
                    onDone={reload}
                    users={usersData || []}
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

export default MeasurementCapture;
