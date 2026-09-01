import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, FileSpreadsheet, Calendar, CheckCircle2, Paperclip, Layers, Pencil,
    Ruler, Sparkles, RefreshCw, Tag, Check, Plus, Percent, UserCheck, Clock, AlertTriangle, FileText, X
} from 'lucide-react';
import { date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field, DelayBadge, ViewSwitcher } from '../../components/ui';
import useViewMode from '../../hooks/useViewMode';
import CardGridView from '../../components/common/CardGridView';
import SalesStageCard from '../../components/cards/SalesStageCard';
import { useSelector } from 'react-redux';
import { selectUser } from '../../features/auth/authSlice';
import useSales from '../../hooks/useSales';
import { leadsApi, fabricsApi, usersApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import DetailedDrawer from '../../components/sales/DetailedDrawer';

const SPREADSHEET_SECTIONS = [
    {
        id: 's7',
        title: 'Consumption / BOQ',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-700/80',
        cols: [
            { key: 'consumption.sheetDueDate', label: 'Consumption Sheet Due' },
            { key: 'delayStatus', label: 'Delay / SLA Status' },
            { key: 'consumption.measurements', label: 'Measurements' },
            { key: 'consumption.quantity', label: 'Consumption Quantity' },
            { key: 'consumption.unit', label: 'Unit' },
            { key: 'consumption.wastageAllowance', label: 'Wastage Allowance' },
            { key: 'consumption.boqVersion', label: 'BOQ / Consumption Sheet Version' },
            { key: 'consumption.roomList', label: 'Room List' },
            { key: 'consumption.boqPreparedBy', label: 'BOQ Prepared By' },
            { key: 'consumption.boqPreparedDate', label: 'BOQ Prepared Date' },
            { key: 'consumption.fabricDesignSelection', label: 'Fabric / Design Selection' },
            { key: 'consumption.panelCount', label: 'Panel Count' },
            { key: 'consumption.liningAccessoryAssumptions', label: 'Lining / accessory assumptions' },
        ]
    }
];

const APPROVED_UNITS = [
    'Metre',
    'Square Metre',
    'Piece',
    'Set',
    'Yard',
    'Feet',
    'Square Feet',
    'Roll'
];

const LINING_ACCESSORY_MASTER = [
    'Blackout Lining',
    'Satin / Soft Lining',
    'Thermal Interlining',
    'Sheer Fabric Lining',
    'Motorized Track System',
    'Heavy Duty Manual Track',
    'Decorative Rods & Rings',
    'Tiebacks & Holdbacks',
    'Pelmet / Valance Board',
    'Lead Tape Bottom Weighting',
    'Side Hooks & Brackets'
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
    }
    return [];
};

const calculateVariance = (prevW, prevH, confW, confH, unit) => {
    const pw = parseFloat(prevW) || 0;
    const ph = parseFloat(prevH) || 0;
    const cw = parseFloat(confW) || 0;
    const ch = parseFloat(confH) || 0;

    const diffW = cw - pw;
    const diffH = ch - ph;

    if (diffW === 0 && diffH === 0) return <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Exact Match (0)</span>;

    const signW = diffW > 0 ? `+${diffW}` : `${diffW}`;
    const signH = diffH > 0 ? `+${diffH}` : `${diffH}`;

    return (
        <span className="text-amber-600 dark:text-amber-400 font-mono font-semibold text-[11px]">
            W: {signW}{unit} / H: {signH}{unit}
        </span>
    );
};

