import { apiClient } from "./api/client";

export const adminService = {
  listEntities(params) {
    return apiClient.get("/admin/entities", { params });
  },
  createEntity(payload) {
    return apiClient.post("/admin/entities", payload);
  },
  updateEntity(entityId, payload) {
    return apiClient.patch(`/admin/entities/${entityId}`, payload);
  },
  deleteEntity(entityId) {
    return apiClient.delete(`/admin/entities/${entityId}`);
  },
  listAuditLogs(params) {
    return apiClient.get("/admin/audit-logs", { params });
  },
};
