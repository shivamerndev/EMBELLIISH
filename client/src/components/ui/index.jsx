import React from 'react';
import { Loader2, AlertCircle, Inbox, X } from 'lucide-react';
import cn from '../../utils/cn';

/* ------------------------------------------------------------------ surface */

export const Panel = ({ className, children, ...props }) => (
  <div className={cn('panel', className)} {...props}>
    {children}
  </div>
);

export const PanelHeader = ({ title, subtitle, actions, icon: Icon }) => (
  <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-800">
    <div className="flex items-start gap-3 min-w-0">
      {Icon && <Icon className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-100 truncate">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

/* ------------------------------------------------------------------ controls */

const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 border-transparent',
  secondary: 'bg-[ #836444] 800 hover:bg-[ #836444] 700 text-slate-200 border-slate-700',
  ghost: 'bg-transparent hover:bg-[ #836444] 800 text-slate-300 border-transparent',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white border-transparent',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent',
  outline: 'bg-transparent hover:bg-[ #836444] 800 text-slate-200 border-slate-700',
};

const BUTTON_SIZES = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled,
  className,
  children,
  ...props
}) => (
  <button
    type="button"
    disabled={disabled || loading}
    className={cn(
      'inline-flex items-center justify-center font-semibold rounded-lg border transition-colors',
      'disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/40',
      BUTTON_VARIANTS[variant],
      BUTTON_SIZES[size],
      className
    )}
    {...props}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
    {children}
  </button>
);

export const Field = ({ label, error, hint, required, children }) => (
  <div>
    {label && (
      <label className="field-label">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
    )}
    {children}
    {hint && !error && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    {error && <p className="text-[11px] text-rose-400 mt-1">{error}</p>}
  </div>
);

export const Input = ({ className, ...props }) => (
  <input className={cn('field-input', className)} {...props} />
);

export const Textarea = ({ className, ...props }) => (
  <textarea rows={3} className={cn('field-input resize-y', className)} {...props} />
);

export const Select = ({ className, options = [], placeholder, children, ...props }) => (
  <select className={cn('field-input', className)} {...props}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
    {children}
  </select>
);

export const Checkbox = ({ label, className, ...props }) => (
  <label className={cn('inline-flex items-center gap-2 cursor-pointer select-none', className)}>
    <input
      type="checkbox"
      className="w-4 h-4 rounded border-slate-700 bg-[ #836444] 950 text-blue-600 focus:ring-blue-500/40 focus:ring-2"
      {...props}
    />
    <span className="text-sm text-slate-300">{label}</span>
  </label>
);

/* -------------------------------------------------------------------- status */

const BADGE_TONES = {
  slate: 'bg-[ #836444] 800 text-slate-300 border-slate-700',
  blue: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  green: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  rose: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  violet: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
};

export const Badge = ({ tone = 'slate', className, children }) => (
  <span
    className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap',
      BADGE_TONES[tone] || BADGE_TONES.slate,
      className
    )}
  >
    {children}
  </span>
);

/** Maps the server's status vocabulary onto badge colours, in one place. */
export const toneForStatus = (status) => {
  const value = String(status || '').toUpperCase();

  if (['APPROVED', 'PASS', 'CLEARED', 'PAID', 'COMPLETED', 'CLOSED', 'RECEIVED', 'DELIVERED', 'CONVERTED', 'QUALIFIED', 'ACTIVE'].includes(value)) return 'green';
  if (['FAIL', 'REJECTED', 'BOUNCED', 'CANCELLED', 'LOST', 'UNQUALIFIED', 'CRITICAL', 'OPEN'].includes(value)) return 'rose';
  if (['PENDING', 'DRAFT', 'PLANNED', 'SCHEDULED', 'PARTIAL', 'PARTIALLY_PAID', 'PARTIALLY_RECEIVED', 'IN_REWORK', 'MAJOR', 'NEW'].includes(value)) return 'amber';
  if (['SENT', 'ISSUED', 'IN_PROGRESS', 'IN_TRANSIT', 'CONTACTED', 'READY'].includes(value)) return 'blue';
  if (['REVISED', 'PACKED', 'DISPATCHED'].includes(value)) return 'violet';
  return 'slate';
};

