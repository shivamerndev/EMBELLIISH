import React, { useState, useEffect, useMemo } from 'react';
import {
    X, Layers, Paperclip, FileCode, Upload,
    Loader2, Trash2, ExternalLink, Image as ImageIcon, Plus, Check, Save,
    Calculator, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Button, Input, Select, Field, Badge } from '../ui';
import { uploadApi } from '../../api';
import { getMediaUrl, date } from '../../utils/format';
import {
    calculateCurtainConsumption,
    calculateRomanBlindConsumption,
    calculateWallpaperConsumption,
} from '../../utils/consumptionCalc';

// ─── Calculator type detector ─────────────────────────────────────────────────
const getCalcType = (particular) => {
    const p = String(particular || 'MAIN_CURTAIN').toUpperCase();
    if (p === 'WALLPAPER') return 'wallpaper';
    if (p.includes('ROMAN') || p.includes('ROLLER') || p.includes('WOODEN')) return 'roman';
    return 'curtain';
};

// ─── Small result row component ───────────────────────────────────────────────
const ResultRow = ({ label, value, unit = '', highlight = false, warn = false }) => (
    <div className={`flex items-center justify-between px-2 py-1.5 rounded-md ${highlight ? 'bg-emerald-500/10 border border-emerald-500/20' : warn ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-100/60 dark:bg-slate-800/40'}`}>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`font-mono font-bold text-[12px] ${highlight ? 'text-emerald-700 dark:text-emerald-300' : warn ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'}`}>
            {value}{unit ? <span className="ml-0.5 font-normal text-[10px] text-slate-400">{unit}</span> : null}
        </span>
    </div>
);

// ─── Input number field shorthand ─────────────────────────────────────────────
const CalcInput = ({ label, field, form, onChange, unit = 'in', step = 'any', min = 0, hint }) => (
    <div className="space-y-0.5">
        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {label} {unit && <span className="font-normal normal-case">({unit})</span>}
        </label>
        <Input
            type="number"
            step={step}
            min={min}
            value={form[field] ?? ''}
            onChange={(e) => onChange(field, e.target.value)}
            placeholder="0"
            className="text-xs"
        />
        {hint && <p className="text-[10px] text-slate-400 leading-tight">{hint}</p>}
    </div>
);

// ─── Curtain Calculator Inputs Section ────────────────────────────────────────
const CurtainInputs = ({ form, onChange }) => (
    <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Qty" field="qty" form={form} onChange={onChange} unit="sets" step="1" min="1" hint="No. of identical curtain sets" />
            <CalcInput label="Track Width" field="trackWidth" form={form} onChange={onChange} hint="Width of curtain track/rod" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Finished Drop" field="finishedDrop" form={form} onChange={onChange} hint="Track to floor/sill" />
            <CalcInput label="Fabric Width" field="fabricWidth" form={form} onChange={onChange} hint="Full roll width" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Usable Width" field="usableWidth" form={form} onChange={onChange} hint="After selvedge loss" />
            <CalcInput label="Vertical Repeat" field="verticalRepeat" form={form} onChange={onChange} hint="0 = no pattern" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Fullness" field="fullness" form={form} onChange={onChange} unit="ratio" hint="e.g. 2.5 = 250%" />
            <CalcInput label="Left Return" field="leftReturn" form={form} onChange={onChange} />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Right Return" field="rightReturn" form={form} onChange={onChange} />
            <CalcInput label="Centre Overlap" field="centreOverlap" form={form} onChange={onChange} />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Top Allowance" field="topAllowance" form={form} onChange={onChange} />
            <CalcInput label="Bottom Hem" field="bottomHem" form={form} onChange={onChange} />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Wastage" field="wastage" form={form} onChange={onChange} unit="ratio" hint="e.g. 0.03 = 3%" step="0.01" />
            <CalcInput label="Order Increment" field="orderIncrement" form={form} onChange={onChange} unit="m" hint="e.g. 0.5" step="0.1" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pleating by Design</label>
                <Select
                    value={form.pleatByDesign || 'No'}
                    onChange={(e) => onChange('pleatByDesign', e.target.value)}
                    options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes (+20%)' }]}
                    className="text-xs"
                />
            </div>
            <div className="space-y-0.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fabric Direction</label>
                <Select
                    value={form.fabricDirection || 'Normal'}
                    onChange={(e) => onChange('fabricDirection', e.target.value)}
                    options={[{ value: 'Normal', label: 'Normal' }, { value: 'Railroaded', label: 'Railroaded' }]}
                    className="text-xs"
                />
            </div>
        </div>
    </div>
);

