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
  ];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Entity"
        title="Profile"
        description="This profile view uses entity details returned by the existing OTP verification response."
      />

      <Card className="p-6">
        <div className="grid gap-5 md:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-base font-medium text-slate-800">{value || "Not available"}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
