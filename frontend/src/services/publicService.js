import { apiClient } from "./api/client";

export const publicService = {
  getForm(formId) {
    return apiClient.get(`/public/forms/${formId}`);
  },
  submitForm(formId, payload) {
    return apiClient.post(`/public/forms/${formId}/submit`, payload);
  },
};
