import React, { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth, RequireRole } from './auth/guards';
import { AppLayout } from './layouts/AppLayout';
import { PublicLayout } from './layouts/PublicLayout';

// Auth Page (public first paint — eager)
import { LoginPage } from './pages/auth/LoginPage';
import { ProviderRegister } from './pages/auth/ProviderRegister';
import { FactoryRegister } from './pages/auth/FactoryRegister';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Forbidden } from './pages/Forbidden';
import { NotFound } from './pages/NotFound';

// Portal pages are code-split per route so the public landing ships without
// the admin/provider/factory bundles (recharts, heavy tables, editors).
// Public marketing pages stay eager.
const lazyPage = <T,>(loader: () => Promise<T>, name: keyof T) =>
  lazy(() => loader().then((m) => ({ default: m[name] as unknown as React.ComponentType<object> })));

// Admin Portal Pages
const AdminDashboard = lazyPage(() => import('./pages/admin/AdminDashboard'), 'AdminDashboard');
const FactoriesManagement = lazyPage(() => import('./pages/admin/FactoriesManagement'), 'FactoriesManagement');
const ProvidersManagement = lazyPage(() => import('./pages/admin/ProvidersManagement'), 'ProvidersManagement');
const ProviderApprovals = lazyPage(() => import('./pages/admin/ProviderApprovals'), 'ProviderApprovals');
const ProviderApprovalDetail = lazyPage(() => import('./pages/admin/ProviderApprovalDetail'), 'ProviderApprovalDetail');
const FactoryApprovals = lazyPage(() => import('./pages/admin/FactoryApprovals'), 'FactoryApprovals');
const FactoryApprovalDetail = lazyPage(() => import('./pages/admin/FactoryApprovalDetail'), 'FactoryApprovalDetail');
const ChangeRequests = lazyPage(() => import('./pages/admin/ChangeRequests'), 'ChangeRequests');
const AdminRequests = lazyPage(() => import('./pages/admin/AdminRequests'), 'AdminRequests');
const ServicesManagement = lazyPage(() => import('./pages/admin/ServicesManagement'), 'ServicesManagement');
const AdsManagement = lazyPage(() => import('./pages/admin/AdsManagement'), 'AdsManagement');
const HeroVideoSettings = lazyPage(() => import('./pages/admin/HeroVideoSettings'), 'HeroVideoSettings');
const LandingSettings = lazyPage(() => import('./pages/admin/LandingSettings'), 'LandingSettings');
const ContractsManagement = lazyPage(() => import('./pages/admin/ContractsManagement'), 'ContractsManagement');
const FinancialsReports = lazyPage(() => import('./pages/admin/FinancialsReports'), 'FinancialsReports');
const UsersRoles = lazyPage(() => import('./pages/admin/UsersRoles'), 'UsersRoles');
const AuditLogs = lazyPage(() => import('./pages/admin/AuditLogs'), 'AuditLogs');
const ReadinessAdministration = lazyPage(() => import('./pages/admin/ReadinessAdministration'), 'ReadinessAdministration');
const ImcNumbersManagement = lazyPage(() => import('./pages/admin/ImcNumbersManagement'), 'ImcNumbersManagement');
const FinancialSettings = lazyPage(() => import('./pages/admin/FinancialSettings'), 'FinancialSettings');

// Provider Portal Pages
const ProviderDashboard = lazyPage(() => import('./pages/provider/ProviderDashboard'), 'ProviderDashboard');
const ProviderServices = lazyPage(() => import('./pages/provider/ProviderServices'), 'ProviderServices');
const ProviderRequests = lazyPage(() => import('./pages/provider/ProviderRequests'), 'ProviderRequests');
const NegotiationWorkspace = lazyPage(() => import('./pages/provider/NegotiationWorkspace'), 'NegotiationWorkspace');
const ProviderContracts = lazyPage(() => import('./pages/provider/ProviderContracts'), 'ProviderContracts');
const ProviderInvoices = lazyPage(() => import('./pages/provider/ProviderInvoices'), 'ProviderInvoices');
const ProviderRequestDetail = lazyPage(() => import('./pages/provider/ProviderRequestDetail'), 'ProviderRequestDetail');
const ProviderReports = lazyPage(() => import('./pages/provider/ProviderReports'), 'ProviderReports');
const ProviderSettings = lazyPage(() => import('./pages/provider/ProviderSettings'), 'ProviderSettings');
// Factory Portal Pages
const FactoryDashboard = lazyPage(() => import('./pages/factory/FactoryDashboard'), 'FactoryDashboard');
const DigitalReadinessAssessment = lazyPage(() => import('./pages/factory/DigitalReadinessAssessment'), 'DigitalReadinessAssessment');
const ServiceCatalog = lazyPage(() => import('./pages/factory/ServiceCatalog'), 'ServiceCatalog');
const ServiceDetails = lazyPage(() => import('./pages/factory/ServiceDetails'), 'ServiceDetails');
const ProviderDirectory = lazyPage(() => import('./pages/factory/ProviderDirectory'), 'ProviderDirectory');
const FactoryRoadmap = lazyPage(() => import('./pages/factory/FactoryRoadmap'), 'FactoryRoadmap');
const TransformationPlans = lazyPage(() => import('./pages/admin/TransformationPlans'), 'TransformationPlans');
const TransformationPlanDetail = lazyPage(() => import('./pages/admin/TransformationPlanDetail'), 'TransformationPlanDetail');
const FactoryRequests = lazyPage(() => import('./pages/factory/FactoryRequests'), 'FactoryRequests');
const FactoryRequestDetail = lazyPage(() => import('./pages/factory/FactoryRequestDetail'), 'FactoryRequestDetail');
const FactoryContracts = lazyPage(() => import('./pages/factory/FactoryContracts'), 'FactoryContracts');
const FactoryInvoices = lazyPage(() => import('./pages/factory/FactoryInvoices'), 'FactoryInvoices');
const FactoryServices = lazyPage(() => import('./pages/factory/FactoryServices'), 'FactoryServices');
const FactoryCart = lazyPage(() => import('./pages/factory/FactoryCart'), 'FactoryCart');
const FactorySettings = lazyPage(() => import('./pages/factory/FactorySettings'), 'FactorySettings');
const ProviderTraining = lazyPage(() => import('./pages/factory/ProviderTraining'), 'ProviderTraining');
const UseCases = lazyPage(() => import('./pages/home/UseCases'), 'UseCases');
const NotificationsPage = lazyPage(() => import('./pages/NotificationsPage'), 'NotificationsPage');

