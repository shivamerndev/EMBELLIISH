import React from 'react';

/**
 * High-density skeleton loader mimicking table structure, sticky columns, and grouped rows.
 */
const MeasurementSkeleton = () => {
    return (
        <div className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm animate-pulse">
            {/* Header Skeleton */}
            <div className="h-20 bg-slate-200 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800" />
            
            {/* Room 1 Skeleton */}
            <div className="h-10 bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-4">
                <div className="w-6 h-4 bg-slate-300 dark:bg-slate-800 rounded" />
                <div className="w-36 h-4 bg-slate-300 dark:bg-slate-800 rounded" />
            </div>
            
            {/* Rows Skeleton */}
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-11 border-b border-slate-100 dark:border-slate-900 flex items-center px-4 gap-3">
                    <div className="w-8 h-4 bg-slate-200 dark:bg-slate-900 rounded" />
                    <div className="w-28 h-4 bg-slate-200 dark:bg-slate-900 rounded" />
                    <div className="w-36 h-4 bg-slate-200 dark:bg-slate-900 rounded" />
                    <div className="flex-1 flex gap-2 justify-end">
                        <div className="w-16 h-4 bg-slate-200 dark:bg-slate-900 rounded" />
                        <div className="w-16 h-4 bg-slate-200 dark:bg-slate-900 rounded" />
                        <div className="w-16 h-4 bg-slate-200 dark:bg-slate-900 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default React.memo(MeasurementSkeleton);
