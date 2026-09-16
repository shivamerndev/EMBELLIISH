import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, Pencil, Ruler, Calendar, CheckCircle2, Paperclip, ClipboardList, Upload, Loader2, Trash2, ExternalLink, Plus, X, Layers, Zap, Settings, Grid, AlertCircle, Clock, FileCode, FileText } from 'lucide-react';
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
import MeasurementToolbar from '../../components/measurement/MeasurementToolbar';
import ExcelMeasurementGrid from '../../components/measurement/ExcelMeasurementGrid';
import MeasurementDetailsDrawer from '../../components/measurement/MeasurementDetailsDrawer';
import MeasurementSkeleton from '../../components/measurement/MeasurementSkeleton';
import AddWindowMeasurementModal from '../../components/measurement/AddWindowMeasurementModal';
import PhysicalMeasurementSheet from '../../components/measurement/MeasurementCapture';


const SPREADSHEET_SECTIONS = [
    {
        id: 's4',
        title: 'Measurement (Site Details)',
        color: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/90 dark:text-teal-200 dark:border-teal-700/80',
        // All fields — shown in DetailedDrawer
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
        ],
        // Subset of cols shown in the table (prevents horizontal scrolling)
        tableCols: [
            { key: 'actualSiteVisitDateTime', label: 'Actual Visit Time' },
            { key: 'measurement.dueDate', label: 'Due Date' },
            { key: 'delayStatus', label: 'SLA Status' },
            { key: 'measurement.measuredBy', label: 'Measured By' },
            { key: 'measurement.status', label: 'Status' },
            { key: 'measurement.siteAccess', label: 'Site Access' },
        ]
    }
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

    // ExcelMeasurementGrid workspace states inside modal
    const [workspaceSearch, setWorkspaceSearch] = useState('');
    const [workspaceRoomFilter, setWorkspaceRoomFilter] = useState('ALL');
    const [workspaceTypeFilter, setWorkspaceTypeFilter] = useState('ALL');
    const [columnVisibility, setColumnVisibility] = useState({
        windowSize: true,
        pelmetSize: true,
        wire: true,
        returnSize: true,
        fabricRequirement: true,
    });
    const [lastAddedRoom, setLastAddedRoom] = useState('');
    const [inspectorRowIndex, setInspectorRowIndex] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [saveState, setSaveState] = useState('saved');

    const gridRows = gridMeasurements;

    const handleGridRowsUpdate = (newRows) => {
        setGridMeasurements(newRows);
        setSaveState('unsaved');
    };

    const handleOpenRowDetails = (row, rowIndex) => {
        setInspectorRowIndex(rowIndex);
    };

    const handleSaveRowDetails = (rowIndex, updatedRow) => {
        if (rowIndex === null || rowIndex === undefined) return;
        const updated = [...gridMeasurements];
        updated[rowIndex] = updatedRow;
        setGridMeasurements(updated);
        setSaveState('unsaved');
    };

    const handleToggleColumnGroup = (groupKey) => {
        setColumnVisibility((prev) => ({
            ...prev,
            [groupKey]: !prev[groupKey],
        }));
    };

    const handleConfirmAddMeasurement = (newRow) => {
        setGridMeasurements((prev) => [...prev, newRow]);
        setLastAddedRoom(newRow.room);
        setSaveState('unsaved');
    };

    const modalAvailableRooms = useMemo(() => {
        const roomsSet = new Set();
        (roomList || []).forEach((r) => roomsSet.add(r));
        (gridMeasurements || []).forEach((r) => {
            if (r.room) roomsSet.add(r.room);
        });
        return Array.from(roomsSet);
    }, [gridMeasurements, roomList]);

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
    const dueDateOnly = form.dueDate ? form.dueDate.split('T')[0] : '';
    const actualDateOnly = form.date ? form.date.split('T')[0] : '';
    const isActualDateBeforeDueDate = Boolean(
        dueDateOnly && actualDateOnly && actualDateOnly < dueDateOnly
    );

    const submit = (e) => {
        e.preventDefault();
        setValidationError(null);

        if (form.measuredBy && !form.dueDate) {
            setValidationError('Measurement Due Date is required once a Measured By technician/installer is assigned.');
            setActiveTab('basic');
            return;
        }

        if (isActualDateBeforeDueDate) {
            setValidationError(`Actual Measurement Date & Time cannot be earlier than Measurement Due Date (${dueDateOnly}).`);
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

        let measuredById = form.measuredBy;
        if (typeof measuredById === 'object' && measuredById !== null) {
            measuredById = measuredById._id || measuredById.id || '';
        }
        if (typeof measuredById === 'string') {
            measuredById = measuredById.trim();
        }

        const payload = {
            ...form,
            dueDate: form.dueDate || undefined,
            date: form.date || undefined,
            measuredBy: measuredById || undefined,
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
            title={`Capture Measurement Details — ${item?.clientName || ''}`}
            size="full"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>Status: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{form.status}</strong></span>
                        {form.measuredBy && (
                            <span>Technician: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{resolveUserName(form.measuredBy, users)}</strong></span>
                        )}
                        <span>Windows: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{gridRows.length}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
                            Close
                        </Button>
                        <Button type="button" variant="primary" size="sm" onClick={submit} disabled={pending} icon={pending ? Loader2 : CheckCircle2}>
                            {pending ? 'Saving…' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            }        >

            <div className="space-y-3">
                {/* Navigation Tabs */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5">

                        <button type="button" onClick={() => setActiveTab('basic')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'basic'
                                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}>

                            <ClipboardList className="w-3.5 h-3.5" />
                            <span>Site Details & Technician</span>
                        </button>


                        <button type="button" onClick={() => setActiveTab('sheet')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'sheet'
                                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}>
                            <FileText className="w-3.5 h-3.5" />
                            <span>Physical Sheet</span>
                        </button>

                    </div>
                </div>

                {/* Validation Error */}
                {validationError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{validationError}</span>
                    </div>
                )}


                {/* TAB: Physical Sheet View (PDF Format) */}
                {activeTab === 'sheet' && (
                    <PhysicalMeasurementSheet
                        lead={item}
                        preSiteVisitRooms={roomList && roomList.length > 0 ? roomList : preSiteVisitRooms}
                        initialData={{
                            rooms: roomList && roomList.length > 0 ? roomList : preSiteVisitRooms,
                            header: {
                                company: 'Embellish',
                                client: item.clientName || '',
                                siteAddress: item.siteAddress || '',
                                date: form.date ? form.date.slice(0, 10) : form.dueDate ? form.dueDate.slice(0, 10) : '',
                                siteVisitedBy: resolveUserName(form.measuredBy, users),
                                srNo: item.code || '',
                            },
                            rows: gridRows.map((r, i) => ({
                                id: r.id || `row-${i}`,
                                srNo: i + 1,
                                area: r.room || '',
                                lWindowDetail: r.windowId || '',
                                outToOutWidth: r.outToOutWidth ?? r.o2oWidth ?? '',
                                outToOutHeight: r.outToOutHeight ?? r.o2oHeight ?? '',
                                frameToFrameWidth: r.frameToFrameWidth ?? r.f2fWidth ?? '',
                                frameToFrameHeight: r.frameToFrameHeight ?? r.f2fHeight ?? '',
                                pelmetOutOutWidth: r.pelmetO2oWidth ?? '',
                                pelmetOutOutDrop: r.pelmetO2oDrop ?? '',
                                pelmetFrameFrameWidth: r.pelmetF2fWidth ?? '',
                                pelmetFrameFrameDrop: r.pelmetF2fDrop ?? '',
                                sidesOfRoman: r.sidesOfRoman ?? '',
                                ceilingSupport: r.ceilingSupport ?? '',
                                wire: Boolean(r.wireLeft || r.wireRight || r.wire),
                                sideWall: r.sideWall || '',
                                remarks: r.remarks || '',
                            })),
                        }}
                        onSave={(sheetData) => {
                            if (sheetData?.rows) {
                                const mappedRows = sheetData.rows.map((sr, idx) => ({
                                    id: sr.id || `win-${Date.now()}-${idx}`,
                                    room: sr.area || 'Living Room',
                                    windowId: sr.lWindowDetail || `W-0${idx + 1}`,
                                    outToOutWidth: sr.outToOutWidth || '',
                                    outToOutHeight: sr.outToOutHeight || '',
                                    frameToFrameWidth: sr.frameToFrameWidth || '',
                                    frameToFrameHeight: sr.frameToFrameHeight || '',
                                    pelmetO2oWidth: sr.pelmetOutOutWidth || '',
                                    pelmetO2oDrop: sr.pelmetOutOutDrop || '',
                                    pelmetF2fWidth: sr.pelmetFrameFrameWidth || '',
                                    pelmetF2fDrop: sr.pelmetFrameFrameDrop || '',
                                    sidesOfRoman: sr.sidesOfRoman || '',
                                    ceilingSupport: sr.ceilingSupport || '',
                                    wireLeft: sr.wire,
                                    wireRight: sr.wire,
                                    sideWall: sr.sideWall || '',
                                    remarks: sr.remarks || '',
                                }));
                                handleGridRowsUpdate(mappedRows);
                            }
                        }}
                    />
                )}

                {/* TAB 2: Site Details & Technician */}
                {activeTab === 'basic' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Measurement Due Date">
                                <Input
                                    type="date"
                                    value={form.dueDate}
                                    onChange={set('dueDate')}
                                />
                            </Field>
                            <Field label="Actual Measurement Date & Time">
                                <Input
                                    type="datetime-local"
                                    value={form.date}
                                    onChange={set('date')}
                                />
                                {isActualDateBeforeDueDate && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Actual date is before the due date.
                                    </p>
                                )}
                            </Field>
                            <Field label="Measured By (Technician / Installer)">
                                <Select
                                    value={form.measuredBy}
                                    onChange={set('measuredBy')}
                                    options={[
                                        { value: '', label: '— Select Technician —' },
                                        ...(users || []).map((u) => ({ value: u._id || u.id, label: u.name || u.email })),
                                    ]}
                                />
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

                        {/* Room list setup */}
                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Configured Rooms</h4>
                            <div className="flex gap-2">
                                <Input
                                    value={newRoomInput}
                                    onChange={(e) => setNewRoomInput(e.target.value)}
                                    placeholder="Add custom room name..."
                                    className="flex-1 text-xs"
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRoom(newRoomInput); } }}
                                />
                                <Button type="button" variant="outline" size="sm" icon={Plus} onClick={() => addRoom(newRoomInput)}>
                                    Add Room
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {roomList.map((r, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs"
                                    >
                                        {r}
                                        <button
                                            type="button"
                                            onClick={() => removeRoom(i)}
                                            className="ml-0.5 text-slate-400 hover:text-rose-500 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Row Details Inspector Drawer */}
            <MeasurementDetailsDrawer
                open={inspectorRowIndex !== null}
                row={inspectorRowIndex !== null ? gridRows[inspectorRowIndex] : null}
                rowIndex={inspectorRowIndex}
                onClose={() => setInspectorRowIndex(null)}
                onSaveRowDetails={handleSaveRowDetails}
            />

            {/* Add Window Measurement Modal */}
            <AddWindowMeasurementModal
                open={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddMeasurement={handleConfirmAddMeasurement}
                availableRooms={modalAvailableRooms}
                existingRows={gridRows}
                preselectedRoom={workspaceRoomFilter !== 'ALL' ? workspaceRoomFilter : ''}
            />
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
                                <td className="border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 z-10 font-mono text-brand-600 dark:text-brand-400 font-semibold">
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

    // Selected lead for active workspace editing
    const [activeLeadId, setActiveLeadId] = useState('');
    const [gridRows, setGridRows] = useState([]);
    const [saveState, setSaveState] = useState('saved'); // 'saved', 'saving', 'unsaved', 'error'
    const [isSaving, setIsSaving] = useState(false);

    // Add Window Measurement Modal & Room auto-expansion state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [lastAddedRoom, setLastAddedRoom] = useState('');

    // Workspace search & filters
    const [workspaceSearch, setWorkspaceSearch] = useState('');
    const [workspaceRoomFilter, setWorkspaceRoomFilter] = useState('ALL');
    const [workspaceTypeFilter, setWorkspaceTypeFilter] = useState('ALL');
    const [columnVisibility, setColumnVisibility] = useState({
        windowSize: true,
        pelmetSize: true,
        wire: true,
        returnSize: true,
        fabricRequirement: true,
    });

    // Inspector Drawer State for row details
    const [inspectorRowIndex, setInspectorRowIndex] = useState(null);

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

    // Auto-select initial lead for workspace
    useEffect(() => {
        if (filteredLeads.length > 0 && !activeLeadId) {
            const firstId = filteredLeads[0].id || filteredLeads[0]._id;
            setActiveLeadId(firstId);
        }
    }, [filteredLeads, activeLeadId]);

    // Sync active lead's grid rows when activeLeadId changes or leads reload
    const activeLead = useMemo(() => {
        return filteredLeads.find((l) => (l.id || l._id) === activeLeadId) || filteredLeads[0] || null;
    }, [filteredLeads, activeLeadId]);

    useEffect(() => {
        if (activeLead?.measurement?.notes) {
            const parsed = safeParseArray(activeLead.measurement.notes);
            if (parsed.length > 0) {
                setGridRows(parsed);
            } else {
                setGridRows([]);
            }
            setSaveState('saved');
        } else {
            setGridRows([]);
            setSaveState('saved');
        }
    }, [activeLead]);

    // Handle grid row updates
    const handleGridRowsUpdate = (newRows) => {
        setGridRows(newRows);
        setSaveState('unsaved');
    };


    // Open Add Window Measurement Modal
    const handleOpenAddWindowModal = () => {
        setIsAddModalOpen(true);
    };

    // Confirm creation of new window measurement in selected room
    const handleConfirmAddMeasurement = (newRow) => {
        setGridRows((prevRows) => [...prevRows, newRow]);
        setLastAddedRoom(newRow.room);
        setSaveState('unsaved');
    };

    // Toggle column visibility groups
    const handleToggleColumnGroup = (groupKey) => {
        setColumnVisibility((prev) => ({
            ...prev,
            [groupKey]: !prev[groupKey],
        }));
    };

    // Inspector Drawer handlers
    const handleOpenRowDetails = (row, rowIndex) => {
        setInspectorRowIndex(rowIndex);
    };

    const handleSaveRowDetails = (rowIndex, updatedRow) => {
        if (rowIndex === null || rowIndex === undefined) return;
        const updatedRows = [...gridRows];
        updatedRows[rowIndex] = updatedRow;
        handleGridRowsUpdate(updatedRows);
    };

    // Aggregate dynamic room list options for workspace toolbar & modal dropdown
    const availableRooms = useMemo(() => {
        const roomsSet = new Set();
        if (activeLead?.measurement?.roomList) {
            safeParseArray(activeLead.measurement.roomList).forEach((r) => roomsSet.add(r));
        }
        if (activeLead?.rooms) {
            safeParseArray(activeLead.rooms).forEach((r) => roomsSet.add(r));
        }
        gridRows.forEach((r) => {
            if (r.room) roomsSet.add(r.room);
        });
        return Array.from(roomsSet);
    }, [gridRows, activeLead]);

    const totalCount = visitedLeads.length;
    const completedCount = visitedLeads.filter((l) => l.measurement?.status === 'FINAL' || l.measurement?.status === 'COMPLETED' || l.measurement?.date).length;
    const pendingCount = visitedLeads.filter((l) => l.measurement?.status === 'PENDING' || l.measurement?.status === 'PROVISIONAL' || l.measurement?.status === 'REVISIT_REQUIRED').length;
    const siteAccessReady = visitedLeads.filter((l) => l.measurement?.siteAccess === 'Available').length;

    return (
        <div className="space-y-4">
            <PageHeader
                title="Measurement Capture Workspace"
                subtitle="High-density SaaS measurement workstation with live calculations, sticky identity columns, inline editing, versioned blueprints, and room grouping"
            />

            {/* Context Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                <StatTile label="Total Measurement Leads" value={totalCount} sub="Active site pipeline" icon={Ruler} tone="teal" />
                <StatTile label="Completed Measurements" value={completedCount} sub="Site data captured" icon={CheckCircle2} tone="green" />
                <StatTile label="Pending Schedules" value={pendingCount} sub="Awaiting site visit" icon={Calendar} tone="amber" />
                <StatTile label="Site Access Available" value={siteAccessReady} sub="Ready for technician" icon={ClipboardList} tone="blue" />
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
                                placeholder="Search client code or name..."
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
                <MeasurementSkeleton />
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
            ) : viewMode === 'table' ? (
                /* --- PRIMARY SaaS MEASUREMENT WORKSPACE --- */
                <div className="space-y-2">




                    <SpreadsheetGridView items={filteredLeads} onView={handleViewLead} onEdit={(lead) => setEditingLead(lead)}
                        onRowClick={(lead) => setDrawerLead(lead)} users={usersData} selectedSection={selectedSection}
                        onSectionChange={(sec) => updateParam('section', sec, 's4')} />

                </div>
            ) : (
                /* --- ALTERNATE COMPACT SPREADSHEET OVERVIEW VIEW --- */
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

            {/* Full Site Details Modal */}
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

            {/* Row Specifications Inspector Drawer */}
            <MeasurementDetailsDrawer
                open={inspectorRowIndex !== null}
                row={inspectorRowIndex !== null ? gridRows[inspectorRowIndex] : null}
                rowIndex={inspectorRowIndex}
                onClose={() => setInspectorRowIndex(null)}
                onSaveRowDetails={handleSaveRowDetails}
            />

            {/* Add Window Measurement Modal (Dynamic Room Selection) */}
            <AddWindowMeasurementModal
                open={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddMeasurement={handleConfirmAddMeasurement}
                availableRooms={availableRooms}
                existingRows={gridRows}
                preselectedRoom={workspaceRoomFilter !== 'ALL' ? workspaceRoomFilter : ''}
            />
        </div>
    );
};

export default MeasurementCapture;

