import React from 'react';
import { Copy, Trash2, Sliders, Eye, Paperclip, Layers, Zap } from 'lucide-react';
import MeasurementCell from './MeasurementCell';
import { calculateRowConsumption } from '../../utils/consumptionCalc';

const PARTICULAR_OPTIONS = [
    { value: 'MAIN_CURTAIN', label: 'Main Curtain' },
    { value: 'SHEER_CURTAIN', label: 'Sheer Curtain' },
    { value: 'MOTORISED_CURTAIN', label: 'Motorised Curtain' },
    { value: 'ROMAN_BLIND', label: 'Roman Blind' },
    { value: 'WOODEN_BLIND', label: 'Wooden Blind' },
    { value: 'ROLLER_BLIND', label: 'Roller Blind' },
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
}) => {
    const isColVisible = (key) => columnVisibility[key] !== false;

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

            {/* --- RETURN SIZE (Supports Negative Values) --- */}
            {isColVisible('returnSize') && (
                <>
                    <MeasurementCell
                        type="number"
                        value={row.curtainReturnLeft ?? ''}
                        onChange={(val) => handleFieldChange('curtainReturnLeft', val)}
                        allowNegative={true}
                        placeholder="0"
                    />
                    <MeasurementCell
                        type="number"
                        value={row.curtainReturnRight ?? ''}
                        onChange={(val) => handleFieldChange('curtainReturnRight', val)}
                        allowNegative={true}
                        placeholder="0"
                    />
                </>
            )}

            {/* --- FABRIC REQUIREMENT & LIVE CALCULATED FIELDS --- */}
            {isColVisible('fabricRequirement') && (
                <>
                    <MeasurementCell type="readonly" isCalculated value={calc.heightPerPartM} unit="m" />
                    <MeasurementCell
                        type="number"
                        value={row.partsOverride ?? calc.roundedParts}
                        onChange={(val) => handleFieldChange('partsOverride', val)}
                        placeholder={String(calc.roundedParts)}
                        align="right"
                        className={row.partsOverride ? 'font-bold text-brand-600 dark:text-brand-400' : ''}
                    />
                    <MeasurementCell type="readonly" isCalculated value={calc.rnft} unit="ft" />
                    <MeasurementCell type="readonly" isCalculated value={calc.fabricMeters} unit="m" />
                    <MeasurementCell type="readonly" isCalculated value={calc.blackoutMeters} unit="m" />
                    <MeasurementCell type="readonly" isCalculated value={calc.romanSqft} unit="sqft" />
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
