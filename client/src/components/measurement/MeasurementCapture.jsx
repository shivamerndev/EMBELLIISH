import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Trash2, Copy, Save, RotateCcw, Printer, CheckSquare, Sparkles, Check, ChevronDown, Home, FileText } from 'lucide-react';
import { Button } from '../ui';
import { printMeasurementSheet } from './measurementPrintService';

// Reference handwritten data directly transcribed from Measurement sheet.pdf
const PDF_REFERENCE_DATA = {
    header: {
        company: 'Embelliish',
        client: '',
        siteAddress: '5401 | 5404 | ICC Tower 1\nDadar East',
        date: new Date().toISOString().slice(0, 10),
        siteVisitedBy: '',
        srNo: '1800',
    },
    rows: [
        {
            id: 'row-pdf-1',
            srNo: 1,
            area: 'Rakesh',
            lWindowDetail: '',
            outToOutWidth: '116.2',
            outToOutHeight: '113',
            frameToFrameWidth: '',
            frameToFrameHeight: '',
            pelmetOutOutWidth: '12',
            pelmetOutOutDrop: '6',
            pelmetFrameFrameWidth: '',
            pelmetFrameFrameDrop: '',
            sidesOfRoman: '',
            ceilingSupport: 'Wood',
            wire: true,
            sideWall: 'R',
            remarks: '',
        },
        {
            id: 'row-pdf-2',
            srNo: 2,
            area: 'Rishabh',
            lWindowDetail: '',
            outToOutWidth: '144.2',
            outToOutHeight: '113',
            frameToFrameWidth: '',
            frameToFrameHeight: '',
            pelmetOutOutWidth: '12',
            pelmetOutOutDrop: '6',
            pelmetFrameFrameWidth: '',
            pelmetFrameFrameDrop: '',
            sidesOfRoman: '',
            ceilingSupport: 'Wood',
            wire: true,
            sideWall: 'R',
            remarks: '',
        },
        {
            id: 'row-pdf-3',
            srNo: 3,
            area: 'Walking',
            lWindowDetail: '',
            outToOutWidth: '72.25',
            outToOutHeight: '113',
            frameToFrameWidth: '',
            frameToFrameHeight: '',
            pelmetOutOutWidth: '12',
            pelmetOutOutDrop: '6',
            pelmetFrameFrameWidth: '',
            pelmetFrameFrameDrop: '',
            sidesOfRoman: '',
            ceilingSupport: 'Wood',
            wire: true,
            sideWall: 'R',
            remarks: '',
        },
        {
            id: 'row-pdf-4',
            srNo: 4,
            area: 'Flat',
            lWindowDetail: 'W1',
            outToOutWidth: '51.1',
            outToOutHeight: '113',
            frameToFrameWidth: '',
            frameToFrameHeight: '',
            pelmetOutOutWidth: '12',
            pelmetOutOutDrop: '6',
            pelmetFrameFrameWidth: '',
            pelmetFrameFrameDrop: '',
            sidesOfRoman: '',
            ceilingSupport: 'Wood',
            wire: true,
            sideWall: 'R',
            remarks: '',
        },
        {
            id: 'row-pdf-5',
            srNo: 5,
            area: 'Flat',
            lWindowDetail: 'W2',
            outToOutWidth: '162',
            outToOutHeight: '113',
            frameToFrameWidth: '',
            frameToFrameHeight: '',
            pelmetOutOutWidth: '12',
            pelmetOutOutDrop: '6',
            pelmetFrameFrameWidth: '',
            pelmetFrameFrameDrop: '',
            sidesOfRoman: '',
            ceilingSupport: 'Wood',
            wire: true,
            sideWall: 'R',
            remarks: '',
        },
        {
            id: 'row-pdf-6',
            srNo: 6,
            area: 'Kids',
            lWindowDetail: '',
            outToOutWidth: '135.1',
            outToOutHeight: '113',
            frameToFrameWidth: '',
            frameToFrameHeight: '',
            pelmetOutOutWidth: '12',
            pelmetOutOutDrop: '6',
            pelmetFrameFrameWidth: '',
            pelmetFrameFrameDrop: '',
            sidesOfRoman: '',
            ceilingSupport: 'Wood',
            wire: true,
            sideWall: 'R',
            remarks: '',
        },
    ],
    remarks: '',
    checklist: {
        photo: false,
        video: false,
        flooring: false,
        sidewall: false,
        others: false,
        ceiling: false,
        height: false,
    },
};

const createEmptyRow = (index) => ({
    id: `row-${Date.now()}-${index}`,
    srNo: index,
    area: '',
    lWindowDetail: '',
    outToOutWidth: '',
    outToOutHeight: '',
    frameToFrameWidth: '',
    frameToFrameHeight: '',
    pelmetOutOutWidth: '',
    pelmetOutOutDrop: '',
    pelmetFrameFrameWidth: '',
    pelmetFrameFrameDrop: '',
    sidesOfRoman: '',
    ceilingSupport: '',
    wire: false,
    wireLeft: false,
    wireRight: false,
    sideWall: '',
    remarks: '',
});