// ─── Roman Blind Inputs Section ───────────────────────────────────────────────
const RomanBlindInputs = ({ form, onChange }) => (
    <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Qty" field="qty" form={form} onChange={onChange} unit="blinds" step="1" min="1" hint="No. of identical blinds" />
            <CalcInput label="Blind Width" field="blindWidth" form={form} onChange={onChange} hint="Finished outside width" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Blind Drop" field="blindDrop" form={form} onChange={onChange} hint="Finished outside drop" />
            <CalcInput label="Fabric Width" field="fabricWidth" form={form} onChange={onChange} hint="Full roll width" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Usable Width" field="usableWidth" form={form} onChange={onChange} hint="After selvedge loss" />
            <CalcInput label="Vertical Repeat" field="verticalRepeat" form={form} onChange={onChange} hint="0 = no pattern" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Left Allowance" field="leftAllowance" form={form} onChange={onChange} hint="Mounting/turning" />
            <CalcInput label="Right Allowance" field="rightAllowance" form={form} onChange={onChange} hint="Mounting/turning" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Top Allowance" field="topAllowance" form={form} onChange={onChange} hint="Mounting allowance" />
            <CalcInput label="Bottom Allowance" field="bottomAllowance" form={form} onChange={onChange} hint="Hem allowance" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Wastage" field="wastage" form={form} onChange={onChange} unit="ratio" hint="e.g. 0.03 = 3%" step="0.01" />
            <CalcInput label="Order Increment" field="orderIncrement" form={form} onChange={onChange} unit="m" step="0.1" />
        </div>
        <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fabric Direction</label>
            <Select
                value={form.fabricDirection || 'Normal'}
                onChange={(e) => onChange('fabricDirection', e.target.value)}
                options={[{ value: 'Normal', label: 'Normal' }, { value: 'Railroaded', label: 'Railroaded' }]}
                className="text-xs"
            />
        </div>
    </div>
);

// ─── Wallpaper Inputs Section ─────────────────────────────────────────────────
const WallpaperInputs = ({ form, onChange }) => (
    <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Qty" field="qty" form={form} onChange={onChange} unit="walls" step="1" min="1" hint="No. of identical walls" />
            <CalcInput label="Wall Width" field="wallWidth" form={form} onChange={onChange} hint="Width of wall" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Wall Height" field="wallHeight" form={form} onChange={onChange} hint="Height of wall" />
            <CalcInput label="Roll Width" field="rollWidth" form={form} onChange={onChange} hint="Width of roll" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Roll Length" field="rollLength" form={form} onChange={onChange} unit="m" hint="In METRES (e.g. 10.05)" step="0.01" />
            <CalcInput label="Vertical Repeat" field="verticalRepeat" form={form} onChange={onChange} hint="0 = no pattern" />
        </div>
        <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pattern Match</label>
            <Select
                value={form.patternMatch || 'None'}
                onChange={(e) => onChange('patternMatch', e.target.value)}
                options={[
                    { value: 'None', label: 'None' },
                    { value: 'Random', label: 'Random' },
                    { value: 'Straight', label: 'Straight' },
                    { value: 'Half Drop', label: 'Half Drop' },
                ]}
                className="text-xs"
            />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Top Allowance" field="topAllowance" form={form} onChange={onChange} hint="Top trim allowance" />
            <CalcInput label="Bottom Allowance" field="bottomAllowance" form={form} onChange={onChange} hint="Bottom trim allowance" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Wastage" field="wastage" form={form} onChange={onChange} unit="ratio" hint="e.g. 0.10 = 10%" step="0.01" />
            <div className="space-y-0.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ordering Unit</label>
                <Select
                    value={form.orderingUnit || 'Metres'}
                    onChange={(e) => onChange('orderingUnit', e.target.value)}
                    options={[{ value: 'Metres', label: 'Metres' }, { value: 'Rolls', label: 'Rolls' }]}
                    className="text-xs"
                />
            </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order Increment Required?</label>
                <Select
                    value={form.orderIncrementRequired || 'No'}
                    onChange={(e) => onChange('orderIncrementRequired', e.target.value)}
                    options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
                    className="text-xs"
                />
            </div>
            <CalcInput label="Order Increment" field="orderIncrement" form={form} onChange={onChange} unit="m" step="0.1" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <CalcInput label="Minimum Order" field="minimumOrder" form={form} onChange={onChange} unit="m" hint="Min order qty" step="0.5" />
            <CalcInput label="Spare Rolls" field="spareRolls" form={form} onChange={onChange} unit="rolls" step="1" hint="Extra buffer rolls" />
        </div>
    </div>
);

