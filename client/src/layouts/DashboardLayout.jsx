import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

export const DashboardLayout = () => (
  <div className="flex min-h-screen bg-[ #836444] 950">
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      <main className="flex-1 p-6 min-w-0">
        <Outlet />
      </main>
    </div>
  </div>
);

export default DashboardLayout;
