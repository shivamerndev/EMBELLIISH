import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, FileSpreadsheet, Calendar, CheckCircle2, Paperclip, Layers, Pencil,
    Ruler, Percent, UserCheck, Clock, AlertTriangle, Loader2,
    Printer
} from 'lucide-react';
import { date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Loading, ErrorState, EmptyState, StatTile, Modal, DelayBadge, ViewSwitcher } from '../../components/ui';
import useViewMode from '../../hooks/useViewMode';
import CardGridView from '../../components/common/CardGridView';
import SalesStageCard from '../../components/cards/SalesStageCard';
import { useSelector } from 'react-redux';
import { selectUser } from '../../features/auth/authSlice';
import useSales from '../../hooks/useSales';
import { leadsApi, fabricsApi, usersApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import DetailedDrawer from '../../components/sales/DetailedDrawer';
import HeaderTools from '../../components/consumption/HeaderTools';
import ConsumptionGrid from '../../components/consumption/ConsumptionGrid';
import AddWindowMeasurementModal from '../../components/consumption/AddWindowModal';
import consumptionPrintService, { printConsumptionSheet } from '../../services/consumptionPrintService';
import { calculateRowConsumption } from '../../utils/consumptionCalc';
import TypesTab from '@/components/consumption/TypesTab';


const SPREADSHEET_SECTIONS = [
    {
        id: 's7',
        title: 'Consumption / BOQ',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-700/80',
        // All fields : shown in DetailedDrawer
        cols: [
            { key: 'code', label: 'Lead ID' },
            { key: 'clientName', label: 'Client Name' },
            { key: 'consumption.sheetDueDate', label: 'Consumption Sheet Due' },
            { key: 'consumption.boqPreparedDate', label: 'BOQ Actual Prepared Date' },
            { key: 'delayStatus', label: 'Delay / SLA Status' },
            { key: 'consumption.boqVersion', label: 'BOQ / Consumption Sheet Version' },
            { key: 'consumption.boqPreparedBy', label: 'BOQ Prepared By' },
            { key: 'consumption.measurements', label: 'Measurements' },
            { key: 'consumption.quantity', label: 'Consumption Quantity' },
            { key: 'consumption.unit', label: 'Unit' },
            { key: 'consumption.wastageAllowance', label: 'Wastage Allowance' },
            { key: 'consumption.roomList', label: 'Room List' },
            { key: 'consumption.fabricDesignSelection', label: 'Fabric / Design Selection' },
            { key: 'consumption.panelCount', label: 'Panel Count' },
            { key: 'consumption.liningAccessoryAssumptions', label: 'Lining / accessory assumptions' },
        ],
        // Subset shown in table : prevents horizontal scrolling
        tableCols: [
            { key: 'clientName', label: 'Client Name' },
            { key: 'consumption.sheetDueDate', label: 'Due Date' },
            { key: 'consumption.boqPreparedDate', label: 'Prepared Date' },
            { key: 'delayStatus', label: 'SLA Status' },
            { key: 'consumption.boqVersion', label: 'BOQ Version' },
            { key: 'consumption.boqPreparedBy', label: 'Prepared By' },
            { key: 'consumption.quantity', label: 'Quantity' },
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

const isMeasurementRowValid = (row) => {
    if (!row) return false;
    const hasArea = Boolean((row.area && String(row.area).trim()) || (row.room && String(row.room).trim()));
    const hasDims = Boolean(
        (row.outToOutWidth !== '' && row.outToOutWidth != null) ||
        (row.outToOutHeight !== '' && row.outToOutHeight != null) ||
        (row.frameToFrameWidth !== '' && row.frameToFrameWidth != null) ||
        (row.frameToFrameHeight !== '' && row.frameToFrameHeight != null) ||
        (row.pelmetOutOutWidth !== '' && row.pelmetOutOutWidth != null) ||
        (row.pelmetOutOutDrop !== '' && row.pelmetOutOutDrop != null) ||
        (row.pelmetFrameFrameWidth !== '' && row.pelmetFrameFrameWidth != null) ||
        (row.pelmetFrameFrameDrop !== '' && row.pelmetFrameFrameDrop != null) ||
        (row.width !== '' && row.width != null) ||
        (row.height !== '' && row.height != null)
    );
    const hasDetail = Boolean(
        (row.lWindowDetail && String(row.lWindowDetail).trim()) ||
        (row.remarks && String(row.remarks).trim()) ||
        (row.notes && String(row.notes).trim()) ||
        (row.sidesOfRoman && String(row.sidesOfRoman).trim()) ||
        (row.ceilingSupport && String(row.ceilingSupport).trim()) ||
        row.wire || row.wireLeft || row.wireRight
    );
    return hasArea || hasDims || hasDetail;
};

const parseGridInitial = (item) => {
    const rawNotes = item?.measurement?.rows || item?.measurement?.notes;
    const parsedNotes = parseSubformArray(rawNotes);
    const validNotes = parsedNotes.filter(isMeasurementRowValid);

    const existing = item?.consumption?.measurements;
    const parsedExisting = parseSubformArray(existing);
    if (parsedExisting.length > 0 && typeof parsedExisting[0] === 'object' && (parsedExisting[0].room || parsedExisting[0].confirmedWidth || parsedExisting[0].width || parsedExisting[0].frameToFrameWidth)) {
        const validExisting = parsedExisting.filter((row, idx) => {
            if (!row) return false;
            const hasRoom = Boolean((row.room && String(row.room).trim()) || (row.area && String(row.area).trim()));
            const hasDims = Boolean(
                (row.frameToFrameWidth !== '' && row.frameToFrameWidth != null) ||
                (row.frameToFrameHeight !== '' && row.frameToFrameHeight != null) ||
                (row.outToOutWidth !== '' && row.outToOutWidth != null) ||
                (row.outToOutHeight !== '' && row.outToOutHeight != null) ||
                (row.width !== '' && row.width != null) ||
                (row.height !== '' && row.height != null) ||
                (row.pelmetO2oWidth !== '' && row.pelmetO2oWidth != null) ||
                (row.pelmetF2fWidth !== '' && row.pelmetF2fWidth != null)
            );
            const hasNotes = Boolean((row.notes && String(row.notes).trim()) || (row.remarks && String(row.remarks).trim()));
            const hasAccessories = Boolean(
                (row.pelmetDetails && row.pelmetDetails.length > 0) ||
                (row.channelDetails && row.channelDetails.length > 0) ||
                (row.motorDetails && row.motorDetails.length > 0) ||
                (row.wiringDetails && row.wiringDetails.length > 0)
            );

            if (!hasRoom && !hasDims && !hasNotes && !hasAccessories) return false;

            // Detect and filter out template ghost rows if measurement rows had fewer items
            if (validNotes.length > 0 && idx >= validNotes.length) {
                if (!hasDims && !hasNotes && !hasAccessories) return false;
                if (!row.frameToFrameWidth && !row.outToOutWidth && !row.width && !hasNotes && !hasAccessories &&
                    (row.confirmedWidth === '1200' || row.confirmedWidth === 1200) &&
                    (row.confirmedHeight === '2100' || row.confirmedHeight === 2100)) {
                    return false;
                }
            }

            return true;
        });

        if (validExisting.length > 0) {
            return validExisting.map((row, idx) => ({
                id: row.id || `win-${Date.now()}-${idx}`,
                room: (row.room && String(row.room).trim()) || (row.roomName && String(row.roomName).trim()) || 'General',
                windowId: row.windowId || row.label || `W-0${idx + 1}`,
                previousWidth: row.previousWidth || row.width || row.frameToFrameWidth || '1200',
                previousHeight: row.previousHeight || row.height || row.frameToFrameHeight || '2100',
                confirmedWidth: row.confirmedWidth || row.width || row.frameToFrameWidth || '1200',
                confirmedHeight: row.confirmedHeight || row.height || row.frameToFrameHeight || '2100',
                frameToFrameWidth: row.frameToFrameWidth ?? row.confirmedWidth ?? row.width ?? '',
                frameToFrameHeight: row.frameToFrameHeight ?? row.confirmedHeight ?? row.height ?? '',
                outToOutWidth: row.outToOutWidth ?? '',
                outToOutHeight: row.outToOutHeight ?? '',
                curtainReturnLeft: row.curtainReturnLeft ?? '',
                curtainReturnRight: row.curtainReturnRight ?? '',
                pelmetO2oWidth: row.pelmetO2oWidth ?? '',
                pelmetO2oDrop: row.pelmetO2oDrop ?? '',
                pelmetF2fWidth: row.pelmetF2fWidth ?? '',
                pelmetF2fDrop: row.pelmetF2fDrop ?? '',
                sidesOfRoman: row.sidesOfRoman ?? '',
                ceilingSupport: row.ceilingSupport ?? '',
                wireLeft: row.wireLeft ?? false,
                wireRight: row.wireRight ?? false,
                particular: row.particular || row.windowType || 'MAIN_CURTAIN',
                unit: row.unit || 'mm',
                status: row.status || 'Confirmed',
                notes: row.notes || '',
                version: row.version || 'v2.0',
                pelmetDetails: row.pelmetDetails || [],
                channelDetails: row.channelDetails || [],
                motorDetails: row.motorDetails || [],
                wiringDetails: row.wiringDetails || [],
            }));
        }
    }

    if (validNotes.length > 0) {
        return validNotes.map((row, idx) => ({
            id: row.id || `win-${Date.now()}-${idx}`,
            room: (row.area && String(row.area).trim()) || (row.room && String(row.room).trim()) || 'General',
            windowId: row.lWindowDetail || row.windowId || row.label || `W-0${idx + 1}`,
            previousWidth: row.frameToFrameWidth || row.outToOutWidth || row.width || '1200',
            previousHeight: row.frameToFrameHeight || row.outToOutHeight || row.height || '2100',
            confirmedWidth: row.frameToFrameWidth || row.outToOutWidth || row.width || '1200',
            confirmedHeight: row.frameToFrameHeight || row.outToOutHeight || row.height || '2100',
            frameToFrameWidth: row.frameToFrameWidth ?? row.width ?? '',
            frameToFrameHeight: row.frameToFrameHeight ?? row.height ?? '',
            outToOutWidth: row.outToOutWidth ?? '',
            outToOutHeight: row.outToOutHeight ?? '',
            curtainReturnLeft: row.curtainReturnLeft ?? '',
            curtainReturnRight: row.curtainReturnRight ?? '',
            pelmetO2oWidth: row.pelmetOutOutWidth ?? row.pelmetO2oWidth ?? '',
            pelmetO2oDrop: row.pelmetOutOutDrop ?? row.pelmetO2oDrop ?? '',
            pelmetF2fWidth: row.pelmetFrameFrameWidth ?? row.pelmetF2fWidth ?? '',
            pelmetF2fDrop: row.pelmetFrameFrameDrop ?? row.pelmetF2fDrop ?? '',
            sidesOfRoman: row.sidesOfRoman ?? '',
            ceilingSupport: row.ceilingSupport ?? '',
            wireLeft: Boolean(row.wireLeft),
            wireRight: Boolean(row.wireRight ?? row.wire),
            particular: row.particular || row.windowType || 'MAIN_CURTAIN',
            unit: row.unit || 'mm',
            status: row.status || 'Confirmed',
            notes: row.remarks || row.notes || '',
            version: row.version || 'v2.0',
            pelmetDetails: row.pelmetDetails || [],
            channelDetails: row.channelDetails || [],
            motorDetails: row.motorDetails || [],
            wiringDetails: row.wiringDetails || [],
        }));
    }

    const rawFinal = item?.readySize?.finalMeasurements || item?.readySize?.finalMeasurementGrid;
    const parsedFinal = parseSubformArray(rawFinal);
    const validFinal = parsedFinal.filter((row) => Boolean((row.room && String(row.room).trim()) || row.confirmedWidth || row.width));
    if (validFinal.length > 0) {
        return validFinal.map((row, idx) => ({
            id: row.id || `win-${Date.now()}-${idx}`,
            room: (row.room && String(row.room).trim()) || (row.roomName && String(row.roomName).trim()) || 'General',
            windowId: row.windowId || `W-0${idx + 1}`,
            previousWidth: row.previousWidth || row.width || '1200',
            previousHeight: row.previousHeight || row.height || '2100',
            confirmedWidth: row.confirmedWidth || row.width || '1200',
            confirmedHeight: row.confirmedHeight || row.height || '2100',
            frameToFrameWidth: row.confirmedWidth || row.width || '1200',
            frameToFrameHeight: row.confirmedHeight || row.height || '2100',
            unit: row.unit || 'mm',
            status: row.status || 'Confirmed',
            notes: row.notes || 'Final size confirmed',
            version: row.version || 'v2.0',
            particular: 'MAIN_CURTAIN',
            pelmetDetails: [],
            channelDetails: [],
            motorDetails: [],
            wiringDetails: [],
        }));
    }

    const rawWindows = item?.readySize?.windowSizes || item?.readySize?.windowSize || item?.measurement?.windowSizes;
    const parsedWindows = parseSubformArray(rawWindows);
    const validWindows = parsedWindows.filter((w) => Boolean((w.room && String(w.room).trim()) || (w.roomName && String(w.roomName).trim()) || w.width));
    if (validWindows.length > 0) {
        return validWindows.map((w, idx) => ({
            id: `win-${Date.now()}-${idx}`,
            room: (w.room && String(w.room).trim()) || (w.roomName && String(w.roomName).trim()) || 'General',
            windowId: w.windowId || `W-0${idx + 1}`,
            previousWidth: w.width || '1200',
            previousHeight: w.height || '2100',
            confirmedWidth: w.width || '1200',
            confirmedHeight: w.height || '2100',
            frameToFrameWidth: w.width || '1200',
            frameToFrameHeight: w.height || '2100',
            unit: w.unit || 'mm',
            status: 'Confirmed',
            notes: 'Final size confirmed',
            version: 'v2.0',
            particular: 'MAIN_CURTAIN',
            pelmetDetails: [],
            channelDetails: [],
            motorDetails: [],
            wiringDetails: [],
        }));
    }

    return [
        {
            id: 'win-1',
            room: 'Living Room',
            windowId: 'W-01',
            previousWidth: '1200',
            previousHeight: '2100',
            confirmedWidth: '1200',
            confirmedHeight: '2100',
            frameToFrameWidth: '1200',
            frameToFrameHeight: '2100',
            unit: 'mm',
            status: 'Confirmed',
            notes: 'Final size confirmed',
            version: 'v2.0',
            particular: 'MAIN_CURTAIN',
            pelmetDetails: [],
            channelDetails: [],
            motorDetails: [],
            wiringDetails: [],
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
    if (item.measurement?.rows) {
        const parsed = parseSubformArray(item.measurement.rows);
        const valid = parsed.filter(isMeasurementRowValid);
        if (valid.length > 0) return `Site Measurement Sheet (${valid.length} window(s) recorded)`;
    }
    if (item.measurement?.roomList) return `Measurement Record (${typeof item.measurement.roomList === 'object' ? JSON.stringify(item.measurement.roomList) : item.measurement.roomList})`;
    if (item.measurement?.status) return `Measurement Record - ${typeof item.measurement.status === 'object' ? JSON.stringify(item.measurement.status) : item.measurement.status}`;
    return 'Final Confirmed Measurements v1.0';
};

const autoFetchRooms = (item) => {
    if (!item) return '';
    if (item.readySize?.windowSizes) {
        if (Array.isArray(item.readySize.windowSizes)) {
            const rooms = item.readySize.windowSizes.map((w) => (w.roomName || w.room)?.trim()).filter(Boolean);
            if (rooms.length > 0) return Array.from(new Set(rooms)).join(', ');
        }
    }
    if (item.measurement?.rows) {
        const parsed = parseSubformArray(item.measurement.rows);
        const valid = parsed.filter(isMeasurementRowValid);
        const rooms = valid.map((r) => (r.area || r.room)?.trim()).filter(Boolean);
        if (rooms.length > 0) return Array.from(new Set(rooms)).join(', ');
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
    'consumption.sheetDueDate': (lead) => {
        const val = lead.consumption?.sheetDueDate;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const isOverdue = !lead.consumption?.boqVersion && new Date(val) < new Date();
        return (
            <div className="flex items-center gap-1 justify-center">
                <span className={`text-[11px]   whitespace-nowrap ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
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
            <span className="  text-xs font-semibold text-slate-800 dark:text-slate-200">
                {Number(qty).toLocaleString('en-US', { maximumFractionDigits: 2 })} {unit ? <span className="text-[10px] text-slate-500 font-normal">{unit}</span> : ''}
            </span>
        );
    },
    'consumption.unit': (lead) => {
        const unit = lead.consumption?.unit;
        if (!unit) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <Badge tone="slate" className="text-[10px]  ">{unit}</Badge>;
    },
    'consumption.wastageAllowance': (lead) => {
        const raw = lead.consumption?.wastageAllowance;
        if (!raw && raw !== 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const formatted = String(raw).includes('%') ? raw : `${raw}%`;
        return (
            <span className="inline-flex items-center gap-1 text-[11px]   font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-300/60 dark:border-amber-700/60">
                <Percent className="w-3 h-3 text-amber-500" />
                {formatted}
            </span>
        );
    },
    'consumption.boqVersion': (lead) => {
        const ver = lead.consumption?.boqVersion;
        if (!ver) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <Badge tone="purple" className="  text-[10px] font-bold">{ver}</Badge>;
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
            <span className="inline-flex items-center gap-1 text-[11px]   text-slate-600 dark:text-slate-400 whitespace-nowrap justify-center">
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
        return <span className="  text-xs font-bold text-slate-800 dark:text-slate-200">{count} panel(s)</span>;
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
    const [selectedLinings, setSelectedLinings] = useState(initialLining.selected);
    const [liningNotes, setLiningNotes] = useState(initialLining.notes);
    const [autoIncrementVersion, setAutoIncrementVersion] = useState(false);
    const [validationError, setValidationError] = useState('');


    // ExcelMeasurementGrid workspace states inside modal
    const [workspaceSearch, setWorkspaceSearch] = useState('');
    const [workspaceRoomFilter, setWorkspaceRoomFilter] = useState('ALL');
    const [workspaceTypeFilter, setWorkspaceTypeFilter] = useState('MAIN_CURTAIN');
    const [columnVisibility, setColumnVisibility] = useState({
        windowSize: true,
        pelmetSize: true,
        wire: true,
        measurements: true,
        trackDrop: true,
        fabric: true,
        allowances: true,
        calculations: true,
        fabricOrder: true,
        flags: true,
        rb_finishedSize: true,
        rb_fabric: true,
        rb_allowances: true,
        rb_calculations: true,
        rb_fabricOrder: true,
        rb_flags: true,
        wp_wallInfo: true,
        wp_rollSpecs: true,
        wp_allowances: true,
        wp_orderSettings: true,
        wp_calculations: true,
        wp_orderOutput: true,
        wp_flags: true,
    });
    const [lastAddedRoom, setLastAddedRoom] = useState('');
    const [inspectorRowIndex, setInspectorRowIndex] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [saveState, setSaveState] = useState('saved');

    const handleGridRowsUpdate = (newRows) => {
        setFinalMeasurementsGrid(newRows);
        setSaveState('unsaved');
    };

    const handleOpenRowDetails = (row, rowIndex) => {
        setInspectorRowIndex(rowIndex);
    };

    const handleSaveRowDetails = (rowIndex, updatedRow) => {
        if (rowIndex === null || rowIndex === undefined) return;
        setFinalMeasurementsGrid((prev) => {
            const updated = [...prev];
            updated[rowIndex] = updatedRow;
            return updated;
        });
        setSaveState('unsaved');
    };

    const handleToggleColumnGroup = (groupKey) => {
        setColumnVisibility((prev) => ({
            ...prev,
            [groupKey]: !prev[groupKey],
        }));
    };

    const handleConfirmAddMeasurement = (newRow) => {
        setFinalMeasurementsGrid((prev) => [...prev, newRow]);
        setLastAddedRoom(newRow.room);
        setSaveState('unsaved');
    };

    const modalAvailableRooms = useMemo(() => {
        const roomsSet = new Set();
        const parsedRooms = form.roomList ? form.roomList.split(',').map((s) => s.trim()).filter(Boolean) : [];
        parsedRooms.forEach((r) => roomsSet.add(r));
        (finalMeasurementsGrid || []).forEach((r) => {
            if (r.room) roomsSet.add(r.room);
        });
        if (roomsSet.size === 0) {
            roomsSet.add('Living Room');
            roomsSet.add('Master Bedroom');
        }
        return Array.from(roomsSet);
    }, [finalMeasurementsGrid, form.roomList]);

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


    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item.id || item._id, { consumption: payload }),
        {
            onSuccess: () => {
                setSaveState('saved');
                onDone();
                onClose();
            }
        }
    );


    const submit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setValidationError('');

        // --- Form Validations ---
        let qtyNum = undefined;
        if (form.quantity !== '') {
            qtyNum = Number(form.quantity);
            if (isNaN(qtyNum) || qtyNum < 0) {
                setValidationError('Consumption Quantity must be a valid positive decimal number.');
                return;
            }
        } else if (finalMeasurementsGrid.length > 0) {
            let totalOrderMetres = 0;
            finalMeasurementsGrid.forEach((row) => {
                const c = calculateRowConsumption(row);
                totalOrderMetres += c.orderMetres || c.fabricMeters || 0;
            });
            if (totalOrderMetres > 0) {
                qtyNum = Math.round(totalOrderMetres * 100) / 100;
            }
        }

        let panelInt = undefined;
        if (form.panelCount !== '') {
            panelInt = Number(form.panelCount);
            if (!Number.isInteger(panelInt) || panelInt < 0) {
                setValidationError('Panel Count must be a whole positive integer (0, 1, 2...).');
                return;
            }
        } else if (finalMeasurementsGrid.length > 0) {
            let totalWidths = 0;
            finalMeasurementsGrid.forEach((row) => {
                const c = calculateRowConsumption(row);
                totalWidths += (c.numWidths ?? c.roundedParts) || 0;
            });
            if (totalWidths > 0) {
                panelInt = Math.round(totalWidths);
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

    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrint = async () => {
        try {
            setIsPrinting(true);
            const clientName = item?.clientName || item?.name || '';
            const architectName = item?.architectName || item?.architect?.name || (typeof item?.architect === 'string' ? item.architect : '') || '';
            const siteAddress = item?.siteAddress || (item?.address ? (typeof item.address === 'string' ? item.address : [item.address.street, item.address.city, item.address.state, item.address.pincode || item.address.pinCode].filter(Boolean).join(', ')) : '') || item?.location || '';
            const preparedDate = form.boqPreparedDate || item?.consumption?.boqPreparedDate || item?.createdAt || new Date().toISOString();
            const preparedBy = form.boqPreparedBy || item?.consumption?.boqPreparedBy || currentUser?.name || currentUser?.email || 'System User';
            const remarks = liningNotes || (typeof form.liningAccessoryAssumptions === 'string' ? form.liningAccessoryAssumptions : form.liningAccessoryAssumptions?.notes) || item?.consumption?.liningAccessoryAssumptions?.notes || item?.measurement?.remarks || '';
            const floorHeader = form.roomList || (finalMeasurementsGrid.length > 0 && finalMeasurementsGrid[0]?.room ? finalMeasurementsGrid[0].room : 'Ground & Upper Floors');

            await consumptionPrintService({
                header: {
                    clientName,
                    architect: architectName,
                    siteAddress,
                    date: preparedDate,
                    siteVisitedBy: preparedBy,
                    floor: floorHeader,
                },
                rows: finalMeasurementsGrid,
                remarks,
                preparedBy,
                checkedBy: '',
            });
        } catch (err) {
            console.error('Failed to print consumption sheet:', err);
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Consumption & BOQ Sheet : ${item?.clientName || ''}`}
            size="full"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>BOQ Version: <strong className="text-purple-600 dark:text-purple-400 font-bold">{form.boqVersion}</strong></span>
                        <span>Windows: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{finalMeasurementsGrid.length}</strong></span>
                        {form.quantity && (
                            <span>Total Consumption: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{form.quantity} {form.unit}</strong></span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending || isPrinting}>
                            Close
                        </Button>
                        <Button
                            type="button"
                            icon={isPrinting ? Loader2 : Printer}
                            variant="ghost"
                            size="sm"
                            onClick={handlePrint}
                            disabled={pending || isPrinting}
                        >
                            {isPrinting ? 'Printing…' : 'Print'}
                        </Button>
                        <Button type="button" variant="primary" size="sm" onClick={submit} disabled={pending || isPrinting} icon={pending ? Loader2 : CheckCircle2}>
                            {pending ? 'Saving…' : 'Save Consumption Sheet'}
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {(error || validationError) && (
                    <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{validationError || error?.message || String(error)}</span>
                    </div>
                )}


                <div className="space-y-3">
                    <HeaderTools
                        searchQuery={workspaceSearch}
                        onSearchChange={setWorkspaceSearch}
                        roomFilter={workspaceRoomFilter}
                        onRoomFilterChange={setWorkspaceRoomFilter}
                        typeFilter={workspaceTypeFilter}
                        onTypeFilterChange={setWorkspaceTypeFilter}
                        roomOptions={modalAvailableRooms}
                        columnVisibility={columnVisibility}
                        onToggleColumnGroup={handleToggleColumnGroup}
                        onAddMeasurement={() => setIsAddModalOpen(true)}
                        isSaving={pending}
                    />

                    {/* Chrome Window Container: Tabs + Grid */}
                    <div className="flex flex-col">
                        <TypesTab
                            setWorkspaceTypeFilter={setWorkspaceTypeFilter}
                            workspaceTypeFilter={workspaceTypeFilter}
                            rows={finalMeasurementsGrid}
                            onAddMeasurement={() => setIsAddModalOpen(true)}
                        />

                        <ConsumptionGrid
                            rows={finalMeasurementsGrid}
                            onUpdateRows={handleGridRowsUpdate}
                            searchQuery={workspaceSearch}
                            roomFilter={workspaceRoomFilter}
                            typeFilter={workspaceTypeFilter}
                            columnVisibility={columnVisibility}
                            onOpenDetails={handleOpenRowDetails}
                            lastAddedRoom={lastAddedRoom}
                        />
                    </div>
                </div>



            </div>


            {/* Add Window Measurement Modal */}
            <AddWindowMeasurementModal
                open={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddMeasurement={handleConfirmAddMeasurement}
                availableRooms={modalAvailableRooms}
                existingRows={finalMeasurementsGrid}
                preselectedRoom={workspaceRoomFilter !== 'ALL' ? workspaceRoomFilter : ''}
                defaultParticular={workspaceTypeFilter}
            />
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
            <PageHeader title="Consumption Sheet / BOQ Dashboard"
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
                pageName={SPREADSHEET_SECTIONS[0].title}
                pageFields={SPREADSHEET_SECTIONS[0].cols}
            />
        </div>
    );
};

export default ConsumptionBoq;
