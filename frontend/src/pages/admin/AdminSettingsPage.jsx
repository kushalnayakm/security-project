import { Card } from "../../components/ui/Card";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { useAuth } from "../../context/AuthContext";

export function AdminSettingsPage() {
  const { session } = useAuth();
  const profile = session?.profile || {};

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin"
        title="Settings"
        description="Review account details for the current admin session."
      />

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Admin Code</p>
            <p className="mt-2 text-lg font-semibold text-blue-900">{profile.admin_code || profile.adminCode || "Unavailable"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Linked User ID</p>
            <p className="mt-2 break-all text-sm text-slate-700">{profile.user_id || profile.userId || "Unavailable"}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
