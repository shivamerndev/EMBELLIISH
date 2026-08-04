import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, AlertTriangle, CircleAlert, CheckCircle2, Info } from 'lucide-react';
import { notificationsApi } from '../../api';
import { relativeTime } from '../../utils/format';
import cn from '../../utils/cn';

/**
 * Module 19 — "WhatsApp nahi. ERP me."
 *
 * The unread count is polled rather than pushed: this is an internal tool with a
 * handful of concurrent users, and a minute of latency on "the token cleared" is
 * not worth a websocket in the deployment.
 */
const POLL_MS = 60_000;

const ICONS = {
  CRITICAL: { icon: CircleAlert, tone: 'text-rose-400' },
  WARNING: { icon: AlertTriangle, tone: 'text-amber-400' },
  SUCCESS: { icon: CheckCircle2, tone: 'text-emerald-400' },
  INFO: { icon: Info, tone: 'text-brand-400' },
};

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const panel = useRef(null);
  const navigate = useNavigate();

  const loadCount = async () => {
    try {
      const response = await notificationsApi.unreadCount();
      setUnread(response.data.unread);
    } catch {
      // A failed badge poll is not worth telling anyone about.
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await notificationsApi.list({ limit: 15 });
      setItems(response.data.items);
      setUnread(response.data.unread);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCount();
    const timer = setInterval(loadCount, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    loadItems();

    const onClickAway = (event) => {
      if (panel.current && !panel.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const openItem = async (item) => {
    if (!item.isRead) {
      await notificationsApi.markRead(item.id).catch(() => {});
      setUnread((n) => Math.max(0, n - 1));
      setItems((list) => list.map((row) => (row.id === item.id ? { ...row, isRead: true } : row)));
    }
    if (item.link) {
      setOpen(false);
      navigate(item.link);
    }
  };

  const markAll = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setUnread(0);
    setItems((list) => list.map((row) => ({ ...row, isRead: true })));
  };

  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        className="relative p-2 rounded-lg transition"
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
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center shadow">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-96 max-h-[28rem] overflow-y-auto panel shadow-2xl z-50"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b sticky top-0"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Notifications{' '}
              {unread > 0 && (
                <span style={{ color: 'var(--text-muted)' }}>· {unread} unread</span>
              )}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="inline-flex items-center gap-1 text-[11px] hover:text-brand-300 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {loading && (
            <p className="px-4 py-6 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Loading…
            </p>
          )}

          {!loading && !items.length && (
            <p className="px-4 py-8 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Nothing yet. Stage changes, payments, QC failures and snags land here.
            </p>
          )}

          {items.map((item) => {
            const { icon: Icon, tone } = ICONS[item.severity] || ICONS.INFO;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                className={cn(
                  'w-full text-left flex gap-3 px-4 py-3 border-b last:border-0 transition-colors',
                  !item.isRead && 'bg-brand-500/[0.06]'
                )}
                style={{ borderColor: 'var(--border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = !item.isRead ? 'rgba(131,100,68,0.06)' : '')}
              >
                <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', tone)} />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn('text-xs truncate', !item.isRead && 'font-semibold')}
                    style={{ color: item.isRead ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                  >
                    {item.title}
                  </p>
                  {item.body && (
                    <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                      {item.body}
                    </p>
                  )}
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>
                    {relativeTime(item.createdAt)}
                  </p>
                </div>
                {!item.isRead && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
