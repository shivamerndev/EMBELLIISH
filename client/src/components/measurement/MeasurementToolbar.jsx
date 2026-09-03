import React, { useState } from 'react';
import { Search, Plus, SlidersHorizontal, Check, RefreshCw, Save, AlertCircle } from 'lucide-react';
import { Button, Input, Select } from '../ui';

/**
 * Compact, modern SaaS Toolbar for Measurement Workspace.
 */
const MeasurementToolbar = ({
    searchQuery = '',
    onSearchChange,
    roomFilter = 'ALL',
    onRoomFilterChange,
    typeFilter = 'ALL',
    onTypeFilterChange,
    roomOptions = [],
    columnVisibility = {},
    onToggleColumnGroup,
    saveState = 'saved', // 'saved', 'saving', 'unsaved', 'error'
    onSaveChanges,
    onAddMeasurement,
    isSaving = false,
}) => {
    const [showColsPopover, setShowColsPopover] = useState(false);

    return (
        <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mb-4 shadow-sm flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* --- LEFT: Search & Filters --- */}
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search room, window or item..."
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 font-sans"
                        />
                    </div>

                    {/* Room Filter */}
                    <select
                        value={roomFilter}
                        onChange={(e) => onRoomFilterChange(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer font-sans"
                    >
                        <option value="ALL">All Rooms</option>
                        {roomOptions.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>

                    {/* Particular/Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => onTypeFilterChange(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer font-sans"
                    >
                        <option value="ALL">All Types</option>
                        <option value="MAIN_CURTAIN">Main Curtain</option>
                        <option value="SHEER_CURTAIN">Sheer Curtain</option>
                        <option value="MOTORISED_CURTAIN">Motorised Curtain</option>
                        <option value="ROMAN_BLIND">Roman Blind</option>
                        <option value="WOODEN_BLIND">Wooden Blind</option>
                    </select>

                    {/* Columns Popover Toggle */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowColsPopover(!showColsPopover)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Columns</span>
                        </button>

                        {showColsPopover && (
                            <div className="absolute left-0 top-full mt-1.5 z-50 w-56 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl space-y-2">
                                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Toggle Columns</h4>
                                <div className="space-y-1.5 text-xs">
                                    <label className="flex items-center gap-2 text-slate-400 cursor-not-allowed">
                                        <input type="checkbox" checked disabled className="rounded text-slate-400" />
                                        <span>Identity (SR / Room / Particular)</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={columnVisibility.windowSize !== false}
                                            onChange={() => onToggleColumnGroup('windowSize')}
                                            className="rounded text-brand-600 focus:ring-brand-500"
                                        />
                                        <span>Window Size (O2O & F2F)</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={columnVisibility.pelmetSize !== false}
                                            onChange={() => onToggleColumnGroup('pelmetSize')}
                                            className="rounded text-brand-600 focus:ring-brand-500"
                                        />
                                        <span>Pelmet Size</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={columnVisibility.wire !== false}
                                            onChange={() => onToggleColumnGroup('wire')}
                                            className="rounded text-brand-600 focus:ring-brand-500"
                                        />
                                        <span>Wire Drop</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={columnVisibility.returnSize !== false}
                                            onChange={() => onToggleColumnGroup('returnSize')}
                                            className="rounded text-brand-600 focus:ring-brand-500"
                                        />
                                        <span>Return Size (in)</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={columnVisibility.fabricRequirement !== false}
                                            onChange={() => onToggleColumnGroup('fabricRequirement')}
                                            className="rounded text-brand-600 focus:ring-brand-500"
                                        />
                                        <span>Fabric & Calculated Values</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RIGHT: Save Indicator & Actions --- */}
                <div className="flex items-center gap-3 shrink-0">
                    {/* Save State Indicator */}
                    <div className="flex items-center gap-1.5 text-xs">
                        {saveState === 'saving' ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                            </span>
                        ) : saveState === 'unsaved' ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Unsaved changes
                            </span>
                        ) : saveState === 'error' ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Save failed
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                <Check className="w-3.5 h-3.5 text-emerald-500" /> Saved
                            </span>
                        )}
                    </div>

                    {/* Manual Save Button */}
                    <button
                        type="button"
                        onClick={onSaveChanges}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition shadow-sm disabled:opacity-50"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                    </button>

                    {/* Dominant Primary Action Button */}
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        icon={Plus}
                        onClick={onAddMeasurement}
                        className="font-semibold shadow-md"
                    >
                        + Add Window Measurement
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(MeasurementToolbar);
