import React from 'react';
import { Copy, Trash2, Sliders } from 'lucide-react';
import MeasurementCell from '../measurement/MeasurementCell';
import { calculateRowConsumption } from '../../utils/consumptionCalc';

const PARTICULAR_OPTIONS = [
    { value: 'MAIN_CURTAIN', label: 'Main Curtain' },
    { value: 'SHEER_CURTAIN', label: 'Sheer Curtain' },
    { value: 'MOTORISED_CURTAIN', label: 'Motorised Curtain' },
    { value: 'ROMAN_BLIND', label: 'Roman Blind' },
    { value: 'WOODEN_BLIND', label: 'Wooden Blind' },
    { value: 'ROLLER_BLIND', label: 'Roller Blind' },
    { value: 'WALLPAPER', label: 'Wallpaper' },
];

/**
 * High-density measurement grid row.
 * Includes sticky identity cells (SR, AREA, PARTICULAR) and inline editable cells.
 */
const MeasurementRow = ({
    row = {},
    rowIndex = 0,
    itemSr = 1,
    onUpdateRow,
    onDuplicateRow,
    onDeleteRow,
    onOpenDetails,
    columnVisibility = {},
    typeFilter = 'MAIN_CURTAIN',
}) => {
    const isColVisible = (key) => columnVisibility[key] !== false;
    const isRoman = typeFilter === 'ROMAN_BLIND' || typeFilter === 'ROLLER_BLIND' || typeFilter === 'WOODEN_BLIND';
    const isCurtain = !isRoman && (typeFilter === 'MAIN_CURTAIN' || typeFilter === 'SHEER_CURTAIN' || typeFilter === 'MOTORISED_CURTAIN' || typeFilter === 'ALL');

    // Calculate live consumption outputs for responsive display
    const calc = calculateRowConsumption(row);

    const handleFieldChange = (field, val) => {
        onUpdateRow(rowIndex, { [field]: val });
    };

    const hasSubDetails = Boolean(
        (row.pelmetDetails?.length || 0) +
        (row.channelDetails?.length || 0) +
        (row.motorDetails?.length || 0) +
        (row.wiringDetails?.length || 0)
    );

    return (
        <tr
            className="group hover:bg-amber-500/5 dark:hover:bg-slate-900/60 transition-colors border-b border-slate-200 dark:border-slate-800/60 text-slate-800 dark:text-slate-200"
            style={{ height: '44px' }}
        >
            {/* Sticky SR */}
            <td className="sticky left-0 z-20 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 font-medium w-[52px] min-w-[52px]">
                {itemSr}
            </td>

            {/* Sticky AREA / Window ID */}
            <td className="sticky left-[52px] z-20 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 px-3 border-r border-slate-200 dark:border-slate-800 w-[150px] min-w-[150px]">
                <div className="flex flex-col">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {row.windowId || row.label || `W-0${itemSr}`}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">{row.room || 'Living Room'}</span>
                </div>
            </td>

            {/* Sticky PARTICULAR (With Double Line Separator) */}
            <td className="sticky left-[202px] z-20 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 px-2 border-r-4 border-r-amber-500/80 dark:border-r-amber-500/70 w-[180px] min-w-[180px] shadow-[4px_0_10px_rgba(0,0,0,0.15)]">
                <select
                    value={row.particular || row.windowType || 'MAIN_CURTAIN'}
                    onChange={(e) => handleFieldChange('particular', e.target.value)}
                    className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-brand-500 rounded px-1 py-0.5 focus:outline-none transition cursor-pointer"
                >
                    {PARTICULAR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </td>

            {/* --- WINDOW SIZE (O2O & F2F) --- */}
            {isColVisible('windowSize') && (
                <>
                    <MeasurementCell
                        type="number"
                        value={row.outToOutWidth ?? row.o2oWidth ?? ''}
                        onChange={(val) => handleFieldChange('outToOutWidth', val)}
                        placeholder="—"
                        min={0}
                    />
                    <MeasurementCell
                        type="number"
                        value={row.outToOutHeight ?? row.o2oHeight ?? ''}
                        onChange={(val) => handleFieldChange('outToOutHeight', val)}
                        placeholder="—"
                        min={0}
                    />
                    <MeasurementCell
                        type="number"
                        value={row.frameToFrameWidth ?? row.f2fWidth ?? ''}
                        onChange={(val) => handleFieldChange('frameToFrameWidth', val)}
                        placeholder="—"
                        min={0}
                    />
                    <MeasurementCell
                        type="number"
                        value={row.frameToFrameHeight ?? row.f2fHeight ?? ''}
                        onChange={(val) => handleFieldChange('frameToFrameHeight', val)}
                        placeholder="—"
                        min={0}
                    />
                </>
            )}

            {/* --- PELMET SIZE --- */}
            {isColVisible('pelmetSize') && (
                <>
                    <MeasurementCell
                        type="number"
                        value={row.pelmetO2oWidth ?? ''}
                        onChange={(val) => handleFieldChange('pelmetO2oWidth', val)}
                        placeholder="—"
                        min={0}
                    />
                    <MeasurementCell
                        type="number"
                        value={row.pelmetO2oDrop ?? ''}
                        onChange={(val) => handleFieldChange('pelmetO2oDrop', val)}
                        placeholder="—"
                        min={0}
                    />
                    <MeasurementCell
                        type="number"
                        value={row.pelmetF2fWidth ?? ''}
                        onChange={(val) => handleFieldChange('pelmetF2fWidth', val)}
                        placeholder="—"
                        min={0}
                    />
                    <MeasurementCell
                        type="number"
                        value={row.pelmetF2fDrop ?? ''}
                        onChange={(val) => handleFieldChange('pelmetF2fDrop', val)}
                        placeholder="—"
                        min={0}
                    />
                </>
            )}

            {/* --- WIRE --- */}
            {isColVisible('wire') && (
                <>
                    <MeasurementCell
                        type="checkbox"
                        value={row.wireLeft}
                        onChange={(val) => handleFieldChange('wireLeft', val)}
                    />
                    <MeasurementCell
                        type="checkbox"
                        value={row.wireRight}
                        onChange={(val) => handleFieldChange('wireRight', val)}
                    />
                </>
            )}

            {/* --- MEASUREMENTS (Shared: Rnft / Roman Sqft / Window / Qty) --- */}
            {isColVisible('measurements') && (
                <>
                    <MeasurementCell
                        type="number"
                        value={row.rnft ?? ''}
                        onChange={(val) => handleFieldChange('rnft', val)}
                        placeholder="—"
                        min={0}
                    />
                    <MeasurementCell
                        type="number"
                        value={row.romanSqft ?? ''}
                        onChange={(val) => handleFieldChange('romanSqft', val)}
                        placeholder="—"
                        min={0}
                    />
                    <MeasurementCell
                        type="text"
                        align="center"
                        value={row.windowId || row.label || ''}
                        onChange={(val) => handleFieldChange('windowId', val)}
                        placeholder="—"
                    />
                    <MeasurementCell
                        type="number"
                        align="center"
                        value={row.qty ?? 1}
                        onChange={(val) => handleFieldChange('qty', val)}
                        min={1}
                        placeholder="1"
                    />
                </>
            )}

            {/* ══════════════ CURTAIN ONLY ══════════════ */}
            {isCurtain && (
                <>
                    {/* Track & Drop */}
                    {isColVisible('trackDrop') && (
                        <>
                            <MeasurementCell
                                type="number"
                                value={row.trackWidth ?? row.outToOutWidth ?? ''}
                                onChange={(val) => handleFieldChange('trackWidth', val)}
                                placeholder="—"
                                min={0}
                            />
                            <MeasurementCell
                                type="number"
                                value={row.finishedDrop ?? row.outToOutHeight ?? ''}
                                onChange={(val) => handleFieldChange('finishedDrop', val)}
                                placeholder="—"
                                min={0}
                            />
                        </>
                    )}

                    {/* Fabric */}
                    {isColVisible('fabric') && (
                        <>
                            <MeasurementCell
                                type="number"
                                value={row.fabricWidth ?? 138}
                                onChange={(val) => handleFieldChange('fabricWidth', val)}
                                placeholder="138"
                                min={0}
                            />
                            <MeasurementCell
                                type="number"
                                value={row.usableWidth ?? 136}
                                onChange={(val) => handleFieldChange('usableWidth', val)}
                                placeholder="136"
                                min={0}
                            />
                            <MeasurementCell
                                type="number"
                                value={row.verticalRepeat ?? 0}
                                onChange={(val) => handleFieldChange('verticalRepeat', val)}
                                placeholder="0"
                                min={0}
                            />
                        </>
                    )}

                    {/* Allowances (7 cols) */}
                    {isColVisible('allowances') && (
                        <>
                            <MeasurementCell
                                type="number"
                                value={row.fullness ?? 2}
                                onChange={(val) => handleFieldChange('fullness', val)}
                                step="0.1"
                                min={0}
                                placeholder="2"
                            />
                            <MeasurementCell
                                type="number"
                                value={row.leftReturn ?? row.curtainReturnLeft ?? 0.05}
                                onChange={(val) => {
                                    handleFieldChange('leftReturn', val);
                                    handleFieldChange('curtainReturnLeft', val);
                                }}
                                step="0.01"
                                placeholder="0"
                            />
                            <MeasurementCell
                                type="number"
                                value={row.rightReturn ?? row.curtainReturnRight ?? 0}
                                onChange={(val) => {
                                    handleFieldChange('rightReturn', val);
                                    handleFieldChange('curtainReturnRight', val);
                                }}
                                step="0.01"
                                placeholder="0"
                            />
                            <MeasurementCell
                                type="number"
                                value={row.centreOverlap ?? 0}
                                onChange={(val) => handleFieldChange('centreOverlap', val)}
                                step="0.01"
                                placeholder="0"
                            />
                            <MeasurementCell
                                type="number"
                                value={row.topAllowance ?? 0}
                                onChange={(val) => handleFieldChange('topAllowance', val)}
                                step="0.01"
                                placeholder="0"
                            />
                            <MeasurementCell
                                type="number"
                                value={row.bottomHem ?? 0.2}
                                onChange={(val) => handleFieldChange('bottomHem', val)}
                                step="0.01"
                                placeholder="0.2"
                            />
                            <MeasurementCell
                                type="number"
                                value={row.wastage ?? 0.05}
                                onChange={(val) => handleFieldChange('wastage', val)}
                                step="0.01"
                                placeholder="0.05"
                            />
                        </>
                    )}

                    {/* Calculations (7 cols) */}
                    {isColVisible('calculations') && (
                        <>
                            <MeasurementCell
                                type="number"
                                value={row.orderIncrement ?? 0.1}
                                onChange={(val) => handleFieldChange('orderIncrement', val)}
                                step="0.05"
                                placeholder="0.1"
                            />
                            <MeasurementCell
                                type="select"
                                align="center"
                                value={row.pleatingByDesign ?? row.pleatByDesign ?? 'No'}
                                onChange={(val) => {
                                    handleFieldChange('pleatingByDesign', val);
                                    handleFieldChange('pleatByDesign', val);
                                }}
                                options={['No', 'Yes']}
                            />
                            <MeasurementCell
                                type="select"
                                align="center"
                                value={row.fabricDirection ?? 'Normal'}
                                onChange={(val) => handleFieldChange('fabricDirection', val)}
                                options={['Normal', 'Railroaded']}
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                align="center"
                                value={calc.autoSafety ?? 0}
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.effectiveWidth ?? 0}
                                unit="m"
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.flatFabricWidth ?? 0}
                                unit="m"
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.usableWidthApplied ?? 0}
                                unit="m"
                            />
                        </>
                    )}

                    {/* Fabric Order (5 cols) */}
                    {isColVisible('fabricOrder') && (
                        <>
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.numWidths ?? 0}
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.rawCutDrop ?? 0}
                                unit="m"
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.repeatCutDrop ?? 0}
                                unit="m"
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.rawMetres ?? 0}
                                unit="m"
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.netMetres ?? 0}
                                unit="m"
                            />
                        </>
                    )}

                    {/* Flags (3 cols) */}
                    {isColVisible('flags') && (
                        <>
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.orderMetres ?? 0}
                                unit="m"
                                className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                align="center"
                                value={calc.railroadCheck ?? '—'}
                                className={calc.railroadCheck === 'Cannot railroad at this height' ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                align="center"
                                value={calc.cuttingInstruction || '—'}
                            />
                        </>
                    )}
                </>
            )}

            {/* ══════════════ ROMAN BLIND ONLY ══════════════ */}
            {isRoman && (
                <>
                    {/* Finished Size */}
                    {isColVisible('rb_finishedSize') && (
                        <>
                            <MeasurementCell
                                type="number"
                                value={row.finishedBlindWidth ?? row.blindWidth ?? (row.outToOutWidth ? (Number(row.outToOutWidth) > 200 ? Math.round((Number(row.outToOutWidth) / 25.4) * 10) / 10 : row.outToOutWidth) : '')}
                                onChange={(val) => {
                                    handleFieldChange('finishedBlindWidth', val);
                                    handleFieldChange('blindWidth', val);
                                }}
                                placeholder="—"
                                min={0}
                            />
                            <MeasurementCell
                                type="number"
                                value={row.finishedBlindDrop ?? row.blindDrop ?? (row.outToOutHeight ? (Number(row.outToOutHeight) > 200 ? Math.round((Number(row.outToOutHeight) / 25.4) * 10) / 10 : row.outToOutHeight) : '')}
                                onChange={(val) => {
                                    handleFieldChange('finishedBlindDrop', val);
                                    handleFieldChange('blindDrop', val);
                                }}
                                placeholder="—"
                                min={0}
                            />
                        </>
                    )}

                    {/* Fabric */}
                    {isColVisible('rb_fabric') && (
                        <>
                            <MeasurementCell
                                type="number"
                                value={row.fabricWidth ?? 54}
                                onChange={(val) => handleFieldChange('fabricWidth', val)}
                                placeholder="54"
                                min={0}
                            />
                            <MeasurementCell
                                type="number"
                                value={row.usableWidth ?? 52}
                                onChange={(val) => handleFieldChange('usableWidth', val)}
                                placeholder="52"
                                min={0}
                            />
                            <MeasurementCell
                                type="number"
                                value={row.verticalRepeat ?? 0}
                                onChange={(val) => handleFieldChange('verticalRepeat', val)}
                                placeholder="0"
                                min={0}
                            />
                        </>
                    )}

                    {/* Allowances */}
                    {isColVisible('rb_allowances') && (
                        <>
                            <MeasurementCell
                                type="number"
                                value={row.leftAllowance ?? 1.5}
                                onChange={(val) => handleFieldChange('leftAllowance', val)}
                                step="0.1"
                                placeholder="1.5"
                            />
                            <MeasurementCell
                                type="number"
                                value={row.rightAllowance ?? 1.5}
                                onChange={(val) => handleFieldChange('rightAllowance', val)}
                                step="0.1"
                                placeholder="1.5"
                            />
                            <MeasurementCell
                                type="number"
                                value={row.topAllowance ?? 2}
                                onChange={(val) => handleFieldChange('topAllowance', val)}
                                step="0.1"
                                placeholder="2"
                            />
                            <MeasurementCell
                                type="number"
                                value={row.bottomAllowance ?? 3}
                                onChange={(val) => handleFieldChange('bottomAllowance', val)}
                                step="0.1"
                                placeholder="3"
                            />
                            <MeasurementCell
                                type="number"
                                value={row.wastage ?? 0.05}
                                onChange={(val) => handleFieldChange('wastage', val)}
                                step="0.01"
                                placeholder="0.05"
                            />
                        </>
                    )}

                    {/* Calculations */}
                    {isColVisible('rb_calculations') && (
                        <>
                            <MeasurementCell
                                type="number"
                                value={row.orderIncrement ?? 0.5}
                                onChange={(val) => handleFieldChange('orderIncrement', val)}
                                step="0.1"
                                placeholder="0.5"
                            />
                            <MeasurementCell
                                type="select"
                                align="center"
                                value={row.fabricDirection ?? 'Normal'}
                                onChange={(val) => handleFieldChange('fabricDirection', val)}
                                options={['Normal', 'Railroaded']}
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.requiredCutWidth ?? 0}
                                unit='"'
                            />
                        </>
                    )}

                    {/* Fabric Order */}
                    {isColVisible('rb_fabricOrder') && (
                        <>
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.rawCutDrop ?? 0}
                                unit='"'
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.repeatCutDrop ?? 0}
                                unit='"'
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.railroadRunningWidth ? calc.railroadRunningWidth : '—'}
                                unit={calc.railroadRunningWidth ? '"' : ''}
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.numWidths ?? 0}
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.rawMetres ?? 0}
                                unit="m"
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.netMetres ?? 0}
                                unit="m"
                            />
                        </>
                    )}

                    {/* Flags */}
                    {isColVisible('rb_flags') && (
                        <>
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                value={calc.orderMetres ?? 0}
                                unit="m"
                                className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                align="center"
                                value={calc.railroadCheck ?? '—'}
                                className={calc.railroadCheck === 'Cannot railroad at this height' ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}
                            />
                            <MeasurementCell
                                type="readonly"
                                isCalculated
                                align="center"
                                value={calc.cuttingInstruction || '—'}
                            />
                        </>
                    )}
                </>
            )}


            {/* --- ACTIONS --- */}
            <td className="px-2 py-1 text-center align-middle bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 w-[110px] min-w-[110px]">
                <div className="flex items-center justify-center gap-1">
                    <button
                        type="button"
                        onClick={() => onOpenDetails(row, rowIndex)}
                        className={`p-1.5 rounded transition ${hasSubDetails ? 'text-brand-600 dark:text-brand-400 bg-brand-500/10 hover:bg-brand-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title="Inspect Window Specifications & Attachments"
                    >
                        <Sliders className="w-3.5 h-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={() => onDuplicateRow(rowIndex)}
                        className="p-1.5 rounded text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Duplicate Window Measurement Row"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={() => onDeleteRow(rowIndex)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                        title="Delete Window Measurement Row"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default React.memo(MeasurementRow);
