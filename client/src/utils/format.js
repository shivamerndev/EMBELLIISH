/** Indian-format currency, which is what every figure in this business is quoted in. */
export const currency = (value, { compact = false } = {}) => {
  const amount = Number(value) || 0;

  if (compact) {
    if (Math.abs(amount) >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
    if (Math.abs(amount) >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`;
  }

  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

export const number = (value, dp = 2) => {
  const n = Number(value) || 0;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: dp });
};

export const date = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

/** "2 days ago" / "in 3 days" — used on follow-up and delivery dates. */
export const relative = (value) => {
  if (!value) return '—';
  const diff = new Date(value).getTime() - Date.now();
  const days = Math.round(diff / 86400000);

  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
};

/**
 * "just now" / "12 min ago" / "3 h ago" — finer than `relative`, for a feed where
 * everything worth reading happened in the last hour.
 */
export const relativeTime = (value) => {
  if (!value) return '—';
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} d ago`;
  return date(value);
};

/** ENUM_CASE → "Enum case", for labels the server has not named explicitly. */
export const humanise = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

export const initials = (name) =>
  String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

/**
 * Normalises media URLs: converts direct S3 URLs (e.g. https://*.s3.*.amazonaws.com/uploads/...)
 * into relative proxy paths (/uploads/...) served by the Express backend proxy.
 */
export const getMediaUrl = (url) => {
  if (!url) return '';
  if (typeof url === 'string' && (url.includes('.s3.') || url.includes('.amazonaws.com'))) {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      return url;
    }
  }
  return url;
};
