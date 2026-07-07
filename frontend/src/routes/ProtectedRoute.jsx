import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ portal }) {
  const { session } = useAuth();

  if (!session?.token) {
    return <Navigate to="/auth/admin/login" replace />;
  }

  if (portal && session.portal !== portal) {
    return <Navigate to={`/${session.portal}/dashboard`} replace />;
  }

  return <Outlet />;
}