// ─── Curtain Results Panel ────────────────────────────────────────────────────
const CurtainResults = ({ r }) => {
    if (!r.valid) return <p className="text-[11px] text-slate-400 italic">Enter track width, finished drop and fabric width to calculate.</p>;
    const cannotRailroad = r.railroadCheck === 'Cannot railroad at this height';
    return (
        <div className="space-y-1.5">
            <ResultRow label="Auto Safety" value={r.autoSafety} unit=" in" />
            <ResultRow label="Effective Width" value={r.effectiveWidth} unit=" in" />
            <ResultRow label="Flat Fabric Width" value={r.flatFabricWidth} unit=" in" />
            <ResultRow label="Usable Width Applied" value={r.usableWidthApplied} unit=" in" />
            <ResultRow label="No. of Widths" value={r.numWidths} unit=" widths" />
            <ResultRow label="Raw Cut Drop" value={r.rawCutDrop} unit=" in" />
            <ResultRow label="Repeat Cut Drop" value={r.repeatCutDrop} unit=" in" />
            <ResultRow label="Raw Metres" value={r.rawMetres} unit=" m" />
            <ResultRow label="Net Metres (+ wastage)" value={r.netMetres} unit=" m" />
            <ResultRow label="Order Metres" value={r.orderMetres} unit=" m" highlight />
            <ResultRow label="Railroad Check" value={r.railroadCheck} warn={cannotRailroad} />
            {r.cuttingInstruction && (
                <div className="p-2 mt-1 bg-slate-100 dark:bg-slate-800/60 rounded-md text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                    ✂ {r.cuttingInstruction}
                </div>
            )}
        </div>
    );
};

// ─── Roman Blind Results Panel ────────────────────────────────────────────────
const RomanResults = ({ r }) => {
    if (!r.valid) return <p className="text-[11px] text-slate-400 italic">Enter blind width, blind drop and fabric width to calculate.</p>;
    const cannotRailroad = r.railroadCheck === 'Cannot railroad at this height';
    return (
        <div className="space-y-1.5">
            <ResultRow label="Required Cut Width" value={r.requiredCutWidth} unit=" in" />
            <ResultRow label="Raw Cut Drop" value={r.rawCutDrop} unit=" in" />
            <ResultRow label="Repeat Cut Drop" value={r.repeatCutDrop} unit=" in" />
            {r.railroadRunningWidth > 0 && (
                <ResultRow label="Railroad Running Width" value={r.railroadRunningWidth} unit=" in" />
            )}
            {r.numWidths > 0 && (
                <ResultRow label="No. of Widths" value={r.numWidths} unit=" widths" />
            )}
            <ResultRow label="Raw Metres" value={r.rawMetres} unit=" m" />
            <ResultRow label="Net Metres (+ wastage)" value={r.netMetres} unit=" m" />
            <ResultRow label="Order Metres" value={r.orderMetres} unit=" m" highlight />
            {r.railroadCheck !== '—' && (
                <ResultRow label="Railroad Check" value={r.railroadCheck} warn={cannotRailroad} />
            )}
            {r.cuttingInstruction && (
                <div className="p-2 mt-1 bg-slate-100 dark:bg-slate-800/60 rounded-md text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                    ✂ {r.cuttingInstruction}
                </div>
            )}
        </div>
    );
};

