import React from 'react';

const TypesTab = ({ activeType = 'MAIN_CURTAIN', onSelectType }) => {
    const types = [
        { key: 'MAIN_CURTAIN', label: 'Main curtain' },
        { key: 'ROMAN_BLIND', label: 'Roman blind' },
        { key: 'WALLPAPER', label: 'Wallpaper' },
    ];

    return (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {types.map(({ key, label }) => {
                const isActive = activeType === key;
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onSelectType && onSelectType(key)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                            isActive
                                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
};

export default TypesTab;