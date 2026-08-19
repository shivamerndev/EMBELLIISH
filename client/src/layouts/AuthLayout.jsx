import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Logo from '../components/common/Logo';
import ThemeToggle from '../components/common/ThemeToggle';

export const AuthLayout = () => {
  const themeMode = useSelector((state) => state.theme?.mode || 'dark');

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      {/* Floating theme toggle — top right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Luxury Ambient Background Glows */}
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-gold-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Centered 2-Column Content Area */}
      <div className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 z-10 my-auto">
        {/* LEFT SIDE: Brand & Logo */}
        <div className="flex-1 flex flex-col items-center text-center z-10">
          <Logo size="xl" variant="vertical" showEmblem={false} mode={themeMode === 'dark' ? 'dark' : 'light'} className="mb-4" />
          <div className="mt-2 space-y-1">
            <a
              href="https://www.dtableanalytics.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold tracking-widest uppercase hover:underline transition-all inline-block"
              style={{ color: 'var(--text-muted)' }}
            >
              Powered by D-table analytics
            </a>
          </div>
        </div>

        {/* RIGHT SIDE: Credentials Entry Box */}
        <div className="w-full max-w-md shrink-0 z-10">
          <div
            className="panel p-8 shadow-2xl backdrop-blur-md"
            style={{ borderColor: 'var(--border-strong)' }}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
