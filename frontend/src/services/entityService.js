import { apiClient } from "./api/client";

export const entityService = {
  register(payload) {
    return apiClient.post("/entity/register", payload);
  },
  getForms() {
    return apiClient.get("/entity/forms");
  },
  createForm(payload) {
    return apiClient.post("/entity/forms", payload);
  },
  updateForm(formId, payload) {
    return apiClient.patch(`/entity/forms/${formId}`, payload);
  },
  publishForm(formId, payload) {
    return apiClient.post(`/entity/forms/${formId}/publish`, payload);
  },
  generateQr(formId) {
    return apiClient.post(`/entity/forms/${formId}/qr-code`);
  },
  getQr(formId) {
    return apiClient.get(`/entity/forms/${formId}/qr-code`);
  },
  getSubmissions(formId) {
    return apiClient.get(`/entity/forms/${formId}/submissions`);
  },
  getSubmission(submissionId) {
    return apiClient.get(`/entity/submissions/${submissionId}`);
  },
  generateCertificate(submissionId, payload) {
    return apiClient.post(`/entity/submissions/${submissionId}/certificate`, payload);
  },
};
