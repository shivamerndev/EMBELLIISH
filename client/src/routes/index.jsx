import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import AuthLayout from '../layouts/AuthLayout';
import PrivateRoute from './PrivateRoute';
import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import LeadsPage from '../pages/crm/LeadsPage';
import DcmAssignmentPage from '../pages/crm/DcmAssignmentPage';
import QualificationPage from '../pages/crm/QualificationPage';
import FollowUpPage from '../pages/crm/FollowUpPage';

// Sales and Commercials Pages
import SalesCommercialsPage from '../pages/sales/SalesCommercials.jsx';
import LeadDetails from '@/pages/sales/LeadDetails.jsx';
import PreSiteVisit from '@/pages/sales/PreSiteVisit.jsx';
import MeasurementCapture from '../pages/sales/MeasurementCapture.jsx';
import StudioMeeting from '../pages/sales/StudioMeeting.jsx';
import ReadySize from '../pages/sales/ReadySize.jsx';
import ConsumptionBoq from '../pages/sales/ConsumptionBoq.jsx';
import ProposalCreation from '../pages/sales/ProposalCreation.jsx';
import TokenDiscussion from '../pages/sales/TokenDiscussion.jsx';
import PricingCosting from '../pages/sales/PricingCosting.jsx';
import QuotationPreparation from '../pages/sales/QuotationPreparation.jsx';
import ClientApproval from '../pages/sales/ClientApproval.jsx';

import ClientsPage from '../pages/crm/ClientsPage';
import ProjectsPage from '../pages/project/ProjectsPage';
import ProjectWorkspace from '../pages/project/ProjectWorkspace';
import ProductionPage from '../pages/production/ProductionPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import AccountsPage from '../pages/accounts/AccountsPage';
import ReportsPage from '../pages/reports/ReportsPage';
import TeamPage from '../pages/team/TeamPage';
import SettingsPage from '../pages/settings/SettingsPage';
import MembersPage from '../pages/members/MembersPage';
import NotFound from '../pages/NotFound';
import Kyc from '../pages/sales/Kyc.jsx';

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
        <Route path="/crm/dcm-assignments" element={<DcmAssignmentPage />} />
        <Route path="/crm/qualification" element={<QualificationPage />} />
        <Route path="/crm/follow-ups" element={<FollowUpPage />} />

        {/* Sales and Commercials Sub-Routes */}
        <Route path="/crm/sales-commercials" element={<Navigate to="/crm/sales-commercials/leads" replace />} />
        <Route path="/crm/sales-commercials/leads" element={<SalesCommercialsPage />} />
        <Route path="/crm/sales-commercials/leads/:LeadCode" element={<LeadDetails />} />
        <Route path="/crm/sales-commercials/pre-site-visit" element={<PreSiteVisit />} />
        <Route path="/crm/sales-commercials/measurement" element={<MeasurementCapture />} />
        <Route path="/crm/sales-commercials/studio-meeting" element={<StudioMeeting />} />
        <Route path="/crm/sales-commercials/ready-size" element={<ReadySize />} />
        <Route path="/crm/sales-commercials/consumption-boq" element={<ConsumptionBoq />} />
        <Route path="/crm/sales-commercials/proposal" element={<ProposalCreation />} />
        <Route path="/crm/sales-commercials/token-discussion" element={<TokenDiscussion />} />
        <Route path="/crm/sales-commercials/pricing-costing" element={<PricingCosting />} />
        <Route path="/crm/sales-commercials/quotation" element={<QuotationPreparation />} />
        <Route path="/crm/sales-commercials/client-approval" element={<ClientApproval />} />
        <Route path="/crm/sales-commercials/kyc" element={<Kyc />} />

        <Route path="/crm/clients" element={<ClientsPage />} />

        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectWorkspace />} />

        <Route path="/production" element={<ProductionPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
