import React, { useState, useEffect, useRef } from 'react';

/**
 * High-density inline editable grid cell component.
 * Normal state: Data display (clean typography, no heavy input borders)
 * Hover state: Subtle indicator
 * Active state: Interactive input (subtle border, focus ring, keyboard nav)
 * Read-only state: Muted background with clear read-only indicator
 */
const MeasurementCell = ({
    value,
    onChange,
    type = 'number', // 'text', 'number', 'select', 'checkbox', 'readonly'
    options = [],
    placeholder = '—',
    className = '',
    align = 'right',
    min,
    max,
    step = 'any',
    allowNegative = true,
    isCalculated = false,
    unit = '',
    onNavigateNext,
    onNavigatePrev,
    onNavigateDown,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localVal, setLocalVal] = useState(value ?? '');
    const inputRef = useRef(null);

    useEffect(() => {
        setLocalVal(value ?? '');
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (type === 'number' || type === 'text') {
                inputRef.current.select();
            }
        }
    }, [isEditing, type]);

    const handleCommit = () => {
        setIsEditing(false);
        let finalVal = localVal;
        if (type === 'number') {
            if (localVal === '' || localVal === null || localVal === undefined) {
                finalVal = '';
            } else {
                const parsed = parseFloat(localVal);
                if (!isNaN(parsed)) {
                    if (!allowNegative && parsed < 0) {
                        finalVal = Math.abs(parsed);
                    } else {
                        finalVal = parsed;
                    }
                } else {
                    finalVal = '';
                }
            }
        }
        if (finalVal !== value) {
            onChange(finalVal);
        }
    };

    const handleCancel = () => {
        setLocalVal(value ?? '');
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCommit();
            if (onNavigateDown) onNavigateDown();
            else if (onNavigateNext) onNavigateNext();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            handleCommit();
            if (e.shiftKey) {
                if (onNavigatePrev) onNavigatePrev();
            } else {
                if (onNavigateNext) onNavigateNext();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    // --- Checkbox Cell
    if (type === 'checkbox') {
        return (
            <td className={`px-2 py-1 text-center align-middle border-r border-slate-200 dark:border-slate-800 ${className}`}>
                <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => onChange(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 cursor-pointer transition"
                />
            </td>
        );
    }

    // --- Readonly / Calculated Cell
    if (type === 'readonly' || isCalculated) {
        let displayVal = value;
        if (value === null || value === undefined || value === '') displayVal = '—';
        else if (typeof value === 'number') {
            displayVal = Number.isInteger(value) ? value : value.toFixed(2);
        }

        return (
            <td
                className={`px-2 py-1 text-xs font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40 border-r border-slate-200 dark:border-slate-800/80 align-middle ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} ${className}`}
                title={isCalculated ? 'System Calculated Field' : undefined}
            >
                <div className="flex items-center justify-end gap-1">
                    <span>{displayVal}</span>
                    {unit && <span className="text-[10px] text-slate-400 font-sans">{unit}</span>}
                </div>
            </td>
        );
    }

    // --- Editable Cell
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

    let displayFormatted = localVal;
    if (localVal === '' || localVal === null || localVal === undefined) displayFormatted = placeholder;
    else if (typeof localVal === 'number') {
        displayFormatted = Number.isInteger(localVal) ? String(localVal) : localVal.toFixed(2);
    }

    return (
        <td
            onClick={() => setIsEditing(true)}
            className={`px-2 py-1 text-xs font-mono text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/80 align-middle transition-colors cursor-cell group ${isEditing ? 'bg-amber-500/10 dark:bg-amber-950/30' : 'hover:bg-slate-100/80 dark:hover:bg-slate-900/80'} ${alignClass} ${className}`}
        >
            {isEditing ? (
                type === 'select' ? (
                    <select
                        ref={inputRef}
                        value={localVal}
                        onChange={(e) => {
                            setLocalVal(e.target.value);
                            onChange(e.target.value);
                            setIsEditing(false);
                        }}
                        onBlur={handleCommit}
                        onKeyDown={handleKeyDown}
                        className="w-full h-7 px-1.5 py-0.5 text-xs bg-white dark:bg-slate-900 border border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 rounded text-slate-900 dark:text-slate-100 font-sans shadow-sm"
                    >
                        {options.map((opt) => (
                            <option key={typeof opt === 'object' ? opt.value : opt} value={typeof opt === 'object' ? opt.value : opt}>
                                {typeof opt === 'object' ? opt.label : opt}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        ref={inputRef}
                        type={type}
                        value={localVal}
                        onChange={(e) => setLocalVal(e.target.value)}
                        onBlur={handleCommit}
                        onKeyDown={handleKeyDown}
                        min={min}
                        max={max}
                        step={step}
                        placeholder={placeholder}
                        className={`w-full h-7 px-1.5 py-0.5 text-xs font-mono bg-white dark:bg-slate-900 border border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 rounded text-slate-900 dark:text-slate-100 shadow-sm ${alignClass}`}
                    />
                )
            ) : (
                <div className={`flex items-center ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'} gap-1 w-full min-h-[24px]`}>
                    <span className={localVal === '' || localVal === null || localVal === undefined ? 'text-slate-400 dark:text-slate-600 font-sans italic text-[11px]' : 'font-medium'}>
                        {displayFormatted}
                    </span>
                    {unit && localVal !== '' && localVal !== null && localVal !== undefined && (
                        <span className="text-[10px] text-slate-400 font-sans shrink-0">{unit}</span>
                    )}
                </div>
            )}
        </td>
    );
};

export default React.memo(MeasurementCell);
