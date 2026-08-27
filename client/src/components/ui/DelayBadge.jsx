import React from 'react';
import cn from '../../utils/cn';
import { getDelayStatus } from '../../utils/delay';

const DELAY_BADGE_STYLES = {
  green: {
    container: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  amber: {
    container: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 font-semibold',
    dot: 'bg-amber-500 animate-pulse',
  },
  rose: {
    container: 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 font-bold shadow-2xs',
    dot: 'bg-rose-600 animate-pulse',
  },
};

/**
 * Renders a compact ERP SLA Delay badge with colored indicator and tooltip detail on hover.
 *
 * @param {object} props
 * @param {string | Date} props.dueDate - The due date of the task/activity
 * @param {boolean} props.isCompleted - Whether the action is already completed
 * @param {string} props.className - Extra CSS classes
 * @param {React.ReactNode} props.fallback - What to render if not delayed/completed (default null)
 */
export const DelayBadge = ({ dueDate, isCompleted = false, className = '', fallback = null }) => {
  const status = getDelayStatus(dueDate, isCompleted);

  if (!status) {
    return fallback;
  }

  const style = DELAY_BADGE_STYLES[status.tone] || DELAY_BADGE_STYLES.green;

  return (
    <span
      title={status.tooltip}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] border whitespace-nowrap transition-colors cursor-help select-none',
        style.container,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} aria-hidden="true" />
      <span>{status.label}</span>
    </span>
  );
};

export default DelayBadge;
