import { useEffect, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { adminService } from "../../services/adminService";

export function AdminDashboardPage() {
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

  const quickActions = [
    { label: "Register New Entity", to: "/admin/register-entity" },
    { label: "Dynamic Forms", to: "/admin/forms" },
    { label: "QR Management", to: "/admin/qr" },
    { label: "Audit Logs", to: "/admin/audit-logs" },
    { label: "Reports", to: "/admin/reports" },
  ];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin Portal"
        title="Welcome Admin"
        description="Customer Registration & Certificate Management System. Manage entity onboarding, registration forms, QR assignment, audit visibility, and reporting from one operational workspace."
      />

      <Card className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Main Actions</p>
            <h2 className="mt-3 text-4xl font-semibold text-blue-900">Keep the registration workflow moving</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Register entities, prepare registration forms, manage QR allocation, review logs, and monitor progress through each business step.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => window.location.assign("/admin/register-entity")}>Register New Entity</Button>
            <Button variant="secondary" onClick={() => window.location.assign("/admin/forms")}>Dynamic Forms</Button>
            <Button variant="secondary" onClick={() => window.location.assign("/admin/qr")}>QR Management</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-blue-900">Recent registered entities</h2>
            <Link to="/admin/entities" className="text-sm font-medium text-blue-900">View all</Link>
          </div>
          <div className="mt-6 space-y-3">
            {entities.slice(0, 5).map((entity) => (
              <div key={entity.entity_id} className="flex items-center justify-between rounded-3xl border border-slate-200 p-4">
                <div>
                  <p className="font-semibold text-slate-800">{entity.name}</p>
                  <p className="mt-1 text-sm text-slate-500">GST: {entity.gstNo || "Not provided"}</p>
                </div>
                <p className="text-sm text-slate-600">{entity.status}</p>
              </div>
            ))}
            {entities.length === 0 ? <p className="text-sm text-slate-500">No entities registered yet.</p> : null}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-blue-900">Quick actions</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to} className="flex items-center justify-between rounded-3xl border border-slate-200 p-4 text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-orange-50">
                  {action.label}
                  <ArrowRightIcon className="h-4 w-4 text-blue-900" />
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-blue-900">Recent audit logs</h2>
            <div className="mt-5 space-y-3">
              {logs.slice(0, 4).map((log) => (
                <div key={log.audit_id || `${log.action}-${log.target_id}`} className="rounded-3xl bg-slate-50 p-4">
                  <p className="font-medium text-slate-800">{log.action}</p>
                  <p className="mt-1 text-sm text-slate-500">{log.target_type} - {log.target_id}</p>
                </div>
              ))}
              {logs.length === 0 ? <p className="text-sm text-slate-500">No audit activity recorded yet.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
