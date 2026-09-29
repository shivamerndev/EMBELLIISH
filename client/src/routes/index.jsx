import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import AuthLayout from '../layouts/AuthLayout';
import PrivateRoute from './PrivateRoute';
import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import LeadsPage from '../pages/crm/LeadsPage';
import DcmAssignmentPage from '../pages/crm/DcmAssignmentPage';
import QualificationPage from '../pages/crm/QualificationPage';
import ReassignDcmPage from '../pages/crm/ReassignDcmPage';

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
import Kyc from '../pages/sales/Kyc.jsx';

// PMS Pages
import ProjectActivationPage from '../pages/pms/ProjectActivationPage.jsx';
import ExecutionSetupPage from '../pages/pms/ExecutionSetupPage.jsx';
import DesignFinalisationPage from '../pages/pms/DesignFinalisationPage.jsx';
import ExecutionDrawingRequestPage from '../pages/pms/ExecutionDrawingRequestPage.jsx';
import ExecutionDrawingPreparationPage from '../pages/pms/ExecutionDrawingPreparationPage.jsx';
import ApprovalsPage from '../pages/pms/ApprovalsPage.jsx';
import ChangeRevisionControlPage from '../pages/pms/ChangeRevisionControlPage.jsx';
import OrderSheetFmsCreationPage from '../pages/pms/OrderSheetFmsCreationPage.jsx';
import ProcurementRequestPage from '../pages/pms/ProcurementRequestPage.jsx';
import MotorsAccessoriesControlPage from '../pages/pms/MotorsAccessoriesControlPage.jsx';
import QcStatusPage from '../pages/pms/QcStatusPage.jsx';
import PackingDispatchReadinessPage from '../pages/pms/PackingDispatchReadinessPage.jsx';
import InstallationPage from '../pages/pms/InstallationPage.jsx';
import FinalPaymentPage from '../pages/pms/FinalPaymentPage.jsx';
import InstallationSchedulingPage from '../pages/pms/InstallationSchedulingPage.jsx';
import InstallationBriefDispatchPage from '../pages/pms/InstallationBriefDispatchPage.jsx';
import InstallationExecutionUpdatesPage from '../pages/pms/InstallationExecutionUpdatesPage.jsx';
import ClientExecutionUpdatesPage from '../pages/pms/ClientExecutionUpdatesPage.jsx';
import SnagReworkPage from '../pages/pms/SnagReworkPage.jsx';
import MaintenancePage from '../pages/pms/MaintenancePage.jsx';
import ProjectClosurePage from '../pages/pms/ProjectClosurePage.jsx';

import MembersPage from '../pages/members/MembersPage';
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
        <Route path="/crm/dcm-assignments" element={<DcmAssignmentPage />} />
        <Route path="/crm/qualification" element={<QualificationPage />} />
        {/* Reassign DCM & Delayed Leads */}
        <Route path="/crm/delayed-leads" element={<ReassignDcmPage />} />

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
        <Route path="/crm/sales-commercials/advance" element={<TokenDiscussion />} />
        <Route path="/crm/sales-commercials/pricing-costing" element={<PricingCosting />} />
        <Route path="/crm/sales-commercials/quotation" element={<QuotationPreparation />} />
        <Route path="/crm/sales-commercials/client-approval" element={<ClientApproval />} />
        <Route path="/crm/sales-commercials/kyc" element={<Kyc />} />

        {/* PMS Sub-Routes */}
        <Route path="/pms" element={<Navigate to="/pms/project-activation" replace />} />
        <Route path="/pms/project-activation" element={<ProjectActivationPage />} />
        <Route path="/pms/execution-setup" element={<ExecutionSetupPage />} />
        <Route path="/pms/design-finalisation" element={<DesignFinalisationPage />} />
        <Route path="/pms/execution-drawing-request" element={<ExecutionDrawingRequestPage />} />
        <Route path="/pms/execution-drawing-preparation" element={<ExecutionDrawingPreparationPage />} />
        <Route path="/pms/approvals" element={<ApprovalsPage />} />
        <Route path="/pms/change-revision-control" element={<ChangeRevisionControlPage />} />
        <Route path="/pms/order-sheet-fms-creation" element={<OrderSheetFmsCreationPage />} />
        <Route path="/pms/procurement-request" element={<ProcurementRequestPage />} />
        <Route path="/pms/motors-accessories-control" element={<MotorsAccessoriesControlPage />} />
        <Route path="/pms/qc-status" element={<QcStatusPage />} />
        <Route path="/pms/packing-dispatch-readiness" element={<PackingDispatchReadinessPage />} />
        <Route path="/pms/installation" element={<Navigate to="/pms/installation-scheduling" replace />} />
        <Route path="/pms/final-payment" element={<FinalPaymentPage />} />
        <Route path="/pms/installation-scheduling" element={<InstallationSchedulingPage />} />
        <Route path="/pms/installation-brief-dispatch" element={<InstallationBriefDispatchPage />} />
        <Route path="/pms/installation-execution-updates" element={<InstallationExecutionUpdatesPage />} />
        <Route path="/pms/client-execution-updates" element={<ClientExecutionUpdatesPage />} />
        <Route path="/pms/snag-rework" element={<SnagReworkPage />} />
        <Route path="/pms/maintenance" element={<MaintenancePage />} />
        <Route path="/pms/project-closure" element={<ProjectClosurePage />} />

        <Route path="/members" element={<MembersPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
