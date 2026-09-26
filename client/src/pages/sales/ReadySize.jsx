import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, CheckSquare, Calendar, CheckCircle2, Paperclip, Home, Pencil,
    Plus, Trash2, Clock, AlertTriangle, Layers, ArrowRight, RefreshCw, Check, X, Ruler, Sparkles, FileText,
    FileSpreadsheet, Download, ExternalLink, UploadCloud, Presentation, FileUp, Printer, Save, ChevronDown
} from 'lucide-react';
import { date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field, DelayBadge, ViewSwitcher } from '../../components/ui';
import useViewMode from '../../hooks/useViewMode';
import CardGridView from '../../components/common/CardGridView';
import SalesStageCard from '../../components/cards/SalesStageCard';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi, usersApi, uploadApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import DetailedDrawer from '../../components/sales/DetailedDrawer';
import { SiteDetailSheetView } from '../../components/sales/SiteDetailSheetView';
import { SiteDetailSheetEditor } from '../../components/sales/SiteDetailSheetEditor';
import {
    SAMPLE_SITE_DETAIL_ROOMS,
    isSampleSiteDetailRooms,
    getQuotationRoomsFromLead,
    buildSiteDetailRoomsFromLead
} from '../../components/sales/siteSheetDefaults';
import { printSiteDetailSheet, printAllSiteDetailSheets } from '../../components/sales/siteSheetPrintService';

const SPREADSHEET_SECTIONS = [
    {
        id: 's6',
        title: 'Site Detail Sheet',
        color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/90 dark:text-blue-200 dark:border-blue-700/80',
        // All fields : shown in DetailedDrawer
        cols: [
            { key: 'code', label: 'Lead ID' },
            { key: 'clientName', label: 'Client Name' },
            { key: 'readySize.dueDate', label: 'Site Detail Sheet Due' },
            { key: 'readySize.confirmationDate', label: 'Actual Confirmation Date' },
            { key: 'delayStatus', label: 'Delay / SLA Status' },
            { key: 'readySize.confirmedBy', label: 'Site Confirmed By' },
            { key: 'readySize.siteCondition', label: 'Site Condition' },
            { key: 'readySize.siteDetailSheetGoogleLink', label: 'Site Detail Sheet (Google / XLS)' },
            { key: 'readySize.designPpt', label: 'Design PPT' },
            { key: 'readySize.selectionPpt', label: 'Selection PPT' },
            { key: 'readySize.windowSizes', label: 'Window Size' },
            { key: 'readySize.pelmetDetails', label: 'Pelmet Details' },
            { key: 'readySize.channelDetails', label: 'Channel Details' },
            { key: 'readySize.readyHeight', label: 'Ready Height' },
            { key: 'readySize.finalMeasurements', label: 'Final Measurements Grid' },
        ],
        // Subset shown in table : prevents horizontal scrolling
        tableCols: [
            { key: 'clientName', label: 'Client Name' },
            { key: 'readySize.dueDate', label: 'Due Date' },
            { key: 'readySize.confirmationDate', label: 'Actual Date' },
            { key: 'delayStatus', label: 'SLA Status' },
            { key: 'readySize.confirmedBy', label: 'Confirmed By' },
            { key: 'readySize.siteCondition', label: 'Site Condition' },
            { key: 'readySize.siteDetailSheetGoogleLink', label: 'Site Detail Sheet' },
        ]
    }
];

const SITE_CONDITION_OPTIONS = [
    { value: 'Ready', label: 'Ready', tone: 'emerald' },
    { value: 'Not Ready', label: 'Not Ready', tone: 'rose' },
    { value: 'Changes Required', label: 'Changes Required', tone: 'amber' }
];

const UNIT_OPTIONS = [
    { value: 'mm', label: 'mm' },
    { value: 'inch', label: 'inch' },
    { value: 'cm', label: 'cm' },
    { value: 'ft', label: 'ft' }
];

