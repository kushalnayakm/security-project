import { useEffect, useState } from "react";
import { ArrowDownTrayIcon, EyeIcon, LinkIcon, QrCodeIcon } from "@heroicons/react/24/outline";

import { Card } from "../../components/ui/Card";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { adminService } from "../../services/adminService";

export function AdminQrManagementPage() {
  const [entities, setEntities] = useState([]);

  useEffect(() => {
    async function loadEntities() {
      try {
        const response = await adminService.listEntities();
        setEntities(response.data.data || []);
      } catch {
        setEntities([]);
      }
    }

    loadEntities();
  }, []);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin Portal"
        title="QR management"
        description="Generate, preview, download, and assign QR codes as part of the entity onboarding workflow."
      />

      <Card className="p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Generate QR", QrCodeIcon],
            ["Preview QR", EyeIcon],
            ["Download QR", ArrowDownTrayIcon],
            ["Assign QR", LinkIcon],
            ["QR Status", QrCodeIcon],
          ].map(([label, Icon]) => (
            <div key={label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <Icon className="h-5 w-5 text-orange-500" />
              <p className="mt-4 font-semibold text-blue-900">{label}</p>
              <p className="mt-2 text-sm text-slate-500">Backend Integration Pending</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entities.map((entity) => (
            <div key={entity.entity_id} className="rounded-3xl border border-slate-200 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Entity</p>
              <h2 className="mt-3 text-lg font-semibold text-blue-900">{entity.name}</h2>
              <p className="mt-2 text-sm text-slate-600">GST: {entity.gstNo || "Not provided"}</p>
              <p className="mt-2 text-sm text-slate-600">Customers registered: {entity.customerCount ?? 0}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {["Generate QR", "Preview QR", "Download QR", "Assign QR"].map((action) => (
                  <div key={action} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    {action}: Backend Integration Pending
                  </div>
                ))}
              </div>
            </div>
          ))}
          {entities.length === 0 ? <p className="text-sm text-slate-500">No entity records available for QR assignment yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
