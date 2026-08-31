import React from 'react';
import { LayoutList, LayoutGrid } from 'lucide-react';
import cn from '../../utils/cn';

/**
 * Global ERP View Switcher component for switching between Table/List and Card/Grid views.
 *
 * @param {object} props
 * @param {'table' | 'cards'} props.view - Current active view mode
 * @param {(view: 'table' | 'cards') => void} props.onViewChange - Callback triggered when changing views
 * @param {string} [props.className] - Additional CSS class names
 */
export const ViewSwitcher = ({ view = 'table', onViewChange, className = '' }) => {
  return (
    <div
      className={cn(
        'inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0 shadow-2xs',
        className
      )}
      role="group"
      aria-label="View Switcher"
    >
      <button
        type="button"
        onClick={() => onViewChange && onViewChange('table')}
        title="Table View"
        aria-label="Table View"
        aria-pressed={view === 'table'}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all select-none',
          view === 'table'
            ? 'bg-amber-600 text-white shadow-xs font-semibold dark:bg-amber-600'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
        )}
      >
        <LayoutList className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Table</span>
      </button>

      <button
        type="button"
        onClick={() => onViewChange && onViewChange('cards')}
        title="Card View"
        aria-label="Card View"
        aria-pressed={view === 'cards'}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all select-none',
          view === 'cards'
            ? 'bg-amber-600 text-white shadow-xs font-semibold dark:bg-amber-600'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
        )}
      >
        <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Cards</span>
      </button>
    </div>
  );
};

export default ViewSwitcher;