// Home Page
import { LandingHome } from './pages/home/LandingHome';
import { AdDetails } from './pages/ads/AdDetails';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/provider" element={<ProviderRegister />} />
          <Route path="/register/factory" element={<FactoryRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Public marketing pages: no session and no portal sidebar. */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingHome />} />
            <Route path="/ads/:id" element={<AdDetails />} />
            <Route path="/use-cases" element={<UseCases />} />
          </Route>

          {/* Portals: a session is required before the sidebar layout renders. */}
          <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/forbidden" element={<Forbidden />} />
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* Admin Routes (imc_admin) */}
            <Route element={<RequireRole roles={['imc_admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/factories" element={<FactoriesManagement />} />
            <Route path="/admin/providers" element={<ProvidersManagement />} />
            <Route path="/admin/approvals" element={<Navigate to="/admin/approvals/providers" replace />} />
            <Route path="/admin/approvals/providers" element={<ProviderApprovals />} />
            <Route path="/admin/approvals/providers/:id" element={<ProviderApprovalDetail />} />
            <Route path="/admin/approvals/factories" element={<FactoryApprovals />} />
            <Route path="/admin/approvals/factories/:id" element={<FactoryApprovalDetail />} />
            <Route path="/admin/change-requests" element={<ChangeRequests />} />
            <Route path="/admin/services" element={<ServicesManagement />} />
            <Route path="/admin/requests" element={<AdminRequests />} />
            <Route path="/admin/ads" element={<AdsManagement />} />
            <Route path="/admin/hero-video" element={<HeroVideoSettings />} />
            <Route path="/admin/landing" element={<LandingSettings />} />
            <Route path="/admin/contracts" element={<ContractsManagement />} />
            <Route path="/admin/reports" element={<FinancialsReports />} />
            <Route path="/admin/financial-settings" element={<FinancialSettings />} />
            <Route path="/admin/users" element={<UsersRoles />} />
            <Route path="/admin/audit-logs" element={<AuditLogs />} />
            <Route path="/admin/readiness" element={<ReadinessAdministration />} />
            <Route path="/admin/roadmaps" element={<TransformationPlans />} />
            <Route path="/admin/roadmaps/:id" element={<TransformationPlanDetail />} />
            <Route path="/admin/imc-numbers" element={<ImcNumbersManagement />} />
            </Route>

            {/* Provider Routes (provider_member) */}
            <Route element={<RequireRole roles={['provider_member']} />}>
            <Route path="/provider/dashboard" element={<ProviderDashboard />} />
            <Route path="/provider/profile" element={<Navigate to="/provider/settings" replace />} />
            <Route path="/provider/settings" element={<ProviderSettings />} />
            <Route path="/provider/reports" element={<ProviderReports />} />
            <Route path="/provider/requests/:id" element={<ProviderRequestDetail />} />
            <Route path="/provider/contracts/:id" element={<ProviderContracts />} />
            <Route path="/provider/services" element={<ProviderServices />} />
            <Route path="/provider/requests" element={<ProviderRequests />} />
            <Route path="/provider/negotiations" element={<NegotiationWorkspace />} />
            <Route path="/provider/contracts" element={<ProviderContracts />} />
            <Route path="/provider/invoices" element={<ProviderInvoices />} />
            </Route>

            {/* Factory Routes (factory_member) */}
            <Route element={<RequireRole roles={['factory_member']} />}>
            <Route path="/factory/dashboard" element={<FactoryDashboard />} />
            <Route path="/factory/profile" element={<Navigate to="/factory/settings" replace />} />
            <Route path="/factory/settings" element={<FactorySettings />} />
            <Route path="/factory/services" element={<FactoryServices />} />
            <Route path="/factory/cart" element={<FactoryCart />} />
            <Route path="/factory/contracts/:id" element={<FactoryContracts />} />
            <Route path="/factory/assessment" element={<DigitalReadinessAssessment />} />
            <Route path="/factory/roadmap" element={<FactoryRoadmap />} />
            <Route path="/factory/catalog" element={<ServiceCatalog />} />
            <Route path="/factory/services/:id" element={<ServiceDetails />} />
            <Route path="/factory/providers" element={<ProviderDirectory />} />
            <Route path="/factory/providers/:id/training" element={<ProviderTraining />} />
            <Route path="/factory/requests" element={<FactoryRequests />} />
            <Route path="/factory/requests/:id" element={<FactoryRequestDetail />} />
            <Route path="/factory/negotiations" element={<NegotiationWorkspace />} />
            <Route path="/factory/contracts" element={<FactoryContracts />} />
            <Route path="/factory/invoices" element={<FactoryInvoices />} />
            </Route>
          </Route>
          </Route>

          {/* Fallback Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
