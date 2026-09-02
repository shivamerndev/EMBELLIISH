import React, { useState, useMemo } from 'react';
import MeasurementGridHeader from './MeasurementGridHeader';
import MeasurementRoomGroup from './MeasurementRoomGroup';
import MeasurementRow from './MeasurementRow';
import MeasurementTotals from './MeasurementTotals';
import { calculateRowConsumption } from '../../utils/consumptionCalc';

/**
 * ExcelMeasurementGrid — Primary high-density SaaS Measurement Workspace grid.
 * Groups rows by room, provides sticky headers & identity columns,
 * supports inline editing, room collapse, search/filtering, and live totals.
 */
const ExcelMeasurementGrid = ({
    rows = [],
    onUpdateRows,
    searchQuery = '',
    roomFilter = 'ALL',
    typeFilter = 'ALL',
    columnVisibility = {},
    onOpenDetails,
    lastAddedRoom = '',
}) => {
    // State for expanded room groups (default: all expanded)
    const [collapsedRooms, setCollapsedRooms] = useState({});

    // Auto-expand room group when a new measurement is added to it
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

    // Compute Grand Totals across all filtered rows live
    const grandTotals = useMemo(() => {
        let totalParts = 0;
        let rnft = 0;
        let fabricMeters = 0;
        let blackoutMeters = 0;
        let romanSqft = 0;

        filteredRowsWithIndex.forEach(({ row }) => {
            const calc = calculateRowConsumption(row);
            totalParts += calc.roundedParts || 0;
            rnft += calc.rnft || 0;
            fabricMeters += calc.fabricMeters || 0;
            blackoutMeters += calc.blackoutMeters || 0;
            romanSqft += calc.romanSqft || 0;
        });

        return {
            totalWindows: filteredRowsWithIndex.length,
            totalParts,
            rnft,
            fabricMeters,
            blackoutMeters,
            romanSqft,
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
        <div className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
            {/* The ONLY container with horizontal & vertical scrolling */}
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] select-none relative scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs font-sans min-w-[1200px]">
                    <MeasurementGridHeader columnVisibility={columnVisibility} />

                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950">
                        {Object.keys(roomGroups).length === 0 ? (
                            <tr>
                                <td colSpan={25} className="py-12 text-center text-slate-400 font-sans italic">
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
                                        acc.fabricMeters += c.fabricMeters || 0;
                                        acc.blackoutMeters += c.blackoutMeters || 0;
                                        acc.rnft += c.rnft || 0;
                                        acc.romanSqft += c.romanSqft || 0;
                                        return acc;
                                    },
                                    { fabricMeters: 0, blackoutMeters: 0, rnft: 0, romanSqft: 0 }
                                );

                                return (
                                    <React.Fragment key={roomName}>
                                        <MeasurementRoomGroup
                                            roomName={roomName}
                                            srIndex={roomSrIdx + 1}
                                            itemCount={items.length}
                                            isExpanded={isExpanded}
                                            onToggleExpand={() => toggleRoomExpand(roomName)}
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
                                                />
                                            ))}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>

                    <MeasurementTotals totals={grandTotals} columnVisibility={columnVisibility} />
                </table>
            </div>
        </div>
    );
};

export default React.memo(ExcelMeasurementGrid);