// ─── Wallpaper Results Panel ──────────────────────────────────────────────────
const WallpaperResults = ({ r }) => {
    if (!r.valid && r.stripsPerRoll === undefined) return <p className="text-[11px] text-slate-400 italic">Enter wall dimensions and roll specifications to calculate.</p>;
    const shortRoll = r.stripsPerRoll === 0;
    return (
        <div className="space-y-1.5">
            <ResultRow label="Raw Cut Drop" value={r.rawCutDrop} unit=" in" />
            <ResultRow label="Adjusted Strip Length" value={r.adjustedStripLength} unit=" in" />
            <ResultRow label="Strips per Wall" value={r.stripsPerWall} />
            <ResultRow label="Required Strips (total)" value={r.requiredStrips} />
            <ResultRow label="Strips per Roll" value={r.stripsPerRoll} warn={shortRoll} />
            <ResultRow label="Required Metres (+ wastage)" value={r.requiredMetres} unit=" m" />
            <ResultRow label="Base Rolls" value={r.baseRolls} />
            {r.orderUnit?.toLowerCase() === 'rolls' ? (
                <ResultRow label="Final Order Rolls" value={r.finalOrderRolls} unit=" rolls" highlight />
            ) : (
                <ResultRow label="Final Order Metres" value={r.finalOrderMetres} unit=" m" highlight />
            )}
            <ResultRow label="Order Check" value={r.orderCheck} warn={shortRoll || r.orderCheck?.includes('Minimum')} />
            {r.cuttingInstruction && (
                <div className="p-2 mt-1 bg-slate-100 dark:bg-slate-800/60 rounded-md text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                    ✂ {r.cuttingInstruction}
                </div>
            )}
        </div>
    );
};

/**
 * Right-side Slide-Over Inspector Drawer for deep window specifications:
 * Pelmets, Channels, Motors, Wirings, Site Photos, Versioned Drawings,
 * and the Consumption Calculator (Curtain / Roman Blind / Wallpaper).
 */