const parseGridInitial = (item) => {
    const existing = item?.consumption?.measurements;
    const parsedExisting = parseSubformArray(existing);
    if (parsedExisting.length > 0 && typeof parsedExisting[0] === 'object' && (parsedExisting[0].room || parsedExisting[0].confirmedWidth || parsedExisting[0].width)) {
        return parsedExisting;
    }

    const rawFinal = item?.readySize?.finalMeasurements || item?.readySize?.finalMeasurementGrid;
    const parsedFinal = parseSubformArray(rawFinal);
    if (parsedFinal.length > 0 && typeof parsedFinal[0] === 'object') {
        return parsedFinal.map((row, idx) => ({
            id: row.id || `g-${idx + 1}`,
            room: row.room || row.roomName || 'Room',
            windowId: row.windowId || `W-0${idx + 1}`,
            previousWidth: row.previousWidth || row.width || '1200',
            previousHeight: row.previousHeight || row.height || '2100',
            confirmedWidth: row.confirmedWidth || row.width || '1200',
            confirmedHeight: row.confirmedHeight || row.height || '2100',
            unit: row.unit || 'mm',
            status: row.status || 'Confirmed',
            notes: row.notes || 'Final size confirmed',
            version: row.version || 'v2.0'
        }));
    }

    const rawWindows = item?.readySize?.windowSizes || item?.readySize?.windowSize || item?.measurement?.windowSizes;
    const parsedWindows = parseSubformArray(rawWindows);
    if (parsedWindows.length > 0 && typeof parsedWindows[0] === 'object') {
        return parsedWindows.map((w, idx) => ({
            id: `g-${idx + 1}`,
            room: w.room || w.roomName || 'Room',
            windowId: w.windowId || `W-0${idx + 1}`,
            previousWidth: w.width || '1200',
            previousHeight: w.height || '2100',
            confirmedWidth: w.width || '1200',
            confirmedHeight: w.height || '2100',
            unit: w.unit || 'mm',
            status: 'Confirmed',
            notes: 'Final size confirmed',
            version: 'v2.0'
        }));
    }

    return [
        {
            id: 'g-1',
            room: 'Living Room',
            windowId: 'W-01',
            previousWidth: '1200',
            previousHeight: '2100',
            confirmedWidth: '1200',
            confirmedHeight: '2100',
            unit: 'mm',
            status: 'Confirmed',
            notes: 'Final size confirmed',
            version: 'v2.0'
        }
    ];
};

const autoFetchMeasurements = (item) => {
    if (!item) return '—';
    const rawFinal = item.readySize?.finalMeasurements || item.consumption?.measurements;
    if (rawFinal) {
        if (typeof rawFinal === 'string') return rawFinal;
        const parsed = parseSubformArray(rawFinal);
        if (parsed.length > 0) return `Confirmed Measurements (${parsed.length} window(s) recorded)`;
    }
    if (item.readySize?.windowSizes) {
        if (Array.isArray(item.readySize.windowSizes)) {
            return `Confirmed Measurements (${item.readySize.windowSizes.length} window(s) recorded)`;
        }
        if (typeof item.readySize.windowSizes === 'object' && item.readySize.windowSizes !== null) {
            return `Confirmed Measurements (${Object.keys(item.readySize.windowSizes).length} item(s) recorded)`;
        }
        return String(item.readySize.windowSizes);
    }
    if (item.measurement?.roomList) return `Measurement Record (${typeof item.measurement.roomList === 'object' ? JSON.stringify(item.measurement.roomList) : item.measurement.roomList})`;
    if (item.measurement?.status) return `Measurement Record - ${typeof item.measurement.status === 'object' ? JSON.stringify(item.measurement.status) : item.measurement.status}`;
    return 'Final Confirmed Measurements v1.0';
};

const autoFetchRooms = (item) => {
    if (!item) return '';
    if (item.readySize?.windowSizes) {
        if (Array.isArray(item.readySize.windowSizes)) {
            const rooms = item.readySize.windowSizes.map((w) => w.roomName || w.room).filter(Boolean);
            if (rooms.length > 0) return Array.from(new Set(rooms)).join(', ');
        }
    }
    if (item.measurement?.roomList) return String(item.measurement.roomList);
    if (item.rooms) return Array.isArray(item.rooms) ? item.rooms.join(', ') : String(item.rooms);
    return '';
};

const parseFabricSelections = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
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
        if (typeof current === 'string' && current.length > 0) {
            return current.split(',').map((s) => s.trim()).filter(Boolean);
        }
    }
    return [];
};

const parseLiningAssumptions = (raw) => {
    if (!raw) return { selected: [], notes: '' };
    let current = raw;
    if (typeof current === 'string') {
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
    }
    if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
        return {
            selected: Array.isArray(current.selected) ? current.selected : [],
            notes: current.notes || ''
        };
    }
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'object' && parsed !== null) {
                return {
                    selected: Array.isArray(parsed.selected) ? parsed.selected : [],
                    notes: parsed.notes || ''
                };
            }
        } catch {
            // Check if string contains notes or comma-separated items
            const parts = raw.split(' | Notes: ');
            const items = parts[0] ? parts[0].split(',').map((s) => s.trim()).filter(Boolean) : [];
            const notes = parts[1] || '';
            return { selected: items, notes };
        }
    }
    return { selected: [], notes: String(raw) };
};

