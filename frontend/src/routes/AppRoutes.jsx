import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "../layouts/AppShell";
import { CustomerLoginPage } from "../pages/customer/CustomerLoginPage";
import { CustomerDashboardPage } from "../pages/customer/CustomerDashboardPage";
import { EntityCertificatesPage } from "../pages/entity/EntityCertificatesPage";
import { EntityCustomersPage } from "../pages/entity/EntityCustomersPage";
import { EntityDashboardPage } from "../pages/entity/EntityDashboardPage";
import { EntityFormsPage } from "../pages/entity/EntityFormsPage";
import { EntityProfilePage } from "../pages/entity/EntityProfilePage";
import { EntityQrPage } from "../pages/entity/EntityQrPage";
import { PublicFormPage } from "../pages/public/PublicFormPage";
import { EntityLandingPage } from "../pages/auth/EntityLandingPage";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/auth/entity/login"
        element={<EntityLandingPage />}
      />

      {/* Public form page — no auth required */}
      <Route path="/form/:formId" element={<PublicFormPage />} />

      {/* Customer portal — standalone auth */}
      <Route path="/customer/login" element={<CustomerLoginPage />} />
      <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />
      <Route path="/customer" element={<Navigate to="/customer/login" replace />} />

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

      <Route path="*" element={<Navigate to="/auth/entity/login" replace />} />
    </Routes>
  );
}