const STANDARD_ROOMS = [
    'Living Room', 'Master Bedroom', 'Bedroom 1', 'Bedroom 2', 'Guest Room',
    'Dining Room', 'Kitchen', 'Balcony', 'Home Office', 'Pooja Room', 'Passage'
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

const resolveUserNames = (confirmedBy, users = []) => {
    if (!confirmedBy) return '—';

    let ids = [];
    if (Array.isArray(confirmedBy)) {
        ids = confirmedBy;
    } else if (typeof confirmedBy === 'string') {
        ids = confirmedBy.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (typeof confirmedBy === 'object') {
        ids = [confirmedBy._id || confirmedBy.id || confirmedBy.name || confirmedBy];
    }

    if (ids.length === 0) return '—';

    const names = ids.map((idOrObj) => {
        if (!idOrObj) return null;
        if (typeof idOrObj === 'object' && idOrObj.name) return idOrObj.name;
        if (typeof idOrObj === 'string' && users.length > 0) {
            const found = users.find((u) => u._id === idOrObj || u.id === idOrObj);
            if (found?.name) return found.name;
        }
        return typeof idOrObj === 'string' ? idOrObj : (idOrObj?.name || null);
    }).filter(Boolean);

    return names.length > 0 ? names : ['—'];
};

const parseSubformArray = (raw) => {
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
            return [{ id: '1', name: current, notes: current }];
        }
    }
    return [];
};

