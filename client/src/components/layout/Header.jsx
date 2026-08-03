import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { logout } from '../../features/auth/authSlice';
import { initials, humanise } from '../../utils/format';
import NotificationBell from './NotificationBell';

export const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const signOut = () => {
    dispatch(logout());
    navigate('/auth/login', { replace: true });
  };

  return (
    <header className="h-14 bg-[#171310]/90 backdrop-blur-md border-b border-[#2e251e] px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
        <p className="text-xs text-stone-400 font-medium">Lead → Measurement → BOQ → Quotation → Production → Installation → Closure</p>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <div className="h-5 w-px bg-[#2e251e]" />

        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-xs font-serif font-bold text-brand-200 shadow-sm">
            {initials(user?.name) || '—'}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-stone-200">{user?.name || 'Signed out'}</p>
            <p className="text-[10px] text-stone-500 tracking-wide font-medium">{humanise(user?.role)}</p>
          </div>
        </div>

        <div className="h-5 w-px bg-[#2e251e]" />

        <button
          type="button"
          onClick={signOut}
          title="Sign out"
          className="p-2 text-stone-500 hover:text-rose-400 rounded-lg hover:bg-[#251e18] transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Header;

