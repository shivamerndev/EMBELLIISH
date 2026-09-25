import React from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '../ui';


const MeasurementToolbar = ({ searchQuery = '', onSearchChange, roomFilter = 'ALL', onRoomFilterChange, roomOptions = [], onAddMeasurement, }) => {

    return (
        <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mb-4 shadow-sm flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* --- LEFT: Search & Filters --- */}
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search room, window or item..." className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 font-sans" />
                    </div>

                    {/* Room Filter */}
                    <select value={roomFilter} onChange={(e) => onRoomFilterChange(e.target.value)} className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer font-sans">
                        <option value="ALL">All Rooms</option>
                        {roomOptions.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>

                </div>

                <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={onAddMeasurement}
                    className="font-semibold shadow-md"
                >
                    Add Window Measurement
                </Button>
            </div>
        </div>
    );
};

export default React.memo(MeasurementToolbar);
