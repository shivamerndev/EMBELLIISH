import React from 'react';

/**
 * Sticky Footer Summary Row aligned precisely with grid columns.
 */
const MeasurementTotals = ({ totals = {}, columnVisibility = {} }) => {
    const isColVisible = (key) => columnVisibility[key] !== false;

    return (
        <tfoot className="sticky bottom-0 z-30 font-semibold select-none border-t-2 border-amber-600/40 dark:border-slate-700 shadow-md">
            <tr className="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs" style={{ height: '42px' }}>
                {/* Sticky Identity Footer */}
                <td className="sticky left-0 z-40 bg-slate-100 dark:bg-slate-900 px-2 py-2 text-center border-r border-slate-300 dark:border-slate-800 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    TOTAL
                </td>
                <td className="sticky left-[52px] z-40 bg-slate-100 dark:bg-slate-900 px-3 py-2 border-r border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                    Project Summary
                </td>
                <td className="sticky left-[202px] z-40 bg-slate-100 dark:bg-slate-900 px-3 py-2 border-r-4 border-r-amber-500/80 dark:border-r-amber-500/70 text-slate-500 text-[11px] font-normal shadow-[4px_0_10px_rgba(0,0,0,0.15)]">
                    {totals.totalWindows || 0} Window Records
                </td>

                {/* Window Size Blank Footer */}
                {isColVisible('windowSize') && (
                    <td colSpan={4} className="border-r border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-center text-slate-400 font-normal italic text-[11px]">
                        —
                    </td>
                )}

                {/* Pelmet Size Blank Footer */}
                {isColVisible('pelmetSize') && (
                    <td colSpan={4} className="border-r border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-center text-slate-400 font-normal italic text-[11px]">
                        —
                    </td>
                )}

                {/* Wire Blank Footer */}
                {isColVisible('wire') && (
                    <td colSpan={2} className="border-r border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-center text-slate-400 font-normal italic text-[11px]">
                        —
                    </td>
                )}

                {/* Return Size Blank Footer */}
                {isColVisible('returnSize') && (
                    <td colSpan={2} className="border-r border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-center text-slate-400 font-normal italic text-[11px]">
                        —
                    </td>
                )}

                {/* Fabric & Calculated Grand Totals */}
                {isColVisible('fabricRequirement') && (
                    <>
                        <td className="border-r border-slate-300 dark:border-slate-800 px-2 py-2 text-right font-mono text-slate-400 font-normal text-[11px]">
                            —
                        </td>
                        <td className="border-r border-slate-300 dark:border-slate-800 px-2 py-2 text-right font-mono text-brand-700 dark:text-brand-300 font-bold">
                            {totals.totalParts || 0}
                        </td>
                        <td className="border-r border-slate-300 dark:border-slate-800 px-2 py-2 text-right font-mono text-slate-900 dark:text-slate-100 font-bold">
                            {(totals.rnft || 0).toFixed(0)} ft
                        </td>
                        <td className="border-r border-slate-300 dark:border-slate-800 px-2 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10">
                            {(totals.fabricMeters || 0).toFixed(2)} m
                        </td>
                        <td className="border-r border-slate-300 dark:border-slate-800 px-2 py-2 text-right font-mono text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10">
                            {(totals.blackoutMeters || 0).toFixed(2)} m
                        </td>
                        <td className="border-r border-slate-300 dark:border-slate-800 px-2 py-2 text-right font-mono text-sky-700 dark:text-sky-400 font-bold">
                            {totals.romanSqft || 0} sqft
                        </td>
                    </>
                )}

                <td className="bg-slate-100 dark:bg-slate-900 text-center text-slate-400 font-normal text-[11px]">
                    —
                </td>
            </tr>
        </tfoot>
    );
};

export default React.memo(MeasurementTotals);
