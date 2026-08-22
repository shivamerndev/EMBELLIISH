import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight } from 'lucide-react';
import { logout } from '../../features/auth/authSlice';
import { initials, humanise } from '../../utils/format';
import NotificationBell from './NotificationBell';
import ThemeToggle from '../common/ThemeToggle';

export const Header = ({ isSidebarCollapsed, onToggleSidebar }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const signOut = () => {
    dispatch(logout());
    navigate('/auth/login', { replace: true });
  };

  return (
    <header
      className="h-14 backdrop-blur-md border-b px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-250"
      style={{
        backgroundColor: 'var(--bg-surface-alt)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-3">
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title="Expand Sidebar"
            className="p-1.5 rounded-lg border transition-all hover:bg-[var(--bg-hover)] text-[var(--text-primary)] shrink-0 cursor-pointer"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-surface-alt)',
            }}
          >
            <ChevronRight className="w-5 h-5 text-brand-500" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Lead → Measurement → BOQ → Quotation → Production → Installation → Closure
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <div className="h-5 w-px" style={{ backgroundColor: 'var(--border)' }} />

        {/* Theme Toggle */}
        <ThemeToggle />

        <div className="h-5 w-px" style={{ backgroundColor: 'var(--border)' }} />

        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-xs font-bold text-brand-200 shadow-sm">
            {initials(user?.name) || '—'}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              {user?.name || 'Signed out'}
            </p>
            <p className="text-[10px] tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>
              {humanise(user?.role)}
            </p>
          </div>
        </div>

        <div className="h-5 w-px" style={{ backgroundColor: 'var(--border)' }} />

        <button
          type="button"
          onClick={signOut}
          title="Sign out"
          className="p-2 rounded-lg transition"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fb7185')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Header;
