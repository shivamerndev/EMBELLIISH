import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout = () => (
  <div className="min-h-screen bg-[ #836444] 950 flex flex-col justify-center items-center p-4">
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-blue-600/30 mx-auto mb-4">
          E
        </div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Embellish ERP</h2>
        <p className="text-sm text-slate-500 mt-1">Lead to closure, on one record</p>
      </div>

      <div className="panel p-6 shadow-2xl">
        <Outlet />
      </div>
    </div>
  </div>
);

export default AuthLayout;
