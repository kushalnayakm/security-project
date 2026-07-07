import { apiClient } from "./api/client";

export const customerService = {
  login(uniqueId) {
    return apiClient.post("/auth/customer/login", { unique_id: uniqueId });
  },
  getMySubmission() {
    return apiClient.get("/customer/me/submission");
  },
  getMyCertificate() {
    return apiClient.get("/customer/me/certificate");
  },
};
