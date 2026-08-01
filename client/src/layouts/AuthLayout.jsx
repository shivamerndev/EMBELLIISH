import React from 'react';
import { Outlet } from 'react-router-dom';
import Logo from '../components/common/Logo';

export const AuthLayout = () => (
  <div className="min-h-screen bg-[#120f0d] flex flex-col justify-center items-center p-6 relative overflow-hidden">
    {/* Subtle Luxury Ambient Background Glow */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />

    <div className="w-full max-w-md relative z-10">
      <div className="text-center mb-8 flex flex-col items-center">
        <Logo size="lg" variant="vertical" mode="dark" className="mb-2" />
        <p className="text-xs text-stone-400 mt-2 font-medium tracking-wide">Enterprise Operating Spine</p>
      </div>

      <div className="panel p-8 shadow-2xl border-[#3d3026] bg-[#1a1512]/95 backdrop-blur-md">
        <Outlet />
      </div>
    </div>
  </div>
);

export default AuthLayout;

