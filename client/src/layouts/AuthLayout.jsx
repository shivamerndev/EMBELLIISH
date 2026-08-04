import React from 'react';
import { Outlet } from 'react-router-dom';
import Logo from '../components/common/Logo';
import ThemeToggle from '../components/common/ThemeToggle';

export const AuthLayout = () => (
  <div
    className="min-h-screen flex flex-col justify-center items-center p-6 relative overflow-hidden transition-colors duration-300"
    style={{ backgroundColor: 'var(--bg-page)' }}
  >
    {/* Floating theme toggle — top right */}
    <div className="absolute top-4 right-4 z-20">
      <ThemeToggle />
    </div>

    {/* Subtle Luxury Ambient Background Glow */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />

    <div className="w-full max-w-md relative z-10">
      <div className="text-center mb-8 flex flex-col items-center">
        <Logo size="lg" variant="vertical" mode="dark" className="mb-2" />
        <p
          className="text-xs mt-2 font-medium tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          Enterprise Operating Spine
        </p>
      </div>

      <div
        className="panel p-8 shadow-2xl backdrop-blur-md"
        style={{ borderColor: 'var(--border-strong)' }}
      >
        <Outlet />
      </div>
    </div>
  </div>
);

export default AuthLayout;
