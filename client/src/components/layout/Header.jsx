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
    <header className="h-14 bg-[ #836444] 900/80 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
      <p className="text-xs text-slate-500">Lead → Measurement → BOQ → Quotation → Production → Installation → Closure</p>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <div className="h-5 w-px bg-[ #836444] 800" />

        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-300">
            {initials(user?.name) || '—'}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-slate-200">{user?.name || 'Signed out'}</p>
            <p className="text-[10px] text-slate-500">{humanise(user?.role)}</p>
          </div>
        </div>

        <div className="h-5 w-px bg-[ #836444] 800" />

        <button
          type="button"
          onClick={signOut}
          title="Sign out"
          className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-[ #836444] 800 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Header;
