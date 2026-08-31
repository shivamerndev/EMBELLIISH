import React from 'react';
import cn from '../../utils/cn';

/**
 * Responsive Card Grid View layout wrapper.
 *
 * @param {object} props
 * @param {Array} props.items - Data items to render
 * @param {(item: any, index: number) => React.ReactNode} props.renderCard - Card render function
 * @param {React.ReactNode} [props.empty] - Optional custom empty state node
 * @param {string} [props.className] - Additional container class names
 */
export const CardGridView = ({ items = [], renderCard, empty = null, className = '' }) => {
  if (!items || items.length === 0) {
    if (empty) return empty;
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
        No records found.
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 w-full',
        className
      )}
    >
      {items.map((item, idx) => (
        <React.Fragment key={item._id || item.id || item.code || idx}>
          {renderCard(item, idx)}
        </React.Fragment>
      ))}
    </div>
  );
};

export default CardGridView;
