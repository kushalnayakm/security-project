import { useEffect, useState } from "react";

import { Card } from "../../components/ui/Card";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { adminService } from "../../services/adminService";

export function AdminReportsPage() {
  const [entities, setEntities] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [entityResponse, logResponse] = await Promise.all([
          adminService.listEntities(),
          adminService.listAuditLogs(),
        ]);
        setEntities(entityResponse.data.data || []);
        setLogs(logResponse.data.data || []);
      } catch {
        setEntities([]);
        setLogs([]);
      }
    }

    loadData();
  }, []);

  const activeCount = entities.filter((entity) => entity.status === "ACTIVE").length;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin"
        title="Operational reports"
        description="This report view is derived from the existing entity list and audit log endpoints only."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm text-slate-500">Registered entities</p>
          <p className="mt-3 text-3xl font-semibold text-blue-900">{entities.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-slate-500">Active entities</p>
          <p className="mt-3 text-3xl font-semibold text-blue-900">{activeCount}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-slate-500">Audit events</p>
          <p className="mt-3 text-3xl font-semibold text-blue-900">{logs.length}</p>
        </Card>
      </div>
    </div>
  );
}
