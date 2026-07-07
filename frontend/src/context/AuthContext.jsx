import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { registerAuthHandlers } from "../services/api/client";
import { authService } from "../services/authService";
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from "../utils/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => readStoredSession());

  useEffect(() => {
    registerAuthHandlers({
      getToken: () => session?.token ?? null,
      onUnauthorized: () => {
        clearStoredSession();
        setSession(null);
        navigate("/auth/admin/login");
      },
    });
  }, [navigate, session]);

  const value = {
    session,
    login(nextSession) {
      writeStoredSession(nextSession);
      setSession(nextSession);
    },
    async logout() {
      try {
        await authService.logout();
      } catch {
        // Clearing the session locally keeps the app recoverable.
      }
      clearStoredSession();
      setSession(null);
      navigate("/auth/admin/login");
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