export const StatusBadge = ({ status, label }) => (
  <Badge tone={toneForStatus(status)}>{label || String(status || '—').replace(/_/g, ' ')}</Badge>
);

/* ------------------------------------------------------------------ feedback */

export const Spinner = ({ className }) => (
  <Loader2 className={cn('w-5 h-5 animate-spin text-blue-400', className)} />
);

export const Loading = ({ label = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
    <Spinner className="w-6 h-6" />
    <p className="text-sm">{label}</p>
  </div>
);

export const ErrorState = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-6">
    <AlertCircle className="w-8 h-8 text-rose-400" />
    <div>
      <p className="text-sm font-semibold text-slate-200">{error?.message || 'Something went wrong'}</p>
      {Array.isArray(error?.errors) && error.errors.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {error.errors.map((item, index) => (
            <li key={index} className="text-xs text-slate-400">
              {item.field ? `${item.field}: ` : ''}
              {item.message}
            </li>
          ))}
        </ul>
      )}
    </div>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

export const EmptyState = ({ title = 'Nothing here yet', hint, icon: Icon = Inbox, action }) => (
  <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-6">
    <Icon className="w-8 h-8 text-slate-600" />
    <div>
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      {hint && <p className="text-xs text-slate-500 mt-1 max-w-sm">{hint}</p>}
    </div>
    {action}
  </div>
);

/* --------------------------------------------------------------------- data */

export const StatTile = ({ label, value, sub, icon: Icon, tone = 'blue' }) => {
  const tones = {
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    violet: 'text-violet-400',
  };

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        {Icon && <Icon className={cn('w-4 h-4', tones[tone])} />}
      </div>
      <p className="text-2xl font-bold text-slate-100 numeric">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </Panel>
  );
};

/**
 * A plain, dense table. Columns are `{ key, header, render, align, className }`.
 * Wrapped in its own scroll container so a wide consumption sheet never makes
 * the whole page scroll sideways.
 */
export const Table = ({ columns, rows, keyField = 'id', empty, onRowClick, footer }) => {
  if (!rows?.length) return empty ?? <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap',
                  column.align === 'right' ? 'text-right' : 'text-left',
                  column.headerClassName
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row[keyField] ?? index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-slate-800/60 last:border-0',
                onRowClick && 'cursor-pointer hover:bg-[ #836444] 800/40 transition-colors'
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-4 py-2.5 text-slate-300',
                    column.align === 'right' && 'text-right numeric',
                    column.className
                  )}
                >
                  {column.render ? column.render(row, index) : row[column.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot className="border-t-2 border-slate-700">{footer}</tfoot>}
      </table>
    </div>
  );
};

/* -------------------------------------------------------------------- modal */

export const Modal = ({ open, onClose, title, subtitle, children, footer, size = 'md' }) => {
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    // Stop the page behind the dialog from scrolling with it.
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-[ #836444] 950/80 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full my-8 panel shadow-2xl', sizes[size])}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-100">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-[ #836444] 800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-800">{footer}</div>}
      </div>
    </div>
  );
};

/** Horizontal bar showing how far along a value is. */
export const Progress = ({ value = 0, tone = 'blue', className }) => {
  const tones = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };

  return (
    <div className={cn('h-1.5 w-full bg-[ #836444] 800 rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
};

export const Tabs = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 overflow-x-auto border-b border-slate-800 -mx-1 px-1">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        type="button"
        onClick={() => onChange(tab.key)}
        className={cn(
          'px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
          active === tab.key
            ? 'border-blue-500 text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-300'
        )}
      >
        {tab.label}
        {tab.count !== undefined && (
          <span className="ml-1.5 text-[11px] text-slate-500">{tab.count}</span>
        )}
      </button>
    ))}
  </div>
);
