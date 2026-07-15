import { Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicFormPage } from "../pages/public/PublicFormPage";
import { EntityLoginPage } from "../pages/auth/EntityLoginPage";
import { EntityRegisterPage } from "../pages/auth/EntityRegisterPage";
import { EntityHomePage } from "../pages/entity/EntityHomePage";
import { EntityDashboardPage } from "../pages/entity/EntityDashboardPage";

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
      <Route path="/auth/entity/register" element={<EntityRegisterPage />} />

      {/* Entity home page - accessible without auth but shows login/register */}
      <Route path="/" element={<EntityHomePage />} />

      {/* Protected entity routes */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["ENTITY_STAFF", "ADMIN"]}>
            <EntityDashboardPage />
          </ProtectedRoute>
        }
      >
        <Route path="entity/dashboard" element={<EntityDashboardPage />} />
      </Route>

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