const SPREADSHEET_CELL_RENDERERS = {
    delayStatus: (lead) => (
        <DelayBadge
            dueDate={lead.readySize?.dueDate}
            isCompleted={Boolean(lead.readySize?.confirmationDate)}
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
    'readySize.dueDate': (lead) => {
        const val = lead.readySize?.dueDate;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const isOverdue = !lead.readySize?.confirmationDate && new Date(val) < new Date();
        return (
            <div className="flex items-center gap-1 justify-center">
                <span className={`text-[11px]   whitespace-nowrap ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {date(val)}
                </span>
                {isOverdue && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Overdue for size confirmation" />}
            </div>
        );
    },
    'readySize.confirmedBy': (lead, { users = [] } = {}) => {
        const confirmers = resolveUserNames(lead.readySize?.confirmedBy, users);
        if (confirmers === '—' || (Array.isArray(confirmers) && confirmers[0] === '—')) {
            return <span className="text-slate-400 dark:text-slate-600">—</span>;
        }
        const list = Array.isArray(confirmers) ? confirmers : [confirmers];
        return (
            <div className="flex flex-wrap gap-1 max-w-[180px] justify-center">
                {list.slice(0, 2).map((name, idx) => (
                    <Badge key={idx} tone="blue" className="text-[10px] max-w-[90px] truncate">
                        {name}
                    </Badge>
                ))}
                {list.length > 2 && <Badge tone="slate" className="text-[9px]">+{list.length - 2}</Badge>}
            </div>
        );
    },
    'readySize.confirmationDate': (lead) => {
        const val = lead.readySize?.confirmationDate;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 text-[11px]   text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap justify-center">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                {date(val, { time: true })}
            </span>
        );
    },
    'readySize.windowSizes': (lead) => {
        const raw = lead.readySize?.windowSizes || lead.readySize?.windowSize;
        const list = parseSubformArray(raw);
        if (list.length === 0 && typeof raw === 'string' && raw) {
            return <span className="text-slate-700 dark:text-slate-300 text-xs truncate max-w-[150px] block" title={raw}>{raw}</span>;
        }
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400 font-medium">
                <Ruler className="w-3 h-3 shrink-0 text-blue-500" /> {list.length} window(s)
            </span>
        );
    },
    'readySize.siteCondition': (lead) => {
        const cond = lead.readySize?.siteCondition;
        if (!cond) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const matched = SITE_CONDITION_OPTIONS.find((o) => o.value.toLowerCase() === String(cond).toLowerCase());
        const tone = matched ? matched.tone : (cond.toLowerCase().includes('ready') ? 'emerald' : 'amber');
        return <Badge tone={tone}>{cond}</Badge>;
    },
    'readySize.pelmetDetails': (lead) => {
        const raw = lead.readySize?.pelmetDetails || lead.measurement?.pelmetDetails;
        const list = parseSubformArray(raw);
        if (list.length === 0 && typeof raw === 'string' && raw) {
            return <span className="text-slate-700 dark:text-slate-300 text-xs truncate max-w-[150px] block" title={raw}>{raw}</span>;
        }
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-medium">
                <Layers className="w-3 h-3 shrink-0" /> {list.length} pelmet item(s)
            </span>
        );
    },
    'readySize.channelDetails': (lead) => {
        const raw = lead.readySize?.channelDetails || lead.measurement?.channelDetails;
        const list = parseSubformArray(raw);
        if (list.length === 0 && typeof raw === 'string' && raw) {
            return <span className="text-slate-700 dark:text-slate-300 text-xs truncate max-w-[150px] block" title={raw}>{raw}</span>;
        }
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-400 font-medium">
                <Layers className="w-3 h-3 shrink-0" /> {list.length} channel item(s)
            </span>
        );
    },
    'readySize.readyHeight': (lead) => {
        const val = lead.readySize?.readyHeight;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="  text-[11px] font-semibold text-slate-800 dark:text-slate-200">{String(val)}</span>;
    },
    'readySize.finalMeasurements': (lead) => {
        const grid = parseSubformArray(lead.readySize?.finalMeasurements || lead.readySize?.finalMeasurementGrid);
        const textVal = typeof lead.readySize?.finalMeasurements === 'string' ? lead.readySize.finalMeasurements : '';
        if (grid.length > 0) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-500" /> {grid.length} confirmed grid item(s)
                </span>
            );
        }
        if (textVal) {
            return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px] block italic" title={textVal}>{textVal}</span>;
        }
        return <span className="text-slate-400 dark:text-slate-600">—</span>;
    },
    'readySize.siteDetailSheetGoogleLink': (lead, { onEdit } = {}) => {
        const link = lead.readySize?.siteDetailSheetGoogleLink;
        const atts = Array.isArray(lead.readySize?.siteDetailSheetAttachments) ? lead.readySize.siteDetailSheetAttachments : [];
        const customRooms = lead.readySize?.siteDetailRooms;
        const isDummy = isSampleSiteDetailRooms(customRooms, lead?.clientName);
        const validCustomRooms = (Array.isArray(customRooms) && customRooms.length > 0 && !isDummy) ? customRooms : null;

        let roomCount = 0;
        if (validCustomRooms) {
            roomCount = validCustomRooms.length;
        } else {
            const quotationRooms = getQuotationRoomsFromLead(lead);
            roomCount = quotationRooms.length;
        }

        return (
            <div className="flex items-center gap-1.5 justify-center flex-wrap max-w-[220px]" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    onClick={() => onEdit && onEdit(lead)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition shadow-2xs"
                    title="Open Room-wise Site Detail Sheet Preview & Editor"
                >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                    <span>Site Sheet {roomCount > 0 ? `(${roomCount})` : ''}</span>
                </button>
                {link && (
                    <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition"
                        title={link}
                    >
                        <span>Google</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                )}
                {atts.length > 0 && (
                    <a
                        href={atts[0].url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 transition"
                        title={atts[0].filename || 'Attached XLS'}
                    >
                        <Paperclip className="w-3 h-3 text-blue-600" />
                        <span>XLS ({atts.length})</span>
                    </a>
                )}
                {!link && atts.length === 0 && (
                    <a
                        href="/Site Detail Sheet. R5.xls"
                        download="Site Detail Sheet. R5.xls"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        title="Download Blank Master Template (.xls)"
                    >
                        <Download className="w-3 h-3" /> Template
                    </a>
                )}
            </div>
        );
    },
    'readySize.designPpt': (lead) => {
        const ppt = lead.readySize?.designPpt;
        const link = ppt?.link || (typeof ppt === 'string' && (ppt.startsWith('http') || ppt.startsWith('/')) ? ppt : null);
        const files = Array.isArray(ppt?.files) ? ppt.files : (Array.isArray(ppt?.attachments) ? ppt.attachments : []);
        const count = files.length;
        if (!link && count === 0) {
            return <span className="text-slate-400 dark:text-slate-600">—</span>;
        }
        return (
            <div className="flex items-center gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                {link ? (
                    <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition shadow-2xs"
                        title={link}
                    >
                        <Presentation className="w-3 h-3 text-amber-600" />
                        <span>Design PPT</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                    </a>
                ) : (
                    <a
                        href={files[0].url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition shadow-2xs"
                        title={files[0].filename || 'Design PPT'}
                    >
                        <Presentation className="w-3 h-3 text-amber-600" />
                        <span>Design PPT ({count})</span>
                        <Download className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                    </a>
                )}
            </div>
        );
    },
    'readySize.selectionPpt': (lead) => {
        const ppt = lead.readySize?.selectionPpt;
        const link = ppt?.link || (typeof ppt === 'string' && (ppt.startsWith('http') || ppt.startsWith('/')) ? ppt : null);
        const files = Array.isArray(ppt?.files) ? ppt.files : (Array.isArray(ppt?.attachments) ? ppt.attachments : []);
        const count = files.length;
        if (!link && count === 0) {
            return <span className="text-slate-400 dark:text-slate-600">—</span>;
        }
        return (
            <div className="flex items-center gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                {link ? (
                    <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 transition shadow-2xs"
                        title={link}
                    >
                        <Presentation className="w-3 h-3 text-indigo-600" />
                        <span>Selection PPT</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                    </a>
                ) : (
                    <a
                        href={files[0].url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 transition shadow-2xs"
                        title={files[0].filename || 'Selection PPT'}
                    >
                        <Presentation className="w-3 h-3 text-indigo-600" />
                        <span>Selection PPT ({count})</span>
                        <Download className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                    </a>
                )}
            </div>
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

const EditReadySizeModal = ({ item, onClose, onDone, users = [] }) => {

    const initialRooms = useMemo(() => {
        const rawExisting = item?.readySize?.siteDetailRooms;
        const parsedExisting = parseSubformArray(rawExisting);
        const isDummy = isSampleSiteDetailRooms(parsedExisting, item?.clientName);
        const existing = (parsedExisting && parsedExisting.length > 0 && !isDummy) ? parsedExisting : null;
        if (existing) {
            return existing;
        }
        return buildSiteDetailRoomsFromLead(item, users);
    }, [item, users]);

    const [rooms, setRooms] = useState(initialRooms);

    // Default to first room
    const [activeRoomId, setActiveRoomId] = useState(() => {
        return initialRooms[0]?.id || 'room-1';
    });

    useEffect(() => {
        setRooms(initialRooms);
        setActiveRoomId(initialRooms[0]?.id || 'room-1');
    }, [initialRooms]);

    const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'edit' | 'all-rooms'
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [printMenuOpen, setPrintMenuOpen] = useState(false);

    const activeRoom = useMemo(() => {
        return rooms.find((r) => r.id === activeRoomId) || rooms[0];
    }, [rooms, activeRoomId]);

    const activeRoomIndex = useMemo(() => {
        return rooms.findIndex((r) => r.id === activeRoomId);
    }, [rooms, activeRoomId]);

    // Save action hook
    const { execute: saveSheet, pending: saving, error: saveError } = useAction(
        async (roomsToSave) => {
            const dataToSave = roomsToSave || rooms;
            const payload = {
                readySize: {
                    ...(item?.readySize || {}),
                    siteDetailRooms: dataToSave,
                    siteDetailSheet: {
                        updatedAt: new Date().toISOString(),
                        roomsCount: dataToSave.length,
                        lastActiveRoom: activeRoom?.roomTitle || activeRoom?.sheetName,
                    },
                },
            };
            return leadsApi.update(item._id || item.id, payload);
        },
        {
            onSuccess: () => {
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
                if (onDone) onDone();
            },
        }
    );

    const handleUpdateActiveRoom = (updatedRoom) => {
        setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
    };

    const handleSyncFromQuotation = () => {
        if (
            rooms.length > 0 &&
            !window.confirm('Reload rooms and windows from the Quotation Sheet? This will refresh all room sheets with the latest items from the quotation.')
        ) {
            return;
        }
        const freshRooms = buildSiteDetailRoomsFromLead(item, users);
        setRooms(freshRooms);
        if (freshRooms.length > 0) {
            setActiveRoomId(freshRooms[0].id);
        }
    };

    const handleAddRoom = () => {
        const newSheetNo = rooms.length + 1;
        const newRoom = {
            id: `room-${Date.now()}`,
            sheetName: `Room ${newSheetNo}`,
            roomTitle: `Room ${newSheetNo}`,
            sheetNo: newSheetNo,
            clientName: item?.clientName || '',
            architect: item?.architectName || item?.architect || '',
            siteIncharge: activeRoom?.siteIncharge || '',
            notes: [],
            items: [
                {
                    id: `item-${Date.now()}-1`,
                    srNo: 1,
                    look: '',
                    type: 'Main Curtain',
                    windowWidth: '',
                    windowHeight: '',
                    pelmetWidth: '',
                    pelmetDrop: '',
                    pelmetReturn: '',
                    catalogueImages: [],
                    design: 'Ready',
                    brand: '',
                    fabricName: '',
                    fabricWidth: '',
                    repeatV: '',
                    repeatH: '',
                    fullness: 2.5,
                    qtyMtrs: '',
                    stitchingStyle: 'Ripple',
                    parts: 1,
                    opening: 'Center Open',
                    readyWidth: '',
                    readyHeight: '',
                    liningType: '',
                    liningQty: '',
                    tieback: '',
                    position: '',
                    electricalPoint: '',
                    installationType: '',
                },
            ],
        };
        const updated = [...rooms, newRoom];
        setRooms(updated);
        setActiveRoomId(newRoom.id);
        setActiveTab('edit');
    };

    const handleDeleteRoom = (roomId, e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (rooms.length <= 1) {
            alert('Cannot delete the only room sheet. At least one room sheet is required.');
            return;
        }

        const roomToDelete = rooms.find((r) => r.id === roomId);
        const roomTitle = roomToDelete?.roomTitle || roomToDelete?.sheetName || 'this room sheet';
        if (!window.confirm(`Are you sure you want to delete "${roomTitle}"?`)) {
            return;
        }

        const roomIndex = rooms.findIndex((r) => r.id === roomId);
        const filtered = rooms.filter((r) => r.id !== roomId);
        setRooms(filtered);

        if (activeRoomId === roomId) {
            const nextIndex = Math.max(0, roomIndex - 1);
            setActiveRoomId(filtered[nextIndex]?.id || filtered[0]?.id);
        }
    };

    const handlePrintCurrentRoom = async () => {
        setPrinting(true);
        setPrintMenuOpen(false);
        try {
            await printSiteDetailSheet({
                room: activeRoom,
                clientName: item?.clientName,
                address: item?.address ? `${item.address.street || ''} ${item.address.city || ''}`.trim() : (item?.siteAddress || item?.billingAddress || ''),
                architect: item?.architectName || item?.architect || '',
                siteIncharge: activeRoom?.siteIncharge || '',
                sheetNo: activeRoom?.sheetNo || activeRoomIndex + 1,
                totalSheets: rooms.length,
                leadCode: item?.code || item?.leadNumber,
                company: 'embellish',
            });
        } catch (err) {
            console.error('[ReadySize] Failed to print current room sheet:', err);
        } finally {
            setPrinting(false);
        }
    };

    const handlePrintAllRooms = async () => {
        setPrinting(true);
        setPrintMenuOpen(false);
        try {
            await printAllSiteDetailSheets({
                rooms: rooms,
                clientName: item?.clientName,
                address: item?.address ? `${item.address.street || ''} ${item.address.city || ''}`.trim() : (item?.siteAddress || item?.billingAddress || ''),
                architect: item?.architectName || item?.architect || '',
                siteIncharge: activeRoom?.siteIncharge || '',
                leadCode: item?.code || item?.leadNumber,
                company: 'embellish',
            });
        } catch (err) {
            console.error('[ReadySize] Failed to batch print all room sheets:', err);
        } finally {
            setPrinting(false);
        }
    };

    return (
        <Modal open={Boolean(item)} onClose={onClose}
            title={<div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                    Site Detail Sheet
                </span>
                <Badge tone="slate" className="text-xs">
                    {item?.clientName || ''}
                </Badge>
            </div>}
            size="full"
            footer={
                <div className="flex items-center justify-between w-full gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                            Active: <strong className="text-slate-800 dark:text-slate-200">{activeRoom?.roomTitle || activeRoom?.sheetName}</strong>
                        </span>
                        <span>•</span>
                        <span>Treatments: <strong>{activeRoom?.items?.length || 0}</strong></span>
                        {savedSuccess && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold ml-2 animate-in fade-in">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Saved to Lead
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Invoice-Style Print Action with Dropdown Options */}
                        <div className="relative">
                            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    icon={Printer}
                                    loading={printing}
                                    onClick={handlePrintCurrentRoom}
                                    title={`Print ${activeRoom?.roomTitle || activeRoom?.sheetName || 'current room'} in invoice format`}
                                    className="rounded-r-none border-r border-slate-200 dark:border-slate-800 text-xs font-semibold"
                                >
                                    Print Sheet
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => setPrintMenuOpen((prev) => !prev)}
                                    className="px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-r-lg transition flex items-center"
                                    title="More print options"
                                >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {printMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setPrintMenuOpen(false)}
                                    />
                                    <div
                                        className="absolute bottom-full right-0 mb-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 z-50 text-xs animate-in fade-in"
                                    >
                                        <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Print Invoice / Spec Sheet
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handlePrintCurrentRoom}
                                            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium text-slate-800 dark:text-slate-200 transition"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Printer className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                                                <span>Current Room Sheet</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400  ">1 sheet</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handlePrintAllRooms}
                                            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium text-slate-800 dark:text-slate-200 transition"
                                        >
                                            <div className="flex items-center gap-2">
                                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                <span>All Room Sheets</span>
                                            </div>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400">
                                                {rooms.length} sheets
                                            </span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <Button
                            type="button"
                            icon={Save}
                            loading={saving}
                            onClick={() => saveSheet(rooms)}
                        >
                            Save Changes
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">

                {/* Error Alert */}
                {saveError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Failed to save site detail sheet: {saveError.message || 'Please try again.'}</span>
                    </div>
                )}

                {/* Top Control Header: Room Switcher & Main Tab Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    {/* View Modes Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setActiveTab('preview')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${activeTab === 'preview'
                                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Site Sheet Preview</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('edit')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${activeTab === 'edit'
                                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit Room Sheet</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            icon={RefreshCw}
                            onClick={handleSyncFromQuotation}
                            className="text-xs"
                            title="Re-sync rooms & windows from Quotation Sheet"
                        >
                            Sync from Quotation
                        </Button>
                        {rooms.length > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                onClick={(e) => handleDeleteRoom(activeRoomId, e)}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
                                title={`Delete ${activeRoom?.roomTitle || activeRoom?.sheetName || 'Current Room Sheet'}`}
                            >
                                Delete Room Sheet
                            </Button>
                        )}
                    </div>
                </div>

                {/* Dedicated Room Selector Pill Navigation Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                    {rooms.map((r, idx) => {
                        const isSelected = r.id === activeRoomId;
                        const itemsCount = Array.isArray(r.items) ? r.items.length : 0;

                        return (
                            <div
                                key={r.id || idx}
                                role="button"
                                tabIndex={0}
                                onClick={() => setActiveRoomId(r.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        setActiveRoomId(r.id);
                                    }
                                }}
                                className={`group flex items-center gap-2 px-3 py-2 rounded-md text-xs whitespace-nowrap transition-all border cursor-pointer select-none ${isSelected
                                    ? 'bg-brand-600 text-white border-brand-700 shadow-sm font-semibold'
                                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/70 font-medium'
                                    }`}
                            >
                                <span>{r.roomTitle || r.sheetName}</span>
                                {itemsCount > 0 && (
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isSelected
                                            ? 'bg-white/30 text-white'
                                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            }`}
                                    >
                                        {itemsCount}
                                    </span>
                                )}

                            </div>
                        );
                    })}

                    <Button
                        size="sm"
                        variant="dashed"
                        icon={Plus}
                        onClick={handleAddRoom}
                        className="whitespace-nowrap text-xs shrink-0"
                    >
                        Add Room Sheet
                    </Button>
                </div>

                {/* Main Content Pane */}
                {activeTab === 'preview' ? (
                    <SiteDetailSheetView
                        room={activeRoom}
                        clientName={item?.clientName}
                        address={item?.address ? `${item.address.street || ''} ${item.address.city || ''}`.trim() : (item?.siteAddress || item?.billingAddress || '')}
                        architect={item?.architectName || item?.architect || ''}
                        siteIncharge={activeRoom?.siteIncharge || ''}
                        sheetNo={activeRoom?.sheetNo || activeRoomIndex + 1}
                        totalSheets={rooms.length}
                        onPrint={handlePrintCurrentRoom}
                        onEditRoom={() => setActiveTab('edit')}
                    />
                ) : (
                    <SiteDetailSheetEditor
                        room={activeRoom}
                        onUpdateRoom={handleUpdateActiveRoom}
                        onSave={() => saveSheet(rooms)}
                        onDeleteRoom={rooms.length > 1 ? (e) => handleDeleteRoom(activeRoomId, e) : undefined}
                    />
                )}
            </div>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, onRowClick, selectedSection = 's6', onSectionChange, users = [] }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's6';
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
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            icon={FileSpreadsheet}
                                            onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                                            title="Open Room-wise Site Detail Sheet Preview"
                                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                        />
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); onView(lead); }} title="View Lead Details" />
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

