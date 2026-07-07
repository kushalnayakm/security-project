import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "../layouts/AppShell";
import { AuthLayout } from "../layouts/AuthLayout";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AuditLogsPage } from "../pages/admin/AuditLogsPage";
import { AdminFormsPage } from "../pages/admin/AdminFormsPage";
import { AdminQrManagementPage } from "../pages/admin/AdminQrManagementPage";
import { AdminReportsPage } from "../pages/admin/AdminReportsPage";
import { AdminSettingsPage } from "../pages/admin/AdminSettingsPage";
import { EntityManagementPage } from "../pages/admin/EntityManagementPage";
import { RegisterEntityPage } from "../pages/admin/RegisterEntityPage";
import { PlaceholderPage } from "../pages/common/PlaceholderPage";
import { CustomerLoginPage } from "../pages/customer/CustomerLoginPage";
import { CustomerDashboardPage } from "../pages/customer/CustomerDashboardPage";
import { EntityCertificatesPage } from "../pages/entity/EntityCertificatesPage";
import { EntityCustomersPage } from "../pages/entity/EntityCustomersPage";
import { EntityDashboardPage } from "../pages/entity/EntityDashboardPage";
import { EntityFormsPage } from "../pages/entity/EntityFormsPage";
import { EntityProfilePage } from "../pages/entity/EntityProfilePage";
import { EntityQrPage } from "../pages/entity/EntityQrPage";
import { PublicFormPage } from "../pages/public/PublicFormPage";
import { AdminLoginPage } from "../pages/auth/AdminLoginPage";
import { EntityLoginPage } from "../pages/auth/EntityLoginPage";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/auth/admin/login"
        element={
          <AuthLayout>
            <AdminLoginPage />
          </AuthLayout>
        }
      />
      <Route
        path="/auth/entity/login"
        element={
          <AuthLayout>
            <EntityLoginPage />
          </AuthLayout>
        }
      />

      {/* Public form page — no auth required */}
      <Route path="/form/:formId" element={<PublicFormPage />} />

      {/* Customer portal — standalone auth */}
      <Route path="/customer/login" element={<CustomerLoginPage />} />
      <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />
      <Route path="/customer" element={<Navigate to="/customer/login" replace />} />

      <Route element={<ProtectedRoute portal="admin" />}>
        <Route element={<AppShell />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/register-entity" element={<RegisterEntityPage />} />
          <Route path="/admin/entities" element={<EntityManagementPage />} />
          <Route path="/admin/forms" element={<AdminFormsPage />} />
          <Route path="/admin/qr" element={<AdminQrManagementPage />} />
          <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute portal="entity" />}>
        <Route element={<AppShell />}>
          <Route path="/entity/dashboard" element={<EntityDashboardPage />} />
          <Route path="/entity/forms" element={<EntityFormsPage />} />
          <Route path="/entity/qr" element={<EntityQrPage />} />
          <Route path="/entity/customers" element={<EntityCustomersPage />} />
          <Route path="/entity/certificates" element={<EntityCertificatesPage />} />
          <Route path="/entity/profile" element={<EntityProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/auth/admin/login" replace />} />
    </Routes>
  );
}