const getNextVersion = (currentVer) => {
    if (!currentVer) return 'v1.0';
    const clean = String(currentVer).replace(/^v/i, '').trim();
    const parts = clean.split('.');
    if (parts.length >= 2 && !isNaN(parts[1])) {
        const minor = parseInt(parts[1], 10) + 1;
        return `v${parts[0]}.${minor}`;
    }
    if (!isNaN(clean)) {
        return `v${parseInt(clean, 10) + 1}.0`;
    }
    return `${currentVer}-rev`;
};

const SPREADSHEET_CELL_RENDERERS = {
    delayStatus: (lead) => (
        <DelayBadge
            dueDate={lead.consumption?.sheetDueDate || lead.boq?.dueDate}
            isCompleted={Boolean(lead.consumption?.boqPreparedDate || lead.boq?.status === 'Completed')}
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
    'consumption.sheetDueDate': (lead) => {
        const val = lead.consumption?.sheetDueDate;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const isOverdue = !lead.consumption?.boqVersion && new Date(val) < new Date();
        return (
            <div className="flex items-center gap-1 justify-center">
                <span className={`text-[11px] font-mono whitespace-nowrap ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {date(val)}
                </span>
                {isOverdue && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Overdue for Consumption BOQ" />}
            </div>
        );
    },
    'consumption.measurements': (lead) => {
        const raw = lead.consumption?.measurements;
        let displayVal = '';
        if (typeof raw === 'string' && raw.trim()) {
            displayVal = raw;
        } else if (raw) {
            const parsed = parseSubformArray(raw);
            if (parsed.length > 0) {
                displayVal = `Confirmed Measurements (${parsed.length} window(s) recorded)`;
            }
        }
        if (!displayVal) {
            displayVal = autoFetchMeasurements(lead);
        }
        if (!displayVal || displayVal === '—') return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const textStr = typeof displayVal === 'string' ? displayVal : String(displayVal);
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium max-w-[160px] truncate" title={textStr}>
                <Ruler className="w-3 h-3 shrink-0 text-emerald-500" />
                <span className="truncate">{textStr}</span>
            </span>
        );
    },
    'consumption.quantity': (lead) => {
        const qty = lead.consumption?.quantity;
        const unit = lead.consumption?.unit || '';
        if (qty === undefined || qty === null || qty === '') return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                {Number(qty).toLocaleString('en-US', { maximumFractionDigits: 2 })} {unit ? <span className="text-[10px] text-slate-500 font-normal">{unit}</span> : ''}
            </span>
        );
    },
    'consumption.unit': (lead) => {
        const unit = lead.consumption?.unit;
        if (!unit) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <Badge tone="slate" className="text-[10px] font-mono">{unit}</Badge>;
    },
    'consumption.wastageAllowance': (lead) => {
        const raw = lead.consumption?.wastageAllowance;
        if (!raw && raw !== 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const formatted = String(raw).includes('%') ? raw : `${raw}%`;
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-300/60 dark:border-amber-700/60">
                <Percent className="w-3 h-3 text-amber-500" />
                {formatted}
            </span>
        );
    },
    'consumption.boqVersion': (lead) => {
        const ver = lead.consumption?.boqVersion;
        if (!ver) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <Badge tone="purple" className="font-mono text-[10px] font-bold">{ver}</Badge>;
    },
    'consumption.roomList': (lead) => {
        const rooms = lead.consumption?.roomList || autoFetchRooms(lead);
        if (!rooms) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const list = typeof rooms === 'string' ? rooms.split(',').map((s) => s.trim()).filter(Boolean) : Array.isArray(rooms) ? rooms : [];
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-wrap gap-1 max-w-[180px] justify-center" title={list.join(', ')}>
                {list.slice(0, 2).map((r, idx) => (
                    <Badge key={idx} tone="blue" className="text-[10px] max-w-[90px] truncate">
                        {r}
                    </Badge>
                ))}
                {list.length > 2 && <Badge tone="slate" className="text-[9px]">+{list.length - 2}</Badge>}
            </div>
        );
    },
    'consumption.boqPreparedBy': (lead) => {
        const val = lead.consumption?.boqPreparedBy;
        const name = typeof val === 'object' ? val?.name : val;
        if (!name) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 max-w-[140px] truncate" title={name}>
                <UserCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="truncate">{name}</span>
            </span>
        );
    },
    'consumption.boqPreparedDate': (lead) => {
        const val = lead.consumption?.boqPreparedDate;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap justify-center">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                {date(val, { time: true })}
            </span>
        );
    },
    'consumption.fabricDesignSelection': (lead) => {
        const raw = lead.consumption?.fabricDesignSelection;
        const list = parseFabricSelections(raw);
        if (list.length === 0 && typeof raw === 'string' && raw) {
            return <span className="text-slate-700 dark:text-slate-300 text-xs truncate max-w-[150px] block" title={raw}>{raw}</span>;
        }
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-wrap gap-1 max-w-[180px] justify-center" title={list.join(', ')}>
                {list.slice(0, 2).map((item, idx) => (
                    <Badge key={idx} tone="indigo" className="text-[10px] max-w-[100px] truncate">
                        {item}
                    </Badge>
                ))}
                {list.length > 2 && <Badge tone="slate" className="text-[9px]">+{list.length - 2}</Badge>}
            </div>
        );
    },
    'consumption.panelCount': (lead) => {
        const count = lead.consumption?.panelCount;
        if (count === undefined || count === null || count === '') return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{count} panel(s)</span>;
    },
    'consumption.liningAccessoryAssumptions': (lead) => {
        const raw = lead.consumption?.liningAccessoryAssumptions;
        const { selected, notes } = parseLiningAssumptions(raw);
        if (selected.length === 0 && !notes) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-col gap-0.5 items-center justify-center max-w-[180px]">
                {selected.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center">
                        {selected.slice(0, 2).map((item, idx) => (
                            <Badge key={idx} tone="teal" className="text-[9px] max-w-[90px] truncate">
                                {item}
                            </Badge>
                        ))}
                        {selected.length > 2 && <Badge tone="slate" className="text-[9px]">+{selected.length - 2}</Badge>}
                    </div>
                )}
                {notes && (
                    <span className="text-[10px] text-slate-500 italic truncate max-w-[150px] block" title={notes}>
                        "{notes}"
                    </span>
                )}
            </div>
        );
    },
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

const EditConsumptionModal = ({ item, onClose, onDone }) => {
    const currentUser = useSelector(selectUser);
    const existingConsumption = item?.consumption || {};

    // Initial state setup with auto-fetched measurements, room list, version & user
    const defaultMeasurements = typeof existingConsumption.measurements === 'string'
        ? existingConsumption.measurements
        : autoFetchMeasurements(item);
    const defaultRooms = typeof existingConsumption.roomList === 'string'
        ? existingConsumption.roomList
        : autoFetchRooms(item);
    const defaultVersion = existingConsumption.boqVersion || 'v1.0';
    const defaultPreparedBy = typeof existingConsumption.boqPreparedBy === 'object'
        ? (existingConsumption.boqPreparedBy?.name || currentUser?.name || '')
        : (existingConsumption.boqPreparedBy || currentUser?.name || currentUser?.email || 'System User');

    const initialLining = parseLiningAssumptions(existingConsumption.liningAccessoryAssumptions);
    const initialFabrics = parseFabricSelections(existingConsumption.fabricDesignSelection);

    const [form, setForm] = useState({
        sheetDueDate: existingConsumption.sheetDueDate ? new Date(existingConsumption.sheetDueDate).toISOString().slice(0, 10) : '',
        measurements: defaultMeasurements,
        quantity: existingConsumption.quantity !== undefined && existingConsumption.quantity !== null ? String(existingConsumption.quantity) : '',
        unit: existingConsumption.unit || 'Metre',
        wastageAllowance: existingConsumption.wastageAllowance ? String(existingConsumption.wastageAllowance).replace('%', '') : '',
        boqVersion: defaultVersion,
        roomList: defaultRooms,
        boqPreparedBy: defaultPreparedBy,
        boqPreparedDate: existingConsumption.boqPreparedDate
            ? new Date(existingConsumption.boqPreparedDate).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
        panelCount: existingConsumption.panelCount !== undefined && existingConsumption.panelCount !== null ? String(existingConsumption.panelCount) : '',
    });

    const [finalMeasurementsGrid, setFinalMeasurementsGrid] = useState(() => parseGridInitial(item));
    const [selectedFabrics, setSelectedFabrics] = useState(initialFabrics);
    const [customFabricInput, setCustomFabricInput] = useState('');
    const [selectedLinings, setSelectedLinings] = useState(initialLining.selected);
    const [liningNotes, setLiningNotes] = useState(initialLining.notes);
    const [autoIncrementVersion, setAutoIncrementVersion] = useState(false);
    const [validationError, setValidationError] = useState('');

    // Fetch fabric master options
    const { data: fabricMasterData } = useAsync(() => fabricsApi.list().catch(() => ({ data: [] })), []);
    const fabricOptions = useMemo(() => {
        const rawList = Array.isArray(fabricMasterData?.data)
            ? fabricMasterData.data
            : Array.isArray(fabricMasterData)
                ? fabricMasterData
                : [];
        return rawList.map((f) => f.name || f.code || f.title).filter(Boolean);
    }, [fabricMasterData]);

    // Fetch system users for user selection
    const { data: usersData } = useAsync(() => usersApi.list().catch(() => ({ data: [] })), []);
    const systemUsers = useMemo(() => {
        const rawList = Array.isArray(usersData?.data)
            ? usersData.data
            : Array.isArray(usersData)
                ? usersData
                : [];
        return rawList.map((u) => u.name || u.email).filter(Boolean);
    }, [usersData]);

    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item.id || item._id, { consumption: payload }),
        {
            onSuccess: () => {
                onDone();
                onClose();
            }
        }
    );

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    const handleGridChange = (id, field, value) => {
        setFinalMeasurementsGrid((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
    };

    const handleSyncMeasurements = () => {
        const reFetched = parseGridInitial(item);
        setFinalMeasurementsGrid(reFetched);
        const fetchedText = autoFetchMeasurements(item);
        setForm((prev) => ({ ...prev, measurements: fetchedText }));
    };

    const handleSyncRooms = () => {
        const fetched = autoFetchRooms(item);
        setForm((prev) => ({ ...prev, roomList: fetched }));
    };

    const handleIncrementVersion = () => {
        setForm((prev) => ({ ...prev, boqVersion: getNextVersion(prev.boqVersion) }));
    };

    const toggleFabric = (fabricName) => {
        setSelectedFabrics((prev) =>
            prev.includes(fabricName) ? prev.filter((f) => f !== fabricName) : [...prev, fabricName]
        );
    };

    const addCustomFabric = () => {
        if (customFabricInput.trim() && !selectedFabrics.includes(customFabricInput.trim())) {
            setSelectedFabrics((prev) => [...prev, customFabricInput.trim()]);
            setCustomFabricInput('');
        }
    };

    const toggleLining = (item) => {
        setSelectedLinings((prev) =>
            prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
        );
    };

    const submit = (e) => {
        e.preventDefault();
        setValidationError('');

        // --- Form Validations ---
        let qtyNum = undefined;
        if (form.quantity !== '') {
            qtyNum = Number(form.quantity);
            if (isNaN(qtyNum) || qtyNum < 0) {
                setValidationError('Consumption Quantity must be a valid positive decimal number.');
                return;
            }
        }

        let panelInt = undefined;
        if (form.panelCount !== '') {
            panelInt = Number(form.panelCount);
            if (!Number.isInteger(panelInt) || panelInt < 0) {
                setValidationError('Panel Count must be a whole positive integer (0, 1, 2...).');
                return;
            }
        }

        let wastageVal = form.wastageAllowance.trim();
        if (wastageVal) {
            const numWastage = Number(wastageVal.replace('%', ''));
            if (isNaN(numWastage) || numWastage < 0 || numWastage > 100) {
                setValidationError('Wastage Allowance percentage must be a valid number between 0% and 100%.');
                return;
            }
            wastageVal = `${numWastage}%`;
        }

        const finalVersion = autoIncrementVersion ? getNextVersion(form.boqVersion) : form.boqVersion;
        const liningObj = { selected: selectedLinings, notes: liningNotes.trim() };

        execute({
            ...existingConsumption,
            sheetDueDate: form.sheetDueDate || undefined,
            measurements: finalMeasurementsGrid.length > 0 ? finalMeasurementsGrid : (form.measurements || undefined),
            quantity: qtyNum,
            unit: form.unit || undefined,
            wastageAllowance: wastageVal || undefined,
            boqVersion: finalVersion || undefined,
            roomList: form.roomList || undefined,
            boqPreparedBy: form.boqPreparedBy || currentUser?.name || 'System User',
            boqPreparedDate: new Date().toISOString(),
            fabricDesignSelection: selectedFabrics,
            panelCount: panelInt,
            liningAccessoryAssumptions: liningObj,
        });
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Consumption & BOQ Specification — ${item?.code || ''}`}
            subtitle={`Configure fabric consumption, wastage allowance, versioning, and accessory assumptions for ${item?.clientName || ''}`}
            size="xl"
        >
            <form onSubmit={submit} className="space-y-4">
                {(error || validationError) && (
                    <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{validationError || error?.message || String(error)}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Consumption Sheet Due */}
                    <Field label="Consumption Sheet Due" hint="Target deadline date for sheet completion">
                        <Input
                            type="date"
                            value={form.sheetDueDate}
                            onChange={set('sheetDueDate')}
                        />
                    </Field>

                    {/* 6. BOQ / Consumption Sheet Version */}
                    <Field label="BOQ / Consumption Sheet Version" hint="System-generated versioning">
                        <div className="flex items-center gap-2">
                            <Input
                                value={form.boqVersion}
                                onChange={set('boqVersion')}
                                placeholder="e.g. v1.0"
                                className="font-mono"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleIncrementVersion}
                                title="Increment Version (e.g. v1.0 -> v1.1)"
                                icon={RefreshCw}
                                className="shrink-0"
                            >
                                Revise
                            </Button>
                        </div>
                    </Field>

                    {/* 2. Measurements (Versioned Final Measurement Grid) */}
                    <div className="md:col-span-2">
                        <Panel className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-500" />
                                    Linked Final Measurements Record
                                </h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSyncMeasurements}
                                    icon={Ruler}
                                    className="shrink-0 text-xs"
                                >
                                    Auto-fetch Final
                                </Button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
                                            <th className="p-2">Room & Window</th>
                                            <th className="p-2">Previous Measurement</th>
                                            <th className="p-2">Confirmed Width</th>
                                            <th className="p-2">Confirmed Height</th>
                                            <th className="p-2">Variance / Deviation</th>
                                            <th className="p-2">Version</th>
                                            <th className="p-2">Notes & Adjustments</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {finalMeasurementsGrid.map((gridRow) => (
                                            <tr key={gridRow.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50">
                                                <td className="p-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                                    {gridRow.room} ({gridRow.windowId})
                                                </td>
                                                <td className="p-1.5 font-mono text-slate-500">
                                                    {gridRow.previousWidth} x {gridRow.previousHeight} {gridRow.unit || 'mm'}
                                                </td>
                                                <td className="p-1.5 w-[110px]">
                                                    <Input
                                                        type="number"
                                                        value={gridRow.confirmedWidth}
                                                        onChange={(e) => handleGridChange(gridRow.id, 'confirmedWidth', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-1.5 w-[110px]">
                                                    <Input
                                                        type="number"
                                                        value={gridRow.confirmedHeight}
                                                        onChange={(e) => handleGridChange(gridRow.id, 'confirmedHeight', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-1.5">
                                                    {calculateVariance(gridRow.previousWidth, gridRow.previousHeight, gridRow.confirmedWidth, gridRow.confirmedHeight, gridRow.unit || 'mm')}
                                                </td>
                                                <td className="p-1.5">
                                                    <Badge tone="emerald">{gridRow.version || 'v2.0'}</Badge>
                                                </td>
                                                <td className="p-1.5 min-w-[160px]">
                                                    <Input
                                                        value={gridRow.notes || ''}
                                                        onChange={(e) => handleGridChange(gridRow.id, 'notes', e.target.value)}
                                                        placeholder="Confirmation notes..."
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-1">
                                <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>Confirmed measurement source: <strong>{autoFetchMeasurements(item)}</strong></span>
                            </div>
                        </Panel>
                    </div>

                    {/* 7. Room List (Auto-fetched linked room list) */}
                    <div className="md:col-span-2">
                        <Field label="Linked Room List" hint="Auto-fetched room list from final measurements">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Textarea
                                        rows={2}
                                        value={form.roomList}
                                        onChange={set('roomList')}
                                        placeholder="Master Bedroom, Living Room, Dining..."
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSyncRooms}
                                        icon={RefreshCw}
                                        className="shrink-0 text-xs self-start"
                                    >
                                        Sync Rooms
                                    </Button>
                                </div>
                            </div>
                        </Field>
                    </div>

                    {/* 3. Consumption Quantity */}
                    <Field label="Consumption Quantity" hint="Decimal quantity for BOQ line">
                        <Input
                            type="number"
                            step="any"
                            min="0"
                            value={form.quantity}
                            onChange={set('quantity')}
                            placeholder="e.g. 150.5"
                        />
                    </Field>

                    {/* 4. Unit (Dropdown from approved unit master) */}
                    <Field label="Unit Master" hint="Select approved measurement unit">
                        <Select value={form.unit} onChange={set('unit')}>
                            {APPROVED_UNITS.map((unit) => (
                                <option key={unit} value={unit}>
                                    {unit}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    {/* 5. Wastage Allowance */}
                    <Field label="Wastage Allowance (%)" hint="Numeric percentage allowance (e.g. 10)">
                        <div className="relative">
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={form.wastageAllowance}
                                onChange={set('wastageAllowance')}
                                placeholder="e.g. 10"
                                className="pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">%</span>
                        </div>
                    </Field>

                    {/* 11. Panel Count */}
                    <Field label="Panel Count" hint="Positive whole integers only">
                        <Input
                            type="number"
                            min="0"
                            step="1"
                            value={form.panelCount}
                            onChange={set('panelCount')}
                            placeholder="e.g. 12"
                        />
                    </Field>

                    {/* 8. BOQ Prepared By (System-generated user field) */}
                    <Field label="BOQ Prepared By" hint="Captures user preparing the BOQ">
                        {systemUsers.length > 0 ? (
                            <Select value={form.boqPreparedBy} onChange={set('boqPreparedBy')}>
                                <option value={currentUser?.name || currentUser?.email || ''}>
                                    Current User ({currentUser?.name || currentUser?.email || 'Logged In User'})
                                </option>
                                {systemUsers.map((usr) => (
                                    <option key={usr} value={usr}>
                                        {usr}
                                    </option>
                                ))}
                            </Select>
                        ) : (
                            <Input
                                value={form.boqPreparedBy}
                                onChange={set('boqPreparedBy')}
                                placeholder="User name..."
                            />
                        )}
                    </Field>

                    {/* 9. BOQ Prepared Date (System-generated read-only) */}
                    <Field label="BOQ Prepared Date & Time" hint="System-generated read-only timestamp">
                        <Input
                            type="datetime-local"
                            value={form.boqPreparedDate}
                            disabled
                            className="bg-slate-100 dark:bg-slate-900 cursor-not-allowed opacity-80"
                        />
                    </Field>

                    {/* 10. Fabric / Design Selection (Searchable lookup with multi-select) */}
                    <div className="md:col-span-2 space-y-2">
                        <Field label="Fabric / Design Selection" hint="Select from approved fabric master or enter multiple items">
                            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
                                {/* Selected fabric chips */}
                                <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
                                    {selectedFabrics.length === 0 ? (
                                        <span className="text-xs text-slate-400 italic">No fabrics selected yet. Click options below or type to add.</span>
                                    ) : (
                                        selectedFabrics.map((fab) => (
                                            <span
                                                key={fab}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-brand-500/10 border border-brand-500/30 text-brand-700 dark:text-brand-300"
                                            >
                                                <Tag className="w-3 h-3 text-brand-500 shrink-0" />
                                                {fab}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleFabric(fab)}
                                                    className="ml-1 text-slate-400 hover:text-rose-500 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))
                                    )}
                                </div>

                                {/* Custom fabric adder */}
                                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
                                    <Input
                                        value={customFabricInput}
                                        onChange={(e) => setCustomFabricInput(e.target.value)}
                                        placeholder="Add custom fabric or design name..."
                                        className="text-xs"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addCustomFabric();
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={addCustomFabric}
                                        icon={Plus}
                                        className="shrink-0 text-xs"
                                    >
                                        Add Item
                                    </Button>
                                </div>

                                {/* Fabric master quick picker */}
                                {fabricOptions.length > 0 && (
                                    <div className="pt-2">
                                        <span className="text-[11px] font-semibold text-slate-500 block mb-1 uppercase tracking-wider">
                                            Fabric Catalog Master Quick Select:
                                        </span>
                                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                                            {fabricOptions.map((option) => {
                                                const selected = selectedFabrics.includes(option);
                                                return (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => toggleFabric(option)}
                                                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${selected
                                                            ? 'bg-brand-600 text-white font-semibold shadow-xs'
                                                            : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-100 dark:hover:bg-slate-700'
                                                            }`}
                                                    >
                                                        {selected && <Check className="w-3 h-3 inline mr-1" />}
                                                        {option}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Field>
                    </div>

                    {/* 12. Lining / Accessory Assumptions (Multi-select plus notes) */}
                    <div className="md:col-span-2 space-y-2">
                        <Field label="Lining / Accessory Assumptions" hint="Select approved master items and include explanatory notes">
                            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">
                                        Approved Lining & Accessory Master Options:
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {LINING_ACCESSORY_MASTER.map((item) => {
                                            const checked = selectedLinings.includes(item);
                                            return (
                                                <label
                                                    key={item}
                                                    className={`flex items-center gap-2 p-2 rounded-md border text-xs font-medium cursor-pointer transition-all ${checked
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold'
                                                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleLining(item)}
                                                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                                                    />
                                                    <span>{item}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                                    <Field label="Explanatory Notes & Special Assumptions">
                                        <Textarea
                                            rows={2}
                                            value={liningNotes}
                                            onChange={(e) => setLiningNotes(e.target.value)}
                                            placeholder="Provide explanatory notes on blackout lining, motorized track configurations, custom pelmet details..."
                                        />
                                    </Field>
                                </div>
                            </div>
                        </Field>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoIncrementVersion}
                            onChange={(e) => setAutoIncrementVersion(e.target.checked)}
                            className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                        />
                        <span>Auto-increment revision version on save ({form.boqVersion} → {getNextVersion(form.boqVersion)})</span>
                    </label>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" loading={pending}>Save Consumption / BOQ</Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, onRowClick, selectedSection = 's7', onSectionChange }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's7';
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
                                            {renderSpreadsheetCell(lead, col.key, idx + 1, onView, onEdit)}
                                        </td>
                                    ))
                                )}
                                <td className="p-2 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 text-right sticky right-0 z-10 border-l border-slate-200 dark:border-slate-800/80">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); onView(lead); }} />
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={(e) => { e.stopPropagation(); onEdit && onEdit(lead); }} />
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

const ConsumptionBoq = ({ items: itemsProp = [] }) => {
    const [viewMode, setViewMode] = useViewMode('table');
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleFetchLeads } = useSales();
    const salesLeads = useSelector((state) => state.sales?.leads);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [drawerLead, setDrawerLead] = useState(null);

    const reload = () => {
        setLoading(true);
        setError(null);
        handleFetchLeads()
            .catch((err) => setError(err?.message || 'Failed to fetch consumption BOQ data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const selectedSection = searchParams.get('section') || 's7';

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=consumption-boq`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const studioCompletedLeads = rawLeads.filter((lead) =>
        Boolean(
            lead.studioMeeting?.date ||
            lead.studioMeeting?.feedback ||
            lead.studioMeeting?.nextAction ||
            lead.studioMeeting?.attendees ||
            lead.studioMeeting?.pricingRange ||
            lead.consumption?.boqVersion
        )
    );

    const filteredLeads = studioCompletedLeads.filter((lead) => {
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const version = String(lead.consumption?.boqVersion || '').toLowerCase();
            const fabric = String(lead.consumption?.fabricDesignSelection || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !version.includes(q) && !fabric.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = studioCompletedLeads.length;
    const activeBoqCount = studioCompletedLeads.filter((l) => Boolean(l.consumption?.boqVersion)).length;
    const fabricSelectedCount = studioCompletedLeads.filter((l) => Boolean(l.consumption?.fabricDesignSelection)).length;
    const pendingSheets = studioCompletedLeads.filter((l) => l.consumption?.sheetDueDate && !l.consumption?.boqVersion).length;

    return (
        <div>
            <PageHeader
                title="Consumption Sheet / BOQ Dashboard"
                subtitle="Calculate fabric requirements, quantities, wastage allowances, BOQ versions, room lists, panel counts, and lining accessories"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Total BOQ Projects" value={totalCount} sub="Leads requiring BOQ" icon={FileSpreadsheet} tone="emerald" />
                <StatTile label="Active BOQs" value={activeBoqCount} sub="BOQ versions created" icon={CheckCircle2} tone="green" />
                <StatTile label="Pending BOQ Sheets" value={pendingSheets} sub="Awaiting BOQ calculation" icon={Calendar} tone="amber" />
                <StatTile label="Fabric Selections" value={fabricSelectedCount} sub="Design & fabrics specified" icon={Layers} tone="blue" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, BOQ version, fabric..."
                            className="pl-9"
                        />
                    </div>

                    <ViewSwitcher view={viewMode} onViewChange={setViewMode} />

                    {(search || selectedSection !== 's7') && (
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
                    <Loading text="Loading Consumption Sheet & BOQ..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={FileSpreadsheet} title="No BOQ Records Found" hint="Try adjusting search parameters." />
                </Panel>
            ) : viewMode === 'cards' ? (
                <CardGridView
                    items={filteredLeads}
                    renderCard={(lead) => (
                        <SalesStageCard
                            lead={lead}
                            stageKey="boq"
                            onView={handleViewLead}
                            onEdit={(l) => setEditingItem(l)}
                            onRowClick={(l) => setDrawerLead(l)}
                        />
                    )}
                    empty={
                        <Panel className="p-8 text-center">
                            <EmptyState icon={FileSpreadsheet} title="No BOQ Records Found" hint="Try adjusting search parameters." />
                        </Panel>
                    }
                />
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingItem(lead)}
                    onRowClick={(lead) => setDrawerLead(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's7')}
                />
            )}

            {editingItem && (
                <EditConsumptionModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
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

export default ConsumptionBoq;
