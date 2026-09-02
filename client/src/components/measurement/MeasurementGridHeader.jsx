import React from 'react';

/**
 * 3-Level Grouped Table Header with Sticky Identity Columns (SR, AREA, PARTICULAR)
 * and double-line divider separating identity columns from measurement columns.
 */
const MeasurementGridHeader = ({ columnVisibility = {} }) => {
    const isColVisible = (key) => columnVisibility[key] !== false;

    return (
        <thead className="sticky top-0 z-30 select-none text-slate-800 dark:text-slate-200">
            {/* --- LEVEL 1: Main Category Groups --- */}
            <tr className="bg-[#6b5240] dark:bg-slate-950 text-amber-50 dark:text-slate-200 text-[11px] font-bold tracking-wider uppercase border-b border-amber-800/40 dark:border-slate-800">
                {/* Sticky Identity Level 1 */}
                <th
                    rowSpan={3}
                    className="sticky left-0 z-40 bg-[#574233] dark:bg-slate-950 border-r border-amber-700/50 dark:border-slate-800 px-2 py-2 text-center w-[52px] min-w-[52px]"
                >
                    SR
                </th>
                <th
                    rowSpan={3}
                    className="sticky left-[52px] z-40 bg-[#574233] dark:bg-slate-950 border-r border-amber-700/50 dark:border-slate-800 px-3 py-2 text-left w-[150px] min-w-[150px]"
                >
                    AREA / ROOM
                </th>
                <th
                    rowSpan={3}
                    className="sticky left-[202px] z-40 bg-[#574233] dark:bg-slate-950 border-r-4 border-r-amber-500/80 dark:border-r-amber-500/70 px-3 py-2 text-left w-[180px] min-w-[180px] shadow-[4px_0_10px_rgba(0,0,0,0.15)]"
                >
                    PARTICULAR
                </th>

                {/* Measurement Column Groups */}
                {isColVisible('windowSize') && (
                    <th colSpan={4} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900/90">
                        WINDOW SIZE
                    </th>
                )}

                {isColVisible('pelmetSize') && (
                    <th colSpan={4} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6e5441] dark:bg-slate-900/80">
                        PELMET SIZE
                    </th>
                )}

                {isColVisible('wire') && (
                    <th colSpan={2} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900/90">
                        WIRE
                    </th>
                )}

                {isColVisible('returnSize') && (
                    <th colSpan={2} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6e5441] dark:bg-slate-900/80">
                        RETURN SIZE
                    </th>
                )}

                {isColVisible('fabricRequirement') && (
                    <th colSpan={6} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900/90">
                        FABRIC REQUIREMENT & CALCULATED VALUES
                    </th>
                )}

                <th rowSpan={3} className="px-3 py-2 text-center w-[110px] min-w-[110px] bg-[#574233] dark:bg-slate-950">
                    ACTIONS
                </th>
            </tr>

            {/* --- LEVEL 2: Sub-groups (O2O, F2F, Specs) --- */}
            <tr className="bg-[#785c48] dark:bg-slate-900 text-amber-100 dark:text-slate-300 text-[10px] font-semibold uppercase border-b border-amber-800/30 dark:border-slate-800">
                {isColVisible('windowSize') && (
                    <>
                        <th colSpan={2} className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center bg-[#6b5240] dark:bg-slate-900/70">
                            Out to Out (O2O)
                        </th>
                        <th colSpan={2} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-center bg-[#785c48] dark:bg-slate-900/90">
                            Frame to Frame (F2F)
                        </th>
                    </>
                )}

                {isColVisible('pelmetSize') && (
                    <>
                        <th colSpan={2} className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center bg-[#6b5240] dark:bg-slate-900/70">
                            O2O Pelmet
                        </th>
                        <th colSpan={2} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-center bg-[#785c48] dark:bg-slate-900/90">
                            F2F Pelmet
                        </th>
                    </>
                )}

                {isColVisible('wire') && (
                    <th colSpan={2} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-center">
                        Side Drop
                    </th>
                )}

                {isColVisible('returnSize') && (
                    <th colSpan={2} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-center">
                        Curtain Returns (in)
                    </th>
                )}

                {isColVisible('fabricRequirement') && (
                    <>
                        <th colSpan={2} className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center">
                            Panels & Drops
                        </th>
                        <th colSpan={2} className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center">
                            Curtain Fabric
                        </th>
                        <th colSpan={2} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-center">
                            Lining & Blinds
                        </th>
                    </>
                )}
            </tr>

            {/* --- LEVEL 3: Exact Field Labels & Units --- */}
            <tr className="bg-[#836444] dark:bg-slate-900/95 text-amber-50 dark:text-slate-300 text-[10px] font-semibold border-b-2 border-amber-900/60 dark:border-slate-700 shadow-sm">
                {/* O2O Window */}
                {isColVisible('windowSize') && (
                    <>
                        <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Width (mm)</th>
                        <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Height (mm)</th>
                        <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Width (mm)</th>
                        <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Height (mm)</th>
                    </>
                )}

                {/* Pelmet Size */}
                {isColVisible('pelmetSize') && (
                    <>
                        <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Width (mm)</th>
                        <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Drop (mm)</th>
                        <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Width (mm)</th>
                        <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Drop (mm)</th>
                    </>
                )}

                {/* Wire */}
                {isColVisible('wire') && (
                    <>
                        <th className="border-r border-amber-700/30 dark:border-slate-800 px-1.5 py-1 text-center w-[65px] min-w-[65px]">Left</th>
                        <th className="border-r border-amber-700/40 dark:border-slate-800 px-1.5 py-1 text-center w-[65px] min-w-[65px]">Right</th>
                    </>
                )}

                {/* Return */}
                {isColVisible('returnSize') && (
                    <>
                        <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[90px] min-w-[90px]">Left (in)</th>
                        <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[90px] min-w-[90px]">Right (in)</th>
                    </>
                )}

                {/* Fabric & Calculated */}
                {isColVisible('fabricRequirement') && (
                    <>
                        <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]" title="Height per Part in Metres">Ht/Part (m)</th>
                        <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[85px] min-w-[85px]" title="Rounded Parts / Panels Count">Parts</th>
                        <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]" title="Running Feet">Rnft</th>
                        <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[105px] min-w-[105px]" title="Required Fabric Meters">Fabric (m)</th>
                        <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[105px] min-w-[105px]" title="Required Blackout Meters">Blackout (m)</th>
                        <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]" title="Roman Blind Sqft">Blind (Sqft)</th>
                    </>
                )}
            </tr>
        </thead>
    );
};

export default React.memo(MeasurementGridHeader);
