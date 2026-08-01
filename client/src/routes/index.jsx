import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import DashboardLayout from '../layouts/DashboardLayout';
import AuthLayout from '../layouts/AuthLayout';
import PrivateRoute from './PrivateRoute';

import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import LeadsPage from '../pages/crm/LeadsPage';
import ClientsPage from '../pages/crm/ClientsPage';
import ProjectsPage from '../pages/project/ProjectsPage';
import ProjectWorkspace from '../pages/project/ProjectWorkspace';
import ProductionPage from '../pages/production/ProductionPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import AccountsPage from '../pages/accounts/AccountsPage';
import ReportsPage from '../pages/reports/ReportsPage';
import TeamPage from '../pages/team/TeamPage';
import SettingsPage from '../pages/settings/SettingsPage';
import NotFound from '../pages/NotFound';

export const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthLayout />}>
      <Route path="login" element={<Login />} />
      <Route index element={<Navigate to="login" replace />} />
    </Route>

    <Route element={<PrivateRoute />}>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/crm" element={<Navigate to="/crm/leads" replace />} />
        <Route path="/crm/leads" element={<LeadsPage />} />
        <Route path="/crm/clients" element={<ClientsPage />} />

        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectWorkspace />} />

        <Route path="/production" element={<ProductionPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
