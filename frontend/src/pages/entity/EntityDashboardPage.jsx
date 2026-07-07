import { useEffect, useState } from "react";

import { Card } from "../../components/ui/Card";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { useAuth } from "../../context/AuthContext";
import { entityService } from "../../services/entityService";

export function EntityDashboardPage() {
  const { session } = useAuth();
  const entity = session?.profile || {};
  const populatedCount = Object.values(entity).filter(Boolean).length;
  const completion = Math.min(100, Math.round((populatedCount / 6) * 100));

  const [submissions, setSubmissions] = useState([]);
  const [formCount, setFormCount] = useState(0);

  async function loadSubmissions() {
    try {
      const formsRes = await entityService.getForms();
      const forms = formsRes.data.data?.existingForms || [];
      setFormCount(forms.length);

      const allSubmissions = [];
      for (const form of forms) {
        try {
          const subRes = await entityService.getSubmissions(form.form_id);
          const subs = subRes.data.data || [];
          subs.forEach((s) => allSubmissions.push({ ...s, formTitle: form.title }));
        } catch {
          // Skip forms that fail
        }
      }

      // Sort by submitted_at descending
      allSubmissions.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      setSubmissions(allSubmissions);
    } catch {
      // Silently fail
    }
  }

  useEffect(() => {
    loadSubmissions();

    // Poll every 30 seconds for new submissions
    const interval = setInterval(loadSubmissions, 30000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    ["Active Forms", formCount || "0"],
    ["Total Submissions", submissions.length || "0"],
    ["Certificates Issued", "Certificate management available"],
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

      {/* Recent Submissions Feed */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-blue-900">Recent Submissions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Live feed of customer form submissions — auto-refreshes every 30 seconds.
            </p>
          </div>
          <button
            onClick={loadSubmissions}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {submissions.length > 0 ? (
            submissions.slice(0, 20).map((sub) => (
              <div
                key={sub.submission_id}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 p-5 transition hover:border-slate-300 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                      {sub.unique_id || "N/A"}
                    </span>
                    <span className="text-sm text-slate-500">{sub.formTitle}</span>
                  </div>
                  {sub.customer_name ? (
                    <p className="mt-2 text-sm font-medium text-blue-900">{sub.customer_name}</p>
                  ) : null}
                </div>
                <p className="text-xs text-slate-400">
                  {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : "Unknown"}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-500">No submissions yet.</p>
              <p className="mt-2 text-sm text-slate-400">
                Share your QR code with customers to start receiving form submissions.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
