import { BuildingOffice2Icon, DocumentTextIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

import { Card } from "../../components/ui/Card";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { useAuth } from "../../context/AuthContext";

export function EntityProfilePage() {
  const { session } = useAuth();
  const entity = session?.profile || {};
  const fields = [
    ["Company Name", entity.name],
    ["GST Number", entity.gst_no || entity.gstNo],
    ["Phone", entity.phone],
    ["Email", entity.email],
    ["Business Type", entity.business_type || entity.businessType],
    ["Status", entity.status],
    ["Entity Type", entity.entity_type || "MAIN"],
    ["Parent Entity", entity.parent_entity_id || "None"],
  ];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Entity"
        title="Organization profile"
        description="This screen reflects the entity payload returned during OTP login. It does not invent profile editing features that the current backend does not expose."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
              <BuildingOffice2Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-blue-950">Profile snapshot</h2>
              <p className="text-sm text-slate-500">Current data available in the authenticated session.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
                <p className="mt-2 text-base font-medium text-slate-800">{value || "Not available"}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-[#0F4C81]">
                <DocumentTextIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-blue-950">GST document</h2>
                <p className="text-sm text-slate-500">Available only if present in the backend session payload.</p>
              </div>
            </div>
            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              {entity.gst_doc_url || entity.gstDocUrl ? (
                <>
                  <p className="text-sm text-slate-600">GST document payload is present for this entity.</p>
                  <a
                    href={entity.gst_doc_url || entity.gstDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex text-sm font-semibold text-[#0F4C81] underline"
                  >
                    View GST document
                  </a>
                </>
              ) : (
                <p className="text-sm text-slate-600">No GST document URL is available in the current entity session.</p>
              )}
            </div>
          </Card>

          <Card className="border-amber-100 bg-amber-50/70 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white p-3 text-amber-600">
                <ExclamationTriangleIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-blue-950">Backend Integration Pending</h2>
                <p className="text-sm text-amber-700">No dedicated entity profile read/update API is available yet.</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-700">
              Once a profile endpoint exists, this screen can support richer document views, branch details, and editable organization settings.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
