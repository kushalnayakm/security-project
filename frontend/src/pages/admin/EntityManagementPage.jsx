import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, TrashIcon } from "@heroicons/react/24/outline";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../context/ToastContext";
import { adminService } from "../../services/adminService";

export function EntityManagementPage() {
  const { showToast } = useToast();
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  async function loadEntities() {
    try {
      const response = await adminService.listEntities();
      setEntities(response.data.data || []);
    } catch (error) {
      showToast({
        title: "Unable to load entities",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntities();
  }, []);

  async function handleDelete(entityId) {
    await adminService.deleteEntity(entityId);
    setEntities((current) => current.filter((entity) => entity.entity_id !== entityId));
    showToast({
      title: "Entity removed",
      description: "The delete request completed successfully.",
    });
  }

  const filteredEntities = entities.filter((entity) => {
    const haystack = `${entity.name ?? ""} ${entity.gstNo ?? ""} ${entity.status ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin"
        title="Entity management"
        description="Review registered entities, track their current status, and maintain the onboarding pipeline from one workspace."
      />

      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <Input className="pl-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search entity, GST, or status" />
          </div>
          <Button variant="secondary" onClick={() => window.location.assign("/admin/register-entity")}>
            Register Entity
          </Button>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">GST Number</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Customers</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-40" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-28" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-20" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-16" /></td>
                      <td className="px-4 py-4"><Skeleton className="ml-auto h-5 w-10" /></td>
                    </tr>
                  ))
                : filteredEntities.map((entity) => (
                    <tr key={entity.entity_id} className="text-slate-700">
                      <td className="px-4 py-4">
                        <p className="font-medium text-blue-900">{entity.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{entity.entity_id}</p>
                      </td>
                      <td className="px-4 py-4">{entity.gstNo || "N/A"}</td>
                      <td className="px-4 py-4">{entity.status || "Unknown"}</td>
                      <td className="px-4 py-4">{entity.customerCount ?? "-"}</td>
                      <td className="px-4 py-4 text-right">
                        <button type="button" onClick={() => handleDelete(entity.entity_id)} className="inline-flex text-slate-400 transition hover:text-rose-500">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
