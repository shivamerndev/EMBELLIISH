import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight, Menu } from 'lucide-react';
import { logout } from '../../features/auth/authSlice';
import { initials, humanise } from '../../utils/format';
import NotificationBell from './NotificationBell';
import ThemeToggle from '../common/ThemeToggle';

export const Header = ({ isSidebarCollapsed, onToggleSidebar, onToggleMobile }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const signOut = () => {
    dispatch(logout());
    navigate('/auth/login', { replace: true });
  };

  return (
    <header
      className="h-14 backdrop-blur-md border-b px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-250 w-full max-w-full"
      style={{
        backgroundColor: 'var(--bg-surface-alt)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Trigger (< md) */}
        <button
          type="button"
          onClick={onToggleMobile}
          title="Open Menu"
          aria-label="Open Navigation Menu"
          className="p-1.5 rounded-lg border md:hidden transition-all hover:bg-[var(--bg-hover)] text-[var(--text-primary)] shrink-0 cursor-pointer"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--bg-surface-alt)',
          }}
        >
          <Menu className="w-5 h-5 text-brand-500" />
        </button>

        {/* Desktop Expand Sidebar Trigger (>= md) */}
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title="Expand Sidebar"
            aria-label="Expand Sidebar"
            className="hidden md:flex p-1.5 rounded-lg border transition-all hover:bg-[var(--bg-hover)] text-[var(--text-primary)] shrink-0 cursor-pointer"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-surface-alt)',
            }}
          >
            <ChevronRight className="w-5 h-5 text-brand-500" />
          </button>
        )}

        {/* Pipeline Process Flow Indicator */}
        <div className="hidden lg:flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse shrink-0"></span>
          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-muted)' }}>
            Lead → Measurement → BOQ → Quotation → Production → Installation → Closure
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <NotificationBell />

        <div className="h-4 sm:h-5 w-px" style={{ backgroundColor: 'var(--border)' }} />

        {/* Theme Toggle */}
        <ThemeToggle />

        <div className="h-4 sm:h-5 w-px" style={{ backgroundColor: 'var(--border)' }} />

        {/* User Profile Info */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-xs font-bold text-brand-200 shadow-xs shrink-0">
            {initials(user?.name) || '—'}
          </div>
          <div className="hidden sm:block leading-tight max-w-[120px] md:max-w-[160px]">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.name || 'Signed out'}
            </p>
            <p className="text-[10px] tracking-wide font-medium truncate" style={{ color: 'var(--text-muted)' }}>
              {humanise(user?.role)}
            </p>
          </div>
        </div>

        <div className="h-4 sm:h-5 w-px" style={{ backgroundColor: 'var(--border)' }} />

        <button
          type="button"
          onClick={signOut}
          title="Sign out"
          aria-label="Sign Out"
          className="p-1.5 sm:p-2 rounded-lg transition shrink-0"
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

