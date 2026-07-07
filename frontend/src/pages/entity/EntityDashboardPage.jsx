import { Card } from "../../components/ui/Card";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { useAuth } from "../../context/AuthContext";

export function EntityDashboardPage() {
  const { session } = useAuth();
  const entity = session?.profile || {};
  const populatedCount = Object.values(entity).filter(Boolean).length;
  const completion = Math.min(100, Math.round((populatedCount / 6) * 100));
  const cards = [
    ["Assigned QR", "Available through My QR Code"],
    ["Registered Customers", "Customer workspace coming soon"],
    ["Certificates Issued", "Certificate management available in this portal"],
    ["Profile Completion", `${completion}%`],
  ];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Entity Workspace"
        title={`Welcome${entity.name ? `, ${entity.name}` : ""}`}
        description="Your login is authenticated through GST number, phone number, and OTP. Use this workspace to access assigned QR details, certificate actions, and your registered profile information."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label} className="p-6">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-4 text-xl font-semibold text-blue-900">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
