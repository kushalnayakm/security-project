import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService } from "../services/authService";

import { registerAuthHandlers } from "../services/api/client";

const AuthContext = createContext(null);

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [entity, setEntity] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const initializeAuth = useCallback(async () => {
    const storedToken = localStorage.getItem("token");
    const storedEntity = localStorage.getItem("entity");
    const storedRole = localStorage.getItem("role");

    const parsedEntity = safeParse(storedEntity);

    if (storedToken && parsedEntity && storedRole) {
      setToken(storedToken);
      setEntity(parsedEntity);
      setRole(storedRole);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("entity");
      localStorage.removeItem("role");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    registerAuthHandlers({
      getToken: () => localStorage.getItem("token"),
      onUnauthorized: () => logout(),
    });
    initializeAuth();
  }, [initializeAuth]);

  const loginWithOtp = async (gstNo, phone, otp) => {
    const res = await authService.verifyEntityOtp(gstNo, phone, otp);
    if (!res?.token || !res?.entity || !res?.role) {
      throw new Error("Login response is missing token or entity details.");
    }
    setToken(res.token);
    setEntity(res.entity);
    setRole(res.role);
    localStorage.setItem("token", res.token);
    localStorage.setItem("entity", JSON.stringify(res.entity));
    localStorage.setItem("role", res.role);
    return res;
  };

  const requestOtp = async (gstNo, phone) => {
    return authService.requestEntityOtp(gstNo, phone);
  };

  const register = async (payload) => {
    return authService.registerEntity(payload);
  };

  const logout = () => {
    setToken(null);
    setEntity(null);
    setRole(null);
    localStorage.removeItem("token");
    localStorage.removeItem("entity");
    localStorage.removeItem("role");
  };

  const value = {
    token,
    entity,
    role,
    loading,
    loginWithOtp,
    requestOtp,
    register,
    logout,
    isAuthenticated: !!token,
    isEntityStaff: role === "ENTITY_STAFF",
    isAdmin: role === "ADMIN",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
