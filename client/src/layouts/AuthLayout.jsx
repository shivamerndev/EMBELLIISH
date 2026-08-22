import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Logo from '../components/common/Logo';
import ThemeToggle from '../components/common/ThemeToggle';

export const AuthLayout = () => {
  const themeMode = useSelector((state) => state.theme?.mode || 'dark');
  const isDark = themeMode === 'dark';

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden select-none">
      {/* Background Image: Luxury Curtain Interior Studio */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transition-transform duration-1000"
        style={{ backgroundImage: `url('/luxury_curtain_bg.jpg')` }}
      />

      {/* Sophisticated Luxury Warm Overlay */}
      <div
        className={`absolute inset-0 transition-colors duration-500 ${
          isDark
            ? 'bg-gradient-to-br from-stone-950/50 via-stone-900/35 to-stone-950/55'
            : 'bg-gradient-to-br from-stone-900/30 via-stone-900/15 to-stone-900/35 backdrop-brightness-95'
        }`}
      />

      {/* Architectural Light Beam & Warm Glow Accents */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-amber-700/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Floating Theme Toggle Top-Right */}
      <div className="absolute top-5 right-5 z-30">
        <ThemeToggle />
      </div>

      {/* Main Glassmorphism 2-Column Container */}
      <div className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 z-20 my-auto">
        {/* LEFT COLUMN: Luxury Showroom Brand Identity */}
        <div className="flex-1 flex flex-col items-center text-center z-20 w-full max-w-md">
          <div
            className="w-full p-8 md:p-10 rounded-2xl border shadow-2xl backdrop-blur-xl flex flex-col items-center transition-all duration-300"
            style={{
              backgroundColor: isDark ? 'rgba(28, 25, 23, 0.75)' : 'rgba(255, 252, 248, 0.75)',
              borderColor: isDark ? 'rgba(181, 149, 115, 0.25)' : 'rgba(131, 100, 68, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            }}
          >
            <Logo
              size="xl"
              variant="vertical"
              showEmblem={false}
              mode={isDark ? 'dark' : 'light'}
              className="mb-3"
            />
            <div className="mt-2 space-y-1">
              <a
                href="https://www.dtableanalytics.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] tracking-[0.2em] font-semibold uppercase hover:underline transition-all inline-block"
                style={{ color: isDark ? '#B59573' : '#705033' }}
              >
                Powered by D-table analytics
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sign In Form Box */}
        <div className="w-full max-w-md shrink-0 z-20">
          <div
            className="p-8 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300"
            style={{
              backgroundColor: isDark ? 'rgba(28, 25, 23, 0.82)' : 'rgba(255, 252, 248, 0.85)',
              borderColor: isDark ? 'rgba(181, 149, 115, 0.3)' : 'rgba(131, 100, 68, 0.25)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            }}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
