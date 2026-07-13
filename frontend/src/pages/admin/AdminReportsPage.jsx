import { ChartBarSquareIcon, ExclamationTriangleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
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
  const branchCount = entities.filter((entity) => entity.entity_type === "BRANCH").length;
  const loginEvents = logs.filter((log) => log.action === "LOGIN").length;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin"
        title="Operational reports"
        description="This workspace uses only the current backend outputs. There is no dedicated reports API yet, so each metric is derived from entity and audit-log endpoints."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Registered entities", entities.length, ChartBarSquareIcon],
          ["Active entities", activeCount, ShieldCheckIcon],
          ["Branches in list", branchCount, ChartBarSquareIcon],
          ["Login events", loginEvents, ShieldCheckIcon],
        ].map(([label, value, Icon]) => (
          <Card key={label} className="metric-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{label}</p>
              <div className="rounded-2xl bg-white p-3 text-[#0F4C81] shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-semibold text-blue-950">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-blue-950">Report source summary</h2>
          <div className="mt-6 space-y-4">
            {[
              ["Entity metrics", "Derived from GET /admin/entities and limited to fields returned by that endpoint."],
              ["Audit metrics", "Derived from GET /admin/audit-logs without backend aggregation or time-series grouping."],
              ["Customer and certificate reporting", "No dedicated backend report API exists today, so those metrics are not inferred here."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-sm font-semibold text-blue-950">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-amber-100 bg-amber-50/70 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-3 text-amber-600">
              <ExclamationTriangleIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-blue-950">Backend Integration Pending</h2>
              <p className="text-sm text-amber-700">Advanced reporting is not yet exposed by the backend.</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-700">
            When dedicated report endpoints exist, this page can expand into trend charts, certificate issuance analytics, entity funnel breakdowns, and branch-level summaries.
          </p>
        </Card>
      </div>
    </div>
  );
}
