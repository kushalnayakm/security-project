import { apiClient } from "./api/client";

function unwrapResponse(response) {
  return response?.data?.data ?? response?.data ?? response;
}

export const authService = {
  // Entity OTP login
  async requestEntityOtp(gstNo, phone) {
    const response = await apiClient.post("/auth/entity/login/request-otp", { gst_no: gstNo, phone });
    return unwrapResponse(response);
  },

  async verifyEntityOtp(gstNo, phone, otp) {
    const response = await apiClient.post("/auth/entity/login/verify-otp", { gst_no: gstNo, phone, otp });
    return unwrapResponse(response);
  },

  // Entity registration OTP
  async requestRegistrationOtp(phone) {
    const response = await apiClient.post("/auth/entity/register/request-otp", { phone });
    return unwrapResponse(response);
  },

  async verifyRegistrationOtp(phone, otp) {
    const response = await apiClient.post("/auth/entity/register/verify-otp", { phone, otp });
    return unwrapResponse(response);
  },

  // Entity registration
  async registerEntity(payload) {
    const isFormData = payload instanceof FormData;
    const response = await apiClient.post("/entity/register", payload, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return unwrapResponse(response);
  },

  // Admin login
  async loginAdmin(adminId, password) {
    const response = await apiClient.post("/auth/admin/login", { admin_id: adminId, password });
    return unwrapResponse(response);
  },

  // Customer login
  async loginCustomer(uniqueId) {
    const response = await apiClient.post("/auth/customer/login", { unique_id: uniqueId });
    return unwrapResponse(response);
  },
};
