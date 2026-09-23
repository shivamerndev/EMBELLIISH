import React, { useState, useMemo } from 'react';
import TableHeader from './TableHeader';
import ConsumptionRoomGroup from './ConsumptionRoomGroup';
import MeasurementRow from './ConsumptionRow';
import MeasurementTotals from './ConsumptionTotal';
import { calculateRowConsumption } from '../../utils/consumptionCalc';

/**
 * ConsumptionGrid : Primary high-density SaaS Measurement Workspace grid.
 * Groups rows by room, provides sticky headers & identity columns,
 * supports inline editing, room collapse, search/filtering, and live totals.
 */
const ConsumptionGrid = ({ rows = [], onUpdateRows, searchQuery = '', roomFilter = 'ALL', typeFilter = 'ALL', columnVisibility = {}, onOpenDetails, lastAddedRoom = '', className = '', }) => {


    const [collapsedRooms, setCollapsedRooms] = useState({});

    React.useEffect(() => {
        if (lastAddedRoom) {
            setCollapsedRooms((prev) => ({
                ...prev,
                [lastAddedRoom]: false,
            }));
        }
    }, [lastAddedRoom, rows.length]);

    const toggleRoomExpand = (roomName) => {
        setCollapsedRooms((prev) => ({
            ...prev,
            [roomName]: !prev[roomName],
        }));
    };

    // Filter rows based on search, room, and type filters
    const filteredRowsWithIndex = useMemo(() => {
        return rows.map((row, originalIndex) => ({ row, originalIndex })).filter(({ row }) => {
            const roomMatch = roomFilter === 'ALL' || (row.room || 'Living Room') === roomFilter;
            const typeMatch = typeFilter === 'ALL' || (row.particular || row.windowType || 'MAIN_CURTAIN') === typeFilter;

            if (!roomMatch || !typeMatch) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const room = String(row.room || '').toLowerCase();
                const winId = String(row.windowId || row.label || '').toLowerCase();
                const particular = String(row.particular || row.windowType || '').toLowerCase();
                if (!room.includes(q) && !winId.includes(q) && !particular.includes(q)) {
                    return false;
                }
            }

            return true;
        });
    }, [rows, searchQuery, roomFilter, typeFilter]);

    // Group filtered rows by room
    const roomGroups = useMemo(() => {
        const groups = {};
        filteredRowsWithIndex.forEach(({ row, originalIndex }, seqIdx) => {
            const roomName = row.room || 'Living Room';
            if (!groups[roomName]) {
                groups[roomName] = [];
            }
            groups[roomName].push({ row, originalIndex, displaySr: seqIdx + 1 });
        });
        return groups;
    }, [filteredRowsWithIndex]);

    // Compute dynamic visible column count to span room groups cleanly across entire table
    const visibleColsCount = useMemo(() => {
        let count = 3; // SR, Area, Particular
        const isRoman = typeFilter === 'ROMAN_BLIND' || typeFilter === 'ROLLER_BLIND' || typeFilter === 'WOODEN_BLIND';
        const isWallpaper = typeFilter === 'WALLPAPER';
        const isCurtain = !isRoman && !isWallpaper && (typeFilter === 'MAIN_CURTAIN' || typeFilter === 'SHEER_CURTAIN' || typeFilter === 'MOTORISED_CURTAIN' || typeFilter === 'ALL');
        const isColVisible = (key) => columnVisibility[key] !== false;

        if (!isWallpaper) {
            if (isColVisible('windowSize')) count += 4;
            if (isColVisible('pelmetSize')) count += 4;
            if (isColVisible('wire')) count += 2;
            if (isColVisible('measurements')) count += 4;
        }

        if (isCurtain) {
            if (isColVisible('trackDrop')) count += 2;
            if (isColVisible('fabric')) count += 3;
            if (isColVisible('allowances')) count += 7;
            if (isColVisible('calculations')) count += 7;
            if (isColVisible('fabricOrder')) count += 5;
            if (isColVisible('flags')) count += 3;
        }

        if (isRoman) {
            if (isColVisible('rb_finishedSize')) count += 2;
            if (isColVisible('rb_fabric')) count += 3;
            if (isColVisible('rb_allowances')) count += 5;
            if (isColVisible('rb_calculations')) count += 3;
            if (isColVisible('rb_fabricOrder')) count += 6;
            if (isColVisible('rb_flags')) count += 3;
        }

        if (isWallpaper) {
            if (isColVisible('wp_wallInfo')) count += 4;
            if (isColVisible('wp_rollSpecs')) count += 4;
            if (isColVisible('wp_allowances')) count += 3;
            if (isColVisible('wp_calculations')) count += 8;
            if (isColVisible('wp_flags')) count += 5;
        }

        count += 1; // Actions
        return count;
    }, [columnVisibility, typeFilter]);

    // Compute Grand Totals across all filtered rows live
    const grandTotals = useMemo(() => {
        let totalWindows = filteredRowsWithIndex.length;
        let totalQty = 0;
        let totalWidths = 0;
        let rawMetres = 0;
        let netMetres = 0;
        let orderMetres = 0;
        let baseRolls = 0;
        let finalOrderRolls = 0;
        let totalDropsRequired = 0;
        let wastageAdjustedRolls = 0;
        let orderRolls = 0;
        let approxCoverageArea = 0;

        filteredRowsWithIndex.forEach(({ row }) => {
            const calc = calculateRowConsumption(row);
            totalQty += Number(row.qty ?? 1) || 1;
            totalWidths += (calc.numWidths ?? calc.dropsPerWall ?? calc.stripsPerWall ?? calc.roundedParts) || 0;
            rawMetres += calc.rawMetres || 0;
            netMetres += calc.netMetres || calc.requiredMetres || 0;
            orderMetres += calc.orderMetres || calc.finalOrderMetres || calc.fabricMeters || 0;
            baseRolls += calc.baseRollsRequired || calc.baseRolls || 0;
            finalOrderRolls += calc.finalRollsToOrder || calc.finalOrderRolls || 0;
            totalDropsRequired += calc.totalDropsRequired || 0;
            wastageAdjustedRolls += calc.wastageAdjustedRolls || 0;
            orderRolls += Number(row.orderRolls ?? calc.orderRolls ?? calc.finalRollsToOrder ?? 0) || 0;
            approxCoverageArea += calc.approxCoverageArea || 0;
        });

        return {
            totalWindows,
            totalQty,
            totalWidths: Math.round(totalWidths),
            rawMetres: Math.round(rawMetres * 100) / 100,
            netMetres: Math.round(netMetres * 100) / 100,
            orderMetres: Math.round(orderMetres * 100) / 100,
            baseRolls,
            finalOrderRolls,
            totalDropsRequired,
            wastageAdjustedRolls,
            orderRolls,
            approxCoverageArea: Math.round(approxCoverageArea * 100) / 100,
            // backward-compat aliases kept so nothing else breaks
            totalParts: Math.round(totalWidths),
            fabricMeters: Math.round(orderMetres * 100) / 100,
        };
    }, [filteredRowsWithIndex]);

    // Handlers for Row Operations
    const handleUpdateRow = (originalIndex, updatedFields) => {
        const updatedRows = [...rows];
        updatedRows[originalIndex] = {
            ...updatedRows[originalIndex],
            ...updatedFields,
        };
        onUpdateRows(updatedRows);
    };

    const handleDuplicateRow = (originalIndex) => {
        const targetRow = rows[originalIndex];
        const newWinId = `W-0${rows.length + 1}`;
        const duplicated = {
            ...targetRow,
            id: `win-${Date.now()}-${rows.length}`,
            _id: undefined,
            windowId: newWinId,
            label: `${targetRow.label || targetRow.windowId || 'Window'} copy`,
        };
        const updatedRows = [...rows];
        updatedRows.splice(originalIndex + 1, 0, duplicated);
        onUpdateRows(updatedRows);
    };

    const handleDeleteRow = (originalIndex) => {
        const target = rows[originalIndex];
        if (window.confirm(`Delete measurement row for ${target.windowId || target.room || 'Window'}?`)) {
            const updatedRows = rows.filter((_, idx) => idx !== originalIndex);
            onUpdateRows(updatedRows);
        }
    };

    return (
        <div className={`w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-b-xl rounded-t-none overflow-hidden shadow-sm flex flex-col ${className}`}>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] select-none relative scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs font-sans min-w-[1200px]">

                    <TableHeader columnVisibility={columnVisibility} typeFilter={typeFilter} />


                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950">
                        {Object.keys(roomGroups).length === 0 ? (
                            <tr>
                                <td colSpan={visibleColsCount} className="py-12 text-center text-slate-400 font-sans italic">
                                    No window measurement records match the selected filters.
                                </td>
                            </tr>
                        ) : (
                            Object.entries(roomGroups).map(([roomName, items], roomSrIdx) => {
                                const isExpanded = !collapsedRooms[roomName];

                                // Room level sub-totals
                                const roomSubtotals = items.reduce(
                                    (acc, { row }) => {
                                        const c = calculateRowConsumption(row);
                                        acc.orderMetres += c.orderMetres || c.fabricMeters || 0;
                                        acc.netMetres += c.netMetres || 0;
                                        acc.totalWidths += (c.numWidths ?? c.roundedParts) || 0;
                                        return acc;
                                    },
                                    { orderMetres: 0, netMetres: 0, totalWidths: 0 }
                                );

                                return (
                                    <React.Fragment key={roomName}>
                                        <ConsumptionRoomGroup
                                            roomName={roomName}
                                            srIndex={roomSrIdx + 1}
                                            itemCount={items.length}
                                            isExpanded={isExpanded}
                                            onToggleExpand={() => toggleRoomExpand(roomName)}
                                            colSpan={visibleColsCount - 3}
                                            summary={roomSubtotals}
                                        />

                                        {isExpanded &&
                                            items.map(({ row, originalIndex, displaySr }) => (
                                                <MeasurementRow
                                                    key={row.id || originalIndex}
                                                    row={row}
                                                    rowIndex={originalIndex}
                                                    itemSr={displaySr}
                                                    onUpdateRow={handleUpdateRow}
                                                    onDuplicateRow={handleDuplicateRow}
                                                    onDeleteRow={handleDeleteRow}
                                                    onOpenDetails={(r, idx) => onOpenDetails(r, idx)}
                                                    columnVisibility={columnVisibility}
                                                    typeFilter={typeFilter}
                                                />
                                            ))}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>

                    <MeasurementTotals totals={grandTotals} columnVisibility={columnVisibility} typeFilter={typeFilter} />
                </table>
            </div>
        </div>
    );
};

export default React.memo(ConsumptionGrid);