const MeasurementDetailsDrawer = ({
    open = false,
    row = null,
    rowIndex = null,
    onClose,
    onSaveRowDetails,
}) => {
    const [activeSection, setActiveSection] = useState('specs');
    const [form, setForm] = useState(row || {});
    const [pelmetDetails, setPelmetDetails] = useState(row?.pelmetDetails || []);
    const [channelDetails, setChannelDetails] = useState(row?.channelDetails || []);
    const [motorDetails, setMotorDetails] = useState(row?.motorDetails || []);
    const [wiringDetails, setWiringDetails] = useState(row?.wiringDetails || []);
    const [attachments, setAttachments] = useState(row?.attachments || []);
    const [drawings, setDrawings] = useState(row?.drawings || []);

    // Calculator input state : stored per row
    const [calcInputs, setCalcInputs] = useState({
        qty: row?.qty || 1,
        // Curtain
        trackWidth: row?.trackWidth || '',
        finishedDrop: row?.finishedDrop || '',
        fabricWidth: row?.fabricWidth || '',
        usableWidth: row?.usableWidth || '',
        verticalRepeat: row?.verticalRepeat || '',
        fullness: row?.fullness || 2.5,
        leftReturn: row?.leftReturn || '',
        rightReturn: row?.rightReturn || '',
        centreOverlap: row?.centreOverlap || '',
        topAllowance: row?.topAllowance || '',
        bottomHem: row?.bottomHem || '',
        wastage: row?.wastage || '',
        orderIncrement: row?.orderIncrement || 0.5,
        pleatByDesign: row?.pleatByDesign || 'No',
        fabricDirection: row?.fabricDirection || 'Normal',
        // Roman Blind
        blindWidth: row?.finishedBlindWidth || row?.blindWidth || '',
        blindDrop: row?.finishedBlindDrop || row?.blindDrop || '',
        leftAllowance: row?.leftAllowance || '',
        rightAllowance: row?.rightAllowance || '',
        bottomAllowance: row?.bottomAllowance || '',
        // Wallpaper
        wallWidth: row?.wallWidth || '',
        wallHeight: row?.wallHeight || '',
        rollWidth: row?.rollWidth || '',
        rollLength: row?.rollLength || '',
        patternMatch: row?.patternMatch || 'None',
        topAllowanceWp: row?.topAllowanceWp || '',
        bottomAllowanceWp: row?.bottomAllowanceWp || '',
        orderingUnit: row?.orderingUnit || 'Metres',
        orderIncrementRequired: row?.orderIncrementRequired || 'No',
        minimumOrder: row?.minimumOrder || '',
        spareRolls: row?.spareRolls || '',
    });

    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadingDrawings, setUploadingDrawings] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    useEffect(() => {
        if (row) {
            setForm(row);
            setPelmetDetails(row.pelmetDetails || []);
            setChannelDetails(row.channelDetails || []);
            setMotorDetails(row.motorDetails || []);
            setWiringDetails(row.wiringDetails || []);
            setAttachments(row.attachments || []);
            setDrawings(row.drawings || []);
            setCalcInputs((prev) => ({
                ...prev,
                qty: row.qty || 1,
                trackWidth: row.trackWidth ?? prev.trackWidth,
                finishedDrop: row.finishedDrop ?? prev.finishedDrop,
                fabricWidth: row.fabricWidth ?? prev.fabricWidth,
                usableWidth: row.usableWidth ?? prev.usableWidth,
                verticalRepeat: row.verticalRepeat ?? prev.verticalRepeat,
                fullness: row.fullness ?? prev.fullness,
                leftReturn: row.leftReturn ?? prev.leftReturn,
                rightReturn: row.rightReturn ?? prev.rightReturn,
                centreOverlap: row.centreOverlap ?? prev.centreOverlap,
                topAllowance: row.topAllowance ?? prev.topAllowance,
                bottomHem: row.bottomHem ?? prev.bottomHem,
                wastage: row.wastage ?? prev.wastage,
                orderIncrement: row.orderIncrement ?? prev.orderIncrement,
                pleatByDesign: row.pleatByDesign ?? prev.pleatByDesign,
                fabricDirection: row.fabricDirection ?? prev.fabricDirection,
                blindWidth: row.finishedBlindWidth ?? row.blindWidth ?? prev.blindWidth,
                blindDrop: row.finishedBlindDrop ?? row.blindDrop ?? prev.blindDrop,
                leftAllowance: row.leftAllowance ?? prev.leftAllowance,
                rightAllowance: row.rightAllowance ?? prev.rightAllowance,
                bottomAllowance: row.bottomAllowance ?? prev.bottomAllowance,
                wallWidth: row.wallWidth ?? prev.wallWidth,
                wallHeight: row.wallHeight ?? prev.wallHeight,
                rollWidth: row.rollWidth ?? prev.rollWidth,
                rollLength: row.rollLength ?? prev.rollLength,
                patternMatch: row.patternMatch ?? prev.patternMatch,
                orderingUnit: row.orderingUnit ?? prev.orderingUnit,
                orderIncrementRequired: row.orderIncrementRequired ?? prev.orderIncrementRequired,
                minimumOrder: row.minimumOrder ?? prev.minimumOrder,
                spareRolls: row.spareRolls ?? prev.spareRolls,
            }));
        }
    }, [row]);

    if (!open || !row) return null;

    const calcType = getCalcType(form.particular || row.particular);

    // Live calculation : runs whenever calcInputs change
    const calcResult = useMemo(() => {
        if (calcType === 'wallpaper') {
            return calculateWallpaperConsumption({
                ...calcInputs,
                topAllowance: calcInputs.topAllowanceWp || calcInputs.topAllowance,
                bottomAllowance: calcInputs.bottomAllowanceWp || calcInputs.bottomAllowance,
            });
        }
        if (calcType === 'roman') {
            return calculateRomanBlindConsumption(calcInputs);
        }
        return calculateCurtainConsumption(calcInputs);
    }, [calcInputs, calcType]);

    const handleCalcInputChange = (field, value) => {
        setCalcInputs((prev) => ({ ...prev, [field]: value }));
    };

    // File Upload Handlers
    const handleMediaUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploadingMedia(true);
        setUploadError(null);
        try {
            const formData = new FormData();
            files.forEach((f) => formData.append('files', f));
            const res = await uploadApi.upload(formData);
            const uploaded = (res.data || []).map((file) => ({
                url: file.url,
                filename: file.filename || file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                uploadedAt: new Date().toISOString(),
            }));
            setAttachments((prev) => [...prev, ...uploaded]);
        } catch (err) {
            setUploadError(err?.message || 'Failed to upload media');
        } finally {
            setUploadingMedia(false);
            e.target.value = '';
        }
    };

    const handleDrawingUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploadingDrawings(true);
        setUploadError(null);
        try {
            const formData = new FormData();
            files.forEach((f) => formData.append('files', f));
            const res = await uploadApi.upload(formData);
            setDrawings((prev) => {
                const startVer = prev.length + 1;
                const uploaded = (res.data || []).map((file, i) => ({
                    url: file.url,
                    filename: file.filename || file.originalname,
                    version: startVer + i,
                    uploadedAt: new Date().toISOString(),
                }));
                return [...prev, ...uploaded];
            });
        } catch (err) {
            setUploadError(err?.message || 'Failed to upload drawing');
        } finally {
            setUploadingDrawings(false);
            e.target.value = '';
        }
    };

    const handleSave = () => {
        const updatedRow = {
            ...form,
            pelmetDetails,
            channelDetails,
            motorDetails,
            wiringDetails,
            attachments,
            drawings,
            // Persist all calculator inputs so they reload correctly
            ...calcInputs,
        };
        onSaveRowDetails(rowIndex, updatedRow);
        onClose();
    };

    const tabs = [
        { id: 'calc', label: 'Calculator', icon: Calculator },
        { id: 'specs', label: 'Specifications', icon: Layers },
        { id: 'media', label: 'Media & Drawings', icon: Paperclip },
    ];

    return (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity">
            <div className="w-full max-w-lg bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
                {/* Drawer Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>Measurement Specifications</span>
                            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20">
                                {form.windowId || form.label || 'W-01'}
                            </span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{form.room || 'Living Room'} • {form.particular || 'Main Curtain'}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button key={tab.id} type="button" onClick={() => setActiveSection(tab.id)} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${activeSection === tab.id
                                ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-950'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Drawer Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                    {uploadError && (
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-lg text-xs">
                            {uploadError}
                        </div>
                    )}

                    {/* ─── TAB: CONSUMPTION CALCULATOR ─── */}
                    {activeSection === 'calc' && (
                        <div className="space-y-4">
                            {/* Calculator type badge */}
                            <div className="flex items-center gap-2 p-2.5 bg-brand-500/5 border border-brand-500/20 rounded-lg">
                                <Calculator className="w-4 h-4 text-brand-500 shrink-0" />
                                <div>
                                    <p className="font-semibold text-brand-700 dark:text-brand-300 text-[11px] uppercase tracking-wider">
                                        {calcType === 'curtain' ? 'Curtain Calculator' : calcType === 'roman' ? 'Roman Blind Calculator' : 'Wallpaper Calculator'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">All dimensional inputs in inches unless noted.</p>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider">Inputs</h4>
                                {calcType === 'curtain' && <CurtainInputs form={calcInputs} onChange={handleCalcInputChange} />}
                                {calcType === 'roman' && <RomanBlindInputs form={calcInputs} onChange={handleCalcInputChange} />}
                                {calcType === 'wallpaper' && <WallpaperInputs form={calcInputs} onChange={handleCalcInputChange} />}
                            </div>

                            {/* Live Results */}
                            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-2">
                                <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                                    <Calculator className="w-3.5 h-3.5 text-emerald-500" />
                                    Live Calculated Results
                                </h4>
                                {calcType === 'curtain' && <CurtainResults r={calcResult} />}
                                {calcType === 'roman' && <RomanResults r={calcResult} />}
                                {calcType === 'wallpaper' && <WallpaperResults r={calcResult} />}
                            </div>

                            {/* Auto Safety note */}
                            {calcType === 'curtain' && (
                                <p className="text-[10px] text-slate-400 italic px-1">
                                    ⓘ Auto Safety values are bracket-based. Update <code>AUTO_SAFETY_BRACKETS</code> in consumptionCalc.js to match client specifications.
                                </p>
                            )}
                        </div>
                    )}

                    {/* ─── TAB: SPECIFICATIONS (pelmet, channel, motor) ─── */}
                    {activeSection === 'specs' && (
                        <>
                            {/* Section 1: Pelmet Details */}
                            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Layers className="w-4 h-4 text-amber-500" /> Pelmet Specifications ({pelmetDetails.length})
                                    </h4>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        icon={Plus}
                                        onClick={() => setPelmetDetails([...pelmetDetails, { pelmetType: 'Wooden Box', dimensions: '', notes: '' }])}
                                    >
                                        Add Pelmet
                                    </Button>
                                </div>
                                {pelmetDetails.length === 0 ? (
                                    <p className="text-slate-400 italic text-[11px]">No pelmet specification added.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {pelmetDetails.map((p, idx) => (
                                            <div key={idx} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Select
                                                        value={p.pelmetType}
                                                        onChange={(e) => {
                                                            const updated = [...pelmetDetails];
                                                            updated[idx].pelmetType = e.target.value;
                                                            setPelmetDetails(updated);
                                                        }}
                                                        options={[
                                                            { value: 'Wooden Box', label: 'Wooden Box' },
                                                            { value: 'Recessed Pelmet', label: 'Recessed Pelmet' },
                                                            { value: 'Fabric Covered', label: 'Fabric Covered' },
                                                            { value: 'Plasterboard', label: 'Plasterboard Coving' },
                                                        ]}
                                                    />
                                                    <Input
                                                        placeholder="Dimensions (W x H x D)"
                                                        value={p.dimensions || ''}
                                                        onChange={(e) => {
                                                            const updated = [...pelmetDetails];
                                                            updated[idx].dimensions = e.target.value;
                                                            setPelmetDetails(updated);
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        placeholder="Notes..."
                                                        value={p.notes || ''}
                                                        onChange={(e) => {
                                                            const updated = [...pelmetDetails];
                                                            updated[idx].notes = e.target.value;
                                                            setPelmetDetails(updated);
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setPelmetDetails(pelmetDetails.filter((_, i) => i !== idx))}
                                                        className="p-1 text-slate-400 hover:text-rose-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section 2: Channel Details */}
                            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Settings className="w-4 h-4 text-indigo-500" /> Channel Specifications ({channelDetails.length})
                                    </h4>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        icon={Plus}
                                        onClick={() => setChannelDetails([...channelDetails, { channelType: 'Single Track', quantity: 1, dimensions: '' }])}
                                    >
                                        Add Channel
                                    </Button>
                                </div>
                                {channelDetails.length === 0 ? (
                                    <p className="text-slate-400 italic text-[11px]">No channel specification added.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {channelDetails.map((c, idx) => (
                                            <div key={idx} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Select
                                                        value={c.channelType}
                                                        onChange={(e) => {
                                                            const updated = [...channelDetails];
                                                            updated[idx].channelType = e.target.value;
                                                            setChannelDetails(updated);
                                                        }}
                                                        options={[
                                                            { value: 'Single Track', label: 'Single Track' },
                                                            { value: 'Double Track', label: 'Double Track' },
                                                            { value: 'Ceiling Recessed', label: 'Ceiling Recessed' },
                                                            { value: 'Heavy Duty Track', label: 'Heavy Duty Motorised Track' },
                                                        ]}
                                                    />
                                                    <Input
                                                        type="number"
                                                        placeholder="Qty"
                                                        value={c.quantity || 1}
                                                        onChange={(e) => {
                                                            const updated = [...channelDetails];
                                                            updated[idx].quantity = Number(e.target.value);
                                                            setChannelDetails(updated);
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        placeholder="Dimensions / Length..."
                                                        value={c.dimensions || ''}
                                                        onChange={(e) => {
                                                            const updated = [...channelDetails];
                                                            updated[idx].dimensions = e.target.value;
                                                            setChannelDetails(updated);
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setChannelDetails(channelDetails.filter((_, i) => i !== idx))}
                                                        className="p-1 text-slate-400 hover:text-rose-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section 3: Motor Specifications */}
                            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Zap className="w-4 h-4 text-sky-500" /> Motor Specifications ({motorDetails.length})
                                    </h4>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        icon={Plus}
                                        onClick={() => setMotorDetails([...motorDetails, { motorType: 'Somfy WireFree', quantity: 1, specification: '' }])}
                                    >
                                        Add Motor
                                    </Button>
                                </div>
                                {motorDetails.length === 0 ? (
                                    <p className="text-slate-400 italic text-[11px]">No motor specification added.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {motorDetails.map((m, idx) => (
                                            <div key={idx} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Select
                                                        value={m.motorType}
                                                        onChange={(e) => {
                                                            const updated = [...motorDetails];
                                                            updated[idx].motorType = e.target.value;
                                                            setMotorDetails(updated);
                                                        }}
                                                        options={[
                                                            { value: 'Somfy WireFree', label: 'Somfy WireFree (Battery)' },
                                                            { value: 'Somfy RTS 230V', label: 'Somfy RTS (230V AC)' },
                                                            { value: 'Somfy Glydea', label: 'Somfy Glydea' },
                                                            { value: 'Tuya Smart', label: 'Tuya / Zigbee Motor' },
                                                        ]}
                                                    />
                                                    <Input
                                                        placeholder="Specification / Torque"
                                                        value={m.specification || ''}
                                                        onChange={(e) => {
                                                            const updated = [...motorDetails];
                                                            updated[idx].specification = e.target.value;
                                                            setMotorDetails(updated);
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => setMotorDetails(motorDetails.filter((_, i) => i !== idx))}
                                                        className="p-1 text-slate-400 hover:text-rose-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ─── TAB: MEDIA & DRAWINGS ─── */}
                    {activeSection === 'media' && (
                        <>
                            {/* Site Photos */}
                            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Paperclip className="w-4 h-4 text-emerald-500" /> Site Photos & Attachments ({attachments.length})
                                    </h4>
                                    <label className={`cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition ${uploadingMedia ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {uploadingMedia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                        Upload Media
                                        <input type="file" multiple accept="image/*,video/*,.pdf" className="hidden" onChange={handleMediaUpload} disabled={uploadingMedia} />
                                    </label>
                                </div>
                                {attachments.length === 0 ? (
                                    <p className="text-slate-400 italic text-[11px]">No site photos uploaded.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {attachments.map((att, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                                                <a href={getMediaUrl(att.url)} target="_blank" rel="noreferrer" className="truncate hover:underline text-slate-700 dark:text-slate-300 font-medium">
                                                    {att.filename || `Photo ${i + 1}`}
                                                </a>
                                                <button type="button" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Versioned Drawings */}
                            <div className="space-y-3 p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                                        <FileCode className="w-4 h-4 text-purple-500" /> Versioned Blueprints ({drawings.length})
                                    </h4>
                                    <label className={`cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition ${uploadingDrawings ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {uploadingDrawings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                        Upload Drawing
                                        <input type="file" multiple accept="image/*,.pdf,.dwg" className="hidden" onChange={handleDrawingUpload} disabled={uploadingDrawings} />
                                    </label>
                                </div>
                                {drawings.length === 0 ? (
                                    <p className="text-purple-400 italic text-[11px]">No drawings attached to this record.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {drawings.map((dwg, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/40 rounded-lg">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Badge tone="purple">v{dwg.version || i + 1}</Badge>
                                                    <a href={getMediaUrl(dwg.url)} target="_blank" rel="noreferrer" className="truncate hover:underline text-purple-900 dark:text-purple-200 font-semibold">
                                                        {dwg.filename || `Drawing ${i + 1}`}
                                                    </a>
                                                </div>
                                                <button type="button" onClick={() => setDrawings(drawings.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>Save Specifications</Button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(MeasurementDetailsDrawer);
