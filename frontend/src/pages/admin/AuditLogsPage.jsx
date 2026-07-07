import { useEffect, useState } from "react";

import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { adminService } from "../../services/adminService";

export function AuditLogsPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    async function loadLogs() {
      try {
        const response = await adminService.listAuditLogs();
        setLogs(response.data.data || []);
      } catch {
        setLogs([]);
      }
    }

    loadLogs();
  }, []);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin"
        title="Audit activity"
        description="Review recorded operational activity across the registration and management journey."
      />

      {logs.length === 0 ? (
        <EmptyState title="No audit logs available" description="No audit activity has been recorded for this view yet." />
      ) : (
        <Card className="divide-y divide-slate-200 overflow-hidden">
          {logs.map((log) => (
            <div key={log.audit_id || `${log.action}-${log.target_id}`} className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-blue-900">{log.action}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {log.target_type} - {log.target_id}
                </p>
              </div>
              <p className="text-xs text-slate-500">{log.created_at || "Recorded"}</p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
