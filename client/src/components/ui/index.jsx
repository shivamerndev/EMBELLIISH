import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, Inbox, X } from 'lucide-react';
import cn from '../../utils/cn';
import { getLocalDate, getLocalDateTime, getLocalTime } from '../../utils/format';

/* ------------------------------------------------------------------ surface */

export const Panel = ({ className, children, ...props }) => (
  <div className={cn('panel', className)} {...props}>
    {children}
  </div>
);

export const PanelHeader = ({ title, subtitle, actions, icon: Icon }) => (
  <div
    className="flex items-start justify-between gap-4 px-5 py-4 border-b"
    style={{ borderColor: 'var(--border)' }}
  >
    <div className="flex items-start gap-3 min-w-0">
      {Icon && <Icon className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

/* ------------------------------------------------------------------ controls */

const BUTTON_VARIANTS = {
  primary: 'bg-gradient-to-r from-brand-600 via-brand-500 to-amber-700 hover:from-brand-500 hover:to-amber-600 text-white shadow-lg shadow-brand-900/40 border-transparent',
  danger: 'bg-rose-700 hover:bg-rose-600 text-white border-transparent',
  success: 'bg-emerald-700 hover:bg-emerald-600 text-white border-transparent',
};

const BUTTON_SIZES = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

/**
 * Button component — primary/danger/success variants use fixed colors.
 * secondary/ghost/outline variants use CSS variables to adapt to theme.
 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled,
  className,
  children,
  ...props
}) => {
  // Themed variants need inline styles (CSS variables)
  const themedVariantStyle = {};
  let themedVariantClass = '';

  if (variant === 'secondary') {
    themedVariantClass = 'transition-colors';
    themedVariantStyle.backgroundColor = 'var(--bg-hover)';
    themedVariantStyle.color = 'var(--text-primary)';
    themedVariantStyle.borderColor = 'var(--border-strong)';
  } else if (variant === 'ghost') {
    themedVariantClass = 'transition-colors';
    themedVariantStyle.backgroundColor = 'transparent';
    themedVariantStyle.color = 'var(--text-secondary)';
    themedVariantStyle.borderColor = 'transparent';
  } else if (variant === 'outline') {
    themedVariantClass = 'transition-colors';
    themedVariantStyle.backgroundColor = 'transparent';
    themedVariantStyle.color = 'var(--text-primary)';
    themedVariantStyle.borderColor = 'rgba(131, 100, 68, 0.4)'; // brand-500/40 — stays consistent
  }

  const isThemed = ['secondary', 'ghost', 'outline'].includes(variant);

  return (
    <button
      type="button"
      disabled={disabled || loading}
      style={isThemed ? themedVariantStyle : undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-200',
        'disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500/40',
        isThemed ? themedVariantClass : BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

export const Field = ({ label, error, hint, required, children }) => (
  <div>
    {label && (
      <label className="field-label">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
    )}
    {children}
    {hint && !error && (
      <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
        {hint}
      </p>
    )}
    {error && <p className="text-[11px] text-rose-400 mt-1">{error}</p>}
  </div>
);

export const Input = ({ className, type, value, onChange, onFocus, onClick, ...props }) => {
  const handleFocus = (e) => {
    if ((type === 'date' || type === 'datetime-local' || type === 'time') && !value && onChange) {
      let defaultVal = '';
      if (type === 'date') defaultVal = getLocalDate();
      else if (type === 'datetime-local') defaultVal = getLocalDateTime();
      else if (type === 'time') defaultVal = getLocalTime();

      if (defaultVal) {
        onChange({ ...e, target: { ...e.target, name: props.name, value: defaultVal } });
      }
    }
    if (onFocus) onFocus(e);
  };

  const handleClick = (e) => {
    if ((type === 'date' || type === 'datetime-local' || type === 'time') && !value && onChange) {
      let defaultVal = '';
      if (type === 'date') defaultVal = getLocalDate();
      else if (type === 'datetime-local') defaultVal = getLocalDateTime();
      else if (type === 'time') defaultVal = getLocalTime();

      if (defaultVal) {
        onChange({ ...e, target: { ...e.target, name: props.name, value: defaultVal } });
      }
    }
    if (onClick) onClick(e);
  };

  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      onFocus={handleFocus}
      onClick={handleClick}
      className={cn('field-input', className)}
      {...props}
    />
  );
};

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
      className="w-4 h-4 rounded border-[#3d3026] bg-[#120f0d] text-brand-500 focus:ring-brand-500/40 focus:ring-2 accent-brand-500"
      {...props}
    />
    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
      {label}
    </span>
  </label>
);

/* -------------------------------------------------------------------- status */

const BADGE_TONES = {
  slate: 'bg-slate-200 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  blue: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40',
  brand: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
  green: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
  amber: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
  rose: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
  violet: 'bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40',
};

export const Badge = ({ tone = 'slate', className, children }) => {
  const badgeClasses = BADGE_TONES[tone] || BADGE_TONES.slate;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap shadow-sm',
        badgeClasses,
        className
      )}
    >
      {children}
    </span>
  );
};

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
  <Loader2 className={cn('w-5 h-5 animate-spin text-brand-400', className)} />
);

