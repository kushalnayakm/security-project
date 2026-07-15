import { apiClient } from "./api/client";

function unwrapResponse(response) {
  return response?.data?.data ?? response?.data ?? response;
}

export const entityService = {
  async getProfile() {
    const response = await apiClient.get("/entity/profile");
    return unwrapResponse(response);
  },
  async getForms() {
    const response = await apiClient.get("/entity/forms");
    return unwrapResponse(response);
  },
  async getFormSubmissions(formId) {
    const response = await apiClient.get(`/entity/forms/${formId}/submissions`);
    return unwrapResponse(response);
  },
  async getCustomers() {
    const response = await apiClient.get("/entity/customers");
    return unwrapResponse(response);
  },
};
