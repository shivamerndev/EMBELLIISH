import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, Pencil, Ruler, Calendar, CheckCircle2, Paperclip, ClipboardList,
    Upload, Loader2, Trash2, ExternalLink, Image as ImageIcon, FileText, Plus, X,
    Layers, Zap, Settings, Grid, AlertCircle, Clock, ShieldAlert, FileCode
} from 'lucide-react';
import { leadsApi, usersApi, uploadApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { date, getMediaUrl } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
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

    // Repeatable Pelmet Details
    const [pelmetDetails, setPelmetDetails] = useState(() => {
        const parsed = safeParseArray(item?.measurement?.pelmetDetails);
        if (parsed.length) return parsed;
        const raw = item?.measurement?.pelmetDetails;
        return raw ? [{ roomWindow: '', pelmetType: 'Wooden Box', dimensions: raw, notes: '' }] : [];
    });

    // Repeatable Channel Details
    const [channelDetails, setChannelDetails] = useState(() => {
        const parsed = safeParseArray(item?.measurement?.channelDetails);
        if (parsed.length) return parsed;
        const raw = item?.measurement?.channelDetails;
        return raw ? [{ roomWindow: '', channelType: 'Single Track', quantity: 1, dimensions: raw }] : [];
    });

    // Repeatable Motor Details
    const [motorDetails, setMotorDetails] = useState(() => {
        const parsed = safeParseArray(item?.measurement?.motorDetails);
        if (parsed.length) return parsed;
        const raw = item?.measurement?.motorDetails;
        return raw ? [{ motorType: 'Somfy WireFree', quantity: 1, specification: '', notes: raw }] : [];
    });

    // Repeatable Wiring Details
    const [wiringDetails, setWiringDetails] = useState(() => {
        const parsed = safeParseArray(item?.measurement?.wiringDetails);
        if (parsed.length) return parsed;
        const raw = item?.measurement?.wiringDetails;
        return raw ? [{ wiringAvailability: 'Available', location: '', powerRequirement: '230V AC', notes: raw }] : [];
    });

    // Repeatable Measurements Grid
    const [gridMeasurements, setGridMeasurements] = useState(() => {
        const parsed = safeParseArray(item?.measurement?.notes);
        if (parsed.length) return parsed;
        return [];
    });

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

    // Pelmet Helpers
    const addPelmetRow = () => setPelmetDetails([...pelmetDetails, { roomWindow: '', pelmetType: 'Wooden Box', dimensions: '', notes: '' }]);
    const updatePelmetRow = (i, key, val) => setPelmetDetails(pelmetDetails.map((row, idx) => idx === i ? { ...row, [key]: val } : row));
    const removePelmetRow = (i) => setPelmetDetails(pelmetDetails.filter((_, idx) => idx !== i));

    // Channel Helpers
    const addChannelRow = () => setChannelDetails([...channelDetails, { roomWindow: '', channelType: 'Single Track', quantity: 1, dimensions: '' }]);
    const updateChannelRow = (i, key, val) => setChannelDetails(channelDetails.map((row, idx) => idx === i ? { ...row, [key]: val } : row));
    const removeChannelRow = (i) => setChannelDetails(channelDetails.filter((_, idx) => idx !== i));

    // Motor Helpers
    const addMotorRow = () => setMotorDetails([...motorDetails, { motorType: 'Somfy WireFree', quantity: 1, specification: '', notes: '' }]);
    const updateMotorRow = (i, key, val) => setMotorDetails(motorDetails.map((row, idx) => idx === i ? { ...row, [key]: val } : row));
    const removeMotorRow = (i) => setMotorDetails(motorDetails.filter((_, idx) => idx !== i));

    // Wiring Helpers
    const addWiringRow = () => setWiringDetails([...wiringDetails, { wiringAvailability: 'Available', location: '', powerRequirement: '230V AC', notes: '' }]);
    const updateWiringRow = (i, key, val) => setWiringDetails(wiringDetails.map((row, idx) => idx === i ? { ...row, [key]: val } : row));
    const removeWiringRow = (i) => setWiringDetails(wiringDetails.filter((_, idx) => idx !== i));

    // Measurement Grid Helpers
    const addGridRow = () => setGridMeasurements([...gridMeasurements, { room: roomList[0] || 'Living Room', windowId: `W-0${gridMeasurements.length + 1}`, width: '', height: '', quantity: 1, unit: 'mm' }]);
    const updateGridRow = (i, key, val) => setGridMeasurements(gridMeasurements.map((row, idx) => idx === i ? { ...row, [key]: val } : row));
    const removeGridRow = (i) => setGridMeasurements(gridMeasurements.filter((_, idx) => idx !== i));

    // Validation & Submission
    const submit = (e) => {
        e.preventDefault();
        setValidationError(null);

        // Validation Rule: Required once the measurement person is assigned
        if (form.measuredBy && !form.dueDate) {
            setValidationError('Measurement Due Date is required once a Measured By technician/installer is assigned.');
            setActiveTab('basic');
            return;
        }

        const payload = {
            ...form,
            dueDate: form.dueDate || undefined,
            date: form.date || undefined,
            measuredBy: form.measuredBy || undefined,
            attachments,
            drawings,
            roomList: roomList,
            pelmetDetails: pelmetDetails,
            channelDetails: channelDetails,
            motorDetails: motorDetails,
            wiringDetails: wiringDetails,
            notes: gridMeasurements,
        };

        execute(payload);
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Capture Measurement Details — ${item?.code || ''}`}
            subtitle={`Update site measurement configuration, repeaters, and drawings for ${item?.clientName || ''}`}
            size="xl"
        >
            <form onSubmit={submit} className="space-y-4">
                {(error || validationError) && (
                    <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>{validationError || error?.message || String(error)}</span>
                    </div>
                )}

                {/* Tab Navigation */}
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
                        onClick={() => setActiveTab('subforms')}
                        className={`px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'subforms' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Settings className="w-3.5 h-3.5" /> Pelmet, Channel, Motor & Wiring
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

                        {/* Pre-Site Visit Selected Rooms */}
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

                {/* TAB 3: REPEATABLE SUBFORMS (PELMET, CHANNEL, MOTOR, WIRING) */}
                {activeTab === 'subforms' && (
                    <div className="space-y-6 pt-2 max-h-[50vh] overflow-y-auto pr-1">
                        {/* 1. Pelmet Details */}
                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/40">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <Layers className="w-4 h-4 text-amber-500" /> Pelmet Details Subform ({pelmetDetails.length})
                                </h4>
                                <Button type="button" size="sm" variant="outline" icon={Plus} onClick={addPelmetRow}>Add Pelmet</Button>
                            </div>
                            {pelmetDetails.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No pelmet details specified.</p>
                            ) : (
                                <div className="space-y-2">
                                    {pelmetDetails.map((row, idx) => (
                                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
                                            <Input
                                                placeholder="Room / Window ID"
                                                value={row.roomWindow}
                                                onChange={(e) => updatePelmetRow(idx, 'roomWindow', e.target.value)}
                                                className="text-xs"
                                            />
                                            <Select
                                                value={row.pelmetType}
                                                onChange={(e) => updatePelmetRow(idx, 'pelmetType', e.target.value)}
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
                                                value={row.dimensions}
                                                onChange={(e) => updatePelmetRow(idx, 'dimensions', e.target.value)}
                                                className="text-xs"
                                            />
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    placeholder="Notes"
                                                    value={row.notes}
                                                    onChange={(e) => updatePelmetRow(idx, 'notes', e.target.value)}
                                                    className="text-xs flex-1"
                                                />
                                                <button type="button" onClick={() => removePelmetRow(idx)} className="p-1.5 text-slate-400 hover:text-rose-500">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 2. Channel Details */}
                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/40">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <Settings className="w-4 h-4 text-indigo-500" /> Channel Details Subform ({channelDetails.length})
                                </h4>
                                <Button type="button" size="sm" variant="outline" icon={Plus} onClick={addChannelRow}>Add Channel</Button>
                            </div>
                            {channelDetails.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No channel details specified.</p>
                            ) : (
                                <div className="space-y-2">
                                    {channelDetails.map((row, idx) => (
                                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
                                            <Input
                                                placeholder="Room / Window ID"
                                                value={row.roomWindow}
                                                onChange={(e) => updateChannelRow(idx, 'roomWindow', e.target.value)}
                                                className="text-xs"
                                            />
                                            <Select
                                                value={row.channelType}
                                                onChange={(e) => updateChannelRow(idx, 'channelType', e.target.value)}
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
                                                value={row.quantity}
                                                onChange={(e) => updateChannelRow(idx, 'quantity', Number(e.target.value))}
                                                className="text-xs"
                                            />
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    placeholder="Dimensions (Length mm)"
                                                    value={row.dimensions}
                                                    onChange={(e) => updateChannelRow(idx, 'dimensions', e.target.value)}
                                                    className="text-xs flex-1"
                                                />
                                                <button type="button" onClick={() => removeChannelRow(idx)} className="p-1.5 text-slate-400 hover:text-rose-500">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 3. Motor Details */}
                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/40">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <Zap className="w-4 h-4 text-sky-500" /> Motor Details Subform ({motorDetails.length})
                                </h4>
                                <Button type="button" size="sm" variant="outline" icon={Plus} onClick={addMotorRow}>Add Motor</Button>
                            </div>
                            {motorDetails.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No motor details specified.</p>
                            ) : (
                                <div className="space-y-2">
                                    {motorDetails.map((row, idx) => (
                                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
                                            <Select
                                                value={row.motorType}
                                                onChange={(e) => updateMotorRow(idx, 'motorType', e.target.value)}
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
                                                value={row.quantity}
                                                onChange={(e) => updateMotorRow(idx, 'quantity', Number(e.target.value))}
                                                className="text-xs"
                                            />
                                            <Input
                                                placeholder="Specification (Nm / Volt / Remote)"
                                                value={row.specification}
                                                onChange={(e) => updateMotorRow(idx, 'specification', e.target.value)}
                                                className="text-xs"
                                            />
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    placeholder="Notes"
                                                    value={row.notes}
                                                    onChange={(e) => updateMotorRow(idx, 'notes', e.target.value)}
                                                    className="text-xs flex-1"
                                                />
                                                <button type="button" onClick={() => removeMotorRow(idx)} className="p-1.5 text-slate-400 hover:text-rose-500">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 4. Wiring Details */}
                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/40">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <Zap className="w-4 h-4 text-emerald-500" /> Wiring Details Subform ({wiringDetails.length})
                                </h4>
                                <Button type="button" size="sm" variant="outline" icon={Plus} onClick={addWiringRow}>Add Wiring Spec</Button>
                            </div>
                            {wiringDetails.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No wiring details specified.</p>
                            ) : (
                                <div className="space-y-2">
                                    {wiringDetails.map((row, idx) => (
                                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
                                            <Select
                                                value={row.wiringAvailability}
                                                onChange={(e) => updateWiringRow(idx, 'wiringAvailability', e.target.value)}
                                                options={[
                                                    { value: 'Available', label: 'Wiring Available' },
                                                    { value: 'Restricted', label: 'Work In Progress' },
                                                    { value: 'Not Available', label: 'Wiring Not Available' },
                                                ]}
                                                className="text-xs"
                                            />
                                            <Input
                                                placeholder="Location (e.g. Top Right Corner)"
                                                value={row.location}
                                                onChange={(e) => updateWiringRow(idx, 'location', e.target.value)}
                                                className="text-xs"
                                            />
                                            <Select
                                                value={row.powerRequirement}
                                                onChange={(e) => updateWiringRow(idx, 'powerRequirement', e.target.value)}
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
                                                    value={row.notes}
                                                    onChange={(e) => updateWiringRow(idx, 'notes', e.target.value)}
                                                    className="text-xs flex-1"
                                                />
                                                <button type="button" onClick={() => removeWiringRow(idx)} className="p-1.5 text-slate-400 hover:text-rose-500">
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

                {/* TAB 4: REPEATABLE MEASUREMENTS GRID */}
                {activeTab === 'grid' && (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Repeatable Measurement Grid</h4>
                                <p className="text-[11px] text-slate-500">Capture room, window ID, width, height, quantity and measurement unit</p>
                            </div>
                            <Button type="button" size="sm" icon={Plus} onClick={addGridRow}>Add Window Measurement</Button>
                        </div>

                        {gridMeasurements.length === 0 ? (
                            <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                                <Grid className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-xs text-slate-500">No measurement rows added yet.</p>
                                <Button type="button" size="sm" variant="outline" className="mt-2" onClick={addGridRow}>Add First Window</Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg max-h-[45vh] overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 font-semibold text-slate-700 dark:text-slate-300">
                                        <tr>
                                            <th className="p-2">Room</th>
                                            <th className="p-2">Window ID</th>
                                            <th className="p-2">Width</th>
                                            <th className="p-2">Height</th>
                                            <th className="p-2 w-20">Qty</th>
                                            <th className="p-2 w-24">Unit</th>
                                            <th className="p-2 w-10 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                                        {gridMeasurements.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="p-2">
                                                    <Input
                                                        value={row.room}
                                                        onChange={(e) => updateGridRow(idx, 'room', e.target.value)}
                                                        placeholder="Room"
                                                        className="text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        value={row.windowId}
                                                        onChange={(e) => updateGridRow(idx, 'windowId', e.target.value)}
                                                        placeholder="W-01"
                                                        className="text-xs font-mono"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        value={row.width}
                                                        onChange={(e) => updateGridRow(idx, 'width', e.target.value)}
                                                        placeholder="e.g. 1800"
                                                        className="text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        value={row.height}
                                                        onChange={(e) => updateGridRow(idx, 'height', e.target.value)}
                                                        placeholder="e.g. 2400"
                                                        className="text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        value={row.quantity}
                                                        onChange={(e) => updateGridRow(idx, 'quantity', Number(e.target.value))}
                                                        className="text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Select
                                                        value={row.unit}
                                                        onChange={(e) => updateGridRow(idx, 'unit', e.target.value)}
                                                        options={[
                                                            { value: 'mm', label: 'mm' },
                                                            { value: 'cm', label: 'cm' },
                                                            { value: 'in', label: 'inches' },
                                                            { value: 'ft', label: 'ft' },
                                                        ]}
                                                        className="text-xs"
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button type="button" onClick={() => removeGridRow(idx)} className="p-1 text-slate-400 hover:text-rose-500">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 5: SITE PHOTOS, DRAWINGS & VERSION HISTORY */}
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
                                <p className="text-xs text-slate-400 italic p-3  text-center">No site photos uploaded.</p>
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