const DEFAULT_ROOM_SUGGESTIONS = [
    'Living Room',
    'Master Bedroom',
    'Bedroom 2',
    'Bedroom 3',
    'Guest Bedroom',
    'Dining Room',
    'Kitchen',
    'Home Theatre',
    'Balcony',
    'Study / Office'
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

/**
 * MeasurementCapture : Complete Physical Measurement Sheet UI
 * Recreates the exact format and layout of the handwritten reference sheet (Measurement sheet.pdf)
 * while maintaining compatibility with the ERP's design system, colors, tokens, and data models.
 */
const MeasurementCapture = ({
    initialData,
    lead,
    preSiteVisitRooms,
    onSave,
    readOnly = false,
    className = '',
}) => {
    // Extract rooms selected during Pre-Site Visit
    const preSiteRooms = useMemo(() => {
        // 1. Explicit prop if passed
        if (preSiteVisitRooms && Array.isArray(preSiteVisitRooms) && preSiteVisitRooms.length > 0) {
            return preSiteVisitRooms.map((r) => (typeof r === 'string' ? r.trim() : String(r))).filter(Boolean);
        }
        // 2. From initialData?.rooms
        const fromInitial = safeParseArray(initialData?.rooms);
        if (fromInitial.length > 0) return fromInitial.map((r) => String(r).trim()).filter(Boolean);

        // 3. From lead?.rooms (the primary field saved during pre-site visit)
        const fromLeadRooms = safeParseArray(lead?.rooms);
        if (fromLeadRooms.length > 0) return fromLeadRooms.map((r) => String(r).trim()).filter(Boolean);

        // 4. From lead?.preSiteVisit?.rooms or lead?.preSiteVisit?.roomsSelected or lead?.roomsSelected
        const fromPreSite = safeParseArray(lead?.preSiteVisit?.rooms || lead?.preSiteVisit?.roomsSelected || lead?.roomsSelected);
        if (fromPreSite.length > 0) return fromPreSite.map((r) => String(r).trim()).filter(Boolean);

        // 5. From lead?.measurement?.roomList
        const fromMeasurement = safeParseArray(lead?.measurement?.roomList);
        if (fromMeasurement.length > 0) return fromMeasurement.map((r) => String(r).trim()).filter(Boolean);

        return [];
    }, [preSiteVisitRooms, initialData, lead]);

    const hasPreSiteRooms = preSiteRooms.length > 0;
    const availableRooms = useMemo(() => {
        if (hasPreSiteRooms) {
            return Array.from(new Set(preSiteRooms));
        }
        return DEFAULT_ROOM_SUGGESTIONS;
    }, [hasPreSiteRooms, preSiteRooms]);

    // Active room suggestion dropdown state (stores index of row or null)
    const [activeRoomDropdown, setActiveRoomDropdown] = useState(null);
    const dropdownContainerRef = useRef(null);

    useEffect(() => {
        const handleGlobalClick = (e) => {
            if (activeRoomDropdown !== null) {
                if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target)) {
                    setActiveRoomDropdown(null);
                }
            }
        };
        document.addEventListener('mousedown', handleGlobalClick);
        return () => document.removeEventListener('mousedown', handleGlobalClick);
    }, [activeRoomDropdown]);

    // Helper to extract rows
    const extractRows = (sourceData, sourceLead) => {
        if (sourceData?.rows && sourceData.rows.length > 0) {
            return sourceData.rows.map((r, i) => ({ ...r, srNo: i + 1 }));
        }
        const candidateRows = sourceLead?.measurement?.rows || sourceLead?.measurement?.notes;
        if (candidateRows) {
            try {
                const notes = typeof candidateRows === 'string' ? JSON.parse(candidateRows) : candidateRows;
                if (Array.isArray(notes) && notes.length > 0) {
                    return notes.map((item, idx) => ({
                        id: item.id || `row-${idx}`,
                        srNo: idx + 1,
                        area: item.area || item.room || '',
                        lWindowDetail: item.lWindowDetail || item.windowId || item.particular || '',
                        outToOutWidth: item.outToOutWidth ?? item.o2oWidth ?? item.width ?? '',
                        outToOutHeight: item.outToOutHeight ?? item.o2oHeight ?? item.height ?? '',
                        frameToFrameWidth: item.frameToFrameWidth ?? item.f2fWidth ?? '',
                        frameToFrameHeight: item.frameToFrameHeight ?? item.f2fHeight ?? '',
                        pelmetOutOutWidth: item.pelmetOutOutWidth ?? item.pelmetO2oWidth ?? '',
                        pelmetOutOutDrop: item.pelmetOutOutDrop ?? item.pelmetO2oDrop ?? '',
                        pelmetFrameFrameWidth: item.pelmetFrameFrameWidth ?? item.pelmetF2fWidth ?? '',
                        pelmetFrameFrameDrop: item.pelmetFrameFrameDrop ?? item.pelmetF2fDrop ?? '',
                        sidesOfRoman: item.sidesOfRoman ?? '',
                        ceilingSupport: item.ceilingSupport ?? '',
                        wire: Boolean(item.wire || item.wireLeft || item.wireRight),
                        wireLeft: Boolean(item.wireLeft),
                        wireRight: Boolean(item.wireRight ?? item.wire),
                        sideWall: item.sideWall || (item.curtainReturnLeft ? 'L' : item.curtainReturnRight ? 'R' : ''),
                        remarks: item.remarks || '',
                    }));
                }
            } catch {
                // fall through
            }
        }
        return Array.from({ length: 6 }, (_, i) => createEmptyRow(i + 1));
    };

    const extractHeader = (sourceData, sourceLead) => {
        if (sourceData?.header) return { ...sourceData.header };
        if (sourceLead?.measurement?.header) return { ...sourceLead.measurement.header };
        if (sourceLead) {
            return {
                company: 'Embelliish',
                client: sourceLead.clientName || sourceLead.client || sourceLead.name || '',
                siteAddress: sourceLead.siteAddress || sourceLead.address || sourceLead.location || '',
                date: sourceLead.actualSiteVisitDateTime?.slice(0, 10) || sourceLead.measurement?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
                siteVisitedBy: sourceLead.measurement?.measuredBy?.name || (typeof sourceLead.measurement?.measuredBy === 'string' ? sourceLead.measurement.measuredBy : '') || sourceLead.technician || '',
                srNo: sourceLead.code || sourceLead.srNo || '1800',
            };
        }
        return {
            company: 'Embelliish',
            client: '',
            siteAddress: '',
            date: new Date().toISOString().slice(0, 10),
            siteVisitedBy: '',
            srNo: '',
        };
    };

    // Initialize header details
    const [header, setHeader] = useState(() => extractHeader(initialData, lead));

    // Initialize rows
    const [rows, setRows] = useState(() => extractRows(initialData, lead));

    // Remarks & Checklist states
    const [remarks, setRemarks] = useState(() => initialData?.remarks ?? lead?.measurement?.remarks ?? '');
    const [checklist, setChecklist] = useState(() => initialData?.checklist ?? lead?.measurement?.checklist ?? {
        photo: false,
        video: false,
        flooring: false,
        sidewall: false,
        others: false,
        ceiling: false,
        height: false,
    });

    // Sync when lead or initialData changes
    useEffect(() => {
        if (lead || initialData) {
            setHeader(extractHeader(initialData, lead));
            setRows(extractRows(initialData, lead));
            setRemarks(initialData?.remarks ?? lead?.measurement?.remarks ?? '');
            setChecklist(initialData?.checklist ?? lead?.measurement?.checklist ?? {
                photo: false,
                video: false,
                flooring: false,
                sidewall: false,
                others: false,
                ceiling: false,
                height: false,
            });
        }
    }, [lead?.id, lead?._id, initialData]);

    const [saveStatus, setSaveStatus] = useState(null); // 'saved' | 'saving' | null

    // Handlers for Header fields
    const handleHeaderChange = (field, val) => {
        setHeader((prev) => ({ ...prev, [field]: val }));
    };

    // Handlers for Table Rows
    const handleRowChange = (index, field, val) => {
        setRows((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: val };
            return next;
        });
    };

    const handleAddRow = () => {
        setRows((prev) => [...prev, createEmptyRow(prev.length + 1)]);
    };

    const handleDuplicateRow = (index) => {
        setRows((prev) => {
            const target = prev[index];
            const duplicate = {
                ...target,
                id: `row-${Date.now()}-${prev.length}`,
                area: `${target.area || 'Area'}`,
            };
            const next = [...prev];
            next.splice(index + 1, 0, duplicate);
            return next.map((r, i) => ({ ...r, srNo: i + 1 }));
        });
    };

    const handleDeleteRow = (index) => {
        if (rows.length <= 1) {
            // Keep at least one row
            setRows([createEmptyRow(1)]);
            return;
        }
        setRows((prev) => prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, srNo: i + 1 })));
    };

    // Checklist toggles
    const handleChecklistToggle = (key) => {
        setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Sample Preset Loader
    const handleLoadPdfSample = () => {
        setHeader({ ...PDF_REFERENCE_DATA.header });
        setRows(PDF_REFERENCE_DATA.rows.map((r) => ({ ...r })));
        setRemarks(PDF_REFERENCE_DATA.remarks);
        setChecklist({ ...PDF_REFERENCE_DATA.checklist });
        setSaveStatus(null);
    };

    const handleClearAll = () => {
        if (window.confirm('Clear all entries and start with a blank measurement sheet?')) {
            setHeader({
                company: 'Embelliish',
                client: '',
                siteAddress: '',
                date: new Date().toISOString().slice(0, 10),
                siteVisitedBy: '',
                srNo: '',
            });
            setRows(Array.from({ length: 6 }, (_, i) => createEmptyRow(i + 1)));
            setRemarks('');
            setChecklist({ photo: false, video: false, flooring: false, ceiling: false, height: false });
            setSaveStatus(null);
        }
    };

    // Save action
    const handleSave = () => {
        const payload = {
            header,
            rows,
            remarks,
            checklist,
            updatedAt: new Date().toISOString(),
        };
        setSaveStatus('saving');
        if (onSave) {
            onSave(payload);
        }
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(null), 3000);
        }, 400);
    };

    const handlePrint = (isBlank = false) => {
        printMeasurementSheet({
            header,
            rows,
            remarks,
            checklist,
        }, isBlank);
    };

    return (
        <div className={`w-full flex flex-col space-y-4 font-sans text-slate-800 dark:text-slate-100 ${className}`}>


            {/* --- PHYSICAL MEASUREMENT SHEET CONTAINER --- */}
            <div className="w-full bg-white dark:bg-slate-950 p-1 sm:p-2 space-y-4 print:p-0 print:border-none print:shadow-none">

                {/* 1. HEADER SECTION (Replicating PDF Top Box) */}
                <div className="grid grid-cols-1 md:grid-cols-12 border-2 border-slate-300 dark:border-slate-700 divide-y md:divide-y-0 md:divide-x divide-slate-300 dark:divide-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">

                    {/* Left Column: Logo & Client */}
                    <div className="md:col-span-4 p-3.5 flex flex-col justify-between space-y-2 bg-[#fbf9f6] dark:bg-slate-900/80">
                        <div className="pb-1 border-b border-amber-900/15 dark:border-slate-800">
                            <h1 className="font-serif text-3xl font-extrabold italic tracking-wider text-[#574233] dark:text-amber-200">
                                {header.company || 'Embelliish'}
                            </h1>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-[#785c48] dark:text-amber-400">
                                Luxury Curtains & Blinds Specification
                            </p>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider shrink-0">
                                Client:
                            </label>
                            <input
                                type="text"
                                value={header.client}
                                onChange={(e) => handleHeaderChange('client', e.target.value)}
                                disabled={readOnly}
                                placeholder="Enter client name..."
                                className="w-full text-xs font-semibold px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:border-amber-600 focus:outline-none transition"
                            />
                        </div>
                    </div>

                    {/* Middle Column: Site Address */}
                    <div className="md:col-span-5 p-3.5 flex flex-col justify-between space-y-1.5 bg-[#fbf9f6] dark:bg-slate-900/80">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Site Address:
                        </label>
                        <textarea
                            value={header.siteAddress}
                            onChange={(e) => handleHeaderChange('siteAddress', e.target.value)}
                            disabled={readOnly}
                            rows={3}
                            placeholder="Flat / Unit, Tower, Building, Landmark, Area..."
                            className="w-full text-xs font-medium px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:border-amber-600 focus:outline-none transition resize-none"
                        />
                    </div>

                    {/* Right Column: Date, Site Visited By, Sr. No. */}
                    <div className="md:col-span-3 p-3.5 flex flex-col justify-between space-y-2 bg-[#fdfbf9] dark:bg-slate-900">
                        <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider shrink-0">
                                Date:
                            </label>
                            <input
                                type="date"
                                value={header.date}
                                onChange={(e) => handleHeaderChange('date', e.target.value)}
                                disabled={readOnly}
                                className="w-36 text-xs px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:border-amber-600 focus:outline-none transition"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider shrink-0">
                                Site Visited By:
                            </label>
                            <input
                                type="text"
                                value={header.siteVisitedBy}
                                onChange={(e) => handleHeaderChange('siteVisitedBy', e.target.value)}
                                disabled={readOnly}
                                placeholder="Technician name..."
                                className="w-36 text-xs px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:border-amber-600 focus:outline-none transition"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                            <label className="text-xs font-bold text-[#6b5240] dark:text-amber-400 uppercase tracking-wider shrink-0">
                                Sr. No.:
                            </label>
                            <input
                                type="text"
                                value={header.srNo}
                                onChange={(e) => handleHeaderChange('srNo', e.target.value)}
                                disabled={readOnly}
                                placeholder="1800"
                                className="w-24 text-xs  font-bold text-center px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 rounded focus:border-amber-600 focus:outline-none transition"
                            />
                        </div>
                    </div>

                </div>

                {/* 2. RECREATED MEASUREMENT TABLE */}
                <div className="border-2 border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden shadow-xs bg-white dark:bg-slate-950">
                    <div className="overflow-x-auto select-none relative scrollbar-thin max-h-[62vh]">
                        <table className="w-full text-left border-collapse text-xs font-sans min-w-[1280px]">

                            {/* --- TWO-LEVEL GROUPED HEADERS (Matching PDF exactly + ERP color reference around lines 883-892) --- */}
                            <thead className="sticky top-0 z-30 select-none bg-[#6b5240] text-amber-50 dark:bg-slate-950 dark:text-slate-200">
                                {/* Header Level 1 */}
                                <tr className="border-b border-amber-800/50 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider">
                                    <th rowSpan={2} className="border-r border-amber-700/50 dark:border-slate-800 px-2 py-2 text-center w-[46px] min-w-[46px] bg-[#574233] dark:bg-slate-950">
                                        Sr. No.
                                    </th>
                                    <th rowSpan={2} className="border-r border-amber-700/50 dark:border-slate-800 px-3 py-2 text-left w-[130px] min-w-[130px] bg-[#574233] dark:bg-slate-950">
                                        Area
                                    </th>
                                    <th colSpan={1} className="border-r border-amber-700/50 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900 w-[100px] min-w-[100px]">
                                        L Window
                                    </th>
                                    <th colSpan={4} className="border-r border-amber-700/50 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6e5441] dark:bg-slate-900/90">
                                        Window Size (Inches)
                                    </th>
                                    <th colSpan={4} className="border-r border-amber-700/50 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900">
                                        Pelmet Size
                                    </th>
                                    <th rowSpan={2} className="border-r border-amber-700/50 dark:border-slate-800 px-2 py-2 text-center w-[90px] min-w-[90px] bg-[#6e5441] dark:bg-slate-900/80">
                                        Sides of Roman
                                    </th>
                                    <th rowSpan={2} className="border-r border-amber-700/50 dark:border-slate-800 px-2 py-2 text-center w-[100px] min-w-[100px] bg-[#785c48] dark:bg-slate-900">
                                        Ceiling Support
                                    </th>
                                    <th colSpan={1} className="border-r border-amber-700/50 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6e5441] dark:bg-slate-900/80 w-[70px] min-w-[70px]">
                                        Wire
                                    </th>
                                    <th colSpan={1} className="border-r border-amber-700/50 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900 w-[95px] min-w-[95px]">
                                        Side Wall
                                    </th>
                                    <th rowSpan={2} className="border-r border-amber-700/50 dark:border-slate-800 px-3 py-2 text-left min-w-[140px] bg-[#6e5441] dark:bg-slate-900/90">
                                        Remarks
                                    </th>
                                    {!readOnly && (
                                        <th rowSpan={2} className="px-2 py-2 text-center w-[75px] min-w-[75px] bg-[#574233] dark:bg-slate-950 print:hidden">
                                            Actions
                                        </th>
                                    )}
                                </tr>

                                {/* Header Level 2: Sub-columns */}
                                <tr className="border-b border-amber-800/40 dark:border-slate-800 bg-[#785c48] dark:bg-slate-900 text-[10px] font-semibold tracking-normal uppercase text-amber-100 dark:text-slate-300">
                                    {/* L Window Sub */}
                                    <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-center bg-[#6b5240] dark:bg-slate-900/80">
                                        Detail
                                    </th>

                                    {/* Window Size (Inches) Sub */}

                                    <th
                                        colSpan={2}
                                        className="p-0 border-r border-amber-700/40 dark:border-slate-800 bg-[#6e5441] dark:bg-slate-900/70 w-[136px] min-w-[136px]"
                                    >
                                        <div className="flex flex-col h-full justify-between">
                                            <div className="border-b border-amber-700/30 dark:border-slate-800 px-1 py-1 text-center font-semibold text-[10px] tracking-normal uppercase text-amber-100 dark:text-slate-300">
                                                OUT TO OUT
                                            </div>
                                            <div className="grid grid-cols-2 divide-x divide-amber-700/30 dark:divide-slate-800 text-[10px] font-semibold tracking-normal uppercase text-amber-100 dark:text-slate-300">
                                                <div className="px-1 py-1 text-center w-[68px] min-w-[68px]">
                                                    WIDTH
                                                </div>
                                                <div className="px-1 py-1 text-center w-[68px] min-w-[68px]">
                                                    HIEGHT
                                                </div>
                                            </div>
                                        </div>
                                    </th>

                                    <th colSpan={2} className="p-0 border-r border-amber-700/50 dark:border-slate-800 bg-[#785c48] dark:bg-slate-900/90 w-[136px] min-w-[136px]">
                                        <div className="flex flex-col h-full justify-between">
                                            <div className="border-b border-amber-700/30 dark:border-slate-800 px-1 py-1 text-center font-semibold text-[10px] tracking-normal uppercase text-amber-100 dark:text-slate-300">
                                                FRAME TO FRAME
                                            </div>
                                            <div className="grid grid-cols-2 divide-x divide-amber-700/30 dark:divide-slate-800 text-[10px] font-semibold tracking-normal uppercase text-amber-100 dark:text-slate-300">
                                                <div className="px-1 py-1 text-center w-[68px] min-w-[68px]">
                                                    WIDTH
                                                </div>
                                                <div className="px-1 py-1 text-center w-[68px] min-w-[68px]">
                                                    HIEGHT
                                                </div>
                                            </div>
                                        </div>
                                    </th>

                                    {/* Pelmet Size Sub */}
                                    <th
                                        colSpan={2}
                                        className="p-0 border-r border-amber-700/40 dark:border-slate-800 bg-[#6b5240] dark:bg-slate-900/70 w-[136px] min-w-[136px]"
                                    >
                                        <div className="flex flex-col h-full justify-between">
                                            <div className="border-b border-amber-700/30 dark:border-slate-800 px-1 py-1 text-center font-semibold text-[10px] tracking-normal uppercase text-amber-100 dark:text-slate-300">
                                                OUT / OUT
                                            </div>
                                            <div className="grid grid-cols-2 divide-x divide-amber-700/30 dark:divide-slate-800 text-[10px] font-semibold tracking-normal uppercase text-amber-100 dark:text-slate-300">
                                                <div className="px-1 py-1 text-center w-[68px] min-w-[68px]">
                                                    WIDTH
                                                </div>
                                                <div className="px-1 py-1 text-center w-[68px] min-w-[68px]">
                                                    DROP
                                                </div>
                                            </div>
                                        </div>
                                    </th>
                                    <th
                                        colSpan={2}
                                        className="p-0 border-r border-amber-700/50 dark:border-slate-800 bg-[#785c48] dark:bg-slate-900/90 w-[136px] min-w-[136px]"
                                    >
                                        <div className="flex flex-col h-full justify-between">
                                            <div className="border-b border-amber-700/30 dark:border-slate-800 px-1 py-1 text-center font-semibold text-[10px] tracking-normal uppercase text-amber-100 dark:text-slate-300">
                                                FRAME / FRAME
                                            </div>
                                            <div className="grid grid-cols-2 divide-x divide-amber-700/30 dark:divide-slate-800 text-[10px] font-semibold tracking-normal uppercase text-amber-100 dark:text-slate-300">
                                                <div className="px-1 py-1 text-center w-[68px] min-w-[68px]">
                                                    WIDTH
                                                </div>
                                                <div className="px-1 py-1 text-center w-[68px] min-w-[68px]">
                                                    DROP
                                                </div>
                                            </div>
                                        </div>
                                    </th>

                                    {/* Wire Sub: R | L */}
                                    <th colSpan={1} className="p-0 border-r border-amber-700/40 dark:border-slate-800 bg-[#6e5441] dark:bg-slate-900/70 w-[70px] min-w-[70px]">
                                        <div className="grid grid-cols-2 divide-x divide-amber-700/30 dark:divide-slate-800 text-[10px] font-semibold tracking-normal uppercase text-amber-100 dark:text-slate-300">
                                            <div className="px-1 py-1 text-center">
                                                R
                                            </div>
                                            <div className="px-1 py-1 text-center">
                                                L
                                            </div>
                                        </div>
                                    </th>

                                    {/* Side Wall Sub: R | L | R */}
                                    <th className="border-r border-amber-700/40 dark:border-slate-800 px-1 py-1 text-center bg-[#6e5441] dark:bg-slate-900/80  text-xs">
                                        R / L
                                    </th>
                                </tr>
                            </thead>

                            {/* --- TABLE BODY: MEASUREMENT ROWS --- */}
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                                {rows.map((row, index) => (
                                    <tr key={row.id || index} style={{ height: '44px' }} className="hover:bg-amber-500/5 dark:hover:bg-slate-900/60 transition-colors text-slate-800 dark:text-slate-200 group">

                                        {/* 1. Sr. No. */}
                                        <td className="px-2 py-1 text-center text-sm  text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                                            {row.srNo}
                                        </td>

                                        {/* 2. Area */}
                                        <td
                                            ref={activeRoomDropdown === index ? dropdownContainerRef : null}
                                            className={`px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 ${activeRoomDropdown === index ? 'relative z-50' : 'relative'
                                                }`}
                                        >
                                            <div className="relative flex items-center w-full">
                                                <input
                                                    type="text"
                                                    value={row.area}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        handleRowChange(index, 'area', val);
                                                        if (!val.trim()) {
                                                            setActiveRoomDropdown(index);
                                                        } else {
                                                            setActiveRoomDropdown(null);
                                                        }
                                                    }}
                                                    onFocus={() => {
                                                        if (!row.area || !row.area.trim()) {
                                                            setActiveRoomDropdown(index);
                                                        }
                                                    }}
                                                    onClick={() => {
                                                        if (!row.area || !row.area.trim()) {
                                                            setActiveRoomDropdown(index);
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        setTimeout(() => {
                                                            setActiveRoomDropdown((curr) => (curr === index ? null : curr));
                                                        }, 180);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') {
                                                            setActiveRoomDropdown(null);
                                                        }
                                                    }}
                                                    disabled={readOnly}
                                                    placeholder="Area / Room"
                                                    className="w-full text-sm font-medium px-1.5 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition"
                                                />


                                                {/* Floating Dropdown for Pre-Site Visit Rooms */}

                                                {activeRoomDropdown === index && !readOnly && (!row.area || !row.area.trim()) && (
                                                    <div className={`absolute left-0 min-w-[220px] w-full bg-white dark:bg-slate-900 border border-amber-500/40 dark:border-amber-500/50 rounded-lg shadow-xl py-1 overflow-hidden z-50 ${index >= rows.length - 2 && index >= 3 ? 'bottom-full mb-1' : 'top-full mt-1'}`}>

                                                        {/* Rooms list */}
                                                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin">
                                                            {availableRooms.map((roomName) => {
                                                                const isSelected = row.area?.trim().toLowerCase() === roomName.trim().toLowerCase();
                                                                return (<button key={roomName} type="button"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        handleRowChange(index, 'area', roomName);
                                                                        setActiveRoomDropdown(null);
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${isSelected ? 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 font-semibold' : 'hover:bg-amber-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'}`}>
                                                                    <span className="truncate">{roomName}</span>
                                                                    {isSelected && (
                                                                        <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 ml-2" />
                                                                    )}
                                                                </button>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Custom value indicator if row.area is not in list */}
                                                        {row.area && !availableRooms.some((r) => r.toLowerCase() === row.area.trim().toLowerCase()) && (
                                                            <div className="px-2.5 py-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                                <span className="truncate">
                                                                    Current: <strong className="text-slate-700 dark:text-slate-200 font-medium">"{row.area}"</strong>
                                                                </span>
                                                                <span className="text-[9px] text-slate-400 italic shrink-0 ml-1">(custom)</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* 3. L Window Detail */}
                                        <td className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={row.lWindowDetail}
                                                onChange={(e) => handleRowChange(index, 'lWindowDetail', e.target.value)}
                                                disabled={readOnly}
                                                placeholder="e.g. W1"
                                                className="w-full text-sm  text-center px-1 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition "
                                            />
                                        </td>

                                        {/* 4. Window Size: Out/Out Width */}
                                        <td className="w-[68px] min-w-[68px] px-1 py-1 border-r border-slate-200 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={row.outToOutWidth}
                                                onChange={(e) => handleRowChange(index, 'outToOutWidth', e.target.value)}
                                                disabled={readOnly}
                                                className="w-full text-sm  text-right  px-1 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition"
                                            />
                                        </td>

                                        {/* 5. Window Size: Out/Out Height */}
                                        <td className="w-[68px] min-w-[68px] px-1 py-1 border-r border-slate-200 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={row.outToOutHeight}
                                                onChange={(e) => handleRowChange(index, 'outToOutHeight', e.target.value)}
                                                disabled={readOnly}
                                                className="w-full text-sm  text-right  px-1 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition"
                                            />
                                        </td>

                                        {/* 6. Window Size: Frame/Frame Width */}
                                        <td className="w-[68px] min-w-[68px] px-1 py-1 border-r border-slate-200 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={row.frameToFrameWidth}
                                                onChange={(e) => handleRowChange(index, 'frameToFrameWidth', e.target.value)}
                                                disabled={readOnly}
                                                className="w-full text-sm  text-right  px-1 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition"
                                            />
                                        </td>

                                        {/* 7. Window Size: Frame/Frame Height */}
                                        <td className="w-[68px] min-w-[68px] px-1 py-1 border-r border-slate-200 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={row.frameToFrameHeight}
                                                onChange={(e) => handleRowChange(index, 'frameToFrameHeight', e.target.value)}
                                                disabled={readOnly}
                                                className="w-full text-sm  text-right  px-1 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition"
                                            />
                                        </td>

                                        {/* 8. Pelmet Size: Out/Out Width */}
                                        <td className="w-[68px] min-w-[68px] px-1 py-1 border-r border-slate-200 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={row.pelmetOutOutWidth}
                                                onChange={(e) => handleRowChange(index, 'pelmetOutOutWidth', e.target.value)}
                                                disabled={readOnly}
                                                className="w-full text-sm  text-right  px-1 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition"
                                            />
                                        </td>

                                        {/* 9. Pelmet Size: Out/Out Drop */}
                                        <td className="w-[68px] min-w-[68px] px-1 py-1 border-r border-slate-200 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={row.pelmetOutOutDrop}
                                                onChange={(e) => handleRowChange(index, 'pelmetOutOutDrop', e.target.value)}
                                                disabled={readOnly}
                                                className="w-full text-sm  text-right  px-1 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition"
                                            />
                                        </td>

                                        {/* 10. Pelmet Size: Frame/Frame Width */}
                                        <td className="w-[68px] min-w-[68px] px-1 py-1 border-r border-slate-200 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={row.pelmetFrameFrameWidth}
                                                onChange={(e) => handleRowChange(index, 'pelmetFrameFrameWidth', e.target.value)}
                                                disabled={readOnly}
                                                className="w-full text-sm  text-right  px-1 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition"
                                            />
                                        </td>

                                        {/* 11. Pelmet Size: Frame/Frame Drop */}
                                        <td className="w-[68px] min-w-[68px] px-1 py-1 border-r border-slate-200 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={row.pelmetFrameFrameDrop}
                                                onChange={(e) => handleRowChange(index, 'pelmetFrameFrameDrop', e.target.value)}
                                                disabled={readOnly}
                                                className="w-full text-sm  text-right  px-1 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition"
                                            />
                                        </td>

                                        {/* 12. Sides of Roman */}
                                        <td className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={row.sidesOfRoman}
                                                onChange={(e) => handleRowChange(index, 'sidesOfRoman', e.target.value)}
                                                disabled={readOnly}
                                                placeholder="Sides"
                                                className="w-full text-sm  text-center px-1 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition"
                                            />
                                        </td>

                                        {/* 13. Ceiling Support */}
                                        <td className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={row.ceilingSupport}
                                                onChange={(e) => handleRowChange(index, 'ceilingSupport', e.target.value)}
                                                disabled={readOnly}
                                                placeholder="e.g. Wood"
                                                className="w-full text-sm  text-center px-1.5 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition"
                                            />
                                        </td>

                                        {/* 14. Wire (R / L Checkboxes) */}
                                        <td className="p-0 text-center border-r border-slate-200 dark:border-slate-800 w-[70px] min-w-[70px]">
                                            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 h-full items-center">
                                                <div className="flex items-center justify-center py-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(row.wireRight ?? (row.wire === true))}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            handleRowChange(index, 'wireRight', checked);
                                                            handleRowChange(index, 'wire', checked || Boolean(row.wireLeft));
                                                        }}
                                                        disabled={readOnly}
                                                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                                        title="Wire Right (R)"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-center py-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(row.wireLeft)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            handleRowChange(index, 'wireLeft', checked);
                                                            handleRowChange(index, 'wire', checked || Boolean(row.wireRight));
                                                        }}
                                                        disabled={readOnly}
                                                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                                        title="Wire Left (L)"
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* 15. Side Wall (R | L | R) */}
                                        <td className="px-1 py-1 border-r border-slate-200 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={row.sideWall}
                                                onChange={(e) => handleRowChange(index, 'sideWall', e.target.value)}
                                                disabled={readOnly}
                                                placeholder="R / L"
                                                className="w-full text-sm  text-center  px-1 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition"
                                            />
                                        </td>

                                        {/* 16. Remarks */}
                                        <td className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={row.remarks}
                                                onChange={(e) => handleRowChange(index, 'remarks', e.target.value)}
                                                disabled={readOnly}
                                                placeholder="Note..."
                                                className="w-full text-sm  px-1.5 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-amber-500 rounded focus:outline-none transition"
                                            />
                                        </td>

                                        {/* 17. Actions */}
                                        {!readOnly && (
                                            <td className="px-1 py-1 text-center align-middle print:hidden">
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDuplicateRow(index)}
                                                        className="p-1 rounded text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                        title="Duplicate Row"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteRow(index)}
                                                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                                        title="Delete Row"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Bottom Action Bar */}
                    {!readOnly && (
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50/80 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 print:hidden">
                            <button
                                type="button"
                                onClick={handleAddRow}
                                className="inline-flex items-center gap-1.5 text-xs  text-[#6b5240] dark:text-amber-400 hover:text-[#574233] px-2 py-1 rounded hover:bg-amber-50 dark:hover:bg-slate-800 transition"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Measurement Row</span>
                            </button>
                            <span className="text-[11px] text-slate-400 italic">
                                Tab / Enter to navigate cells • Measurements recorded in inches
                            </span>
                        </div>
                    )}
                </div>

                {/* 3. FOOTER SECTION: REMARKS & CHECKLIST (Replicating lower area of PDF) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">

                    {/* Remarks Section (Left / Center) */}
                    <div className="md:col-span-8 border-2 border-slate-300 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Remarks:
                        </label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            disabled={readOnly}
                            rows={4}
                            placeholder="Enter site notes, pelmet alignment, track drop specifics, motor positioning or client preferences..."
                            className="w-full text-sm border-t font-medium px-2 py-1.5 bg-slate-50/40 dark:bg-slate-800/40 outline-none resize-none flex-1"
                        />
                    </div>

                    {/* Checklist Section (Right) */}
                    <div className="md:col-span-4 border-2 border-slate-300 dark:border-slate-700 rounded-lg p-3 bg-[#fdfbf9] dark:bg-slate-900 flex flex-col justify-between space-y-2">
                        <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                            <CheckSquare className="w-4 h-4 text-[#6b5240] dark:text-amber-400" />
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                Checklist
                            </h4>
                        </div>

                        <div className="space-y-2 py-1">
                            {[
                                { key: 'photo', label: 'Photo' },
                                { key: 'video', label: 'Video' },
                                { key: 'flooring', label: 'Flooring' },
                                { key: 'sidewall', label: 'Sidewall' },
                                { key: 'others', label: 'Others' },
                            ].map(({ key, label }) => (
                                <label
                                    key={key}
                                    className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition select-none"
                                >
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        {label}
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(checklist[key])}
                                        onChange={() => handleChecklistToggle(key)}
                                        disabled={readOnly}
                                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                </label>
                            ))}
                        </div>

                    </div>

                </div>

            </div>


            {/* Top Toolbar / Action Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 shadow-xs print:hidden">
                <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {rows.length} Rows Recorded
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={RotateCcw}
                        onClick={handleClearAll}
                        className="text-xs text-slate-600 hover:text-rose-600"
                    >
                        Clear Form
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={Printer}
                        onClick={() => handlePrint(false)}
                        className="text-xs"
                        title="Print measurement sheet layout with recorded measurements"
                    >
                        Print Sheet
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={FileText}
                        onClick={() => handlePrint(true)}
                        className="text-xs text-slate-600 hover:text-amber-700 dark:text-slate-400 dark:hover:text-amber-300"
                        title="Print blank physical sheet for field site visits"
                    >
                        Print Blank Sheet
                    </Button>

                    {!readOnly && (
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            icon={saveStatus === 'saved' ? Check : Save}
                            onClick={handleSave}
                            disabled={saveStatus === 'saving'}
                            className="text-xs bg-[#6b5240] hover:bg-[#574233] text-amber-50 border-amber-800"
                        >
                            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Sheet'}
                        </Button>
                    )}
                </div>
            </div>

        </div>
    );
};

export default React.memo(MeasurementCapture);