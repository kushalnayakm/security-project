import { apiClient } from "./api/client";

export const entityService = {
  register(payload) {
    return apiClient.post("/entity/register", payload);
  },
  getForms(entityId) {
    const params = entityId ? { entity_id: entityId } : {};
    return apiClient.get("/entity/forms", { params });
  },
  createForm(payload, entityId) {
    const params = entityId ? { entity_id: entityId } : {};
    return apiClient.post("/entity/forms", payload, { params });
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
  getCustomers(entityId) {
    const params = entityId ? { entity_id: entityId } : {};
    return apiClient.get("/entity/customers", { params });
  },
  deleteForm(formId) {
    return apiClient.delete(`/entity/forms/${formId}`);
  },
};
