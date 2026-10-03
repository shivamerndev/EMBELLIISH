import { useMemo } from 'react';
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
    idColumnRender,
    actionColumnLabel,
    showIdColumn = true,
    showActions = true,
    showEditAction = true,
    viewButtonTitle = 'View Details',
    editButtonTitle = 'Edit',
    align, // 'left' | 'center'
    containerClassName,
    tableClassName = 'w-full text-left border-collapse text-xs',
    emptyMessage = 'No data available',
    headerBgClassName,
    pinnedHeaderClassName,
    cellRendererArgs = [],
    noHorizontalScroll = false,
}) => {
    const data = paginatedItems || items || [];

    const activeColumns = useMemo(() => {
        if (columns && columns.length > 0) {
            return columns.filter((c) => c.key !== 'sno' && (showIdColumn ? c.key !== idColumnKey : true));
        }
        if (!visibleSections || visibleSections.length === 0) return [];
        return visibleSections.flatMap((sec) =>
            (sec.tableCols || sec.cols || []).filter((c) => c.key !== 'sno' && (showIdColumn ? c.key !== idColumnKey : true))
        );
    }, [columns, visibleSections, idColumnKey, showIdColumn]);

    const cellRenderer = renderSpreadsheetCell || renderCell;
    const totalCols = activeColumns.length + (showIdColumn ? 1 : 0) + (showActions ? 1 : 0);

    const defaultContainerClass = noHorizontalScroll
        ? 'overflow-y-auto max-h-[60vh] overflow-x-hidden select-none relative w-full'
        : 'overflow-x-auto max-h-[55vh] overflow-y-auto select-none relative';

    const finalHeaderRowClass = headerBgClassName || 'bg-[#836444] text-white font-bold border-b border-amber-300 dark:border-amber-500/30';

    const finalPinnedThClass = pinnedHeaderClassName || 'bg-[#6b5240] dark:bg-slate-950 border-b border-r border-amber-300/40 dark:border-slate-800 text-amber-100 dark:text-slate-400';

    const colThClass = noHorizontalScroll
        ? 'border-b border-r border-amber-300/40 dark:border-slate-800/80 p-2.5 text-[10px] uppercase font-semibold text-amber-50 dark:text-slate-300 bg-[#836444] dark:bg-slate-900/90'
        : 'border-b border-r border-amber-300/40 dark:border-slate-800/80 p-2 text-[10px] uppercase font-semibold text-amber-50 dark:text-slate-300 whitespace-nowrap min-w-[130px] bg-[#836444] dark:bg-slate-900/90';

    const finalActionLabel = actionColumnLabel || 'Manage';
    const manageThClass = 'bg-[#6b5240] dark:bg-slate-950 border-b border-amber-300/40 dark:border-slate-800 p-2 text-[10px] uppercase font-semibold text-amber-100 dark:text-slate-400 text-center sticky right-0 z-30 border-l border-amber-300/40 dark:border-slate-800';

    const defaultAlign = align || ((columns && columns.length > 0) ? 'left' : 'center');
    const alignClass = defaultAlign === 'left' ? 'text-left' : 'text-center';

    const handleRowClick = (lead) => {
        if (onRowClick) onRowClick(lead);
        else if (onView) onView(lead);
        else if (onEdit) onEdit(lead);
    };

    const handleIdClick = (e, lead) => {
        e.stopPropagation();
        if (onView) onView(lead);
        else if (onEdit) onEdit(lead);
        else if (onRowClick) onRowClick(lead);
    };

    return (
        <div className={containerClassName || defaultContainerClass}>
            <table className={tableClassName}>
                <thead>
                    <tr className={`sticky top-0 z-20 shadow-sm ${finalHeaderRowClass} ${alignClass}`}>
                        {showIdColumn && (
                            <th className={`${finalPinnedThClass} p-3 sm:p-4 text-[10px] uppercase font-bold sticky left-0 z-30 ${alignClass}`}>
                                {idColumnLabel}
                            </th>
                        )}
                        {activeColumns.map((col) => {
                            const colAlign = col.align ? (col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left') : alignClass;
                            return (
                                <th key={col.key} className={`${colThClass} ${colAlign} ${col.thClassName || ''}`}>
                                    {col.label}
                                </th>
                            );
                        })}
                        {showActions && (
                            <th className={manageThClass}>
                                {finalActionLabel}
                            </th>
                        )}
                    </tr>
                </thead>

                <tbody className={`divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 ${alignClass}`}>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={totalCols} className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((lead, idx) => (
                            <tr onClick={() => handleRowClick(lead)} key={lead.id || lead._id || idx} className="hover:bg-amber-500/5 dark:hover:bg-slate-900/80 transition group cursor-pointer">

                                {showIdColumn && (<td className="border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 sticky left-0 z-10 text-brand-600 dark:text-brand-400 font-semibold p-2.5 sm:p-3">
                                    <button type="button" onClick={(e) => handleIdClick(e, lead)} className="hover:underline truncate px-1 text-left font-medium">
                                        {idColumnRender ? idColumnRender(lead, idx) : (lead[idColumnKey] || lead.code || lead.ticketId || lead.snagId || lead.id || lead._id || '-')}
                                    </button>
                                </td>)}

                                {activeColumns.map((col) => {
                                    const colAlign = col.align ? (col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left') : '';
                                    return (

                                        <td key={col.key} className={`p-3 sm:p-4 border-r border-slate-200 dark:border-slate-800/60 ${noHorizontalScroll ? 'break-words' : 'whitespace-nowrap'} ${colAlign} ${col.className || ''}`}>
                                            {col.render ? col.render(lead[col.key], lead, idx) : cellRenderer ? cellRenderer(lead, col.key, idx + 1, onView, onEdit, ...cellRendererArgs) : (lead[col.key] ?? '—')}
                                        </td>
                                    );
                                })}

                                {showActions && (
                                    <td className="p-2 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 text-center sticky right-0 z-10 border-l border-slate-200 dark:border-slate-800/80">
                                        {renderActions ? (
                                            renderActions(lead, idx, { onView, onEdit, onSiteVisit })
                                        ) : (
                                            <div className="flex items-center justify-center gap-1">

                                                {onView && (<Button size="sm" variant="ghost" icon={Eye} title={viewButtonTitle}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onView(lead);
                                                    }} />)}

                                                {onEdit && showEditAction && !onSiteVisit &&
                                                    (<Button size="sm" variant="ghost" icon={Pencil} title={editButtonTitle}
                                                        onClick={(e) => { e.stopPropagation(); onEdit(lead); }} />
                                                    )}

                                                {onSiteVisit && (<Button size="sm" className="bg-emerald-700 whitespace-nowrap hover:bg-emerald-600 text-white px-3 py-1 text-xs"
                                                    onClick={(e) => { e.stopPropagation(); onSiteVisit(lead); }}>
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