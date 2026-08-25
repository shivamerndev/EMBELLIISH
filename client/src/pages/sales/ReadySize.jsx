import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, CheckSquare, Calendar, CheckCircle2, Paperclip, Home, Pencil,
    Plus, Trash2, Clock, AlertTriangle, Layers, ArrowRight, RefreshCw, Check, X, Ruler, Sparkles, FileText
} from 'lucide-react';
import { date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi, usersApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';

const SPREADSHEET_SECTIONS = [
    {
        id: 's6',
        title: 'Ready Size (Window/Site Details)',
        color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/90 dark:text-blue-200 dark:border-blue-700/80',
        cols: [
            { key: 'readySize.dueDate', label: 'Ready Size Due' },
            { key: 'readySize.confirmedBy', label: 'Ready Size Confirmed By' },
            { key: 'readySize.confirmationDate', label: 'Confirmation Date' },
            { key: 'readySize.windowSizes', label: 'Window Size' },
            { key: 'readySize.siteCondition', label: 'Site Condition' },
            { key: 'readySize.pelmetDetails', label: 'Pelmet Details' },
            { key: 'readySize.channelDetails', label: 'Channel Details' },
            { key: 'readySize.readyHeight', label: 'Ready Height' },
            { key: 'readySize.finalMeasurements', label: 'Final Measurements Grid' },
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
    'readySize.dueDate': (lead) => {
        const val = lead.readySize?.dueDate;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const isOverdue = !lead.readySize?.confirmationDate && new Date(val) < new Date();
        return (
            <div className="flex items-center gap-1 justify-center">
                <span className={`text-[11px] font-mono whitespace-nowrap ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
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
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap justify-center">
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
        return <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">{String(val)}</span>;
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

const MultiSelectUsersControl = ({ selectedUsers = [], users = [], onChange }) => {
    const eligibleUsers = users.filter((u) => {
        const role = String(u.role || '').toUpperCase();
        const name = String(u.name || '').toLowerCase();
        const isAllowedRole =
            role === 'PROJECT_COORDINATOR' ||
            role.includes('COORDINATOR') ||
            role === 'DCM' ||
            role === 'SENIOR_DCM' ||
            role === 'INSTALLER' ||
            role.includes('CONFIRMER');
        const isAffectedNamedUser = name.includes('ishani') || name.includes('rucha');
        return isAllowedRole || isAffectedNamedUser;
    });

    const toggleUser = (userId) => {
        if (selectedUsers.includes(userId)) {
            onChange(selectedUsers.filter((id) => id !== userId));
        } else {
            onChange([...selectedUsers, userId]);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg">
                {selectedUsers.length === 0 ? (
                    <span className="text-xs text-slate-400 py-0.5">Select confirmers (DCM, PC, Installer...)...</span>
                ) : (
                    selectedUsers.map((uid) => {
                        const uObj = users.find((u) => (u._id || u.id) === uid) || { name: uid };
                        return (
                            <Badge key={uid} tone="blue" className="inline-flex items-center gap-1 text-xs py-0.5 px-2">
                                <span>{uObj.name}</span>
                                {uObj.role && <span className="opacity-70 text-[9px]">({uObj.role})</span>}
                                <button
                                    type="button"
                                    onClick={() => toggleUser(uid)}
                                    className="hover:text-rose-600 focus:outline-none ml-1"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        );
                    })
                )}
            </div>

            <div className="max-h-36 overflow-y-auto p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950/60 divide-y divide-slate-100 dark:divide-slate-900">
                {eligibleUsers.map((u) => {
                    const uid = u._id || u.id;
                    const isSelected = selectedUsers.includes(uid);
                    return (
                        <button
                            key={uid}
                            type="button"
                            onClick={() => toggleUser(uid)}
                            className={`w-full flex items-center justify-between p-1.5 text-left text-xs rounded transition ${isSelected ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'}`}
                        >
                            <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span>{u.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{u.role || 'Staff'}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const EditReadySizeModal = ({ item, onClose, onDone, users = [] }) => {
    const initialMeasurement = item?.measurement || {};
    const existingReadySize = item?.readySize || {};

    const parseConfirmedByInitial = (cb) => {
        if (!cb) return [];
        if (Array.isArray(cb)) return cb.map((u) => typeof u === 'object' ? (u._id || u.id) : u);
        if (typeof cb === 'object') return [cb._id || cb.id];
        if (typeof cb === 'string') return cb.split(',').map((s) => s.trim()).filter(Boolean);
        return [];
    };

    const parseWindowSizesInitial = () => {
        const raw = existingReadySize.windowSizes || existingReadySize.windowSize;
        const parsed = parseSubformArray(raw);
        if (parsed.length > 0) return parsed;
        return [
            { id: 'w-1', room: 'Living Room', windowId: 'W-01', width: '1200', height: '2100', unit: 'mm' },
            { id: 'w-2', room: 'Master Bedroom', windowId: 'W-02', width: '1500', height: '2400', unit: 'mm' }
        ];
    };

    const parsePelmetsInitial = () => {
        const raw = existingReadySize.pelmetDetails || initialMeasurement.pelmetDetails;
        const parsed = parseSubformArray(raw);
        if (parsed.length > 0) return parsed;
        if (typeof raw === 'string' && raw) {
            return [{ id: 'p-1', room: 'Living Room', pelmetType: 'Wooden Pelmet', width: '150', depth: '150', status: 'Confirmed', notes: raw, revision: 1 }];
        }
        return [
            { id: 'p-1', room: 'Living Room', pelmetType: 'Ply Wooden Box', width: '150', depth: '150', status: 'Ready', notes: 'Pulled from site measurement', revision: 1 }
        ];
    };

    const parseChannelsInitial = () => {
        const raw = existingReadySize.channelDetails || initialMeasurement.channelDetails;
        const parsed = parseSubformArray(raw);
        if (parsed.length > 0) return parsed;
        if (typeof raw === 'string' && raw) {
            return [{ id: 'c-1', room: 'Living Room', channelType: 'Recessed Track', trackLength: '2400', mounting: 'Ceiling', status: 'Confirmed', notes: raw, revision: 1 }];
        }
        return [
            { id: 'c-1', room: 'Living Room', channelType: 'Ceiling Track 2-Track', trackLength: '2400', mounting: 'Ceiling Recessed', status: 'Ready', notes: 'Pulled from site measurement', revision: 1 }
        ];
    };

    const parseGridInitial = (windowList) => {
        const raw = existingReadySize.finalMeasurements || existingReadySize.finalMeasurementGrid;
        const parsed = parseSubformArray(raw);
        if (parsed.length > 0 && typeof parsed[0] === 'object') return parsed;

        return windowList.map((w, idx) => ({
            id: `g-${idx + 1}`,
            room: w.room || 'Room',
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
    };

    const [dueDate, setDueDate] = useState(
        existingReadySize.dueDate ? new Date(existingReadySize.dueDate).toISOString().slice(0, 10) : ''
    );
    const [confirmedBy, setConfirmedBy] = useState(parseConfirmedByInitial(existingReadySize.confirmedBy));
    const [confirmationDate, setConfirmationDate] = useState(
        existingReadySize.confirmationDate ? new Date(existingReadySize.confirmationDate).toISOString().slice(0, 16) : ''
    );
    const [siteCondition, setSiteCondition] = useState(existingReadySize.siteCondition || 'Ready');
    const [windowSizes, setWindowSizes] = useState(parseWindowSizesInitial());
    const [readyHeightVal, setReadyHeightVal] = useState(
        typeof existingReadySize.readyHeight === 'string' ? existingReadySize.readyHeight : '2100 mm'
    );
    const [pelmetDetails, setPelmetDetails] = useState(parsePelmetsInitial());
    const [channelDetails, setChannelDetails] = useState(parseChannelsInitial());
    const [finalMeasurementsGrid, setFinalMeasurementsGrid] = useState(parseGridInitial(parseWindowSizesInitial()));

    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item.id || item._id, { readySize: payload }),
        {
            onSuccess: () => {
                onDone();
                onClose();
            }
        }
    );

    const handleSetCurrentTime = () => {
        const nowStr = new Date().toISOString().slice(0, 16);
        setConfirmationDate(nowStr);
    };

    const handleAddWindow = () => {
        const newId = `w-${Date.now()}`;
        const newWin = { id: newId, room: 'Living Room', windowId: `W-0${windowSizes.length + 1}`, width: '1200', height: '2100', unit: 'mm' };
        const updatedWin = [...windowSizes, newWin];
        setWindowSizes(updatedWin);

        setFinalMeasurementsGrid([
            ...finalMeasurementsGrid,
            {
                id: `g-${Date.now()}`,
                room: newWin.room,
                windowId: newWin.windowId,
                previousWidth: newWin.width,
                previousHeight: newWin.height,
                confirmedWidth: newWin.width,
                confirmedHeight: newWin.height,
                unit: newWin.unit,
                status: 'Confirmed',
                notes: 'Newly added window size',
                version: 'v2.0'
            }
        ]);
    };

    const handleRemoveWindow = (id) => {
        setWindowSizes(windowSizes.filter((w) => w.id !== id));
    };

    const handleWindowChange = (id, field, value) => {
        setWindowSizes(windowSizes.map((w) => (w.id === id ? { ...w, [field]: value } : w)));
    };

    const handleAddPelmet = () => {
        setPelmetDetails([
            ...pelmetDetails,
            { id: `p-${Date.now()}`, room: 'Living Room', pelmetType: 'Wooden Pelmet', width: '150', depth: '150', status: 'Ready', notes: 'Added pelmet detail', revision: 1 }
        ]);
    };

    const handleRemovePelmet = (id) => {
        setPelmetDetails(pelmetDetails.filter((p) => p.id !== id));
    };

    const handlePelmetChange = (id, field, value) => {
        setPelmetDetails(pelmetDetails.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    };

    const handleAddChannel = () => {
        setChannelDetails([
            ...channelDetails,
            { id: `c-${Date.now()}`, room: 'Living Room', channelType: 'Ceiling Track', trackLength: '2400', mounting: 'Ceiling', status: 'Ready', notes: 'Added channel detail', revision: 1 }
        ]);
    };

    const handleRemoveChannel = (id) => {
        setChannelDetails(channelDetails.filter((c) => c.id !== id));
    };

    const handleChannelChange = (id, field, value) => {
        setChannelDetails(channelDetails.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    };

    const handleGridChange = (id, field, value) => {
        setFinalMeasurementsGrid(finalMeasurementsGrid.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
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

    const submit = (e) => {
        e.preventDefault();

        const payload = {
            ...(item?.readySize || {}),
            dueDate: dueDate || undefined,
            confirmedBy: confirmedBy.length > 0 ? confirmedBy : undefined,
            confirmationDate: confirmationDate ? new Date(confirmationDate).toISOString() : new Date().toISOString(),
            siteCondition: siteCondition || 'Ready',
            windowSizes: windowSizes,
            windowSize: windowSizes.map((w) => `${w.room} (${w.windowId}): ${w.width}x${w.height} ${w.unit}`).join('; '),
            readyHeight: readyHeightVal,
            pelmetDetails: pelmetDetails,
            channelDetails: channelDetails,
            finalMeasurements: finalMeasurementsGrid,
        };

        execute(payload);
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Ready Size Confirmation — ${item?.code || ''}`}
            subtitle={`Capture & confirm final ready sizes, pelmets, tracks, and versioned site measurements for ${item?.clientName || ''}`}
            size="xl"
        >
            <form onSubmit={submit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
                {error && (
                    <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg">
                        {error?.message || String(error)}
                    </div>
                )}

                {/* Section 1: Ready Size Due, Confirmed By, Confirmation Date, Site Condition */}
                <Panel className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b pb-2 border-slate-200 dark:border-slate-800 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-blue-500" />
                        1. Confirmation Header & Site Condition
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Ready Size Due (Date Picker)">
                            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                        </Field>

                        <Field label="Site Condition (Dropdown)">
                            <Select
                                value={siteCondition}
                                onChange={(e) => setSiteCondition(e.target.value)}
                                options={SITE_CONDITION_OPTIONS}
                            />
                        </Field>

                        <Field label="Confirmation Date & Time">
                            <div className="flex gap-1.5">
                                <Input
                                    type="datetime-local"
                                    value={confirmationDate}
                                    onChange={(e) => setConfirmationDate(e.target.value)}
                                />
                            </div>
                        </Field>
                    </div>
                    <Field label="Ready Size Confirmed By">
                            <MultiSelectUsersControl
                                selectedUsers={confirmedBy}
                                users={users}
                                onChange={setConfirmedBy}
                            />
                        </Field>
                </Panel>

                {/* Section 2: Repeatable Window Size Subform */}
                <Panel className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Ruler className="w-4 h-4 text-blue-500" />
                            2. Window Size
                        </h4>
                        <Button type="button" size="sm" variant="outline" icon={Plus} onClick={handleAddWindow}>
                            Add Window Size
                        </Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
                                    <th className="p-2">Room Name</th>
                                    <th className="p-2">Window ID</th>
                                    <th className="p-2">Width (Numeric)</th>
                                    <th className="p-2">Height (Numeric)</th>
                                    <th className="p-2">Unit</th>
                                    <th className="p-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {windowSizes.map((win) => (
                                    <tr key={win.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50">
                                        <td className="p-1.5 min-w-[140px]">
                                            <Input
                                                value={win.room}
                                                onChange={(e) => handleWindowChange(win.id, 'room', e.target.value)}
                                                placeholder="e.g. Living Room"
                                            />
                                        </td>
                                        <td className="p-1.5 min-w-[100px]">
                                            <Input
                                                value={win.windowId}
                                                onChange={(e) => handleWindowChange(win.id, 'windowId', e.target.value)}
                                                placeholder="e.g. W-01"
                                            />
                                        </td>
                                        <td className="p-1.5 min-w-[110px]">
                                            <Input
                                                type="number"
                                                step="any"
                                                value={win.width}
                                                onChange={(e) => handleWindowChange(win.id, 'width', e.target.value)}
                                                placeholder="e.g. 1200"
                                            />
                                        </td>
                                        <td className="p-1.5 min-w-[110px]">
                                            <Input
                                                type="number"
                                                step="any"
                                                value={win.height}
                                                onChange={(e) => handleWindowChange(win.id, 'height', e.target.value)}
                                                placeholder="e.g. 2100"
                                            />
                                        </td>
                                        <td className="p-1.5 w-[90px]">
                                            <Select
                                                value={win.unit || 'mm'}
                                                onChange={(e) => handleWindowChange(win.id, 'unit', e.target.value)}
                                                options={UNIT_OPTIONS}
                                            />
                                        </td>
                                        <td className="p-1.5 text-right">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                icon={Trash2}
                                                onClick={() => handleRemoveWindow(win.id)}
                                                className="text-rose-600 hover:text-rose-700"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                {/* Section 3: Ready Height Field */}
                <Panel className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b pb-2 border-slate-200 dark:border-slate-800 flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-emerald-500" />
                        3. Ready Height
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Overall / Default Ready Height (Decimal Value + Unit)">
                            <Input
                                value={readyHeightVal}
                                onChange={(e) => setReadyHeightVal(e.target.value)}
                                placeholder="e.g. 2100.5 mm / Floor to Ceiling"
                            />
                        </Field>
                        <div className="text-xs text-slate-500 dark:text-slate-400 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Recorded per window for manufacture allowances and track mounting clearance.</span>
                        </div>
                    </div>
                </Panel>

                {/* Section 4: Auto-fetched Pelmet Details & Channel Details Subforms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pelmet Details */}
                    <Panel className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-amber-500" />
                                4. Pelmet Details
                            </h4>
                            <Button type="button" size="sm" variant="outline" icon={Plus} onClick={handleAddPelmet}>
                                Add Pelmet
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {pelmetDetails.map((pel) => (
                                <div key={pel.id} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            value={pel.room || ''}
                                            onChange={(e) => handlePelmetChange(pel.id, 'room', e.target.value)}
                                            placeholder="Room Name"
                                        />
                                        <Input
                                            value={pel.pelmetType || ''}
                                            onChange={(e) => handlePelmetChange(pel.id, 'pelmetType', e.target.value)}
                                            placeholder="Pelmet Type / Material"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input
                                            type="number"
                                            value={pel.width || ''}
                                            onChange={(e) => handlePelmetChange(pel.id, 'width', e.target.value)}
                                            placeholder="Width (mm)"
                                        />
                                        <Input
                                            type="number"
                                            value={pel.depth || ''}
                                            onChange={(e) => handlePelmetChange(pel.id, 'depth', e.target.value)}
                                            placeholder="Depth (mm)"
                                        />
                                        <div className="flex items-center justify-between">
                                            <Badge tone="amber">Rev #{pel.revision || 1}</Badge>
                                            <Button type="button" size="sm" variant="ghost" icon={Trash2} onClick={() => handleRemovePelmet(pel.id)} />
                                        </div>
                                    </div>
                                    <Input
                                        value={pel.notes || ''}
                                        onChange={(e) => handlePelmetChange(pel.id, 'notes', e.target.value)}
                                        placeholder="Revision notes / site changes..."
                                    />
                                </div>
                            ))}
                        </div>
                    </Panel>

                    {/* Channel Details */}
                    <Panel className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-500" />
                                5. Channel Details
                            </h4>
                            <Button type="button" size="sm" variant="outline" icon={Plus} onClick={handleAddChannel}>
                                Add Channel
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {channelDetails.map((chn) => (
                                <div key={chn.id} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            value={chn.room || ''}
                                            onChange={(e) => handleChannelChange(chn.id, 'room', e.target.value)}
                                            placeholder="Room Name"
                                        />
                                        <Input
                                            value={chn.channelType || ''}
                                            onChange={(e) => handleChannelChange(chn.id, 'channelType', e.target.value)}
                                            placeholder="Channel Type / Track Spec"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input
                                            type="number"
                                            value={chn.trackLength || ''}
                                            onChange={(e) => handleChannelChange(chn.id, 'trackLength', e.target.value)}
                                            placeholder="Track Length (mm)"
                                        />
                                        <Input
                                            value={chn.mounting || ''}
                                            onChange={(e) => handleChannelChange(chn.id, 'mounting', e.target.value)}
                                            placeholder="Mounting (Ceiling/Wall)"
                                        />
                                        <div className="flex items-center justify-between">
                                            <Badge tone="indigo">Rev #{chn.revision || 1}</Badge>
                                            <Button type="button" size="sm" variant="ghost" icon={Trash2} onClick={() => handleRemoveChannel(chn.id)} />
                                        </div>
                                    </div>
                                    <Input
                                        value={chn.notes || ''}
                                        onChange={(e) => handleChannelChange(chn.id, 'notes', e.target.value)}
                                        placeholder="Revision notes / track adjustments..."
                                    />
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>

                {/* Section 5: Versioned Measurement Grid */}
                <Panel className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b pb-2 border-slate-200 dark:border-slate-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        6. Final Measurements
                    </h4>

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
                </Panel>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-950 p-2 z-10">
                    <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                    <Button variant="primary" type="submit" loading={pending} icon={CheckCircle2}>Save Ready Size Details</Button>
                </div>
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's6', onSectionChange, users = [] }) => {
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
                                            {renderSpreadsheetCell(lead, col.key, idx + 1, onView, onEdit, users)}
                                        </td>
                                    ))
                                )}
                                <td className="p-2 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 text-right sticky right-0 z-10 border-l border-slate-200 dark:border-slate-800/80">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(lead)} title="Edit Ready Size" />
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(lead)} title="View Lead Details" />
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
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleFetchLeads } = useSales();
    const salesLeads = useSelector((state) => state.sales?.leads);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingLead, setEditingLead] = useState(null);

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

    const studioCompletedLeads = rawLeads.filter((lead) =>
        Boolean(
            lead.studioMeeting?.date ||
            lead.studioMeeting?.feedback ||
            lead.studioMeeting?.nextAction ||
            lead.studioMeeting?.attendees ||
            lead.studioMeeting?.pricingRange
        )
    );

    const filteredLeads = studioCompletedLeads.filter((lead) => {
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

    const totalCount = studioCompletedLeads.length;
    const confirmedCount = studioCompletedLeads.filter((l) => l.readySize?.confirmationDate).length;
    const pendingConfirmation = studioCompletedLeads.filter((l) => l.readySize?.dueDate && !l.readySize?.confirmationDate).length;
    const roomsReadyCount = studioCompletedLeads.filter((l) => Boolean(l.readySize?.readyHeight || l.readySize?.siteCondition)).length;

    return (
        <div>
            <PageHeader
                title="Ready Size Confirmation (Window & Site Details)"
                subtitle="Track site & window details, ready heights, final measurement confirmations, pelmets, and channel specifications"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Total Window Leads" value={totalCount} sub="Active site windows" icon={CheckSquare} tone="blue" />
                <StatTile label="Confirmed Sizes" value={confirmedCount} sub="Ready for production" icon={CheckCircle2} tone="green" />
                <StatTile label="Pending Confirmations" value={pendingConfirmation} sub="Awaiting site verification" icon={Calendar} tone="amber" />
                <StatTile label="Rooms / Heights Ready" value={roomsReadyCount} sub="Site conditions met" icon={Home} tone="violet" />
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
                    <Loading text="Loading Ready Size Details..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={CheckSquare} title="No Ready Size Records Found" hint="Try adjusting search parameters." />
                </Panel>
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingLead(lead)}
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
        </div>
    );
};

export default ReadySize;

