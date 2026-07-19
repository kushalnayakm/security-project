import { Route, Routes, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { RegistrationDraftProvider } from "../context/RegistrationDraftContext";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicFormPage } from "../pages/public/PublicFormPage";
import { EntityLoginPage } from "../pages/auth/EntityLoginPage";
import { EntityRegisterPage } from "../pages/auth/EntityRegisterPage";
import { EntityHomePage } from "../pages/entity/EntityHomePage";
import { EntityDashboardPage } from "../pages/entity/EntityDashboardPage";
import { DocumentPreviewPage } from "../pages/entity/DocumentPreviewPage";

// Wraps the entity-registration flow (form -> preview) in a single shared
// RegistrationDraftProvider instance, so File objects set on the register page
// are still visible in context on the preview page. Must be a parent <Route>
// with an <Outlet>, not two separately-wrapped routes — two separate wrappers
// would each create their own provider instance and the draft data would not
// carry over between pages.
function RegistrationDraftProviderOutlet() {
  return (
    <RegistrationDraftProvider>
      <Outlet />
    </RegistrationDraftProvider>
  );
}

function AppRoutesInner() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/form/:formId" element={<PublicFormPage />} />
      <Route path="/auth/entity/login" element={<EntityLoginPage />} />

      {/* Entity registration flow — shares one RegistrationDraftProvider instance */}
      <Route element={<RegistrationDraftProviderOutlet />}>
        <Route path="/auth/entity/register" element={<EntityRegisterPage />} />
        <Route path="/entity/register/preview" element={<DocumentPreviewPage />} />
      </Route>

      {/* Entity home page - accessible without auth but shows login/register */}
      <Route path="/" element={<EntityHomePage />} />

      {/* Protected entity routes */}
      <Route
        path="/entity/dashboard"
        element={
          <ProtectedRoute allowedRoles={["ENTITY_STAFF", "ADMIN"]}>
            <EntityDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function AppRoutes() {
  return (
    <AuthProvider>
      <AppRoutesInner />
    </AuthProvider>
  );
}