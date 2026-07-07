import { apiClient } from "./api/client";

export const customerService = {
  getMySubmission() {
    return apiClient.get("/customer/me/submission");
  },
  getMyCertificate() {
    return apiClient.get("/customer/me/certificate");
  },
};
