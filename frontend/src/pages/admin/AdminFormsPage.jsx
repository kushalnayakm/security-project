import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { adminService } from "../../services/adminService";

export function AdminFormsPage() {
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
        title="Dynamic registration forms"
        description="Organize registration form work for approved entities and keep the onboarding journey ready for rollout."
      />

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            "Register entities before preparing their onboarding setup.",
            "Review which entities are ready for registration form activation.",
            "Move approved entities into the next stage of the onboarding journey.",
            "Keep the experience consistent across registration, QR, and customer operations.",
          ].map((item) => (
            <div key={item} className="rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              {item}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-blue-900">Entities in form preparation</h2>
            <p className="mt-2 text-sm text-slate-600">Track which entities are ready for registration form setup and follow-up.</p>
          </div>
          <Button variant="secondary" onClick={() => window.location.assign("/admin/register-entity")}>
            Register Entity
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {entities.map((entity) => (
            <div key={entity.entity_id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-blue-900">{entity.name}</p>
                <p className="mt-1 text-sm text-slate-600">GST: {entity.gstNo || "Not provided"}</p>
                <p className="mt-1 text-sm text-slate-500">Status: {entity.status}</p>
              </div>
              <Link to="/admin/entities" className="text-sm font-medium text-blue-900">Manage entity</Link>
            </div>
          ))}
          {entities.length === 0 ? <p className="text-sm text-slate-500">No entities found yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
