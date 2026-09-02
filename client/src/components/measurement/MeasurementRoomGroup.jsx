import React from 'react';
import { ChevronDown, ChevronRight, DoorOpen, Layers } from 'lucide-react';

/**
 * Compact Room Group Row Header with Expand/Collapse toggle and room summary stats.
 */
const MeasurementRoomGroup = ({
    roomName = 'Unassigned Room',
    srIndex = 1,
    itemCount = 0,
    isExpanded = true,
    onToggleExpand,
    colSpan = 25,
    summary = {},
}) => {
    const formattedSr = String(srIndex).padStart(2, '0');

    return (
        <tr
            onClick={onToggleExpand}
            className="bg-slate-100/90 dark:bg-slate-900/90 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 cursor-pointer transition select-none border-t border-b border-slate-300 dark:border-slate-800"
            style={{ height: '40px' }}
        >
            {/* Sticky SR / Group Badge */}
            <td className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 text-center border-r border-slate-300 dark:border-slate-800">
                <span className="font-mono text-[11px] font-bold text-brand-700 dark:text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
                    {formattedSr}
                </span>
            </td>

            {/* Sticky Room Name */}
            <td className="sticky left-[52px] z-20 bg-slate-100 dark:bg-slate-900 px-3 border-r border-slate-300 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <button type="button" className="p-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-brand-600 dark:text-brand-400 transition-transform" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 transition-transform" />
                        )}
                    </button>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <DoorOpen className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        {roomName}
                    </span>
                </div>
            </td>

            {/* Sticky Particular Placeholder with double line */}
            <td className="sticky left-[202px] z-20 bg-slate-100 dark:bg-slate-900 px-3 border-r-4 border-r-amber-500/80 dark:border-r-amber-500/70 shadow-[4px_0_10px_rgba(0,0,0,0.15)]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    {itemCount} window{itemCount === 1 ? '' : 's'}
                </span>
            </td>

            {/* Remaining Spanned Summary Cells */}
            <td colSpan={colSpan} className="px-4 text-xs text-slate-600 dark:text-slate-400 font-mono">
                <div className="flex items-center gap-6 text-[11px]">
                    {summary.fabricMeters > 0 && (
                        <span>
                            <strong className="text-slate-700 dark:text-slate-300">Fabric:</strong> {summary.fabricMeters.toFixed(2)}m
                        </span>
                    )}
                    {summary.blackoutMeters > 0 && (
                        <span>
                            <strong className="text-slate-700 dark:text-slate-300">Blackout:</strong> {summary.blackoutMeters.toFixed(2)}m
                        </span>
                    )}
                    {summary.rnft > 0 && (
                        <span>
                            <strong className="text-slate-700 dark:text-slate-300">Rnft:</strong> {summary.rnft} ft
                        </span>
                    )}
                    {summary.romanSqft > 0 && (
                        <span>
                            <strong className="text-slate-700 dark:text-slate-300">Blind:</strong> {summary.romanSqft} sqft
                        </span>
                    )}
                    <span className="text-slate-400 font-sans italic text-[10px] ml-auto">
                        Click to {isExpanded ? 'collapse' : 'expand'} room measurements
                    </span>
                </div>
            </td>
        </tr>
    );
};

export default React.memo(MeasurementRoomGroup);
