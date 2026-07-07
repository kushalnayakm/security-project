import { apiClient } from "./api/client";

export const authService = {
  adminLogin(payload) {
    return apiClient.post("/auth/admin/login", payload);
  },
  forgotAdminCode(payload) {
    return apiClient.post("/auth/admin/forgot-id", payload);
  },
  requestEntityOtp(payload) {
    return apiClient.post("/auth/entity/login/request-otp", payload);
  },
  verifyEntityOtp(payload) {
    return apiClient.post("/auth/entity/login/verify-otp", payload);
  },
  customerLogin(payload) {
    return apiClient.post("/auth/customer/login", payload);
  },
  logout() {
    return apiClient.post("/auth/logout");
  },
};
