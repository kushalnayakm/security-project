import { apiClient } from "./api/client";

export const authService = {
  // Entity OTP login
  async requestEntityOtp(gstNo, phone) {
    return apiClient.post("/auth/entity/login/request-otp", { gst_no: gstNo, phone });
  },

  async verifyEntityOtp(gstNo, phone, otp) {
    return apiClient.post("/auth/entity/login/verify-otp", { gst_no: gstNo, phone, otp });
  },

  // Entity registration OTP
  async requestRegistrationOtp(phone) {
    return apiClient.post("/auth/entity/register/request-otp", { phone });
  },

  async verifyRegistrationOtp(phone, otp) {
    return apiClient.post("/auth/entity/register/verify-otp", { phone, otp });
  },

  // Entity registration
  async registerEntity(payload) {
    const isFormData = payload instanceof FormData;
    return apiClient.post("/entity/register", payload, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
  },

  // Admin login
  async loginAdmin(adminId, password) {
    return apiClient.post("/auth/admin/login", { admin_id: adminId, password });
  },

  // Customer login
  async loginCustomer(uniqueId) {
    return apiClient.post("/auth/customer/login", { unique_id: uniqueId });
  },
};