export const Loading = ({ label = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--text-muted)' }}>
    <Spinner className="w-6 h-6" />
    <p className="text-sm">{label}</p>
  </div>
);

export const ErrorState = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-6">
    <AlertCircle className="w-8 h-8 text-rose-400" />
    <div>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {error?.message || 'Something went wrong'}
      </p>
      {Array.isArray(error?.errors) && error.errors.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {error.errors.map((item, index) => (
            <li key={index} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
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
    <Icon className="w-8 h-8" style={{ color: 'var(--border-strong)' }} />
    <div>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        {title}
      </p>
      {hint && (
        <p className="text-xs mt-1 max-w-sm" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
    </div>
    {action}
  </div>
);

/* --------------------------------------------------------------------- data */

export const StatTile = ({ label, value, sub, icon: Icon, tone = 'blue' }) => {
  const tones = {
    blue: 'text-brand-400',
    brand: 'text-brand-400',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    violet: 'text-violet-400',
  };

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </span>
        {Icon && <Icon className={cn('w-4 h-4', tones[tone] || 'text-brand-400')} />}
      </div>
      <p className="text-2xl font-bold numeric" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </p>
      )}
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
          <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap',
                  column.align === 'right' ? 'text-right' : 'text-left',
                  column.headerClassName
                )}
                style={{ color: 'var(--text-muted)' }}
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
                'border-b last:border-0 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
              style={{ borderColor: 'var(--border)' }}
              onMouseEnter={
                onRowClick
                  ? (e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')
                  : undefined
              }
              onMouseLeave={
                onRowClick
                  ? (e) => (e.currentTarget.style.backgroundColor = '')
                  : undefined
              }
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-4 py-2.5',
                    column.align === 'right' && 'text-right numeric',
                    column.className
                  )}
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {column.render ? column.render(row, index) : row[column.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot className="border-t-2" style={{ borderColor: 'var(--border-strong)' }}>
            {footer}
          </tfoot>
        )}
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

  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl', '2xl': 'max-w-6xl', '3xl': 'max-w-7xl', full: 'max-w-[1350px] w-[92vw]' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div
        className="fixed inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'var(--backdrop)' }}
        onClick={onClose}
      />
      <div
        className={cn('relative w-full my-auto panel shadow-2xl flex flex-col max-h-[85vh]', sizes[size])}
        style={{ borderColor: 'var(--border-strong)' }}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg transition"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.backgroundColor = '';
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div
            className="flex justify-end gap-2 px-5 py-4 border-t shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/** Horizontal bar showing how far along a value is. */
export const Progress = ({ value = 0, tone = 'blue', className }) => {
  const tones = {
    blue: 'bg-brand-500',
    brand: 'bg-brand-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };

  return (
    <div style={{ backgroundColor: 'var(--progress-track)' }} className={cn('h-1.5 w-full rounded-full overflow-hidden', className)} >
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%` }} className={cn('h-full rounded-full transition-all duration-500', tones[tone] || 'bg-brand-500')} />
    </div>
  );
};

export const Tabs = ({ tabs, active, onChange, paramName = 'tab', syncQuery = true }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleTabClick = (tabKey) => {
    if (syncQuery) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(paramName, tabKey);
          return next;
        },
        { replace: true }
      );
    }
    if (onChange) {
      onChange(tabKey);
    }
  };

  return (
    <div className="flex gap-1.5 border-b " style={{ borderColor: 'var(--border)' }}>
      {tabs.map((tab) => (
        <button key={tab.key} type="button" onClick={() => handleTabClick(tab.key)} className={cn('px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors', active === tab.key ? 'border-brand-500 text-brand-300' : 'border-transparent')}
          style={active !== tab.key ? { color: 'var(--text-muted)' } : {}}
          onMouseEnter={(e) => {
            if (active !== tab.key) e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            if (active !== tab.key) e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export { PhoneInput, validatePhoneNumber, COUNTRY_CODES } from './PhoneInput';
export { EmailInput, validateEmail } from './EmailInput';