const ReadySize = ({ items: itemsProp = [] }) => {
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
    const users = Array.isArray(usersData) ? usersData : [];

    const reload = () => {
        setLoading(true);
        setError(null);
        handleFetchLeads()
            .catch((err) => setError(err?.message || 'Failed to fetch ready size data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const selectedSection = searchParams.get('section') || 's6';

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=ready-size`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const productionLeads = rawLeads.filter((lead) => {
        const kycStatus = String(lead.kyc?.status || lead.kycStatus || 'Pending').trim().toLowerCase();
        return Boolean(kycStatus && kycStatus !== 'pending');
    });

    const filteredLeads = productionLeads.filter((lead) => {
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const confirmedBy = resolveUserNames(lead.readySize?.confirmedBy, users).toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !confirmedBy.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = productionLeads.length;
    const sheetLinkedCount = productionLeads.filter((l) =>
        Boolean(l.readySize?.siteDetailSheetGoogleLink || (Array.isArray(l.readySize?.siteDetailSheetAttachments) && l.readySize.siteDetailSheetAttachments.length > 0))
    ).length;
    const pptsAttachedCount = productionLeads.filter((l) => {
        const dp = l.readySize?.designPpt;
        const sp = l.readySize?.selectionPpt;
        const hasD = dp && (dp.link || dp.url || (Array.isArray(dp.files) && dp.files.length > 0) || (Array.isArray(dp.attachments) && dp.attachments.length > 0));
        const hasS = sp && (sp.link || sp.url || (Array.isArray(sp.files) && sp.files.length > 0) || (Array.isArray(sp.attachments) && sp.attachments.length > 0));
        return hasD || hasS;
    }).length;
    const confirmedCount = productionLeads.filter((l) => Boolean(l.readySize?.confirmationDate)).length;

    return (
        <div>
            <PageHeader
                title="Site Detail Sheet"
                subtitle="Final site detail sheet, production inputs, window dimensions, pelmet & track specifications, Design PPT, and Selection PPT for production handoff"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Production Handoff Pipeline" value={totalCount} sub="Clients ready for production" icon={CheckSquare} tone="blue" />
                <StatTile label="Site Sheets Linked" value={sheetLinkedCount} sub="Google / XLS sheets ready" icon={FileSpreadsheet} tone="green" />
                <StatTile label="Design & Selection PPTs" value={pptsAttachedCount} sub="PowerPoints attached" icon={Presentation} tone="amber" />
                <StatTile label="Production Confirmed" value={confirmedCount} sub="Final measurements signed" icon={CheckCircle2} tone="violet" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, confirmed by..."
                            className="pl-9"
                        />
                    </div>

                    <ViewSwitcher view={viewMode} onViewChange={setViewMode} />

                    {(search || selectedSection !== 's6') && (
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
                    <Loading text="Loading Site Detail Sheet..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={FileSpreadsheet} title="No Site Detail Records Found" hint="Complete Customer KYC to begin production handoff." />
                </Panel>
            ) : viewMode === 'cards' ? (
                <CardGridView
                    items={filteredLeads}
                    renderCard={(lead) => (
                        <SalesStageCard
                            lead={lead}
                            stageKey="ready-size"
                            onView={handleViewLead}
                            onEdit={(l) => setEditingLead(l)}
                            onRowClick={(l) => setDrawerLead(l)}
                        />
                    )}
                    empty={
                        <Panel className="p-8 text-center">
                            <EmptyState icon={FileSpreadsheet} title="No Site Detail Records Found" hint="Complete Customer KYC to begin production handoff." />
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
                    onSectionChange={(sec) => updateParam('section', sec, 's6')}
                    users={users}
                />
            )}

            {editingLead && (
                <EditReadySizeModal
                    item={editingLead}
                    onClose={() => setEditingLead(null)}
                    onDone={reload}
                    users={users}
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


export default ReadySize;