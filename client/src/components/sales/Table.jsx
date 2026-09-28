import React, { useMemo } from 'react';
import { Eye, Pencil } from 'lucide-react';
import { Button } from '../ui';

const Table = ({
    items = [],
    paginatedItems,
    visibleSections = [],
    columns,
    renderSpreadsheetCell,
    renderCell,
    onRowClick,
    onView,
    onEdit,
    onSiteVisit,
    renderActions,
    idColumnKey = 'code',
    idColumnLabel = 'Code',
    actionColumnLabel = 'Manage',
    showIdColumn = true,
    showActions = true,
    showEditAction = true,
    viewButtonTitle = 'View Details',
    editButtonTitle = 'Edit Details',
    theme = 'amber', // 'amber' | 'slate'
    containerClassName,
    tableClassName = 'w-full text-left border-collapse text-xs',
    emptyMessage = 'No data available',
    headerBgClassName,
    pinnedHeaderClassName,
    cellRendererArgs = [],
}) => {
    const data = paginatedItems || items || [];

    const activeColumns = useMemo(() => {
        if (columns && columns.length > 0) {
            return columns.filter((c) => c.key !== 'sno' && c.key !== idColumnKey);
        }
        if (!visibleSections || visibleSections.length === 0) return [];
        return visibleSections.flatMap((sec) =>
            (sec.tableCols || sec.cols || []).filter((c) => c.key !== 'sno' && c.key !== idColumnKey)
        );
    }, [columns, visibleSections, idColumnKey]);

    const cellRenderer = renderSpreadsheetCell || renderCell;
    const totalCols = activeColumns.length + (showIdColumn ? 1 : 0) + (showActions ? 1 : 0);

    const isSlate = theme === 'slate';

    const defaultContainerClass = isSlate
        ? 'overflow-x-auto max-h-[60vh] overflow-y-auto select-none relative'
        : 'overflow-x-auto max-h-[55vh] overflow-y-auto select-none relative';

    const finalHeaderRowClass = headerBgClassName || (isSlate
        ? 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800'
        : 'bg-[#836444] text-white font-bold border-b border-amber-300 dark:border-amber-500/30');

    const finalPinnedThClass = pinnedHeaderClassName || (isSlate
        ? 'bg-slate-200/80 dark:bg-slate-950 border-b border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
        : 'bg-[#6b5240] dark:bg-slate-950 border-b border-r border-amber-300/40 dark:border-slate-800 text-amber-100 dark:text-slate-400');

    const colThClass = isSlate
        ? 'border-b border-r border-slate-200 dark:border-slate-800/80 p-3 text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[140px]'
        : 'border-b border-r border-amber-300/40 dark:border-slate-800/80 p-2 text-[10px] uppercase font-semibold text-amber-50 dark:text-slate-300 whitespace-nowrap min-w-[130px] bg-[#836444] dark:bg-slate-900/90';

    const manageThClass = isSlate
        ? 'bg-slate-200/80 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-2 text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 text-center sticky right-0 z-30 min-w-[80px]'
        : 'bg-[#6b5240] dark:bg-slate-950 border-b border-amber-300/40 dark:border-slate-800 p-2 text-[10px] uppercase font-semibold text-amber-100 dark:text-slate-400 text-center sticky right-0 z-30 border-l border-amber-300/40 dark:border-slate-800';

    return (
        <div className={containerClassName || defaultContainerClass}>
            <table className={tableClassName}>
                <thead>
                    <tr className={`sticky top-0 z-20 text-center shadow-sm ${finalHeaderRowClass}`}>
                        {showIdColumn && (
                            <th className={`${finalPinnedThClass} p-4 text-[10px] uppercase text-center font-semibold sticky left-0 z-30`}>
                                {idColumnLabel}
                            </th>
                        )}
                        {activeColumns.map((col) => (
                            <th key={col.key} className={colThClass}>
                                {col.label}
                            </th>
                        ))}
                        {showActions && (
                            <th className={manageThClass}>
                                {actionColumnLabel}
                            </th>
                        )}
                    </tr>
                </thead>

                <tbody className="divide-y text-center divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-200">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={totalCols} className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((lead, idx) => (
                            <tr
                                onClick={() => (onRowClick ? onRowClick(lead) : onView && onView(lead))}
                                key={lead.id || lead._id || idx}
                                className={isSlate
                                    ? 'hover:bg-brand-500/5 dark:hover:bg-slate-900/80 transition-colors group cursor-pointer'
                                    : 'hover:bg-amber-500/5 dark:hover:bg-slate-900/80 transition group cursor-pointer'}
                            >
                                {showIdColumn && (
                                    <td className="border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 sticky left-0 z-10 text-brand-600 dark:text-brand-400 font-semibold p-2.5">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onView && onView(lead);
                                            }}
                                            className="hover:underline truncate px-2"
                                        >
                                            {lead[idColumnKey] || lead.code || lead.id || '-'}
                                        </button>
                                    </td>
                                )}

                                {activeColumns.map((col) => (
                                    <td key={col.key} className="p-3 sm:p-4 border-r border-slate-200 dark:border-slate-800/60 whitespace-nowrap">
                                        {cellRenderer
                                            ? cellRenderer(lead, col.key, idx + 1, onView, onEdit, ...cellRendererArgs)
                                            : (lead[col.key] ?? '-')}
                                    </td>
                                ))}

                                {showActions && (
                                    <td className="p-2 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 text-right sticky right-0 z-10 border-l border-slate-200 dark:border-slate-800/80">
                                        {renderActions ? (
                                            renderActions(lead, idx, { onView, onEdit, onSiteVisit })
                                        ) : (
                                            <div className="flex items-center justify-end gap-1">
                                                {onView && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        icon={Eye}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onView(lead);
                                                        }}
                                                        title={viewButtonTitle}
                                                    />
                                                )}
                                                {onEdit && showEditAction && !onSiteVisit && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        icon={Pencil}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEdit(lead);
                                                        }}
                                                        title={editButtonTitle}
                                                    />
                                                )}
                                                {onSiteVisit && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-700 whitespace-nowrap hover:bg-emerald-600 text-white px-3 py-1 text-xs"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSiteVisit(lead);
                                                        }}
                                                    >
                                                        Site Visit
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Table;