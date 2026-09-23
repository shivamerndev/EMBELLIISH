import React, { useMemo, useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';

/**
 * Custom Favicon Icons tailored for Window & Soft Furnishing Types
 */
const CurtainFavicon = ({ className = "w-3.5 h-3.5" }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M2 4h20" />
        <circle cx="2" cy="4" r="1.5" fill="currentColor" />
        <circle cx="22" cy="4" r="1.5" fill="currentColor" />
        <path d="M4 4c1 4 0 9-1 16h5c-1-7-1-12 1-16" />
        <path d="M15 4c2 4 2 9 1 16h5c-1-7-2-12-1-16" />
        <path d="M9 4c1 3 2 3 3 0" />
    </svg>
);

const BlindFavicon = ({ className = "w-3.5 h-3.5" }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <rect x="3" y="3" width="18" height="3" rx="1" fill="currentColor" fillOpacity="0.2" />
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="4" y1="13" x2="20" y2="13" />
        <line x1="4" y1="17" x2="20" y2="17" />
        <line x1="19" y1="6" x2="19" y2="21" strokeDasharray="1 2" />
        <circle cx="19" cy="21" r="1" fill="currentColor" />
    </svg>
);

const WallpaperFavicon = ({ className = "w-3.5 h-3.5" }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M19 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
        <path d="M5 8h16" />
        <path d="M9 13l2 2 4-4" />
        <circle cx="9" cy="17" r="1" fill="currentColor" />
        <circle cx="15" cy="17" r="1" fill="currentColor" />
    </svg>
);

/**
 * Authentic Chrome Browser Tab component for Workspace Type Filters.
 */
const TypesTab = ({
    setWorkspaceTypeFilter,
    workspaceTypeFilter = 'MAIN_CURTAIN',
    rows = [],
    onAddMeasurement = null,
}) => {
    const [hoveredTab, setHoveredTab] = useState(null);

    // Compute measurement counts per type category
    const counts = useMemo(() => {
        const res = {
            ALL: rows.length,
            MAIN_CURTAIN: 0,
            ROMAN_BLIND: 0,
            WALLPAPER: 0,
        };
        (rows || []).forEach((row) => {
            const type = row.particular || row.windowType || 'MAIN_CURTAIN';
            if (type === 'ROMAN_BLIND' || type === 'ROLLER_BLIND' || type === 'WOODEN_BLIND') {
                res.ROMAN_BLIND = (res.ROMAN_BLIND || 0) + 1;
            } else if (type === 'WALLPAPER') {
                res.WALLPAPER = (res.WALLPAPER || 0) + 1;
            } else {
                res.MAIN_CURTAIN = (res.MAIN_CURTAIN || 0) + 1;
            }
        });
        return res;
    }, [rows]);

    const tabs = [
        {
            id: 'MAIN_CURTAIN',
            label: 'Curtains',
            icon: CurtainFavicon,
            iconColor: 'text-indigo-500 dark:text-indigo-400',
            count: counts.MAIN_CURTAIN,
        },
        {
            id: 'ROMAN_BLIND',
            label: 'Roman blind',
            icon: BlindFavicon,
            iconColor: 'text-amber-500 dark:text-amber-400',
            count: counts.ROMAN_BLIND,
        },
        {
            id: 'WALLPAPER',
            label: 'Wallpaper',
            icon: WallpaperFavicon,
            iconColor: 'text-emerald-500 dark:text-emerald-400',
            count: counts.WALLPAPER,
        },
    ];

    const handleTabClick = (tabId) => {
        setWorkspaceTypeFilter(tabId);
    };

    return (
        <div className="w-full bg-[#dee1e6] dark:bg-[#1f1f23] pt-1.5 px-2 border border-slate-300 dark:border-slate-800 rounded-t-xl select-none relative shadow-xs">
            {/* Tab Strip Bar */}
            <div className="flex items-end justify-between border-b border-slate-300/80 dark:border-slate-800 -mx-2 px-2">
                {/* Tabs List */}
                <div className="flex items-end gap-0.5 overflow-x-auto scrollbar-none pb-0 flex-1">
                    {tabs.map((tab, idx) => {
                        const isActive = workspaceTypeFilter === tab.id;
                        const isHovered = hoveredTab === tab.id;
                        const nextTab = tabs[idx + 1];
                        const isNextActive = nextTab && workspaceTypeFilter === nextTab.id;
                        const isNextHovered = nextTab && hoveredTab === nextTab.id;
                        const isLast = idx === tabs.length - 1;

                        // Chrome divider is hidden if current or next tab is active or hovered
                        const showDivider = !isActive && !isNextActive && !isHovered && !isNextHovered && !isLast;
                        const Icon = tab.icon;

                        return (
                            <div
                                key={tab.id}
                                className="relative flex items-end"
                                onMouseEnter={() => setHoveredTab(tab.id)}
                                onMouseLeave={() => setHoveredTab(null)}
                            >
                                <div
                                    role="tab"
                                    tabIndex={0}
                                    aria-selected={isActive}
                                    onClick={() => handleTabClick(tab.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleTabClick(tab.id);
                                        }
                                    }}
                                    title={`${tab.label} (${tab.count} items)`}
                                    className={`group relative flex items-center gap-2 h-9 px-3.5 text-xs font-sans transition-all z-10 shrink-0 cursor-pointer select-none ${isActive
                                            ? 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-semibold rounded-t-[10px] -mb-[1px] shadow-[0_-2px_6px_rgba(0,0,0,0.04)] border-t border-l border-r border-slate-300/80 dark:border-slate-800'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-800/60 rounded-t-[8px]'
                                        }`}
                                >
                                    {/* Favicon */}
                                    <span className={`shrink-0 ${tab.iconColor}`}>
                                        <Icon className="w-3.5 h-3.5" />
                                    </span>

                                    {/* Tab Title */}
                                    <span className="truncate max-w-[120px] tracking-tight">{tab.label}</span>

                                    {/* Count Badge */}
                                    <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-full   transition-colors ${isActive
                                                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold'
                                                : 'bg-slate-300/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-300 dark:group-hover:bg-slate-700'
                                            }`}
                                    >
                                        {tab.count}
                                    </span>

                                    {/* Chrome Iconic Bottom Left Flare Curve */}
                                    {isActive && (
                                        <div className="absolute -left-2 bottom-0 w-2 h-2 pointer-events-none z-10 overflow-hidden">
                                            <svg viewBox="0 0 8 8" className="w-full h-full fill-white dark:fill-slate-950">
                                                <path d="M8 0 C8 4.418 4.418 8 0 8 L8 8 Z" />
                                            </svg>
                                            <svg viewBox="0 0 8 8" className="w-full h-full absolute inset-0 fill-none stroke-slate-300/80 dark:stroke-slate-800" strokeWidth="1">
                                                <path d="M8 0 C8 4.418 4.418 8 0 8" />
                                            </svg>
                                        </div>
                                    )}

                                    {/* Chrome Iconic Bottom Right Flare Curve */}
                                    {isActive && (
                                        <div className="absolute -right-2 bottom-0 w-2 h-2 pointer-events-none z-10 overflow-hidden">
                                            <svg viewBox="0 0 8 8" className="w-full h-full fill-white dark:fill-slate-950">
                                                <path d="M0 0 C0 4.418 3.582 8 8 8 L0 8 Z" />
                                            </svg>
                                            <svg viewBox="0 0 8 8" className="w-full h-full absolute inset-0 fill-none stroke-slate-300/80 dark:stroke-slate-800" strokeWidth="1">
                                                <path d="M0 0 C0 4.418 3.582 8 8 8" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {/* Chrome Inactive Tab Divider */}
                                {showDivider && (
                                    <div className="h-4 w-[1px] bg-slate-400/50 dark:bg-slate-700/80 self-center mx-0.5 shrink-0 pointer-events-none" />
                                )}
                            </div>
                        );
                    })}

                    {/* Chrome New Tab (+) Button */}
                    {onAddMeasurement && (
                        <button
                            type="button"
                            onClick={onAddMeasurement}
                            title="Add Window Measurement (New Tab)"
                            className="w-7 h-7 mb-1 ml-1 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-300/70 dark:hover:bg-slate-800/90 transition-colors shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};

export default TypesTab;